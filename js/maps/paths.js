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
      if (i < n - 1) { const cx = right ? 1 - off : off, sg = right ? 1 : -1, cy = v + dv / 2; [-0.78, 0, 0.78].forEach(function (a) { pts.push([cx + sg * off * Math.cos(a), cy + dv / 2 * Math.sin(a)]); }); }
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

  const ARCH = {
    // --- Step 1 (hutan) ---
    hook: legacy('hook'),
    serp3: function (portrait, d) {
      return portrait ? { pts: serp(6, 0, 0.15, d.asp), shooter: [0.5, 0.97], zones: SERP_ZONE } : { pts: serp(3, 0, 0.27, d.asp), shooter: [0.5, 0.92], zones: SERP_ZONE };
    },
    s2: function (portrait, d) {
      return portrait
        ? { pts: serp(4, 0, 0.2, d.asp), shooter: [0.5, 0.95] }
        : { pts: [[-0.12, 0.02], [0.3, 0.0], [0.7, 0.0], [0.95, 0.05], [1.02, 0.22], [0.95, 0.4], [0.7, 0.44], [0.4, 0.44], [0.12, 0.42]], shooter: [0.5, 0.92] };
    },
    // --- Step 2 (gunung api / gua kristal) ---
    zigzag: function (portrait, d) { return portrait ? { pts: serp(5, 0, 0.18, d.asp, 0.02), shooter: [0.5, 0.97] } : legacy('zigzag')(false); },
    figure8: function (portrait) {
      const pts = figure8(), sh = [0.75, 0.5];
      return portrait ? { pts: T(pts), shooter: [sh[1], sh[0]], bridge: true } : { pts: pts, shooter: sh, bridge: true };
    },
    horseshoe: function (portrait) {
      const pts = [[-0.12, 0.03], [0.05, 0.05], [0.02, 0.5], [0.1, 0.92], [0.3, 1.0], [0.7, 1.0], [0.92, 0.92], [1.0, 0.5], [0.95, 0.1], [0.75, 0.0], [0.55, 0.02]];
      return { pts: portrait ? T(pts) : pts };
    },
    // --- Step 3 (menara, arena boss: penembak di bawah, boss di atas) ---
    bossU: legacy('bossU'),
    bossU2: function () { return { pts: MIR(BOSS_U), shooter: [0.5, 0.66], boss: [0.5, 0.2] }; },
    bossBowl: function () {
      return { pts: [[0.0, -0.2], [0.06, 0.12], [0.0, 0.4], [0.12, 0.75], [0.4, 0.98], [0.7, 0.98], [0.92, 0.8], [1.0, 0.5], [0.9, 0.25], [0.78, 0.05]], shooter: [0.5, 0.66], boss: [0.5, 0.2] };
    }
  };

  function has(id) { return !!ARCH[id]; }
  function resolve(id, portrait, L) {
    const pl = L && L.play, pad = L && L.pad != null ? L.pad : 40, iw = pl ? pl.w - 2 * pad : 440, ih = pl ? pl.h - 2 * pad : 356;
    return ARCH[id] ? ARCH[id](!!portrait, { iw: iw, ih: ih, asp: ih / iw }) : null;
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
    const dr = GA.Theme.dragon.radiusRatio * R, shNeed = dr * 1.5 + R + 12, shClear = near(path.shooter.x, path.shooter.y);
    if (shClear < shNeed) issues.push({ kind: 'shooter', msg: 'ruang penembak ' + Math.round(shClear) + ' < ' + Math.round(shNeed) });
    let bossClear = null;
    if (path.boss) { bossClear = near(path.boss.x, path.boss.y); const bn = 2.45 * R + R + 8; if (bossClear < bn) issues.push({ kind: 'boss', msg: 'ruang boss ' + Math.round(bossClear) + ' < ' + Math.round(bn) }); }
    if (cross.length && !(def && def.bridge)) issues.push({ kind: 'cross', msg: cross.length + ' persilangan tanpa jembatan' });
    return { ok: !issues.length, issues: issues, minGap: minGap > 1e8 ? null : minGap, need: need, minRadius: minR > 1e8 ? null : minR, shooterClear: shClear, bossClear: bossClear, crossings: cross, violations: viol, sharp: sharp, length: path.length };
  }

  /** Lunakkan tikungan tajam: ambil titik tiap ~28 px, haluskan (rata-rata tetangga), bangun ulang jalur. */
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

  GA.Paths = { has: has, resolve: resolve, refine: refine, analyze: analyze, drawDebug: drawDebug, ids: Object.keys(ARCH) };
  GA.debug = /[?&]debug(=1|&|$)/.test(location.search);
})(window.GA = window.GA || {});
