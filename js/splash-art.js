/* splash-art.js — splash art ORIGINAL halaman awal, digambar SEKALI lewat Canvas (tanpa loop, tanpa animasi): hutan gelap bercahaya, naga penjaga berdiri melindungi
 * sarang telur, portal ungu + siluet penyihir di kejauhan, daun dan kunang-kunang sebagai hiasan diam. Tanpa karakter/logo gim atau film lain.
 *
 * Dua kegunaan (modul ini TIDAK dimuat untuk pemain biasa selama assets/splash/*.webp ada):
 *   1. Cadangan: bila assets/splash/splash-landscape.webp / splash-portrait.webp tidak ada, ui/start.js memuat modul ini dan memasang hasilnya ke <img> (GA.SplashArt.apply).
 *   2. Pembuat aset: index.html?debug=splash (js/dev/splashgen.js) merender 1920×1080 dan 1080×1920 lalu menyimpannya sebagai .webp. Ganti dengan gambar buatan sendiri
 *      kapan saja: taruh berkas dengan nama yang sama (lihat docs/ASSET_GUIDE.md); modul ini tidak dipakai lagi.
 * Nilai gelap-terang sudah "dibakar": tengah digelapkan dan tepi diberi vinyet supaya papan menu terbaca. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;

  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  function glow(g, x, y, r, c, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.4, rgba(c, a * 0.4)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

  /** Barisan pohon cemara (siluet): tiap pohon tiga tingkat segitiga. */
  function firs(g, W, baseY, hgt, col, rnd, step) {
    g.fillStyle = col; g.beginPath(); g.moveTo(-20, baseY + hgt);
    for (let x = -30; x < W + 40; x += step * (0.7 + rnd() * 0.7)) {
      const h = hgt * (0.55 + rnd() * 0.5), w = h * 0.34;
      g.lineTo(x - w, baseY); g.lineTo(x - w * 0.55, baseY); g.lineTo(x - w * 0.8, baseY - h * 0.33); g.lineTo(x - w * 0.4, baseY - h * 0.33); g.lineTo(x - w * 0.62, baseY - h * 0.62);
      g.lineTo(x - w * 0.22, baseY - h * 0.62); g.lineTo(x, baseY - h);
      g.lineTo(x + w * 0.22, baseY - h * 0.62); g.lineTo(x + w * 0.62, baseY - h * 0.62); g.lineTo(x + w * 0.4, baseY - h * 0.33); g.lineTo(x + w * 0.8, baseY - h * 0.33); g.lineTo(x + w * 0.55, baseY); g.lineTo(x + w, baseY);
    }
    g.lineTo(W + 20, baseY + hgt); g.closePath(); g.fill();
  }

  function leaf(g, x, y, len, ang, col, rim) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.25, -len * 0.3, len * 0.75, -len * 0.28, len, 0); g.bezierCurveTo(len * 0.75, len * 0.28, len * 0.25, len * 0.3, 0, 0); g.closePath();
    g.fillStyle = col; g.fill(); g.strokeStyle = rim; g.lineWidth = Math.max(1.5, len * 0.012); g.stroke();
    g.strokeStyle = rim; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.95, 0); g.stroke();
    for (let i = 1; i < 6; i++) { const k = i / 6; g.beginPath(); g.moveTo(len * k, 0); g.lineTo(len * (k + 0.14), -len * 0.15 * (1 - k * 0.5)); g.moveTo(len * k, 0); g.lineTo(len * (k + 0.14), len * 0.15 * (1 - k * 0.5)); g.stroke(); }
    g.restore();
  }

  /** Naga penjaga berdiri menghadap kanan (siluet bercahaya tepi). Mengembalikan kanvas; titik kaki di (cx, bottom). Tinggi tubuh = H px. */
  function dragon(H) {
    const W = H * 1.9, c = mk(W, H * 1.15), g = c.getContext('2d'), ox = W * 0.55, oy = H * 1.05, u = H;
    const P = function (x, y) { return [ox + x * u, oy + y * u]; };
    const body = g.createLinearGradient(0, oy - u, 0, oy);
    body.addColorStop(0, '#2a8a6c'); body.addColorStop(0.55, '#145a4a'); body.addColorStop(1, '#0a2a28');
    function limb(pts, w0, w1) {      // garis tebal meruncing lewat beberapa titik
      for (let i = 0; i < pts.length - 1; i++) { const a = P(pts[i][0], pts[i][1]), b = P(pts[i + 1][0], pts[i + 1][1]); g.lineWidth = (w0 + (w1 - w0) * i / (pts.length - 1)) * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
    }
    g.fillStyle = body; g.strokeStyle = '#0d2a26';
    // ekor
    limb([[-0.2, -0.36], [-0.36, -0.3], [-0.52, -0.2], [-0.68, -0.1], [-0.84, -0.07], [-0.98, -0.12]], 0.1, 0.012);
    // kaki belakang + depan
    limb([[-0.1, -0.3], [-0.16, -0.14], [-0.14, -0.02]], 0.1, 0.06); limb([[0.12, -0.3], [0.17, -0.14], [0.2, -0.02]], 0.085, 0.05);
    // sayap (di belakang tubuh): tulang lengan + selaput bergerigi
    const sh = P(0.0, -0.55), wr = P(-0.22, -1.0), t1 = P(-0.66, -0.88), t2 = P(-0.62, -0.62), t3 = P(-0.44, -0.46), t4 = P(-0.2, -0.43);
    g.fillStyle = 'rgba(52,44,112,0.97)'; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(wr[0], wr[1]); g.lineTo(t1[0], t1[1]);
    g.quadraticCurveTo(P(-0.6, -0.76)[0], P(-0.6, -0.76)[1], t2[0], t2[1]); g.quadraticCurveTo(P(-0.56, -0.54)[0], P(-0.56, -0.54)[1], t3[0], t3[1]); g.quadraticCurveTo(P(-0.32, -0.48)[0], P(-0.32, -0.48)[1], t4[0], t4[1]); g.lineTo(P(-0.04, -0.44)[0], P(-0.04, -0.44)[1]); g.closePath(); g.fill();
    g.strokeStyle = '#1c1a48'; g.lineWidth = 0.022 * u; [t1, t2, t3, t4].forEach(function (t) { g.beginPath(); g.moveTo(wr[0], wr[1]); g.lineTo(t[0], t[1]); g.stroke(); });
    g.lineWidth = 0.03 * u; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(wr[0], wr[1]); g.stroke();
    // badan, leher, kepala
    g.fillStyle = body; g.beginPath(); g.ellipse(...P(0, -0.4), 0.27 * u, 0.17 * u, -0.22, 0, TAU); g.fill();
    g.strokeStyle = body; limb([[0.14, -0.5], [0.2, -0.62], [0.27, -0.74], [0.34, -0.83]], 0.13, 0.075);
    g.beginPath(); g.ellipse(...P(0.4, -0.86), 0.1 * u, 0.058 * u, -0.18, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(...P(0.46, -0.9)); g.quadraticCurveTo(...P(0.58, -0.88), ...P(0.6, -0.83)); g.quadraticCurveTo(...P(0.52, -0.8), ...P(0.45, -0.82)); g.closePath(); g.fill();
    // tanduk dan duri punggung
    g.fillStyle = '#0a1f1c'; [[0.34, -0.9, 0.22, -1.0], [0.38, -0.92, 0.3, -1.05]].forEach(function (h) { g.beginPath(); g.moveTo(...P(h[0], h[1])); g.quadraticCurveTo(...P(h[0] - 0.02, h[1] - 0.06), ...P(h[2], h[3])); g.lineTo(...P(h[0] - 0.05, h[1] + 0.01)); g.closePath(); g.fill(); });
    for (let i = 0; i < 8; i++) { const k = i / 7, x = 0.13 - k * 0.56, y = -0.56 - 0.0 + k * 0.2 + Math.sin(k * 3) * 0.02; g.beginPath(); g.moveTo(...P(x - 0.025, y)); g.lineTo(...P(x - 0.01, y - 0.055 * (1 - k * 0.5))); g.lineTo(...P(x + 0.025, y + 0.005)); g.closePath(); g.fill(); }
    // cahaya tepi (bulan di kiri-atas) dan pantulan hangat dari telur (bawah) — hanya di dalam siluet
    g.globalCompositeOperation = 'source-atop';
    const rim = g.createLinearGradient(ox - u * 0.6, oy - u * 1.1, ox + u * 0.2, oy - u * 0.2); rim.addColorStop(0, 'rgba(170,255,230,0.8)'); rim.addColorStop(0.5, 'rgba(90,200,170,0.28)'); rim.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rim; g.fillRect(0, 0, c.width, c.height);
    const warm = g.createRadialGradient(ox + u * 0.45, oy, 0, ox + u * 0.45, oy, u * 0.75); warm.addColorStop(0, 'rgba(255,205,120,0.85)'); warm.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = warm; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    // mata menyala
    glow(g, ...P(0.43, -0.875), 0.05 * u, [255, 200, 90], 0.9); g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(...P(0.43, -0.875), 0.011 * u, 0.007 * u, -0.3, 0, TAU); g.fill();
    return { c: c, ox: ox, oy: oy };
  }

  /** Penyihir (siluet) berdiri, tongkat dengan bola ungu. Titik kaki di (ox, oy) kanvas. */
  function wizard(H) {
    const W = H * 0.9, c = mk(W, H * 1.1), g = c.getContext('2d'), ox = W * 0.45, oy = H * 1.05, u = H;
    const P = function (x, y) { return [ox + x * u, oy + y * u]; };
    g.fillStyle = '#080512'; g.strokeStyle = '#080512';
    g.beginPath(); g.moveTo(...P(-0.16, 0)); g.quadraticCurveTo(...P(-0.14, -0.5), ...P(-0.05, -0.74)); g.lineTo(...P(0.05, -0.74)); g.quadraticCurveTo(...P(0.14, -0.5), ...P(0.17, 0)); g.closePath(); g.fill();      // jubah
    g.beginPath(); g.arc(...P(0, -0.8), 0.052 * u, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(...P(-0.09, -0.83)); g.quadraticCurveTo(...P(-0.03, -0.9), ...P(0.07, -1.06)); g.quadraticCurveTo(...P(0.06, -0.9), ...P(0.1, -0.83)); g.closePath(); g.fill();      // topi runcing
    g.beginPath(); g.ellipse(...P(0.0, -0.83), 0.11 * u, 0.018 * u, 0, 0, TAU); g.fill();
    g.lineWidth = 0.018 * u; g.lineCap = 'round'; g.beginPath(); g.moveTo(...P(0.2, 0)); g.lineTo(...P(0.2, -1.0)); g.stroke();      // tongkat
    g.lineWidth = 0.03 * u; g.beginPath(); g.moveTo(...P(0.1, -0.55)); g.lineTo(...P(0.19, -0.62)); g.stroke();
    glow(g, ...P(0.2, -1.04), 0.2 * u, [200, 140, 255], 0.95); g.fillStyle = '#f0e0ff'; g.beginPath(); g.arc(...P(0.2, -1.04), 0.03 * u, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-atop'; const rim = g.createLinearGradient(ox + u * 0.4, 0, ox - u * 0.2, 0); rim.addColorStop(0, 'rgba(200,140,255,0.5)'); rim.addColorStop(1, 'rgba(200,140,255,0)'); g.fillStyle = rim; g.fillRect(0, 0, W, c.height); g.globalCompositeOperation = 'source-over';
    return { c: c, ox: ox, oy: oy };
  }

  function egg(g, x, y, r, c1, c2) {
    glow(g, x, y, r * 4.2, c1, 0.5);
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.5, r * 0.1, x, y, r * 1.5); gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.4, rgba(c1, 1)); gr.addColorStop(1, rgba(c2, 1));
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, y - r * 1.35); g.bezierCurveTo(x + r * 1.0, y - r * 0.9, x + r * 1.05, y + r * 0.95, x, y + r * 1.0); g.bezierCurveTo(x - r * 1.05, y + r * 0.95, x - r * 1.0, y - r * 0.9, x, y - r * 1.35); g.fill();
    g.strokeStyle = 'rgba(80,40,10,0.45)'; g.lineWidth = Math.max(1, r * 0.06); g.stroke();
  }

  /** Render splash (w × h px). Mengembalikan <canvas>. */
  function render(w, h) {
    const c = mk(w, h), g = c.getContext('2d'), P = h > w, S = (P ? w : h) / 1080, rnd = rng(P ? 9217 : 4093);
    const floorY = h * (P ? 0.86 : 0.83);
    // langit malam hutan
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0a0820'); sky.addColorStop(0.45, '#1a1445'); sky.addColorStop(0.78, '#12293c'); sky.addColorStop(1, '#07120f');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const moonX = P ? w * 0.2 : w * 0.16, moonY = P ? h * 0.1 : h * 0.15;
    glow(g, moonX, moonY, h * 0.45, [150, 210, 255], 0.38); g.fillStyle = '#e8f6ff'; g.beginPath(); g.arc(moonX, moonY, 46 * S, 0, TAU); g.fill();
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(220,230,255,' + (0.25 + rnd() * 0.5).toFixed(2) + ')'; g.fillRect(rnd() * w, rnd() * h * 0.45, 1.6 * S, 1.6 * S); }
    // portal ungu + penyihir di kejauhan
    const pr = (P ? w * 0.26 : h * 0.19), px = P ? w * 0.72 : w * 0.8, py = P ? h * 0.17 : h * 0.4;
    glow(g, px, py, pr * 3.2, [150, 80, 255], 0.5);
    firs(g, w, floorY - h * 0.3, h * 0.2, '#0f1738', rnd, 70 * S);      // hutan jauh
    for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(' + (190 - i * 15) + ',' + (140 - i * 12) + ',255,' + (0.55 - i * 0.07).toFixed(2) + ')'; g.lineWidth = (10 - i) * S; g.beginPath(); g.ellipse(px, py, pr * (1 - i * 0.12), pr * (1 - i * 0.12) * 1.18, 0.2, 0, TAU); g.stroke(); }
    g.strokeStyle = 'rgba(235,210,255,0.55)'; g.lineWidth = 3 * S;
    for (let k = 0; k < 3; k++) { g.beginPath(); for (let a = 0; a < 9; a += 0.1) { const r = pr * 0.08 + a * pr * 0.085, an = a + k * 2.09; const x = px + Math.cos(an) * r, y = py + Math.sin(an) * r * 1.18; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    glow(g, px, py, pr * 0.9, [255, 245, 255], 0.9);
    g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { const a = rnd() * TAU, r = pr * (1.1 + rnd() * 0.9); g.fillStyle = 'rgba(210,170,255,' + (0.3 + rnd() * 0.5).toFixed(2) + ')'; g.beginPath(); g.arc(px + Math.cos(a) * r, py + Math.sin(a) * r * 1.2, (1.5 + rnd() * 3) * S, 0, TAU); g.fill(); } g.globalCompositeOperation = 'source-over';
    firs(g, w, floorY - h * 0.17, h * 0.26, '#0a1229', rnd, 90 * S);      // hutan tengah
    g.fillStyle = 'rgba(120,170,210,0.09)'; g.fillRect(0, floorY - h * 0.24, w, h * 0.12);      // kabut
    const wz = wizard(h * (P ? 0.1 : 0.2)), wx = P ? w * 0.66 : w * 0.76, wy = P ? h * 0.3 : h * 0.62;
    g.fillStyle = '#0a0f26'; g.beginPath(); g.ellipse(wx, wy + 4 * S, 110 * S, 26 * S, 0, 0, TAU); g.fill();      // batu tempat berdiri
    g.shadowColor = 'rgba(190,130,255,0.7)'; g.shadowBlur = 24 * S; g.drawImage(wz.c, wx - wz.ox, wy - wz.oy); g.shadowBlur = 0; g.shadowColor = 'transparent';
    firs(g, w, floorY - h * 0.05, h * 0.3, '#060d1c', rnd, 120 * S);      // pohon dekat
    // berkas cahaya bulan
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { const x0 = w * (0.1 + i * 0.12) + (P ? 0 : w * 0.02); const gr = g.createLinearGradient(x0, 0, x0 + w * 0.2, h * 0.8); gr.addColorStop(0, 'rgba(150,200,255,0.085)'); gr.addColorStop(1, 'rgba(150,200,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + w * 0.05, 0); g.lineTo(x0 + w * 0.3, h * 0.85); g.lineTo(x0 + w * 0.12, h * 0.85); g.closePath(); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    // tanah
    const gnd = g.createLinearGradient(0, floorY - 30 * S, 0, h); gnd.addColorStop(0, '#0c2a22'); gnd.addColorStop(0.35, '#08191a'); gnd.addColorStop(1, '#040a0c');
    g.fillStyle = gnd; g.beginPath(); g.moveTo(0, h); g.lineTo(0, floorY + 20 * S); g.quadraticCurveTo(w * 0.25, floorY - 24 * S, w * 0.5, floorY + 6 * S); g.quadraticCurveTo(w * 0.78, floorY + 30 * S, w, floorY - 6 * S); g.lineTo(w, h); g.closePath(); g.fill();
    // naga + sarang
    const dh = h * (P ? 0.3 : 0.5), dx = P ? w * 0.32 : w * 0.24, dy = P ? h * 0.92 : h * 0.9, nx = P ? w * 0.7 : w * 0.38, ny = P ? h * 0.94 : h * 0.92, nr = (P ? w : h) * 0.11;
    glow(g, nx, ny - nr * 0.2, nr * 3.4, [255, 190, 90], 0.42);
    g.fillStyle = '#3a2410'; g.beginPath(); g.ellipse(nx, ny, nr * 1.25, nr * 0.38, 0, 0, TAU); g.fill();
    for (let i = 0; i < 90; i++) { const a = rnd() * TAU, rr = 1 + rnd() * 0.18; g.strokeStyle = rnd() < 0.5 ? '#8a6428' : '#5a3c16'; g.lineWidth = (2 + rnd() * 2) * S; g.beginPath(); g.moveTo(nx + Math.cos(a) * nr * 1.0 * rr, ny + Math.sin(a) * nr * 0.3 * rr); g.lineTo(nx + Math.cos(a + 0.3) * nr * 1.3, ny + Math.sin(a + 0.3) * nr * 0.38 + (rnd() - 0.5) * 6 * S); g.stroke(); }
    egg(g, nx - nr * 0.45, ny - nr * 0.2, nr * 0.34, [255, 220, 130], [226, 150, 50]); egg(g, nx + nr * 0.5, ny - nr * 0.18, nr * 0.32, [255, 190, 220], [210, 90, 150]); egg(g, nx + 0.02 * nr, ny - nr * 0.5, nr * 0.34, [170, 240, 255], [50, 150, 200]);
    const dr = dragon(dh); g.shadowColor = 'rgba(70,255,200,0.35)'; g.shadowBlur = 26 * S; g.drawImage(dr.c, dx - dr.ox, dy - dr.oy); g.shadowBlur = 0; g.shadowColor = 'transparent';
    // rumput dan dedaunan depan
    g.fillStyle = '#04100d'; for (let i = 0; i < 160; i++) { const x = rnd() * w, hh = (14 + rnd() * 34) * S, y = floorY + 4 * S + rnd() * (h - floorY); g.beginPath(); g.moveTo(x - 3 * S, y); g.lineTo(x + (rnd() - 0.5) * 10 * S, y - hh); g.lineTo(x + 3 * S, y); g.closePath(); g.fill(); }
    const lcol = '#06150f', lrim = 'rgba(80,200,140,0.45)', L = (P ? w : h) * 0.42;
    leaf(g, -L * 0.05, h * 1.02, L, -0.9, lcol, lrim); leaf(g, w * 0.02, h * 1.04, L * 0.8, -0.2, lcol, lrim); leaf(g, w * 1.03, h * 1.0, L, Math.PI + 0.85, lcol, lrim); leaf(g, w * 0.98, h * 1.05, L * 0.75, Math.PI + 0.1, lcol, lrim);
    leaf(g, -L * 0.1, -h * 0.02, L * 0.8, 0.8, lcol, lrim); leaf(g, w * 1.05, -h * 0.03, L * 0.9, Math.PI - 0.8, lcol, lrim);
    // kunang-kunang
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < (P ? 50 : 70); i++) { const x = rnd() * w, y = h * (0.25 + rnd() * 0.7), r = (7 + rnd() * 16) * S; glow(g, x, y, r, rnd() < 0.7 ? [220, 255, 140] : [150, 255, 220], 0.55 + rnd() * 0.4); g.fillStyle = 'rgba(255,255,220,0.95)'; g.beginPath(); g.arc(x, y, 1.6 * S, 0, TAU); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    // gelap-terang "dibakar": tengah digelapkan (papan menu terbaca), tepi diberi vinyet
    const cx = w / 2, cy = h * 0.5, mid = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.55); mid.addColorStop(0, 'rgba(5,3,16,0.36)'); mid.addColorStop(0.6, 'rgba(5,3,16,0.14)'); mid.addColorStop(1, 'rgba(5,3,16,0)');
    g.fillStyle = mid; g.fillRect(0, 0, w, h);
    const vg = g.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.hypot(w, h) * 0.55); vg.addColorStop(0, 'rgba(2,1,8,0)'); vg.addColorStop(1, 'rgba(2,1,8,0.7)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    return c;
  }

  const SplashArt = {
    render: render,
    toBlob: function (w, h, type, q) { const c = render(w, h); return new Promise(function (res) { c.toBlob(res, type || 'image/webp', q || 0.8); }); },
    /** Cadangan: gambar sekali (tanpa loop) dan pasang ke <img>. Dirender ulang hanya bila orientasi layar berubah. */
    apply: function (img) {
      const pic = img.parentNode; if (pic && pic.querySelectorAll) [].forEach.call(pic.querySelectorAll('source'), function (s) { s.parentNode.removeChild(s); });
      let cur = null, url = null, timer = 0;
      const paint = function () {
        const P = window.innerHeight > window.innerWidth; if (P === cur) return; cur = P;
        const c = render(P ? 720 : 1280, P ? 1280 : 720);
        c.toBlob(function (b) { if (!b) return; const old = url; url = URL.createObjectURL(b); img.src = url; if (old) URL.revokeObjectURL(old); }, 'image/jpeg', 0.82);
      };
      paint(); window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(paint, 250); });
    }
  };
  GA.SplashArt = SplashArt;
})(window.GA = window.GA || {});
