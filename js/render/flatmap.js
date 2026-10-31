/* flatmap.js — LATAR STATIS (revisi 11): ilustrasi peta datar yang BERSIH, dirender SEKALI per stage/varian/layout/ukuran ke kanvas latar (#bg) — tidak digambar ulang tiap frame.
 * Isi: tanah berwarna datar 2–3 nada + satu tile bintik berulang (opasitas rendah), alur tebal berbingkai batu (tepi gelap, bibir batu terbagi blok, dasar sedikit lebih gelap, bayangan datar),
 * platform batu naga, dekorasi sedikit (daun, semak, jamur, batu / batu arang, retakan lava, kristal / lantai ubin, lingkaran rune, pilar, obor, spanduk) di luar alur
 * (margin ≥ 1,5 × BALL_RADIUS dari tepi alur), bayangan jatuh datar (bentuk gelap semi-transparan, tanpa blur), dan vignette statis tipis. Tanpa objek depan, tanpa animasi, tanpa parallax.
 * Data/palet: js/maps/themes.js. Gambar sendiri (assets/manifest.json → maps) dipakai sebagai dasar (cover); alur, platform, dan zona bersih tetap digambar di atasnya.
 * API: FlatMap.build(canvas, L, map, path, R, stage) · FlatMap.has(id) · FlatMap.decorItems() · FlatMap.invalidate() — nama GA.Background dipertahankan sebagai alias untuk alat uji. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  const S = { key: '', items: [], map: null };

  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function ext(L) {
    const x0 = -L.ox / L.scale, y0 = -L.oy / L.scale, w = L.cssW / L.scale, h = L.cssH / L.scale;
    return { x0: x0, y0: y0, x1: x0 + w, y1: y0 + h, w: w, h: h };
  }

  /* ---------- jarak ke alur + zona bersih (INV-8) ---------- */
  function pathField(path) {
    const pts = [];
    if (path) for (let i = 0; i < path.xs.length; i += 4) pts.push(path.xs[i], path.ys[i]);
    return { dist: function (x, y) { let m = 1e12; for (let i = 0; i < pts.length; i += 2) { const dx = pts[i] - x, dy = pts[i + 1] - y, d = dx * dx + dy * dy; if (d < m) m = d; } return Math.sqrt(m); } };
  }
  function clearZones(path, R, hole) {
    const P = GA.Paths, sp = P && P.SPR_PORTAL ? P.SPR_PORTAL : 2.2, sn = P && P.SPR_NEST ? P.SPR_NEST : 2.3, c2 = P && P.CLEAR8 ? P.CLEAR8 : 2;
    return [{ x: path.xs[0], y: path.ys[0], r: (sp + c2) * R }, { x: hole.x, y: hole.y, r: (sn + c2) * R }];
  }
  const inZones = function (zones, x, y, rad) { for (let i = 0; i < zones.length; i++) if (Math.hypot(x - zones[i].x, y - zones[i].y) < zones[i].r + rad) return true; return false; };
  const inBoss = function (boss, R, x, y, rad) { return !!boss && Math.abs(x - boss.x) < 200 + rad && y > boss.y - R * 3.6 - rad && y < boss.y + R * 3.6 + rad; };

  /* ---------- bentuk dasar ---------- */
  function blob(g, x, y, r, rnd, n) {
    n = n || 9; const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.72 + rnd() * 0.5; p.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.82]); }
    g.beginPath(); g.moveTo((p[0][0] + p[n - 1][0]) / 2, (p[0][1] + p[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    g.closePath();
  }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
  function stoneShape(g, s, rnd, n) { const p = []; n = n || 6; for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.3, k = 0.78 + rnd() * 0.28; p.push(Math.cos(a) * s * k, Math.sin(a) * s * k * 0.85); } poly(g, p); }

  /* ---------- dekorasi: tiap jenis {r: radius efektif, d: gambar (pusat 0,0; skala s), sh: jejak bayangan} ---------- */
  const SH = 'rgba(2,3,10,0.30)';
  const DEC = {
    forest: {
      leaf: { r: 1.0, sh: function (g, s) { g.beginPath(); g.ellipse(0, 0, s * 1.05, s * 0.5, 0, 0, TAU); }, d: function (g, s, P, rnd) {
        const c = P.deco.leaf; g.fillStyle = c[0]; g.beginPath(); g.moveTo(-s, 0); g.bezierCurveTo(-s * 0.4, -s * 0.62, s * 0.5, -s * 0.55, s, 0); g.bezierCurveTo(s * 0.5, s * 0.55, -s * 0.4, s * 0.62, -s, 0); g.fill();
        g.fillStyle = c[1]; g.beginPath(); g.moveTo(-s, 0); g.bezierCurveTo(-s * 0.4, -s * 0.62, s * 0.5, -s * 0.55, s, 0); g.lineTo(-s, 0); g.fill();
        g.strokeStyle = c[2]; g.lineWidth = Math.max(1.5, s * 0.05); g.beginPath(); g.moveTo(-s * 0.95, 0); g.lineTo(s * 0.95, 0); g.stroke(); } },
      bush: { r: 1.1, sh: function (g, s) { g.beginPath(); g.ellipse(0, s * 0.1, s * 1.15, s * 0.75, 0, 0, TAU); }, d: function (g, s, P) {
        const c = P.deco.leaf; g.fillStyle = c[0]; [[-0.55, 0.05, 0.62], [0.55, 0.12, 0.58], [0, -0.3, 0.7]].forEach(function (b) { g.beginPath(); g.arc(b[0] * s, b[1] * s, b[2] * s, 0, TAU); g.fill(); });
        g.fillStyle = c[1]; [[-0.2, -0.5, 0.34], [0.5, -0.1, 0.24]].forEach(function (b) { g.beginPath(); g.arc(b[0] * s, b[1] * s, b[2] * s, 0, TAU); g.fill(); }); } },
      mushroom: { r: 0.7, sh: function (g, s) { g.beginPath(); g.ellipse(0, s * 0.25, s * 0.8, s * 0.4, 0, 0, TAU); }, d: function (g, s, P) {
        const c = P.deco.cap; g.fillStyle = '#c4bcdc'; g.fillRect(-s * 0.16, -s * 0.05, s * 0.32, s * 0.5);
        g.fillStyle = c[0]; g.beginPath(); g.ellipse(0, -s * 0.05, s * 0.72, s * 0.52, 0, Math.PI, TAU); g.fill();
        g.fillStyle = c[1]; g.beginPath(); g.ellipse(-s * 0.18, -s * 0.28, s * 0.3, s * 0.14, -0.3, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)'; [[-0.35, -0.15], [0.3, -0.2]].forEach(function (p) { g.beginPath(); g.arc(p[0] * s, p[1] * s, s * 0.07, 0, TAU); g.fill(); }); } },
      rock: { r: 0.9, sh: function (g, s) { g.beginPath(); g.ellipse(s * 0.05, s * 0.1, s * 1.0, s * 0.7, 0, 0, TAU); }, d: function (g, s, P, rnd) {
        const c = P.deco.stone; g.fillStyle = c[0]; stoneShape(g, s, rnd, 7); g.fill(); g.fillStyle = c[1]; poly(g, [-s * 0.7, -s * 0.1, -s * 0.2, -s * 0.62, s * 0.4, -s * 0.5, s * 0.1, -s * 0.05]); g.fill(); } },
      statue: { r: 1.0, sh: function (g, s) { g.beginPath(); g.ellipse(s * 0.1, s * 0.5, s * 0.9, s * 0.45, 0, 0, TAU); }, d: function (g, s, P) {
        const c = P.deco.stone; g.fillStyle = c[0]; g.fillRect(-s * 0.55, s * 0.18, s * 1.1, s * 0.34); g.fillStyle = c[1]; g.fillRect(-s * 0.55, s * 0.18, s * 1.1, s * 0.1);
        g.fillStyle = c[0]; poly(g, [-s * 0.38, s * 0.2, -s * 0.28, -s * 0.3, s * 0.28, -s * 0.3, s * 0.38, s * 0.2]); g.fill(); g.fillStyle = c[1]; poly(g, [-s * 0.38, s * 0.2, -s * 0.28, -s * 0.3, 0, -s * 0.3, -s * 0.05, s * 0.2]); g.fill();
        g.fillStyle = c[0]; g.beginPath(); g.arc(0, -s * 0.5, s * 0.26, 0, TAU); g.fill(); poly(g, [-s * 0.22, -s * 0.62, -s * 0.42, -s * 0.95, -s * 0.08, -s * 0.7]); g.fill(); poly(g, [s * 0.22, -s * 0.62, s * 0.42, -s * 0.95, s * 0.08, -s * 0.7]); g.fill();
        g.fillStyle = P.rune; g.fillRect(-s * 0.13, -s * 0.54, s * 0.07, s * 0.06); g.fillRect(s * 0.06, -s * 0.54, s * 0.07, s * 0.06); } },
      grass: { r: 0.5, sh: null, d: function (g, s, P) { g.fillStyle = P.deco.grass; [[-0.35, -0.2], [0, -0.55], [0.35, -0.25]].forEach(function (b) { poly(g, [b[0] * s - s * 0.12, s * 0.3, b[0] * s, b[1] * s, b[0] * s + s * 0.12, s * 0.3]); g.fill(); }); } }
    },
    volcano: {
      rock: { r: 1.0, sh: function (g, s) { g.beginPath(); g.ellipse(s * 0.08, s * 0.12, s * 1.0, s * 0.72, 0, 0, TAU); }, d: function (g, s, P, rnd) {
        const c = P.deco.rock; g.fillStyle = c[0]; stoneShape(g, s, rnd, 7); g.fill(); g.fillStyle = c[1]; poly(g, [-s * 0.7, -s * 0.05, -s * 0.25, -s * 0.62, s * 0.45, -s * 0.5, s * 0.15, 0]); g.fill(); } },
      lava: { r: 1.2, sh: null, d: function (g, s, P, rnd) {      // retakan lava statis berwarna terang: dua lapis garis zig-zag
        const c = P.deco.lava, pts = []; let x = -s, y = 0; for (let i = 0; i < 7; i++) { pts.push([x, y]); x += s * 0.34; y += (rnd() - 0.5) * s * 0.55; }
        g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,2,2,0.7)'; g.lineWidth = s * 0.3; g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke();
        g.strokeStyle = c[0]; g.lineWidth = s * 0.16; g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke();
        g.strokeStyle = c[1]; g.lineWidth = s * 0.06; g.beginPath(); pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke();
        g.fillStyle = c[1]; const b = pts[(rnd() * pts.length) | 0]; g.beginPath(); g.arc(b[0] + s * 0.08, b[1], s * 0.13, 0, TAU); g.fill(); } },
      crystal: { r: 0.8, sh: function (g, s) { g.beginPath(); g.ellipse(s * 0.2, s * 0.15, s * 0.8, s * 0.4, 0, 0, TAU); }, d: function (g, s, P) {
        const c = P.deco.crystal; [[-0.35, 0.1, 0.5], [0.3, 0.12, 0.62], [0, 0.18, 0.85]].forEach(function (k) {
          g.fillStyle = c[0]; poly(g, [k[0] * s - s * 0.2, k[1] * s, k[0] * s, (k[1] - k[2]) * s, k[0] * s + s * 0.2, k[1] * s]); g.fill();
          g.fillStyle = c[1]; poly(g, [k[0] * s - s * 0.2, k[1] * s, k[0] * s, (k[1] - k[2]) * s, k[0] * s - s * 0.02, k[1] * s]); g.fill(); }); } },
      ember: { r: 0.7, sh: null, d: function (g, s, P) {
        const c = P.deco.ember; g.fillStyle = 'rgba(6,2,2,0.7)'; g.beginPath(); g.ellipse(0, 0, s * 0.75, s * 0.5, 0, 0, TAU); g.fill();
        g.fillStyle = c[0]; g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.32, 0, 0, TAU); g.fill(); g.fillStyle = c[1]; g.beginPath(); g.ellipse(-s * 0.05, -s * 0.02, s * 0.24, s * 0.14, 0, 0, TAU); g.fill(); } }
    },
    tower: {
      rune: { r: 1.4, sh: null, d: function (g, s, P) {      // lingkaran rune: dua cincin + 8 tanda + tanda tengah
        g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = P.rune; g.globalAlpha = 0.85; g.beginPath(); g.arc(0, 0, s, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, s * 0.8, 0, TAU); g.stroke();
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8); g.lineTo(Math.cos(a + 0.2) * s * 0.52, Math.sin(a + 0.2) * s * 0.52); g.lineTo(Math.cos(a - 0.2) * s * 0.52, Math.sin(a - 0.2) * s * 0.52); g.closePath(); g.stroke(); }
        g.beginPath(); g.arc(0, 0, s * 0.14, 0, TAU); g.stroke(); g.globalAlpha = 1; } },
      pillar: { r: 0.8, sh: function (g, s) { g.beginPath(); g.ellipse(s * 0.15, s * 0.25, s * 0.8, s * 0.55, 0, 0, TAU); }, d: function (g, s, P) {
        const c = P.deco.stone; g.fillStyle = c[0]; g.beginPath(); g.arc(0, 0, s * 0.62, 0, TAU); g.fill(); g.fillStyle = c[1]; g.beginPath(); g.arc(-s * 0.1, -s * 0.1, s * 0.46, 0, TAU); g.fill();
        g.strokeStyle = c[0]; g.lineWidth = s * 0.07; g.beginPath(); g.arc(-s * 0.1, -s * 0.1, s * 0.26, 0, TAU); g.stroke(); } },
      torch: { r: 0.6, sh: function (g, s) { g.beginPath(); g.ellipse(s * 0.15, s * 0.2, s * 0.5, s * 0.3, 0, 0, TAU); }, d: function (g, s, P) {
        const f = P.deco.flame; g.fillStyle = P.deco.wood; g.beginPath(); g.arc(0, 0, s * 0.3, 0, TAU); g.fill(); g.fillStyle = f[0]; poly(g, [-s * 0.2, s * 0.05, 0, -s * 0.78, s * 0.2, s * 0.05]); g.fill();
        g.fillStyle = f[1]; poly(g, [-s * 0.09, s * 0.05, 0, -s * 0.42, s * 0.09, s * 0.05]); g.fill(); } },
      banner: { r: 0.9, sh: function (g, s) { g.fillRect(-s * 0.3, -s * 0.1, s * 0.75, s * 1.2); }, d: function (g, s, P) {
        const c = P.deco.banner; g.fillStyle = P.deco.wood; g.fillRect(-s * 0.45, -s * 0.12, s * 0.9, s * 0.1); g.fillStyle = c[0]; poly(g, [-s * 0.34, -s * 0.02, s * 0.34, -s * 0.02, s * 0.34, s * 1.0, 0, s * 0.8, -s * 0.34, s * 1.0]); g.fill();
        g.fillStyle = c[1]; g.beginPath(); g.arc(0, s * 0.38, s * 0.14, 0, TAU); g.fill(); } },
      rubble: { r: 0.6, sh: function (g, s) { g.beginPath(); g.ellipse(s * 0.05, s * 0.1, s * 0.9, s * 0.5, 0, 0, TAU); }, d: function (g, s, P, rnd) {
        const c = P.deco.stone; [[-0.4, 0.05, 0.42], [0.35, 0.1, 0.36], [0, -0.28, 0.32]].forEach(function (k, i) { g.fillStyle = c[i % 2]; g.save(); g.translate(k[0] * s, k[1] * s); stoneShape(g, k[2] * s, rnd, 5); g.fill(); g.restore(); }); } }
    }
  };
  /** Komposisi dekorasi per tema: [jenis, bobot, skala min, skala maks (× R)]. */
  const MIX = {
    forest: [['leaf', 5, 1.6, 2.6], ['bush', 3, 1.3, 2.0], ['mushroom', 2, 0.9, 1.4], ['rock', 3, 1.0, 1.8], ['statue', 0.35, 1.5, 1.9], ['grass', 6, 0.9, 1.4]],
    volcano: [['rock', 5, 1.1, 2.2], ['lava', 3, 1.8, 3.0], ['crystal', 2, 1.1, 1.8], ['ember', 2, 0.9, 1.4]],
    tower: [['rune', 0.6, 2.4, 3.6], ['pillar', 1.2, 1.3, 1.9], ['torch', 1.6, 1.0, 1.5], ['banner', 1, 1.3, 1.9], ['rubble', 3, 0.9, 1.5]]
  };

  /* ---------- dasar tanah ---------- */
  function paintGround(g, E, map, rnd, L) {
    const pal = map.pal, th = map.theme;
    g.fillStyle = pal.ground[0]; g.fillRect(E.x0, E.y0, E.w, E.h);
    if (th === 'tower') {      // lantai ubin batu: kisi besar, ubin sesekali sedikit lebih terang/gelap, garis sambungan gelap
      const T = 96, gx0 = Math.floor(E.x0 / T) * T, gy0 = Math.floor(E.y0 / T) * T;
      for (let y = gy0; y < E.y1; y += T) for (let x = gx0; x < E.x1; x += T) { const k = rnd(); if (k < 0.3) { g.fillStyle = pal.ground[1]; g.fillRect(x, y, T, T); } else if (k < 0.45) { g.fillStyle = pal.ground[2]; g.fillRect(x, y, T, T); } }
      g.strokeStyle = 'rgba(4,3,14,0.55)'; g.lineWidth = 3; g.beginPath();
      for (let x = gx0; x < E.x1; x += T) { g.moveTo(x, E.y0); g.lineTo(x, E.y1); } for (let y = gy0; y < E.y1; y += T) { g.moveTo(E.x0, y); g.lineTo(E.x1, y); } g.stroke();
    } else {
      const nb = Math.round(E.w * E.h / 70000) + 6;
      for (let i = 0; i < nb; i++) { g.fillStyle = pal.ground[1 + (i % 2)]; blob(g, E.x0 + rnd() * E.w, E.y0 + rnd() * E.h, 90 + rnd() * 170, rnd, 10); g.fill(); }
    }
    // satu tile bintik kecil (96 px) yang berulang, opasitas rendah
    const t = document.createElement('canvas'); t.width = t.height = 96; const tg = t.getContext('2d'), tr = rng(map.seed + 9); tg.fillStyle = pal.speck;
    for (let i = 0; i < 26; i++) { tg.beginPath(); tg.arc(tr() * 96, tr() * 96, 1 + tr() * 2.4, 0, TAU); tg.fill(); }
    g.fillStyle = g.createPattern(t, 'repeat'); g.fillRect(E.x0, E.y0, E.w, E.h);
  }

  /* ---------- alur: tebal, bibir batu terbagi blok, tepi gelap, dasar lebih gelap, bayangan datar ---------- */
  function paintTrack(g, path, R, pal) {
    const w = 2 * (R + GA.Theme.ball.trackMargin), tk = pal.track, xs = path.xs, ys = path.ys, n = xs.length, st = Math.max(1, Math.round(n / 1400));
    const stroke = function (width, col, dx, dy, dash) {
      g.lineWidth = width; g.strokeStyle = col; g.setLineDash(dash || []); g.beginPath();
      for (let i = 0; i < n; i += st) { const x = xs[i] + (dx || 0), y = ys[i] + (dy || 0); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.lineTo(xs[n - 1] + (dx || 0), ys[n - 1] + (dy || 0)); g.stroke(); g.setLineDash([]);
    };
    g.lineCap = 'round'; g.lineJoin = 'round';
    stroke(w + 26, tk.shadow, 3, 5);              // bayangan jatuh datar
    stroke(w + 22, tk.edge);                       // tepi luar gelap
    stroke(w + 17, tk.rim);                        // bibir batu (bingkai batu tebal)
    g.lineCap = 'butt'; stroke(w + 17, tk.edge, 0, 0, [3, R * 1.6]); g.lineCap = 'round';      // celah antar-blok pada bibir batu
    stroke(w + 5, tk.edge);                        // garis dalam gelap
    stroke(w, tk.fill);                            // jalur
    stroke(w - 12, tk.bed);                        // dasar alur sedikit lebih gelap
  }

  /* ---------- platform naga + dekorasi tidak menimpa ---------- */
  function paintSlab(g, sh, r, pal) {
    g.fillStyle = 'rgba(2,3,10,0.36)'; g.beginPath(); g.arc(sh.x + 3, sh.y + 5, r + 6, 0, TAU); g.fill();
    g.fillStyle = pal.track.edge; g.beginPath(); g.arc(sh.x, sh.y, r + 6, 0, TAU); g.fill();
    g.fillStyle = pal.track.rim; g.beginPath(); g.arc(sh.x, sh.y, r + 3, 0, TAU); g.fill();
    g.strokeStyle = pal.track.edge; g.lineWidth = 2.5; g.setLineDash([2.5, r * 0.55]); g.beginPath(); g.arc(sh.x, sh.y, r + 3, 0, TAU); g.stroke(); g.setLineDash([]);
    g.fillStyle = pal.track.fill; g.beginPath(); g.arc(sh.x, sh.y, r - 3, 0, TAU); g.fill();
    g.strokeStyle = pal.rune; g.globalAlpha = 0.8; g.lineWidth = 2.4; g.beginPath(); g.arc(sh.x, sh.y, r * 0.72, 0, TAU); g.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(sh.x + Math.cos(a) * r * 0.72, sh.y + Math.sin(a) * r * 0.72); g.lineTo(sh.x + Math.cos(a) * r * 0.88, sh.y + Math.sin(a) * r * 0.88); g.stroke(); } g.globalAlpha = 1;
  }

  function pick(mix, rnd) { let t = 0; mix.forEach(function (m) { t += m[1]; }); let k = rnd() * t; for (let i = 0; i < mix.length; i++) { k -= mix[i][1]; if (k <= 0) return mix[i]; } return mix[0]; }

  function scatter(g, E, L, map, field, path, R, sh, slabR, zones, rnd) {
    const th = map.theme, set = DEC[th], mix = MIX[th], items = [];
    let total = Math.round(E.w * E.h / 9000 * map.density);
    const ok = function (x, y, rad) {
      if (x > 0 && x < L.W && y < L.hud + R * 1.5 && y > -1) return false;      // jalur HUD
      if (field.dist(x, y) < R * 2.5 + 12 + rad) return false;                    // margin ≥ 1,5R dari TEPI alur
      if (Math.hypot(x - sh.x, y - sh.y) < slabR + R + rad) return false;
      if (inZones(zones, x, y, rad)) return false;
      if (inBoss(path.boss, R, x, y, rad)) return false;
      for (let i = 0; i < items.length; i++) { const p = items[i]; if (Math.hypot(x - p.x, y - p.y) < (rad + p.r) * 0.85) return false; }
      return true;
    };
    for (let i = 0, tries = 0; i < total && tries < total * 14; tries++) {
      const m = pick(mix, rnd), kind = m[0]; if (map.lavaMore && kind === 'lava' && rnd() < 0.6) { /* lebih banyak lava pada varian magma */ } else if (map.lavaMore && kind === 'rock' && rnd() < 0.3) continue;
      const s = R * (m[2] + rnd() * (m[3] - m[2])), x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h, d = set[kind], rad = s * d.r;
      if (!ok(x, y, rad)) continue;
      items.push({ x: x, y: y, r: rad, s: s, t: kind, rot: (kind === 'leaf' || kind === 'lava' || kind === 'rock' || kind === 'rubble') ? rnd() * TAU : (rnd() - 0.5) * 0.4, seed: (rnd() * 1e9) | 0 }); i++;
    }
    items.sort(function (a, b) { return a.y - b.y; });
    items.forEach(function (it) {
      const d = set[it.t];
      if (d.sh) { g.save(); g.translate(it.x + it.s * 0.14, it.y + it.s * 0.2); g.rotate(it.rot); g.fillStyle = SH; d.sh(g, it.s); g.fill(); g.restore(); }
      g.save(); g.translate(it.x, it.y); g.rotate(it.rot); d.d(g, it.s, map.pal, rng(it.seed)); g.restore();
    });
    return items;
  }

  function artImage(map, L) {
    const url = map.art && (L.portrait ? map.art.portrait : map.art.landscape); if (!url) return null;
    if (!S.art) S.art = {};
    let a = S.art[url]; if (!a) { a = S.art[url] = { img: new Image(), ok: false }; a.img.onload = function () { a.ok = true; FlatMap.invalidate(); if (FlatMap.onArtReady) FlatMap.onArtReady(); }; a.img.onerror = function () { a.bad = true; }; a.img.src = url; }
    return a.ok ? a.img : null;
  }

  /** Bangun lapisan latar di `canvas` (kanvas #bg). path/R boleh null (latar cerita pembuka: tanah + vignette saja). */
  function build(canvas, L, map, path, R) {
    const dprB = Math.min(L.dpr, 1.5), key = [map.id, L.cssW, L.cssH, L.scale.toFixed(3), dprB, path ? path.presetId + ':' + Math.round(path.length) : '-', R, map.seed, map.art && (L.portrait ? map.art.portrait : map.art.landscape) ? 1 : 0].join('|');
    if (S.key === key) return;
    S.key = key; S.map = map; S.items = [];
    canvas.width = Math.max(1, Math.round(L.cssW * dprB)); canvas.height = Math.max(1, Math.round(L.cssH * dprB));
    const g = canvas.getContext('2d'), px = dprB * L.scale; g.setTransform(px, 0, 0, px, dprB * L.ox, dprB * L.oy);
    const E = ext(L), rnd = rng(map.seed), pal = map.pal, art = artImage(map, L);
    if (art) { const sc = Math.max(E.w / art.naturalWidth, E.h / art.naturalHeight); g.fillStyle = pal.ground[2]; g.fillRect(E.x0, E.y0, E.w, E.h); g.drawImage(art, E.x0 + (E.w - art.naturalWidth * sc) / 2, E.y0 + (E.h - art.naturalHeight * sc) / 2, art.naturalWidth * sc, art.naturalHeight * sc); }
    else paintGround(g, E, map, rnd, L);
    if (path) {
      const field = pathField(path), hole = GA.Path.holeXY(path), sh = path.shooter, dr = GA.Theme.dragon.radiusRatio * R, slabR = Math.max(dr * 1.45, R * 2.2), zones = clearZones(path, R, hole);
      paintTrack(g, path, R, pal);
      paintSlab(g, sh, slabR, pal);
      if (!art) S.items = scatter(g, E, L, map, field, path, R, sh, slabR, zones, rng(map.seed + 5));
    }
    const cx = E.x0 + E.w / 2, cy = E.y0 + E.h / 2, rr = Math.hypot(E.w, E.h) / 2, vg = g.createRadialGradient(cx, cy, rr * 0.5, cx, cy, rr);      // vignette statis tipis
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, pal.vignette); g.fillStyle = vg; g.fillRect(E.x0, E.y0, E.w, E.h);
  }

  const FlatMap = {
    build: build, onArtReady: null, reduceMotion: false,
    has: function (id) { return !!(GA.Maps && GA.Maps[id]); },
    decorItems: function () { return S.items; },
    frontCover: function () { return 0; },      // tidak ada objek depan (menutupi alur) pada gaya baru
    invalidate: function () { S.key = ''; }
  };
  GA.FlatMap = FlatMap; GA.Background = FlatMap;
})(window.GA = window.GA || {});
