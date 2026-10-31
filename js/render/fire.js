/* fire.js — bola api naga (revisi 11): INTI bara gelap bercincin oranye-kuning + 2–3 sprite lidah api prarender (bergantian ±12×/dtk) di belakang arah gerak. Tanpa noise/turbulensi,
 * gradien per frame, atau komposit aditif; ekor = ≤ 6 partikel kecil dari pool FX (dibatasi di shooter.js). Ukuran = radius bola rantai (BALL_RADIUS).
 * API: Fire.drawBall(ctx, x, y, r, ammo, px, t, dir) · Fire.drawTrail (no-op). dir = arah gerak (radian) atau null (nyala ke atas). */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2, store = { px: 0, n: 0, map: Object.create(null) };

  function mk(w) { const c = document.createElement('canvas'); c.width = c.height = w; return c; }

  /** Lidah api datar (3 variasi): dua nada (merah-oranye lalu kuning), menjulur ke atas (-y) dari pusat bola. */
  function tongue(qr, px, v) {
    const S = Math.ceil(qr * 4.6 * px), c = mk(S), g = c.getContext('2d'); g.scale(px, px); g.translate(qr * 2.3, qr * 2.3);
    const len = [1.9, 2.15, 1.75][v], wob = [0.12, -0.1, 0.05][v];
    const flame = function (k, col) {
      g.fillStyle = col; g.beginPath(); g.moveTo(-qr * 0.95 * k, qr * 0.1);
      g.bezierCurveTo(-qr * 1.05 * k, -qr * 0.8 * k, -qr * (0.35 + wob) * k, -qr * 1.2 * k, qr * wob * k, -qr * len * k);
      g.bezierCurveTo(qr * (0.4 - wob) * k, -qr * 1.1 * k, qr * 1.05 * k, -qr * 0.7 * k, qr * 0.95 * k, qr * 0.1); g.closePath(); g.fill();
    };
    flame(1, '#e8481c'); flame(0.78, '#ff9a2a'); flame(0.5, '#ffe27a');
    return c;
  }
  function body(qr, px) {
    const pad = 4, S = Math.ceil((qr * 2 + pad * 2) * px), c = mk(S), g = c.getContext('2d'); g.scale(px, px); g.translate(qr + pad, qr + pad);
    g.fillStyle = '#e8481c'; g.beginPath(); g.arc(0, 0, qr, 0, TAU); g.fill();                                  // cincin api
    g.fillStyle = '#ffb02e'; g.beginPath(); g.arc(-qr * 0.05, -qr * 0.08, qr * 0.86, 0, TAU); g.fill();
    g.fillStyle = '#2a0e08'; g.beginPath(); g.arc(0, 0, qr * 0.64, 0, TAU); g.fill();                           // inti bara gelap
    g.strokeStyle = '#ff7a2a'; g.lineWidth = Math.max(1.4, qr * 0.07); g.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.5; g.beginPath(); g.moveTo(Math.cos(a) * qr * 0.5, Math.sin(a) * qr * 0.5); g.lineTo(Math.cos(a + 0.25) * qr * 0.3, Math.sin(a + 0.25) * qr * 0.3); g.stroke(); }
    g.strokeStyle = '#12101f'; g.lineWidth = Math.max(1.5, qr * 0.09); g.beginPath(); g.arc(0, 0, qr - g.lineWidth / 2, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-qr * 0.42, -qr * 0.55, qr * 0.18, qr * 0.09, -0.6, 0, TAU); g.fill();
    return c;
  }
  function get(qr, px) {
    if (store.px !== px || store.n > 12) { store.px = px; store.map = Object.create(null); store.n = 0; }
    return store.map[qr] || (store.n++, store.map[qr] = { body: body(qr, px), t: [tongue(qr, px, 0), tongue(qr, px, 1), tongue(qr, px, 2)] });
  }

  function drawBall(ctx, x, y, r, ammo, px, t, dir) {
    const qr = Math.max(4, Math.round(r / 2) * 2), s = get(qr, px || 1), k = r / qr, v = ((t * 12) | 0) % 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(dir == null ? 0 : dir + Math.PI * 1.5);
    const d = qr * 4.6 * k; ctx.drawImage(s.t[v], -d / 2, -d / 2, d, d);
    ctx.restore();
    const o = (qr + 4) * k; ctx.drawImage(s.body, x - o, y - o, o * 2, o * 2);
  }

  GA.Fire = { drawBall: drawBall, drawTrail: function () { } };
})(window.GA = window.GA || {});
