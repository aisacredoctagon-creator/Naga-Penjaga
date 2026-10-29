/* maps/paths.js — pustaka ARKETIPE jalur bola berbasis data + validator + mode debug.
 *
 * Tiap arketipe punya definisi LANDSCAPE dan PORTRAIT sendiri (titik kontrol ternormalisasi u,v pada area main yang sudah diberi
 * margin; spline Catmull-Rom di path.js mengubahnya menjadi jalur dengan tabel panjang busur). Penembak/boss/zona kecepatan ikut di sini.
 *   resolve(id, portrait) → { pts, shooter, boss, zones }      refine(path, ...) → jalur tervalidasi
 * Validator (dijalankan tiap jalur dibangun): jarak antar-segmen ≥ 2,5R + 8, radius tikungan ≥ 1,15R, jalur tetap di layar, ruang
 * penembak/boss bebas, dan deteksi persilangan (jembatan: bola di jalur atas digambar di atas jembatan, jalur bawah lewat di bawahnya).
 * Tikungan terlalu tajam dilunakkan otomatis (smoothing). ?debug=1 menampilkan jalur, titik kontrol, pelanggaran, dan laporan. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  const T = function (pts) { return pts.map(function (p) { return [p[1], p[0]]; }); };          // transpose: u↔v
  const MIR = function (pts) { return pts.map(function (p) { return [1 - p[0], p[1]]; }); };     // cermin kiri-kanan

  /** Serpentin horizontal: n baris bolak-balik, baris ke-i di v = v0 + i·dv. Tikungan berbentuk setengah lingkaran (kedalaman = dv/2 piksel,
   *  asp = tinggi/lebar area isi). wave > 0 membuat baris bergelombang. Pintu masuk di kiri atas. */
  function serp(n, v0, dv, asp, wave) {
    const off = Math.min(0.2, dv / 2 * asp), pts = [[-0.12, v0]];
    for (let i = 0; i < n; i++) {
      const v = v0 + i * dv, right = i % 2 === 0, us = wave ? [0.12, 0.31, 0.5, 0.69, 0.88] : [0.1, 0.5, 0.9];
      const row = us.map(function (u, k) { return [off + u * (1 - 2 * off), v + (wave && k > 0 && k < us.length - 1 ? (k % 2 ? wave : -wave) : 0)]; });
      if (!right) row.reverse();
      row[0][0] = right ? off : 1 - off; row[row.length - 1][0] = right ? 1 - off : off;
      row.forEach(function (p) { pts.push(p); });
      if (i < n - 1) { const cx = right ? 1 - off : off, sg = right ? 1 : -1, cy = v + dv / 2; [-1.1, -0.55, 0, 0.55, 1.1].forEach(function (a) { pts.push([cx + sg * off * Math.cos(a), cy + dv / 2 * Math.sin(a)]); }); }
    }
    return pts;
  }

  /** Angka delapan (lemniscate Gerono): dua lobus bersilangan di tengah; pintu masuk di lobus kiri, sarang di lobus kiri bawah. */
  function figure8() {
    const pts = [[-0.12, 0.66]];
    for (let t = Math.PI * 1.5 - 0.2; t <= Math.PI * 3 + 0.55; t += 0.2) pts.push([0.5 + 0.5 * Math.sin(t), 0.5 + 0.5 * Math.sin(2 * t)]);
    return pts;
  }

  function legacy(name) {
    return function (portrait) {
      const pr = GA.Path.presets[name], tr = portrait && pr.mode === 'transpose';
      return { pts: tr ? T(pr.pts) : pr.pts, shooter: pr.shooter, boss: pr.boss };
    };
  }

  const BOSS_U = [[0.0, -0.2], [0.03, 0.14], [0.04, 0.6], [0.14, 0.9], [0.5, 1.0], [0.86, 0.9], [0.96, 0.6], [0.97, 0.3], [0.95, 0.08]];
  const SERP_ZONE = [{ from: 0.36, to: 0.56, mul: 1.45 }];   // bagian jalur tempat rantai melaju lebih cepat

  /** Jumlah baris & jarak baris serpentin yang MUAT untuk radius bola d.R: jarak baris >= 1,1 × (2,5R + 8) (spline melorot sedikit di tikungan) dan ruang penembak terjaga. */
  function fitRows(d, n0, sv) {
    const R = d.R, need = (2.5 * R + 8) * 1.1, sh = 1.45 * R * 1.5 + R + 12, span = (d.ih * sv - sh) * 0.97, n = Math.max(3, Math.min(n0, 1 + Math.floor(span / need)));
    return { n: n, dv: Math.min(0.3, Math.max(need / d.ih, span / (n - 1) / d.ih)) };
  }

  /** Jangkauan sayap naga (× radius badan): jalur tidak boleh lebih dekat ke pusat daripada wingNeed = 1,6·dr + R + 2 (tepi bola di luar ujung sayap). */
  const WING_REACH = 1.6;
  const wingNeed = function (R) { return GA.Theme.dragon.radiusRatio * R * WING_REACH + R + 2; };

  /** Jalur "bintang" mengelilingi naga di tengah (kurva polar, SATU lap, sudut hanya bertambah): tiap sinar dari naga memotong jalur sekali, jadi peluru
   *  (berhenti di bola PERTAMA yang tersentuh) selalu mengenai bola yang dibidik. Parameter o:
   *    th0 (derajat, awal/portal; 0 = kanan, 90 = bawah), sweep (derajat, ≤ 340), dir (+1 searah jarum jam | −1), n (eksponen superelips: 2 = oval, 4 = persegi membulat),
   *    rho0 → rho1 (faktor radius awal → akhir lap), wave [amplitudo px, jumlah gelombang, fase] (gelombang radial; wmod 'cos' meredam di atas/bawah),
   *    desc (derajat turunan terakhir ke tepi platform naga), rx (batas semi-sumbu mendatar px, opsional). boss: { fy, fx } posisi boss di bukaan (bagian dari semi-sumbu). */
  function polar(d, o) {
    const R = d.R, ry = d.vc * d.ih, rx = Math.min(d.iw / 2, o.rx || 1e9, (o.ar || (d.portrait ? 1.9 : 1.6)) * ry), n = o.n || 2, e = 2 / n, dir = o.dir || 1, TD = Math.PI / 180;
    const th0 = o.th0 * TD, sw = o.sweep * TD, ds = o.desc * TD, endR = wingNeed(R) + 3, N = Math.max(60, Math.round(o.sweep / 2.5));
    const ring = function (th) { const c = Math.cos(th), s = Math.sin(th); return [rx * Math.sign(c) * Math.pow(Math.abs(c), e), ry * Math.sign(s) * Math.pow(Math.abs(s), e)]; };
    const pe = ring(th0 + dir * sw), rhoEnd = endR / Math.hypot(pe[0], pe[1]), meanR = (rx + ry) / 2, pts = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N, th = th0 + dir * f * sw, p = ring(th);
      let rho = o.rho0 + (o.rho1 - o.rho0) * f;
      const g = Math.max(0, Math.min(1, (f * sw - (sw - ds)) / ds)), u = g;      // turunan linear (kemiringan tetap)
      if (o.wave) { const wm = o.wmod === 'cos' ? Math.pow(Math.abs(Math.cos(th)), 2) : 1; rho += o.wave[0] / 32 * R / meanR * Math.sin(o.wave[1] * f * 2 * Math.PI + (o.wave[2] || 0)) * Math.min(1, f * 10) * (1 - u) * wm; }
      rho = Math.min(rho, 1) * (1 - u) + rhoEnd * u;
      pts.push([0.5 + p[0] * rho / d.iw, d.vc + p[1] * rho / d.ih]);
    }
    const out = { pts: pts, shooter: [0.5, d.vc], star: true };
    if (o.boss) { out.boss = [0.5 + (o.boss.fx || 0) * rx / d.iw, d.vc + (o.boss.fy || 0) * ry / d.ih]; out.bossR = Math.round(1.5 * R); }
    return out;
  }
  const PORT = function (d) { return d.portrait; };
  /** Dua definisi (potret | lanskap) per arketipe: potret = oval tinggi, lanskap = oval pendek (sumbu vertikal dibatasi HUD). */
  const polarArch = function (op, ol) { return function (portrait, d) { return polar(d, portrait ? op : ol); }; };

  const ARCH = {
    // --- jalur baru: naga di TENGAH, jalur mengelilingi (Stage 1: ring1/spiral1/twoside, Stage 2: kuda/petal3/ring2, Stage 3: bkuda/bkuda2/bkudaW) ---
    ring1: polarArch({ th0: -130, sweep: 305, desc: 100, n: 2, rho0: 1, rho1: 1, wave: [0.7 * 32, 5, 0] }, { th0: -75, sweep: 305, desc: 100, n: 2, rho0: 1, rho1: 1, wave: [0.35 * 32, 4, 0], wmod: 'cos' }),
    spiral1: polarArch({ th0: -60, sweep: 305, desc: 100, dir: -1, n: 2, rho0: 1, rho1: 0.72, wave: [0.7 * 32, 4, 1] }, { th0: -105, sweep: 305, desc: 100, dir: -1, n: 2, rho0: 1, rho1: 1, wave: [0.35 * 32, 4, 1], wmod: 'cos' }),
    twoside: polarArch({ th0: -140, sweep: 305, desc: 100, n: 4, rho0: 1, rho1: 0.92, wave: [0.7 * 32, 7, 0] }, { th0: -75, sweep: 305, desc: 100, n: 3, rho0: 1, rho1: 1, wave: [0.35 * 32, 6, 0], wmod: 'cos' }),
    kuda: polarArch({ th0: 125, sweep: 300, desc: 100, n: 2.6, rho0: 1, rho1: 0.96, wave: [0.7 * 32, 4, 0] }, { th0: 120, sweep: 300, desc: 100, n: 2.4, rho0: 1, rho1: 1, wave: [0.35 * 32, 4, 0], wmod: 'cos' }),
    petal3: polarArch({ th0: -120, sweep: 305, desc: 100, n: 2, rho0: 0.84, rho1: 0.84, wave: [0.7 * 32, 3, 0] }, { th0: -75, sweep: 305, desc: 100, n: 2, rho0: 1, rho1: 1, wave: [0.35 * 32, 3, 0], wmod: 'cos' }),
    ring2: polarArch({ th0: -50, sweep: 305, desc: 100, dir: -1, n: 2.2, rho0: 1, rho1: 1, wave: [0.7 * 32, 6, 2] }, { th0: -105, sweep: 305, desc: 100, dir: -1, n: 2.2, rho0: 1, rho1: 1, wave: [0.35 * 32, 5, 2], wmod: 'cos' }),
    // arena boss: bukaan di atas (potret) / di samping (lanskap) tempat boss berdiri
    bkuda: polarArch({ th0: -50, sweep: 255, desc: 100, n: 2.2, rho0: 1, rho1: 1, wave: [0.6 * 32, 4, 0], boss: { fy: -0.58 } }, { th0: -75, sweep: 305, desc: 100, n: 2, rho0: 1, rho1: 1, wave: [0.35 * 32, 3, 0], wmod: 'cos', boss: { fx: 1.62 } }),
    bkuda2: polarArch({ th0: -130, sweep: 255, desc: 100, dir: -1, n: 2.2, rho0: 1, rho1: 1, wave: [0.6 * 32, 4, 1], boss: { fy: -0.58 } }, { th0: -105, sweep: 305, desc: 100, dir: -1, n: 2, rho0: 1, rho1: 1, wave: [0.35 * 32, 3, 1], wmod: 'cos', boss: { fx: -1.62 } }),
    bkudaW: polarArch({ th0: -45, sweep: 260, desc: 100, n: 2.8, rho0: 1, rho1: 0.95, wave: [0.7 * 32, 5, 0], boss: { fy: -0.58 } }, { th0: -75, sweep: 305, desc: 100, n: 2.4, rho0: 1, rho1: 1, wave: [0.35 * 32, 4, 0], wmod: 'cos', boss: { fx: 1.62 } }),
    // --- arketipe lama (tidak dipakai di kolam stage; hanya cadangan menu/uji) ---
    // --- Stage 1 (hutan) ---
    hook: legacy('hook'),
    serp3: function (portrait, d) {
      return portrait ? { pts: serp(6, 0, 0.15, d.asp), shooter: [0.5, 0.97], zones: SERP_ZONE } : { pts: serp(3, 0, 0.3, d.asp), shooter: [0.5, 0.97], zones: SERP_ZONE };
    },
    s2: function (portrait, d) {
      return portrait
        ? { pts: serp(4, 0, 0.2, d.asp), shooter: [0.5, 0.95] }
        : { pts: [[-0.12, 0.02], [0.3, 0.0], [0.7, 0.0], [0.95, 0.05], [1.02, 0.22], [0.95, 0.4], [0.7, 0.44], [0.4, 0.44], [0.12, 0.42]], shooter: [0.5, 0.92] };
    },
    // --- Stage 2 (gunung api / gua kristal) ---
    zigzag: function (portrait, d) { return portrait ? { pts: serp(5, 0, 0.18, d.asp, 0.02), shooter: [0.5, 0.97] } : legacy('zigzag')(false); },
    figure8: function (portrait) {
      const pts = figure8(), sh = [0.75, 0.5];
      return portrait ? { pts: T(pts), shooter: [sh[1], sh[0]], bridge: true } : { pts: pts, shooter: sh, bridge: true };
    },
    // --- varian padat (tahap f): lebih banyak baris = jalur lebih panjang; tikungan setengah lingkaran dilunakkan validator bila perlu ---
    serp4: function (portrait, d) { const f = fitRows(d, portrait ? 7 : 4, portrait ? 0.98 : 0.995); return { pts: serp(f.n, 0, f.dv, d.asp), shooter: [0.5, portrait ? 0.98 : 0.995], zones: SERP_ZONE }; },
    serp4w: function (portrait, d) { const f = fitRows(d, portrait ? 6 : 4, portrait ? 0.97 : 0.995); return { pts: serp(f.n, 0, f.dv, d.asp, portrait ? 0.012 : 0.008), shooter: [0.5, portrait ? 0.97 : 0.995] }; },
    serp3w: function (portrait, d) { return portrait ? { pts: serp(5, 0, 0.17, d.asp, 0.025), shooter: [0.5, 0.96], zones: SERP_ZONE } : { pts: serp(3, 0, 0.3, d.asp, 0.04), shooter: [0.5, 0.97] }; },
    horseshoe: function (portrait) {
      const pts = [[-0.12, 0.03], [0.05, 0.05], [0.02, 0.5], [0.1, 0.92], [0.3, 1.0], [0.7, 1.0], [0.92, 0.92], [1.0, 0.5], [0.95, 0.1], [0.75, 0.0], [0.55, 0.02]];
      return { pts: portrait ? T(pts) : pts };
    },
    // --- Stage 3 (menara, arena boss: penembak di bawah, boss di atas) ---
    bossU: legacy('bossU'),
    bossU2: function () { return { pts: MIR(BOSS_U), shooter: [0.5, 0.63], boss: [0.5, 0.2] }; },
    bossBowl: function () {
      return { pts: [[0.0, -0.2], [0.06, 0.12], [0.0, 0.4], [0.12, 0.75], [0.4, 0.98], [0.7, 0.98], [0.92, 0.8], [1.0, 0.5], [0.9, 0.25], [0.78, 0.05]], shooter: [0.5, 0.63], boss: [0.5, 0.2] };
    }
  };

  const PLAY_IDS = ['ring1', 'spiral1', 'twoside', 'kuda', 'petal3', 'ring2', 'bkuda', 'bkuda2', 'bkudaW'];
  function has(id) { return !!ARCH[id]; }
  function resolve(id, portrait, L, R) {
    const pl = L && L.play, pad = L && L.pad != null ? L.pad : 40, padTop = L && L.padTop != null ? L.padTop : pad, iw = pl ? pl.w - 2 * pad : 440, ih = pl ? pl.h - padTop - pad : 356 - (padTop - pad);
    const vc = pl ? (pl.h / 2 - padTop) / ih : 0.5;      // pusat arena (tengah area bermain) dalam koordinat ternormalisasi area jalur
    return ARCH[id] ? ARCH[id](!!portrait, { iw: iw, ih: ih, vc: vc, asp: ih / iw, R: R || 29, portrait: !!portrait }) : null;
  }

  /* ---------- validator ---------- */
  function analyze(path, R, L, def) {
    const xs = path.xs, ys = path.ys, st = path.step, n = xs.length, S = 4, pl = L.play;
    const need = 2.5 * R + 8, issues = [], viol = [], idx = [];
    for (let i = 0; i < n; i += S) idx.push(i);
    // persilangan: sampel berjauhan di sepanjang jalur tetapi hampir berimpit
    const cross = [];
    for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
      const arc = (idx[b] - idx[a]) * st; if (arc < 6 * R) continue;
      const dx = xs[idx[a]] - xs[idx[b]], dy = ys[idx[a]] - ys[idx[b]];
      if (dx * dx + dy * dy < R * R * 0.64) {
        const x = (xs[idx[a]] + xs[idx[b]]) / 2, y = (ys[idx[a]] + ys[idx[b]]) / 2;
        let c = null; for (let k = 0; k < cross.length; k++) if (Math.hypot(cross[k].x - x, cross[k].y - y) < 2.5 * R) { c = cross[k]; break; }
        if (!c) cross.push({ x: x, y: y, d1: idx[a] * st, d2: idx[b] * st }); else { c.d1 = Math.min(c.d1, idx[a] * st); c.d2 = Math.max(c.d2, idx[b] * st); }
      }
    }
    const nearCross = function (i) { for (let k = 0; k < cross.length; k++) if (Math.hypot(cross[k].x - xs[i], cross[k].y - ys[i]) < 3.6 * R) return true; return false; };
    // jarak minimum antar-segmen
    let minGap = 1e9;
    for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
      const arc = (idx[b] - idx[a]) * st; if (arc < 6 * R) continue;
      const dx = xs[idx[a]] - xs[idx[b]], dy = ys[idx[a]] - ys[idx[b]], d = Math.sqrt(dx * dx + dy * dy);
      if (d >= need * 1.6 || nearCross(idx[a]) || nearCross(idx[b])) continue;
      if (d < minGap) minGap = d;
      if (d < need && viol.length < 30) viol.push([xs[idx[a]], ys[idx[a]]]);
    }
    if (minGap < need) issues.push({ kind: 'gap', msg: 'jarak antar-segmen ' + Math.round(minGap) + ' < ' + Math.round(need) });
    // radius tikungan
    let minR = 1e9, sharp = [];
    const k6 = 6;
    for (let i = k6; i < n - k6; i += 3) {
      const ax = xs[i - k6], ay = ys[i - k6], bx = xs[i], by = ys[i], cx = xs[i + k6], cy = ys[i + k6];
      const ab = Math.hypot(bx - ax, by - ay), bc = Math.hypot(cx - bx, cy - by), ca = Math.hypot(ax - cx, ay - cy), cr = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
      if (cr < 1e-6) continue;
      const rad = ab * bc * ca / (2 * cr); if (rad < minR) minR = rad;
      if (rad < 1.15 * R && sharp.length < 20) sharp.push([bx, by]);
    }
    if (minR < 1.15 * R) issues.push({ kind: 'radius', msg: 'tikungan tajam r=' + Math.round(minR) + ' < ' + Math.round(1.15 * R) });
    // batas layar (setelah titik masuk pertama)
    let first = -1; for (let i = 0; i < n; i++) if (xs[i] >= pl.x && xs[i] <= pl.x + pl.w && ys[i] >= pl.y && ys[i] <= pl.y + pl.h) { first = i; break; }
    let out = 0; for (let i = Math.max(0, first); i < n; i++) if (xs[i] < pl.x - R * 0.6 || xs[i] > pl.x + pl.w + R * 0.6 || ys[i] < pl.y - R * 0.6 || ys[i] > pl.y + pl.h + R * 0.6) out++;
    if (first < 0 || out > 0) issues.push({ kind: 'bounds', msg: first < 0 ? 'jalur tidak masuk layar' : out + ' titik keluar layar' });
    // ruang penembak dan boss
    const near = function (px, py) { let m = 1e12; for (let i = 0; i < n; i += 3) { const dx = xs[i] - px, dy = ys[i] - py, d = dx * dx + dy * dy; if (d < m) m = d; } return Math.sqrt(m); };
    const dr = GA.Theme.dragon.radiusRatio * R, star = !!(def && def.star), shNeed = star ? wingNeed(R) - 2 : dr * 1.5 + R + 12, shClear = near(path.shooter.x, path.shooter.y);
    if (shClear < shNeed) issues.push({ kind: 'shooter', msg: (star ? 'jalur terlalu dekat sayap naga ' : 'ruang penembak ') + Math.round(shClear) + ' < ' + Math.round(shNeed) });
    let bossClear = null;
    if (path.boss) { bossClear = near(path.boss.x, path.boss.y); const bn = path.boss.R ? 1.5 * path.boss.R + R + 2 : 2.45 * R + R + 8; if (bossClear < bn) issues.push({ kind: 'boss', msg: 'ruang boss ' + Math.round(bossClear) + ' < ' + Math.round(bn) }); }
    const star2 = star ? analyzeStar(path, R, L) : null;
    if (star2) star2.issues.forEach(function (i) { issues.push(i); });
    if (cross.length && !(def && def.bridge)) issues.push({ kind: 'cross', msg: cross.length + ' persilangan tanpa jembatan' });
    return { ok: !issues.length, star: star2, issues: issues, minGap: minGap > 1e8 ? null : minGap, need: need, minRadius: minR > 1e8 ? null : minR, shooterClear: shClear, bossClear: bossClear, crossings: cross, violations: viol, sharp: sharp, length: path.length };
  }


  /** Validator jalur bintang (naga di pusat): (1) sudut mengelilingi pusat hanya bertambah, ≤ 360°; (2) tangen ≥ 55° dari arah radial (peluru sebesar bola: 0,92R + R);
   *  (3) ray test dari naga ke setiap posisi bola di sepanjang jalur: tidak ada bola lain yang tersentuh peluru lebih dulu (peluru berhenti di bola pertama);
   *  (4) jalur ≥ 2,5R di bawah HUD (margin bola 1,5R), sayap naga tidak menutupi (≥ wingNeed dari pusat). */
  function analyzeStar(path, R, L) {
    const xs = path.xs, ys = path.ys, n = xs.length, cx = path.shooter.x, cy = path.shooter.y, issues = [], S = 3, pl = L.play;
    const rb = 0.92 * R + (GA.Theme.ball.bulletHitRatio || 0.5) * R, wn = wingNeed(R);
    // (1) sudut kumulatif dan pembalikan arah
    let ang = 0, prev = Math.atan2(ys[0] - cy, xs[0] - cx);
    for (let i = 1; i < n; i++) { const a = Math.atan2(ys[i] - cy, xs[i] - cx); let da = a - prev; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; ang += da; prev = a; }
    const sgn = ang >= 0 ? 1 : -1; let acc = 0, hi = 0, maxBack = 0; prev = Math.atan2(ys[0] - cy, xs[0] - cx);
    for (let i = 1; i < n; i++) { const a = Math.atan2(ys[i] - cy, xs[i] - cx); let da = a - prev; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; prev = a; acc += da * sgn; if (acc > hi) hi = acc; if (hi - acc > maxBack) maxBack = hi - acc; }
    if (Math.abs(ang) > 2 * Math.PI * 1.005) issues.push({ kind: 'angle', msg: 'jalur mengitari ' + Math.round(Math.abs(ang) * 180 / Math.PI) + '° (> 360°)' });
    if (maxBack > 0.04) issues.push({ kind: 'angle', msg: 'sudut berbalik ' + (maxBack * 180 / Math.PI).toFixed(1) + '° (bukan bintang)' });
    // (2) sudut tangen-radial, jarak minimum ke pusat, margin HUD (bagian yang terlihat)
    let first = -1; for (let i = 0; i < n; i++) if (xs[i] >= pl.x && xs[i] <= pl.x + pl.w && ys[i] >= pl.y && ys[i] <= pl.y + pl.h) { first = i; break; }
    let minR = 1e9, minY = 1e9, minAlpha = 90;
    for (let i = Math.max(0, first); i < n - 2; i += 2) {
      const tx = xs[i + 2] - xs[i], ty = ys[i + 2] - ys[i], rx = xs[i] - cx, ry = ys[i] - cy, rl = Math.hypot(rx, ry) || 1;
      const al = Math.acos(Math.min(1, Math.abs(tx * rx + ty * ry) / ((Math.hypot(tx, ty) || 1) * rl))) * 180 / Math.PI;      // 0 = searah radial, 90 = melingkar
      if (al < minAlpha) minAlpha = al; if (rl < minR) minR = rl; if (ys[i] < minY) minY = ys[i];
    }
    if (minAlpha < 25) issues.push({ kind: 'tangent', msg: 'tangen ' + minAlpha.toFixed(0) + '° dari radial (< 25°)' });      // ambang lunak; ukuran sebenarnya = ray test
    if (minR < wn - 2) issues.push({ kind: 'wing', msg: 'jalur ' + Math.round(minR) + ' dari naga < ' + Math.round(wn) + ' (sayap menutupi bola)' });
    if (minY < pl.y + 2.5 * R - 2) issues.push({ kind: 'hud', msg: 'jalur ' + ((minY - pl.y) / R).toFixed(2) + 'R di bawah HUD (< 2,5R)' });
    // (3) ray test
    const smp = []; for (let i = Math.max(0, first); i < n; i += S) smp.push(i);
    let blocked = 0, near2 = 0; const bad = [], D4 = 4 * (2 * R + 1);
    for (let a = 0; a < smp.length; a++) {
      const i = smp[a], px = xs[i] - cx, py = ys[i] - cy, dist = Math.hypot(px, py); if (dist < 1) continue;
      const ux = px / dist, uy = py / dist; let hit = false, hitNear = false;
      for (let b = 0; b < smp.length && !hit; b++) {      // hit = dilindungi bola dari LAP/untai lain (arc >= 4D) = tumpang tindih radial; hitNear = hanya tetangga satu untai
        if (b === a) continue; const j = smp[b], arc = Math.abs(j - i) * path.step; if (arc < 0.95 * (2 * R + 1)) continue;      // bola bersebelahan tidak mungkin sedekat itu
        const qx = xs[j] - cx, qy = ys[j] - cy, t = qx * ux + qy * uy; if (t <= 0 || t > dist + rb) continue;
        const h = Math.abs(qx * uy - qy * ux); if (h >= rb) continue;
        if (t - Math.sqrt(rb * rb - h * h) < dist - rb - 1) { if (arc >= D4) hit = true; else hitNear = true; }      // bola di j tersentuh lebih dulu daripada bola di i
      }
      if (hit) { blocked++; if (bad.length < 40) bad.push([xs[i], ys[i]]); } else if (hitNear) near2++;
    }
    const frac = smp.length ? blocked / smp.length : 0, fracNear = smp.length ? near2 / smp.length : 0;
    if (frac > 0.06) issues.push({ kind: 'ray', msg: 'ray test: ' + (frac * 100).toFixed(1) + '% posisi bola terlindung bola dari lap lain (> 6%)' });      // sisa kecil = bayangan di sambungan lap/turunan
    if (fracNear > (L.portrait ? 0.35 : 0.45)) issues.push({ kind: 'rayNear', msg: 'ray test: ' + (fracNear * 100).toFixed(1) + '% posisi bola terlindung tetangga satu untai (> ' + (L.portrait ? 35 : 45) + '%)' });      // pembanding: jalur lama hook 39% / 71%
    return { issues: issues, rayBlocked: frac, rayNear: fracNear, rayBad: bad, minTangent: minAlpha, minCenter: minR, endDist: Math.hypot(xs[n - 1] - cx, ys[n - 1] - cy), sweepDeg: Math.abs(ang) * 180 / Math.PI };
  }

  /** Lunakkan tikungan tajam:
 ambil titik tiap ~28 px, haluskan (rata-rata tetangga), bangun ulang jalur. */
  function soften(path, passes) {
    const xs = path.xs, ys = path.ys, pts = [];
    for (let i = 0; i < xs.length; i += 14) pts.push([xs[i], ys[i]]);
    pts.push([xs[xs.length - 1], ys[ys.length - 1]]);
    for (let p = 0; p < passes; p++) for (let i = 1; i < pts.length - 1; i++) { pts[i] = [(pts[i - 1][0] + 2 * pts[i][0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4]; }
    const np = new GA.Path.Path(pts);
    np.shooter = path.shooter; np.boss = path.boss; np.presetId = path.presetId; np.play = path.play; np.ctrl = path.ctrl;
    return np;
  }

  /** Validasi + perbaikan otomatis + data persilangan/zona. Mengembalikan jalur (mungkin objek baru). */
  function refine(path, R, L, def) {
    let rep = analyze(path, R, L, def), tries = 0;
    while (rep.issues.some(function (i) { return i.kind === 'radius'; }) && tries < 3) { path = soften(path, 3 + tries * 2); rep = analyze(path, R, L, def); tries++; }
    rep.softened = tries;
    path.report = rep;
    const len = path.length;
    path.zones = ((def && def.zones) || []).map(function (z) { return { from: z.from * len, to: z.to * len, mul: z.mul }; });
    // jembatan di jalur ATAS (bagian yang lebih akhir): bola di sana digambar di atas jembatan
    path.bridges = []; path.overWindows = [];
    if (def && def.bridge) rep.crossings.forEach(function (c) {
      const i = Math.min(path.xs.length - 2, Math.max(1, Math.round(c.d2 / path.step))), a = Math.atan2(path.ys[i + 1] - path.ys[i - 1], path.xs[i + 1] - path.xs[i - 1]);
      path.bridges.push({ x: c.x, y: c.y, a: a, d: c.d2 }); path.overWindows.push([c.d2 - 3.4 * R, c.d2 + 3.4 * R]);
    });
    if (GA.debug && rep.issues.length) console.warn('[jalur ' + path.presetId + '] ' + rep.issues.map(function (i) { return i.msg; }).join('; '));
    return path;
  }

  /* ---------- mode debug (?debug=1) ---------- */
  function drawDebug(ctx, path, R, t) {
    if (!path) return;
    const rep = path.report || {};
    ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,255,255,0.9)'; ctx.stroke(path.poly());
    (path.ctrl || []).forEach(function (p, i) { ctx.fillStyle = 'rgba(255,255,0,0.95)'; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText(String(i), p[0] + 5, p[1] - 5); });
    ctx.strokeStyle = 'rgba(255,60,60,0.9)'; ctx.lineWidth = 2;
    (rep.violations || []).forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], R * 0.7, 0, TAU); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,160,0,0.95)'; (rep.sharp || []).forEach(function (p) { ctx.beginPath(); ctx.rect(p[0] - 8, p[1] - 8, 16, 16); ctx.stroke(); });
    (rep.crossings || []).forEach(function (c) { ctx.strokeStyle = 'rgba(0,255,120,0.9)'; ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.6, 0, TAU); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(120,255,120,0.7)'; ctx.setLineDash([6, 6]);
    const dr = GA.Theme.dragon.radiusRatio * R; ctx.beginPath(); ctx.arc(path.shooter.x, path.shooter.y, dr * 1.5 + R + 12, 0, TAU); ctx.stroke();
    if (path.boss) { ctx.beginPath(); ctx.arc(path.boss.x, path.boss.y, 2.45 * R + R + 8, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]);
    (path.zones || []).forEach(function (z) { const a = path.at(z.from, {}), b = path.at(z.to, {}); ctx.strokeStyle = 'rgba(255,0,255,0.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    const ed = GA.Effects && GA.Effects.entryD ? GA.Effects.entryD() : 0, ep = path.at(ed, {}); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ep.x, ep.y, R * 2.2, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; const y0 = (path.play ? path.play.y : 100) + 8; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(4, y0, 330, 14 + 12 * ((rep.issues || []).length + 3));
    ctx.fillStyle = rep.ok ? '#7dff9a' : '#ff9a7d'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
    const lines = ['jalur ' + path.presetId + '  panjang ' + Math.round(path.length) + '  R ' + R, 'gap min ' + (rep.minGap ? Math.round(rep.minGap) : '-') + ' (butuh ' + Math.round(rep.need || 0) + ')  radius min ' + (rep.minRadius ? Math.round(rep.minRadius) : '-') + '  lunak ' + (rep.softened || 0) + 'x', 'ruang penembak ' + Math.round(rep.shooterClear || 0) + '  silang ' + (rep.crossings || []).length].concat((rep.issues || []).map(function (i) { return '! ' + i.msg; }));
    lines.forEach(function (l, i) { ctx.fillText(l, 10, y0 + 16 + i * 12); });
    ctx.restore();
  }

  GA.Paths = { has: has, resolve: resolve, refine: refine, analyze: analyze, analyzeStar: analyzeStar, drawDebug: drawDebug, ids: PLAY_IDS, all: Object.keys(ARCH), wingNeed: wingNeed, WING_REACH: WING_REACH };
  GA.debug = /[?&]debug(=1|&|$)/.test(location.search);
})(window.GA = window.GA || {});
