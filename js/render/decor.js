/* decor.js — pustaka bentuk prosedural untuk dekorasi peta (daun, pakis, batu, jamur, bunga, rumput, patung, kolam, altar).
 * Semua bentuk memakai SATU arah cahaya (kiri-atas), jadi bayangan jatuh ke kanan-bawah dan sisi terang menghadap kiri-atas.
 * Semua fungsi menerima (g, x, y, ukuran, rnd, palet) dan hanya menggambar; penempatannya diurus background.js. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  const LX = 0.55, LY = 0.8;               // arah jatuh bayangan (kanan-bawah)

  function shade(g, x, y, rx, ry, a) {
    g.fillStyle = 'rgba(8,18,10,' + (a == null ? 0.3 : a) + ')';
    g.beginPath(); g.ellipse(x + LX * ry * 1.1, y + LY * ry * 0.8, rx, ry * 0.62, 0.35, 0, TAU); g.fill();
  }

  /** Lintasan blob tidak beraturan (halus) di sekitar (cx,cy). */
  function blob(g, cx, cy, rr, rnd, jit, n) {
    n = n || 12; const pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + (rnd() - 0.5) * 2 * jit; pts.push([cx + Math.cos(a) * rr * k, cy + Math.sin(a) * rr * k]); }
    g.beginPath();
    const mid = function (p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
    let m0 = mid(pts[n - 1], pts[0]); g.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    g.closePath();
  }

  /* ---------- daun besar (gaya monstera) ---------- */
  function leafPath(g, len, w) {
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.2, -w * 1.15, len * 0.72, -w * 1.0, len, 0);
    g.bezierCurveTo(len * 0.72, w * 0.95, len * 0.2, w * 1.15, 0, 0); g.closePath();
  }
  /** col = [terang, dasar, gelap]. */
  function leaf(g, x, y, len, ang, col, shadowOn) {
    const w = len * 0.36;
    if (shadowOn !== false) {
      g.save(); g.translate(x + LX * len * 0.13, y + LY * len * 0.13); g.rotate(ang); leafPath(g, len, w); g.fillStyle = 'rgba(6,20,10,0.28)'; g.fill(); g.restore();
    }
    g.save(); g.translate(x, y); g.rotate(ang);
    const lx = -LX * Math.cos(ang) - LY * Math.sin(ang), ly = LX * Math.sin(ang) - LY * Math.cos(ang);
    const gr = g.createLinearGradient(lx * w, ly * w, -lx * w, -ly * w); gr.addColorStop(0, col[0]); gr.addColorStop(0.5, col[1]); gr.addColorStop(1, col[2]);
    leafPath(g, len, w); g.fillStyle = gr; g.fill();
    g.lineJoin = 'round'; g.lineWidth = Math.max(1, len * 0.02); g.strokeStyle = 'rgba(10,40,20,0.5)'; g.stroke();
    // tulang daun + urat
    g.strokeStyle = 'rgba(255,255,200,0.28)'; g.lineWidth = Math.max(1, len * 0.028); g.beginPath(); g.moveTo(len * 0.02, 0); g.lineTo(len * 0.96, 0); g.stroke();
    g.strokeStyle = 'rgba(10,50,25,0.28)'; g.lineWidth = Math.max(0.8, len * 0.014);
    for (let i = 1; i <= 5; i++) { const t = i / 6, vx = len * t; g.beginPath(); g.moveTo(vx, 0); g.quadraticCurveTo(vx + len * 0.1, -w * 0.45 * (1 - t * 0.4), vx + len * 0.2, -w * 0.85 * (1 - t * 0.5)); g.moveTo(vx, 0); g.quadraticCurveTo(vx + len * 0.1, w * 0.45 * (1 - t * 0.4), vx + len * 0.2, w * 0.85 * (1 - t * 0.5)); g.stroke(); }
    g.restore();
  }

  /** Rumpun daun: `n` daun menyebar dari satu titik. */
  function leafCluster(g, x, y, s, rnd, col, n, spread, base) {
    n = n || 5; spread = spread == null ? 2.2 : spread; base = base == null ? -Math.PI / 2 : base;
    for (let i = 0; i < n; i++) { const a = base + (i / (n - 1 || 1) - 0.5) * spread + (rnd() - 0.5) * 0.25, l = s * (0.75 + rnd() * 0.5); leaf(g, x, y, l, a, col); }
  }

  /* ---------- pakis ---------- */
  function fern(g, x, y, s, rnd, col) {
    const n = 11, fr = [];
    for (let i = 0; i < n; i++) fr.push([-Math.PI + 0.25 + (i / (n - 1)) * (Math.PI - 0.5) + (rnd() - 0.5) * 0.2, s * (0.7 + rnd() * 0.45), (rnd() - 0.5) * s * 0.4]);
    const pass = function (ox, oy, c1, c2) {
      fr.forEach(function (f, k) {
        const a = f[0], L = f[1], bend = f[2], ex = x + ox + Math.cos(a) * L, ey = y + oy + Math.sin(a) * L * 0.8, cx = x + ox + Math.cos(a) * L * 0.5 - Math.sin(a) * bend, cy = y + oy + Math.sin(a) * L * 0.4 + Math.cos(a) * bend;
        g.strokeStyle = c1; g.lineWidth = Math.max(1, s * 0.035); g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
        g.strokeStyle = c2; g.lineWidth = Math.max(1.2, s * 0.05); g.lineCap = 'round';
        for (let j = 2; j <= 9; j++) {
          const t = j / 10, px = (1 - t) * (1 - t) * (x + ox) + 2 * (1 - t) * t * cx + t * t * ex, py = (1 - t) * (1 - t) * (y + oy) + 2 * (1 - t) * t * cy + t * t * ey;
          const tx = 2 * (1 - t) * (cx - x - ox) + 2 * t * (ex - cx), ty = 2 * (1 - t) * (cy - y - oy) + 2 * t * (ey - cy), tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, ll = (1 - t * 0.75) * s * 0.2;
          g.beginPath(); g.moveTo(px - nx * ll, py - ny * ll); g.lineTo(px + nx * ll, py + ny * ll); g.stroke();
        }
      });
    };
    pass(s * 0.18, s * 0.14, 'rgba(6,20,10,0.22)', 'rgba(6,20,10,0.22)');
    pass(0, 0, col[2], col[1]);
    pass(-s * 0.012, -s * 0.02, 'rgba(0,0,0,0)', col[0]);
  }

  /* ---------- batu berlumut ---------- */
  function rock(g, x, y, s, rnd, pal, moss) {
    const n = 8, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.3, k = 0.78 + rnd() * 0.3; pts.push([Math.cos(a) * s * k, Math.sin(a) * s * 0.74 * k]); }
    const path = function (ox, oy) { g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(x + ox + p[0], y + oy + p[1]); else g.moveTo(x + ox + p[0], y + oy + p[1]); }); g.closePath(); };
    g.fillStyle = 'rgba(8,18,10,0.3)'; path(s * LX * 0.45, s * LY * 0.4); g.fill();
    const gr = g.createLinearGradient(x - s, y - s * 0.8, x + s * 0.8, y + s * 0.8); gr.addColorStop(0, pal.stone[0]); gr.addColorStop(0.55, pal.stone[1]); gr.addColorStop(1, pal.stone[2]);
    path(0, 0); g.fillStyle = gr; g.fill(); g.lineJoin = 'round'; g.lineWidth = Math.max(1.2, s * 0.06); g.strokeStyle = 'rgba(30,25,20,0.55)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x + pts[5][0], y + pts[5][1]); g.lineTo(x + pts[6][0], y + pts[6][1]); g.lineTo(x + pts[7][0] * 0.3, y + pts[7][1] * 0.3); g.lineTo(x + pts[0][0] * 0.2, y - s * 0.1); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(20,15,10,0.35)'; g.lineWidth = Math.max(1, s * 0.04); g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.3); g.lineTo(x + s * 0.05, y); g.lineTo(x - s * 0.1, y + s * 0.25); g.stroke();
    if (moss !== false) {
      g.fillStyle = 'rgba(96,150,60,0.8)'; g.beginPath(); g.ellipse(x - s * 0.15, y - s * 0.42, s * 0.55, s * 0.2, -0.15, 0, TAU); g.fill();
      g.fillStyle = 'rgba(150,200,90,0.55)'; g.beginPath(); g.ellipse(x - s * 0.25, y - s * 0.48, s * 0.3, s * 0.1, -0.15, 0, TAU); g.fill();
    }
  }

  /* ---------- jamur, bunga, rumput ---------- */
  function mushroom(g, x, y, s, rnd, cap) {
    shade(g, x, y, s * 0.7, s * 0.35, 0.28);
    g.fillStyle = '#f4ead0'; g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x - s * 0.16, y); g.quadraticCurveTo(x - s * 0.1, y - s * 0.55, x - s * 0.12, y - s * 0.7); g.lineTo(x + s * 0.12, y - s * 0.7); g.quadraticCurveTo(x + s * 0.1, y - s * 0.55, x + s * 0.16, y); g.closePath(); g.fill(); g.stroke();
    const gr = g.createRadialGradient(x - s * 0.2, y - s * 1.0, 1, x, y - s * 0.7, s * 0.75); gr.addColorStop(0, cap[0]); gr.addColorStop(1, cap[1]);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y - s * 0.72, s * 0.62, s * 0.42, 0, Math.PI, 0); g.quadraticCurveTo(x, y - s * 0.62, x - s * 0.62, y - s * 0.72); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,240,0.85)'; [[-0.25, -0.9, 0.09], [0.1, -1.0, 0.07], [0.3, -0.85, 0.08]].forEach(function (d) { g.beginPath(); g.arc(x + d[0] * s, y + d[1] * s, d[2] * s, 0, TAU); g.fill(); });
  }

  function flower(g, x, y, s, col) {
    g.strokeStyle = 'rgba(30,90,40,0.8)'; g.lineWidth = Math.max(1, s * 0.12); g.beginPath(); g.moveTo(x, y); g.lineTo(x - s * 0.1, y - s * 0.7); g.stroke();
    const fx = x - s * 0.1, fy = y - s * 0.75;
    g.fillStyle = col; for (let p = 0; p < 5; p++) { g.beginPath(); g.ellipse(fx + Math.cos(p * 1.2566) * s * 0.3, fy + Math.sin(p * 1.2566) * s * 0.3, s * 0.22, s * 0.15, p * 1.2566, 0, TAU); g.fill(); }
    g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(fx, fy, s * 0.16, 0, TAU); g.fill();
  }

  function grass(g, x, y, s, rnd, c1, c2) {
    const n = 6 + (rnd() * 4 | 0);
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.5 + (rnd() - 0.5) * 0.2, L = s * (0.6 + rnd() * 0.6), b = (rnd() - 0.5) * s * 0.5;
      const ex = x + Math.cos(a) * L + b, ey = y + Math.sin(a) * L;
      g.strokeStyle = i % 2 ? c1 : c2; g.lineWidth = Math.max(1.1, s * 0.09);
      g.beginPath(); g.moveTo(x + (i - n / 2) * s * 0.06, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.6, ex, ey); g.stroke();
    }
  }

  /* ---------- patung naga (totem batu berukir, karya asli) ---------- */
  function statue(g, x, y, s, rnd, pal) {
    const w = s * 0.7, h = s * 1.9;
    // bayangan panjang ke kanan-bawah
    g.fillStyle = 'rgba(8,18,10,0.32)'; g.beginPath(); g.moveTo(x - w * 0.9, y); g.lineTo(x - w * 0.5 + s * 1.3, y + s * 0.65); g.lineTo(x + w * 0.9 + s * 1.3, y + s * 0.55); g.lineTo(x + w * 0.9, y); g.closePath(); g.fill();
    // alas
    const bg = g.createLinearGradient(x - w, y - s * 0.3, x + w, y); bg.addColorStop(0, pal.stone[0]); bg.addColorStop(1, pal.stone[2]);
    g.fillStyle = bg; g.strokeStyle = 'rgba(25,20,15,0.6)'; g.lineWidth = Math.max(1.5, s * 0.05); g.lineJoin = 'round';
    g.beginPath(); g.rect(x - w * 1.05, y - s * 0.32, w * 2.1, s * 0.34); g.fill(); g.stroke();
    // badan
    const body = g.createLinearGradient(x - w, 0, x + w, 0); body.addColorStop(0, pal.stone[0]); body.addColorStop(0.5, pal.stone[1]); body.addColorStop(1, pal.stone[2]);
    g.fillStyle = body; g.beginPath(); g.moveTo(x - w * 0.8, y - s * 0.3); g.lineTo(x - w * 0.8, y - h * 0.78); g.quadraticCurveTo(x - w * 0.8, y - h, x, y - h); g.quadraticCurveTo(x + w * 0.8, y - h, x + w * 0.8, y - h * 0.78); g.lineTo(x + w * 0.8, y - s * 0.3); g.closePath(); g.fill(); g.stroke();
    // tanduk
    g.fillStyle = pal.stone[1]; [-1, 1].forEach(function (d) { g.beginPath(); g.moveTo(x + d * w * 0.5, y - h * 0.93); g.quadraticCurveTo(x + d * w * 1.25, y - h * 1.0, x + d * w * 1.15, y - h * 1.28); g.quadraticCurveTo(x + d * w * 0.8, y - h * 1.05, x + d * w * 0.3, y - h * 0.97); g.closePath(); g.fill(); g.stroke(); });
    // wajah naga: mata menyala, alis, lubang hidung, taring
    const ey = y - h * 0.72;
    [-1, 1].forEach(function (d) {
      const gl = g.createRadialGradient(x + d * w * 0.38, ey, 0, x + d * w * 0.38, ey, s * 0.32); gl.addColorStop(0, 'rgba(255,220,100,0.9)'); gl.addColorStop(1, 'rgba(255,160,40,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x + d * w * 0.38, ey, s * 0.32, 0, TAU); g.fill();
      g.fillStyle = '#ffe27a'; g.beginPath(); g.ellipse(x + d * w * 0.38, ey, s * 0.12, s * 0.07, d * 0.3, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(20,15,10,0.7)'; g.lineWidth = Math.max(1.5, s * 0.06); g.beginPath(); g.moveTo(x + d * w * 0.12, ey - s * 0.16); g.lineTo(x + d * w * 0.65, ey - s * 0.08); g.stroke();
    });
    g.strokeStyle = 'rgba(20,15,10,0.7)'; g.lineWidth = Math.max(1.5, s * 0.05);
    g.beginPath(); g.moveTo(x - w * 0.25, ey + s * 0.35); g.lineTo(x - w * 0.12, ey + s * 0.3); g.moveTo(x + w * 0.25, ey + s * 0.35); g.lineTo(x + w * 0.12, ey + s * 0.3); g.stroke();
    g.fillStyle = '#f2ecd8'; [-1, 1].forEach(function (d) { g.beginPath(); g.moveTo(x + d * w * 0.4, ey + s * 0.62); g.lineTo(x + d * w * 0.3, ey + s * 0.95); g.lineTo(x + d * w * 0.2, ey + s * 0.62); g.closePath(); g.fill(); g.stroke(); });
    g.strokeStyle = 'rgba(20,15,10,0.4)'; g.lineWidth = Math.max(1, s * 0.04); g.beginPath(); g.moveTo(x - w * 0.5, ey + s * 0.62); g.lineTo(x + w * 0.5, ey + s * 0.62); g.stroke();
    // sisi terang & lumut
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x - w * 0.8, y - h * 0.78, w * 0.22, h * 0.7);
    g.fillStyle = 'rgba(96,150,60,0.75)'; g.beginPath(); g.ellipse(x + w * 0.2, y - s * 0.28, w * 0.85, s * 0.14, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(x - w * 0.55, y - h * 0.96, w * 0.35, s * 0.1, 0, 0, TAU); g.fill();
  }

  /* ---------- kolam kecil + altar batu tempat naga berdiri ---------- */
  function pond(g, cx, cy, rr, pal, rnd) {
    const seed = (rnd() * 1e9) | 0, r2 = function () { let a = seed; return function () { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
    g.save();
    // tepi lumpur basah
    blob(g, cx + rr * 0.04, cy + rr * 0.06, rr * 1.16, r2(), 0.06, 14); g.fillStyle = 'rgba(40,28,14,0.5)'; g.fill();
    blob(g, cx, cy, rr * 1.07, r2(), 0.06, 14); g.fillStyle = pal.shore; g.fill();
    // air
    blob(g, cx, cy, rr, r2(), 0.06, 14);
    const wg = g.createRadialGradient(cx - rr * 0.25, cy - rr * 0.3, rr * 0.1, cx, cy, rr * 1.05); wg.addColorStop(0, pal.water[0]); wg.addColorStop(0.55, pal.water[1]); wg.addColorStop(1, pal.water[2]);
    g.fillStyle = wg; g.fill();
    g.clip();
    const dg = g.createLinearGradient(cx - rr, cy - rr, cx + rr, cy + rr); dg.addColorStop(0, 'rgba(255,255,255,0.12)'); dg.addColorStop(0.5, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,30,40,0.38)'); g.fillStyle = dg; g.fillRect(cx - rr * 1.2, cy - rr * 1.2, rr * 2.4, rr * 2.4);
    g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) { const a = rnd() * TAU, d = rr * (0.3 + rnd() * 0.5); g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, rr * 0.18, rr * 0.05, 0, 0, TAU); g.stroke(); }
    g.restore();
    // batu tepi
    g.save();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + rnd() * 0.3; rock(g, cx + Math.cos(a) * rr * 1.04, cy + Math.sin(a) * rr * 1.04, rr * (0.07 + rnd() * 0.06), rnd, pal, i % 3 === 0); }
    g.restore();
  }

  function slab(g, cx, cy, rp, pal, rnd) {
    const thick = rp * 0.14, n = 14, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push([Math.cos(a) * rp * (0.94 + rnd() * 0.1), Math.sin(a) * rp * 0.9 * (0.94 + rnd() * 0.1)]); }
    const path = function (ox, oy) { g.beginPath(); pts.forEach(function (p, i) { const px = cx + ox + p[0], py = cy + oy + p[1]; if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.closePath(); };
    g.fillStyle = 'rgba(0,15,25,0.4)'; path(thick * 0.8, thick * 1.8); g.fill();                // bayangan di air
    for (let k = thick; k >= 0; k -= 1) { path(0, k); g.fillStyle = k > thick * 0.5 ? pal.stone[2] : '#6d675a'; g.fill(); }  // sisi tebal
    g.lineJoin = 'round';
    path(-1.2, -1.8); g.strokeStyle = 'rgba(255,255,235,0.55)'; g.lineWidth = Math.max(2, rp * 0.04); g.stroke();   // tepi terang kiri-atas
    const gr = g.createLinearGradient(cx - rp, cy - rp * 0.9, cx + rp, cy + rp * 0.9); gr.addColorStop(0, pal.stone[0]); gr.addColorStop(0.55, pal.stone[1]); gr.addColorStop(1, '#7e786a');
    path(0, 0); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(30,25,18,0.45)'; g.lineWidth = Math.max(1.4, rp * 0.025); g.stroke();
    g.save(); path(0, 0); g.clip();
    // lingkaran rune terukir
    g.lineCap = 'round';
    [[1, 'rgba(255,255,230,0.35)', 1.2], [0, 'rgba(35,28,20,0.65)', 0]].forEach(function (p) {
      g.strokeStyle = p[1]; g.lineWidth = Math.max(2, rp * 0.05);
      g.beginPath(); g.ellipse(cx + p[0] * 1, cy + p[0] * 1.4, rp * 0.78, rp * 0.7, 0, 0, TAU); g.stroke();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.2; g.beginPath(); g.moveTo(cx + p[0] + Math.cos(a) * rp * 0.66, cy + p[0] * 1.4 + Math.sin(a) * rp * 0.6); g.lineTo(cx + p[0] + Math.cos(a) * rp * 0.58, cy + p[0] * 1.4 + Math.sin(a) * rp * 0.52); g.stroke(); }
    });
    // retakan
    g.strokeStyle = 'rgba(30,25,18,0.4)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - rp * 0.9, cy + rp * 0.2); g.lineTo(cx - rp * 0.55, cy + rp * 0.3); g.lineTo(cx - rp * 0.4, cy + rp * 0.55); g.moveTo(cx + rp * 0.7, cy - rp * 0.5); g.lineTo(cx + rp * 0.55, cy - rp * 0.25); g.stroke();
    g.fillStyle = 'rgba(96,150,60,0.7)'; g.beginPath(); g.ellipse(cx + rp * 0.5, cy + rp * 0.75, rp * 0.5, rp * 0.16, 0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx - rp * 0.7, cy - rp * 0.5, rp * 0.28, rp * 0.1, -0.4, 0, TAU); g.fill();
    g.restore();
  }

  GA.Decor = { shade: shade, blob: blob, leaf: leaf, leafCluster: leafCluster, fern: fern, rock: rock, mushroom: mushroom, flower: flower, grass: grass, statue: statue, pond: pond, slab: slab, LX: LX, LY: LY };
})(window.GA = window.GA || {});
