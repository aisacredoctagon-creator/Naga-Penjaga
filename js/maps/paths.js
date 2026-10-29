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
  /** Jangkauan sayap naga (× radius badan): jalur tidak boleh lebih dekat ke pusat daripada wingNeed = 1,6·dr + R + 2 (tepi bola di luar ujung sayap). */
  const WING_REACH = 1.6;
  const wingNeed = function (R) { return GA.Theme.dragon.radiusRatio * R * WING_REACH + R + 2; };

  /** Jarak mulut naga dari pusat (tempat peluru lahir): radiusRatio × mouthDist × R. */
  const muzzleL = function (R) { return GA.Theme.dragon.radiusRatio * GA.Theme.dragon.mouthDist * R; };

  /** INV-1 (tidak ada bola yang tertutup). Rantai penuh dan rapat: bola di arc s dan s ± k·D (D = 2R+1). Dari pivot naga C, untuk SETIAP posisi s (langkah 0,25R)
   *  ditembakkan tiga sinar: ke pusat bola dan ke titik tepi ±0,7R ke samping. Sinar harus pertama kali mengenai bola itu sendiri.
   *  Dua model sentuh: 'fat' = peluru nyata (peluru bergaris tengah = bola: sentuh pada jarak 0,92R + bulletR dari pusat bola; INI yang dialami pemain dan yang menjadi syarat lulus)
   *  dan 'thin' = sinar tipis (cakram bola R) sebagai pembanding. Mengembalikan { tot, fat, thin, badPts }. */
  function inv1(path, R, bulletR, L0) {
    const xs = path.xs, ys = path.ys, st = path.step, cx = path.shooter.x, cy = path.shooter.y, D = 2 * R + 1, n = xs.length, stepS = Math.max(st, 0.25 * R), rf = 0.92 * R + bulletR;
    const at = function (s) { const f = s / st, i = Math.floor(f), t = f - i; if (i < 0 || i >= n - 1) return null; return [xs[i] + (xs[i + 1] - xs[i]) * t, ys[i] + (ys[i + 1] - ys[i]) * t]; };
    // peluru berangkat dari MULUT naga (L0 dari pusat, di garis bidik), bukan dari pusat: bola yang sudah bersentuhan saat peluru lahir kena di s = L0 (Chain.hit memilih pusat bola TERDEKAT)
    const L = L0 || 0, first = function (ux, uy, balls, rad) {
      let best = 1e12, bi = -1, bd = 1e12; const mx = cx + ux * L, my = cy + uy * L;
      for (let i = 0; i < balls.length; i++) {
        const qx = balls[i][0] - cx, qy = balls[i][1] - cy, t = qx * ux + qy * uy, h2 = qx * qx + qy * qy - t * t; if (h2 >= rad * rad) continue;
        const sq = Math.sqrt(rad * rad - h2); if (t + sq <= L) continue;
        const th = Math.max(t - sq, L), dm = (balls[i][0] - mx) * (balls[i][0] - mx) + (balls[i][1] - my) * (balls[i][1] - my);
        if (th < best - 1e-6 || (Math.abs(th - best) <= 1e-6 && dm < bd)) { best = th; bi = i; bd = dm; }
      }
      return bi;
    };
    let tot = 0, fat = 0, thin = 0, ki = 0; const badPts = [], rays = [];
    for (let s = 0; s <= path.length; s += stepS) {
      const p = at(s); if (!p) continue; const balls = [p];
      for (let k = 1; k <= 14; k++) { const a = at(s + k * D), b = at(s - k * D); if (a) balls.push(a); if (b) balls.push(b); }
      const dx = p[0] - cx, dy = p[1] - cy, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl; let bad = false;
      for (const off of [0, 0.7, -0.7]) {
        const tx = dx + nx * off * R, ty = dy + ny * off * R, tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl; tot++;
        const hit = first(ux, uy, balls, rf); if (hit !== 0) { fat++; bad = true; }
        if (off === 0 && (ki++ % 6 === 0 || hit !== 0) && rays.length < 160) rays.push([cx, cy, p[0], p[1], hit === 0]);
        if (first(ux, uy, balls, R) !== 0) thin++;
      }
      if (bad && badPts.length < 60) badPts.push([p[0], p[1]]);
    }
    return { tot: tot, fat: fat, thin: thin, badPts: badPts, rays: rays };
  }

  /** INV-3: jarak minimum antar-segmen jalur (pasangan titik berjarak busur ≥ 6R); alur jalur tidak boleh saling menempel (≥ 2,5R + lebar alur). */
  function minSegGap(path, R) {
    const xs = path.xs, ys = path.ys, st = path.step, n = xs.length, S = 4, need = 2.5 * R + 8; let m = 1e9;
    for (let a = 0; a < n; a += S) for (let b = a + S; b < n; b += S) {
      if ((b - a) * st < 6 * R) continue;
      const dx = xs[a] - xs[b], dy = ys[a] - ys[b], d = dx * dx + dy * dy;
      if (d < m) m = d;
    }
    return Math.sqrt(m);
  }

  const fitCache = {};
  /** Jalur SIPUT mengelilingi naga (titik tengah area bermain): SATU lap, sudut hanya bertambah (≤ 330°, celah portal/sarang ≥ 30°), radius mengecil geometris (spiral logaritmik) dari r0 ke
   *  ujung di sekitar platform naga, ditambah lobus kecil (A px, k lobus) / pembulatan poligon. Peluru nyata (sebesar bola) berhenti di bola PERTAMA yang tersentuh, jadi jalur harus
   *  hampir melingkar dari pusat naga: parameter (sapuan, pemipihan, amplitudo lobus, jari-jari ujung) DISETEL OTOMATIS dari yang paling "bergaya" ke yang paling polos
   *  sampai INV-1 (peluru nyata), INV-3 (jarak segmen) dan portal di area bermain lulus 100%; hasil di-cache per ukuran. o: th0 (derajat, awal/portal), sweep, dir (±1), asp
   *  (peregangan vertikal ≥ 1), A (px, × R/32), k, ph, rcap (batas r0), boss { side: 'top'|'left'|'right', k }. */
  function snail(d, o) {
    const R = d.R, TD = Math.PI / 180, wing = wingNeed(R) + 3, dir = o.dir || 1, PR = 2.2 * R, pl = d.pl;
    const key = [o.id, R, d.iw, d.ih, d.vc, d.portrait].join('|');
    let fit = fitCache[key];
    if (!fit) {
      const rMaxX = d.iw / 2, rMaxY = d.vc * d.ih;
      let bossR = 0, bn = 0; if (o.boss) { bossR = Math.round((o.boss.k || 1.25) * R); bn = 1.5 * bossR + R + 2; }
      let rcap = Math.min(rMaxX, o.rcap || 1e9); if (o.boss && o.boss.side === 'top') rcap = Math.min(rcap, d.vc * d.ih + d.padTop - (bn + 8) - bossR - 30);
      const build = function (c) {
        const rx = Math.min(rcap, rMaxY / c.asp), ry = rx * c.asp, N = Math.max(90, Math.round(c.sweep / 2)), sw = c.sweep * TD, th0 = o.th0 * TD, P = [], rE = c.endR;
        const sc = Math.min(1, rE / Math.min(rx, ry));
        for (let i = 0; i <= N; i++) {
          const f = i / N, th = th0 + dir * f * sw, k = Math.pow(sc, f);
          let ex = rx * Math.cos(th) * k, ey = ry * Math.sin(th) * k;
          if (c.A) { const g = 1 + c.A * Math.sin(o.k * f * 2 * Math.PI + (o.ph || 0)) * Math.min(1, f * 6, (1 - f) * 6) / Math.hypot(rx, ry); ex *= g; ey *= g; }
          P.push([ex, ey]);
        }
        return P;
      };
      const rE0 = Math.min(rcap, rMaxY / 1);
      const cands = [];
      [0, 8, 16, 24, 32, 44, 60].forEach(function (ds, si) {
        [o.asp || 1, ((o.asp || 1) + 1) / 2, 1].forEach(function (asp, ai) {
          if (ai && asp === (o.asp || 1)) return;
          [1, 0.75, 0.5, 0.3, 0.15, 0].forEach(function (af, fi) {
            if (!(o.A) && fi) return;
            [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(function (ef) {
              const rr = Math.min(rcap, rMaxY / asp);
              cands.push({ sweep: Math.max(240, o.sweep - ds), asp: asp, A: (o.A || 0) * af * R / 32, endR: wing + ef * Math.max(0, rr - wing), cost: si * 0.4 + ai * 1 + (1 - af) * 3 + Math.abs(ef - (o.ef0 == null ? 0.5 : o.ef0)) * 4 });
            });
          });
        });
      });
      cands.sort(function (a, b) { return a.cost - b.cost; });
      let best = null; const why = { portal: 0, gap: 0, inv1: 0, n: cands.length };
      for (let i = 0; i < cands.length && !best; i++) {
        const P = build(cands[i]), path = new GA.Path.Path(P); path.shooter = { x: 0, y: 0 };
        const sx = d.cx + P[0][0], sy = d.cy + P[0][1];
        if (sx < pl.x + PR || sx > pl.x + pl.w - PR || sy < pl.y + PR || sy > pl.y + pl.h - PR) { why.portal++; continue; }
        if (minSegGap(path, R) < 2.5 * R + 8) { why.gap++; continue; }
        if (inv1(path, R, R, muzzleL(R)).fat === 0) best = { P: P, c: cands[i] }; else why.inv1++;
      }
      if (!best) { const c = { sweep: 250, asp: 1, A: 0, endR: Math.min(rcap, rMaxY) }; best = { P: build(c), c: c, failed: true, why: why }; }
      best.rcap = rcap; fit = fitCache[key] = best;
    }
    const out = { pts: fit.P.map(function (p) { return [(d.cx + p[0] - d.ox) / d.iw, (d.cy + p[1] - d.oy) / d.ih]; }), shooter: [(d.cx - d.ox) / d.iw, (d.cy - d.oy) / d.ih], star: true, fit: fit.c, failed: !!fit.failed, why: fit.why };
    if (o.boss) {
      const bossR = Math.round((o.boss.k || 1.25) * R), bn = 1.5 * bossR + R + 2, rx = Math.min(fit.rcap, d.vc * d.ih / fit.c.asp), ry = rx * fit.c.asp; let bx = d.cx, by = d.cy;
      if (o.boss.side === 'top') by = d.cy - ry - bn - 12; else bx = d.cx + (o.boss.side === 'left' ? -1 : 1) * (rx + bn + 14);
      out.boss = [(bx - d.ox) / d.iw, (by - d.oy) / d.ih]; out.bossR = bossR;
    }
    return out;
  }
  /** Dua definisi (potret | lanskap) per arketipe; id ikut kunci cache penyetelan. */
  const polarArch = function (id, op, ol) { return function (portrait, d) { return snail(d, Object.assign({ id: id + (portrait ? 'p' : 'l') }, portrait ? op : ol)); }; };

  /** Arketipe (semua jalur lama dihapus). Potret: oval vertikal di bawah HUD, portal di tepi atas. Lanskap/desktop: elips mengikuti rasio area. Varian per stage ≥ 2, dipilih acak (levels.js).
   *   Stage 1 SIPUT: lingkaran/oval yang mengecil pelan menuju sarang. Stage 2 LOBUS: cincin berlobus 4–6 (amplitudo disetel otomatis oleh INV-1). Stage 3 POLIGON: poligon bulat 5–6 sisi + boss di luar cincin. */
  const ARCH = {
    siput1: polarArch('siput1', { th0: -125, sweep: 322, dir: 1, asp: 1.1, A: 0, k: 3, ef0: 0 }, { th0: -35, sweep: 322, dir: 1, asp: 1.05, A: 0, k: 3, ef0: 0 }),
    siput2: polarArch('siput2', { th0: -55, sweep: 322, dir: -1, asp: 1.06, A: 0, k: 3, ef0: 0 }, { th0: -145, sweep: 322, dir: -1, asp: 1, A: 0, k: 3, ef0: 0 }),
    siput3: polarArch('siput3', { th0: 145, sweep: 318, dir: 1, asp: 1.03, A: 0, k: 3, ef0: 0.1 }, { th0: 155, sweep: 318, dir: 1, asp: 1, A: 0, k: 3, ef0: 0.1 }),
    lobus1: polarArch('lobus1', { th0: -120, sweep: 322, dir: 1, asp: 1.06, A: 14, k: 5 }, { th0: -40, sweep: 322, dir: 1, asp: 1.03, A: 14, k: 5 }),
    lobus2: polarArch('lobus2', { th0: -60, sweep: 322, dir: -1, asp: 1.04, A: 14, k: 4 }, { th0: -140, sweep: 322, dir: -1, asp: 1, A: 14, k: 4 }),
    lobus3: polarArch('lobus3', { th0: 150, sweep: 318, dir: 1, asp: 1.03, A: 14, k: 6 }, { th0: 160, sweep: 318, dir: 1, asp: 1, A: 14, k: 6 }),
    poligon1: polarArch('poligon1', { th0: -125, sweep: 322, dir: 1, asp: 1, A: 12, k: 5, boss: { side: 'top', k: 1.25 } }, { th0: -150, sweep: 322, dir: 1, asp: 1, A: 12, k: 5, boss: { side: 'right', k: 1.5 } }),
    poligon2: polarArch('poligon2', { th0: -55, sweep: 322, dir: -1, asp: 1, A: 12, k: 6, boss: { side: 'top', k: 1.25 } }, { th0: -30, sweep: 322, dir: -1, asp: 1, A: 12, k: 6, boss: { side: 'left', k: 1.5 } }),
    poligon3: polarArch('poligon3', { th0: 145, sweep: 318, dir: 1, asp: 1, A: 12, k: 5, boss: { side: 'top', k: 1.25 } }, { th0: 30, sweep: 318, dir: 1, asp: 1, A: 12, k: 5, boss: { side: 'right', k: 1.5 } })
  };

  const PLAY_IDS = ['siput1', 'siput2', 'siput3', 'lobus1', 'lobus2', 'lobus3', 'poligon1', 'poligon2', 'poligon3'];
  function has(id) { return !!ARCH[id]; }
  /** Margin atas jalur untuk bola stage berjari-jari R (bola kategori bisa 1,12× bola layout): pusat bola >= (hudGap + 1)R di bawah panel HUD. */
  function padTopFor(L, R) {
    const base = L && L.padTop != null ? L.padTop : (L && L.pad) || 40;
    return R && L && L.hudGap != null ? Math.max(base, Math.round((L.hudGap + 1) * R * (L.portrait ? 1.12 : 1.05))) : base;
  }
  function resolve(id, portrait, L, R) {
    const pl = L && L.play, pad = L && L.pad != null ? L.pad : 40, padTop = padTopFor(L, R), iw = pl ? pl.w - 2 * pad : 440, ih = pl ? pl.h - padTop - pad : 356 - (padTop - pad);
    const vc = pl ? (pl.h / 2 - padTop) / ih : 0.5;      // pusat arena (tengah area bermain) dalam koordinat ternormalisasi area jalur
    return ARCH[id] ? ARCH[id](!!portrait, { iw: iw, ih: ih, vc: vc, asp: ih / iw, R: R || 29, portrait: !!portrait, pl: pl || { x: 0, y: 0, w: 540, h: 400 }, padTop: padTop, ox: (pl ? pl.x : 0) + pad, oy: (pl ? pl.y : 0) + padTop, cx: pl ? pl.x + pl.w / 2 : 270, cy: pl ? pl.y + pl.h / 2 : 200 }) : null;
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
    const xs = path.xs, ys = path.ys, n = xs.length, cx = path.shooter.x, cy = path.shooter.y, issues = [], pl = L.play, wn = wingNeed(R);
    // INV-2: pivot naga = tengah area bermain (di bawah HUD/zona informasi)
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
    if (Math.hypot(cx - pcx, cy - pcy) > 1.5) issues.push({ kind: 'center', msg: 'naga bukan di tengah area bermain (' + Math.round(cx - pcx) + ',' + Math.round(cy - pcy) + ')' });
    // sudut kumulatif ≤ 330° dan arah tunggal; celah sudut ≥ 30° antara ujung (platform) dan awal (portal)
    let ang = 0, prev = Math.atan2(ys[0] - cy, xs[0] - cx), hi = 0, acc = 0, maxBack = 0; const a0 = prev;
    for (let i = 1; i < n; i++) { const a = Math.atan2(ys[i] - cy, xs[i] - cx); let da = a - prev; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; ang += da; prev = a; }
    const sgn = ang >= 0 ? 1 : -1; prev = a0;
    for (let i = 1; i < n; i++) { const a = Math.atan2(ys[i] - cy, xs[i] - cx); let da = a - prev; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; prev = a; acc += da * sgn; if (acc > hi) hi = acc; if (hi - acc > maxBack) maxBack = hi - acc; }
    const sweepDeg = Math.abs(ang) * 180 / Math.PI;
    if (sweepDeg > 330.5) issues.push({ kind: 'angle', msg: 'rentang sudut ' + sweepDeg.toFixed(0) + '° (> 330°; celah portal < 30°)' });
    if (maxBack > 0.03) issues.push({ kind: 'angle', msg: 'sudut berbalik ' + (maxBack * 180 / Math.PI).toFixed(1) + '°' });
    // INV-2: ujung jalur di tepi platform/sarang tengah; jalur tidak lebih dekat ke pusat daripada jangkauan sayap; portal penuh di area bermain
    let first = -1; for (let i = 0; i < n; i++) if (xs[i] >= pl.x + 2 && xs[i] <= pl.x + pl.w - 2 && ys[i] >= pl.y + 2 && ys[i] <= pl.y + pl.h - 2) { first = i; break; }
    let minR = 1e9, minY = 1e9;
    for (let i = Math.max(0, first); i < n; i += 2) { const rl = Math.hypot(xs[i] - cx, ys[i] - cy); if (rl < minR) minR = rl; if (ys[i] < minY) minY = ys[i]; }
    const endD = Math.hypot(xs[n - 1] - cx, ys[n - 1] - cy);
    if (minR < wn - 2) issues.push({ kind: 'wing', msg: 'jalur ' + Math.round(minR) + ' dari naga < ' + Math.round(wn) + ' (sayap menutupi bola)' });
    if (endD < wn - 2) issues.push({ kind: 'end', msg: 'ujung jalur ' + Math.round(endD) + ' dari pusat (di dalam platform naga)' });
    const gapR = (L.hudGap == null ? 1.5 : L.hudGap) + 1;
    if (minY < pl.y + gapR * R - 2) issues.push({ kind: 'hud', msg: 'jalur ' + ((minY - pl.y) / R).toFixed(2) + 'R di bawah HUD (< ' + gapR.toFixed(1) + 'R)' });
    const PR = 2.2 * R, sx = xs[Math.max(0, first)], sy = ys[Math.max(0, first)];
    if (sx < pl.x + PR - 1 || sx > pl.x + pl.w - PR + 1 || sy < pl.y + PR - 1 || sy > pl.y + pl.h - PR + 1) issues.push({ kind: 'portal', msg: 'portal tidak penuh di area bermain' });
    // INV-1 dengan peluru nyata (syarat lulus) + sinar tipis (pembanding)
    const v = inv1(path, R, R, muzzleL(R));
    if (v.fat > 0) issues.push({ kind: 'inv1', msg: 'INV-1: ' + v.fat + '/' + v.tot + ' sinar mengenai bola lain lebih dulu (peluru nyata)' });
    return { issues: issues, inv1: v, rayBad: v.badPts, minCenter: minR, endDist: endD, sweepDeg: sweepDeg };
  }

  /** Lunakkan tikungan tajam:
 ambil titik tiap ~28 px, haluskan (rata-rata tetangga), bangun ulang jalur. */
  function soften(path, passes) {
    const xs = path.xs, ys = path.ys, pts = [];
    for (let i = 0; i < xs.length; i += 14) pts.push([xs[i], ys[i]]);
    pts.push([xs[xs.length - 1], ys[ys.length - 1]]);
    for (let p = 0; p < passes; p++) for (let i = 1; i < pts.length - 1; i++) { pts[i] = [(pts[i - 1][0] + 2 * pts[i][0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4]; }
    const np = new GA.Path.Path(pts);
    np.shooter = path.shooter; np.boss = path.boss; np.presetId = path.presetId; np.play = path.play; np.ctrl = path.ctrl; np.star = path.star;
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
    if (rep.star) {      // INV-1: sinar uji dari naga ke tiap posisi bola (hijau = mengenai bola itu sendiri, merah = terhalang bola lain), bola tertutup diisi merah
      ctx.lineWidth = 1; (rep.star.inv1.rays || []).forEach(function (r) { ctx.strokeStyle = r[4] ? 'rgba(120,255,140,0.2)' : 'rgba(255,60,60,0.9)'; ctx.beginPath(); ctx.moveTo(r[0], r[1]); ctx.lineTo(r[2], r[3]); ctx.stroke(); });
      ctx.fillStyle = 'rgba(255,40,40,0.5)'; (rep.star.rayBad || []).forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, TAU); ctx.fill(); });
    }
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
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; const y0 = (path.play ? path.play.y : 100) + 8; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(4, y0, 330, 14 + 12 * ((rep.issues || []).length + 4));
    ctx.fillStyle = rep.ok ? '#7dff9a' : '#ff9a7d'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
    const lines = ['jalur ' + path.presetId + '  panjang ' + Math.round(path.length) + '  R ' + R, 'gap min ' + (rep.minGap ? Math.round(rep.minGap) : '-') + ' (butuh ' + Math.round(rep.need || 0) + ')  radius min ' + (rep.minRadius ? Math.round(rep.minRadius) : '-') + '  lunak ' + (rep.softened || 0) + 'x', 'ruang penembak ' + Math.round(rep.shooterClear || 0) + '  silang ' + (rep.crossings || []).length].concat(rep.star ? ['INV-1 peluru nyata ' + rep.star.inv1.fat + '/' + rep.star.inv1.tot + '  sinar tipis ' + rep.star.inv1.thin + '  sudut ' + Math.round(rep.star.sweepDeg) + '°  ujung ' + Math.round(rep.star.endDist)] : []).concat((rep.issues || []).map(function (i) { return '! ' + i.msg; }));
    lines.forEach(function (l, i) { ctx.fillText(l, 10, y0 + 16 + i * 12); });
    ctx.restore();
  }

  GA.Paths = { has: has, resolve: resolve, refine: refine, analyze: analyze, analyzeStar: analyzeStar, inv1: inv1, muzzleL: muzzleL, padTopFor: padTopFor, drawDebug: drawDebug, ids: PLAY_IDS, all: Object.keys(ARCH), wingNeed: wingNeed, WING_REACH: WING_REACH };
  GA.debug = /[?&]debug(=1|&|$)/.test(location.search);
})(window.GA = window.GA || {});
