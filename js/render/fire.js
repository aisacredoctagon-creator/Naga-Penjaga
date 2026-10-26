/* fire.js — bola api naga: inti putih-kuning panas, badan oranye-merah bergolak (turbulensi), lidah api, ekor api, cahaya aditif.
 *
 * Badan api dirender sebagai 8 frame sprite (per radius terkuantisasi) lalu diputar-putar urutannya + diputar menurut arah gerak,
 * jadi per frame hanya drawImage. Plakat gelap kecil di tengah memuat pengali "×N" agar selalu terbaca.
 * Ukuran bola api = BALL_RADIUS (sama dengan bola rantai); lidah api tidak mengubah ukuran dasar bola. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2, FR = 8;
  const store = { px: 0, map: Object.create(null), n: 0 };
  const MULT = { 1: 0.85, 2: 1.0, 3: 1.2 };

  function frame(qr, f, px) {
    const pad = qr * 0.95, S = Math.ceil((qr * 2 + pad * 2) * px), c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), o = qr + pad, r = qr, ph = f / FR * TAU;
    g.scale(px, px); g.translate(o, o);
    // cahaya luar
    const gl = g.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.9); gl.addColorStop(0, 'rgba(255,150,40,0.55)'); gl.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 1.9, 0, TAU); g.fill();
    // lidah api: bentuk kutub dengan turbulensi; lidah panjang mengarah ke atas (-y)
    const lobe = function (scale, alpha, stops) {
      g.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = i / 64 * TAU, up = Math.max(0, Math.sin(-a)), tongue = Math.pow(up, 2.2) * (0.32 + 0.2 * Math.sin(ph * 2 + 1.3)) + Math.pow(Math.max(0, Math.sin(-a + 0.7)), 5) * 0.2 * (0.6 + 0.4 * Math.sin(ph * 3));
        const rr = r * scale * (0.9 + 0.09 * Math.sin(3 * a + ph) + 0.06 * Math.sin(5 * a - ph * 2) + 0.04 * Math.sin(9 * a + ph * 3) + tongue * 0.9);
        if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      const gr = g.createRadialGradient(0, r * 0.1, 0, 0, 0, r * scale * 1.5); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
      g.globalAlpha = alpha; g.fillStyle = gr; g.fill(); g.globalAlpha = 1;
    };
    lobe(1.04, 0.85, [[0, 'rgba(255,120,30,0.95)'], [0.5, 'rgba(230,60,20,0.85)'], [1, 'rgba(160,20,10,0)']]);
    lobe(1.0, 1, [[0, '#fff6c0'], [0.3, '#ffcf55'], [0.62, '#ff8a22'], [0.92, '#d9341a'], [1, 'rgba(160,20,10,0.8)']]);
    lobe(0.7, 0.95, [[0, '#ffffff'], [0.4, '#fff0a0'], [1, 'rgba(255,200,60,0.2)']]);
    // pusaran panas di dalam
    g.strokeStyle = 'rgba(255,255,220,0.55)'; g.lineWidth = Math.max(1.2, r * 0.08); g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const a = ph + k * 2.1; g.beginPath(); g.arc(0, 0, r * (0.42 + k * 0.1), a, a + 1.5); g.stroke(); }
    return c;
  }

  function get(qr, f, px) {
    if (store.px !== px || store.n > 200) { store.px = px; store.map = Object.create(null); store.n = 0; }
    const key = qr + '|' + f;
    return store.map[key] || (store.n++, store.map[key] = { c: frame(qr, f, px), pad: qr * 0.95 });
  }

  function plaque(ctx, x, y, r) {
    const pr = r * 0.6;
    ctx.fillStyle = 'rgba(28,8,4,0.78)'; ctx.beginPath(); ctx.arc(x, y, pr, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(1.4, r * 0.06); ctx.strokeStyle = 'rgba(255,190,90,0.85)'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(x, y, pr * 0.9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  }

  /** Gambar bola api di (x,y). dir = arah gerak (radian) atau null (diam: lidah api ke atas). Pengali ammo.mult mengatur besar nyala. */
  function drawBall(ctx, x, y, r, ammo, px, t, dir) {
    const qr = Math.max(4, Math.round(r / 2) * 2), f = ((t * 14) | 0) % FR, s = get(qr, f, px), k = r / qr, m = MULT[ammo.mult] || 1;
    const d = (qr * 2 + s.pad * 2) * k, o = (qr + s.pad) * k;
    ctx.save(); ctx.translate(x, y); ctx.rotate(dir == null ? 0 : dir + Math.PI * 1.5);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.3 * m; ctx.drawImage(s.c, -o * 1.06, -o * 1.06, d * 1.06, d * 1.06);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(s.c, -o, -o, d, d);
    ctx.restore();
    plaque(ctx, x, y, r);
    GA.Chain.drawLabel(ctx, '×' + ammo.mult, x, y, r * 0.95);
  }

  /** Ekor api + cahaya dinamis untuk peluru yang melesat (additive, memanjang ke belakang). */
  function drawTrail(ctx, x, y, r, dir, t, speedFactor) {
    const bx = Math.cos(dir + Math.PI), by = Math.sin(dir + Math.PI), nx = -by, ny = bx, len = r * 4.2 * (speedFactor || 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // cahaya yang menerangi sekitar
    const gl = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4.4); gl.addColorStop(0, 'rgba(255,150,50,0.34)'); gl.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 4.4, 0, TAU); ctx.fill();
    // tiga lidah ekor yang berkedip
    [[0, 1, 'rgba(255,230,140,0.55)', 0.55], [0.55, 0.78, 'rgba(255,150,50,0.4)', 0.4], [-0.55, 0.72, 'rgba(255,90,30,0.36)', 0.4]].forEach(function (L, i) {
      const l = len * L[1] * (0.85 + 0.15 * Math.sin(t * 40 + i * 2)), w = r * L[3], sw = Math.sin(t * 28 + i * 1.7) * r * 0.25;
      const ex = x + bx * l + nx * (L[0] * r * 0.5 + sw), ey = y + by * l + ny * (L[0] * r * 0.5 + sw);
      const g = ctx.createLinearGradient(x, y, ex, ey); g.addColorStop(0, L[2]); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + nx * w, y + ny * w); ctx.quadraticCurveTo(x + bx * l * 0.5 + nx * w * 0.9, y + by * l * 0.5 + ny * w * 0.9, ex, ey);
      ctx.quadraticCurveTo(x + bx * l * 0.5 - nx * w * 0.9, y + by * l * 0.5 - ny * w * 0.9, x - nx * w, y - ny * w); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  GA.Fire = { drawBall: drawBall, drawTrail: drawTrail };
})(window.GA = window.GA || {});
