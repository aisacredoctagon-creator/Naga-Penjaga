/* decor3.js — dekorasi RAWA: kolam kecil bertabur daun teratai (dengan bunga), rumpun alang-alang berbulu cokelat, kayu apung.
 * Arah cahaya sama dengan decor.js (terang kiri-atas, bayangan kanan-bawah). Warna dari palet peta: pal.water, pal.leaf, pal.flowers. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2, LX = 0.55, LY = 0.8;

  function lily(g, x, y, s, rnd, pal) {
    // genangan air dengan kilau tepi
    const w = pal.water || ['#97e4d8', '#2f9aa2', '#14586a'], rx = s * (1.7 + rnd() * 0.5), ry = rx * (0.62 + rnd() * 0.15);
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,10,8,0.3)'; g.beginPath(); g.ellipse(rx * 0.06, ry * 0.12, rx * 1.04, ry * 1.04, 0, 0, TAU); g.fill();
    const wg = g.createRadialGradient(-rx * 0.3, -ry * 0.35, rx * 0.1, 0, 0, rx); wg.addColorStop(0, w[0]); wg.addColorStop(0.55, w[1]); wg.addColorStop(1, w[2]);
    g.fillStyle = wg; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.lineWidth = Math.max(1.5, s * 0.08); g.strokeStyle = 'rgba(10,40,30,0.6)'; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, s * 0.06); g.beginPath(); g.ellipse(0, 0, rx * 0.92, ry * 0.92, 0, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
    // daun teratai: lingkaran bercelah, urat radial
    const n = 3 + ((rnd() * 3) | 0), lv = pal.leaf || [['#a6e670', '#52b04a', '#1f6a3a']];
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = rnd() * rx * 0.55, px = Math.cos(a) * d, py = Math.sin(a) * d * 0.62, r = s * (0.42 + rnd() * 0.3), nt = rnd() * TAU, c = lv[(rnd() * lv.length) | 0];
      g.save(); g.translate(px, py); g.scale(1, 0.78);
      g.fillStyle = 'rgba(0,15,10,0.35)'; g.beginPath(); g.arc(r * 0.12, r * 0.18, r, 0, TAU); g.fill();
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r); gr.addColorStop(0, c[0]); gr.addColorStop(0.6, c[1]); gr.addColorStop(1, c[2]);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, nt + 0.22, nt + TAU - 0.22); g.closePath(); g.fill(); g.lineWidth = Math.max(1, r * 0.08); g.strokeStyle = 'rgba(10,50,25,0.7)'; g.stroke();
      g.strokeStyle = 'rgba(255,255,220,0.3)'; g.lineWidth = Math.max(0.8, r * 0.04); for (let k = 0; k < 6; k++) { const aa = nt + 0.5 + k * 0.95; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(aa) * r * 0.86, Math.sin(aa) * r * 0.86); g.stroke(); }
      if (i === 0 && rnd() < 0.7) {      // bunga teratai
        const fc = (pal.flowers || ['#ffd6ea'])[(rnd() * (pal.flowers || [1]).length) | 0];
        for (let p = 0; p < 7; p++) { const pa = p / 7 * TAU; g.fillStyle = fc; g.strokeStyle = 'rgba(120,40,70,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(Math.cos(pa) * r * 0.26, Math.sin(pa) * r * 0.26, r * 0.2, r * 0.09, pa, 0, TAU); g.fill(); g.stroke(); }
        g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(0, 0, r * 0.11, 0, TAU); g.fill();
      }
      g.restore();
    }
    g.restore();
  }

  function reed(g, x, y, s, rnd, pal) {
    const lv = pal.leaf || [['#a6e670', '#52b04a', '#1f6a3a']], n = 6 + ((rnd() * 4) | 0);
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,12,8,0.3)'; g.beginPath(); g.ellipse(s * 0.25, s * 0.08, s * 0.7, s * 0.2, 0, 0, TAU); g.fill();
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const bx = (i - (n - 1) / 2) * s * 0.11 + (rnd() - 0.5) * s * 0.08, h = s * (1.0 + rnd() * 0.9), lean = (rnd() - 0.5) * s * 0.7, c = lv[i % lv.length];
      const cx = bx + lean * 0.4, cy = -h * 0.55, tx = bx + lean, ty = -h;
      g.strokeStyle = 'rgba(10,40,20,0.8)'; g.lineWidth = Math.max(1.6, s * 0.1); g.beginPath(); g.moveTo(bx, 0); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
      g.strokeStyle = c[(i % 3)]; g.lineWidth = Math.max(1, s * 0.06); g.beginPath(); g.moveTo(bx, 0); g.quadraticCurveTo(cx, cy, tx, ty); g.stroke();
      if (i % 3 === 1) {                // bulu cokelat (cattail)
        g.fillStyle = '#7a4a22'; g.strokeStyle = '#3a200a'; g.lineWidth = 1; g.beginPath(); g.ellipse(tx, ty - s * 0.12, s * 0.07, s * 0.2, Math.atan2(ty - cy, tx - cx) + Math.PI / 2 - Math.PI / 2, 0, TAU); g.fill(); g.stroke();
      }
    }
    g.restore();
  }

  function log(g, x, y, s, rnd, pal) {   // kayu apung berlumut
    g.save(); g.translate(x, y); g.rotate((rnd() - 0.5) * 0.8);
    g.fillStyle = 'rgba(0,10,6,0.3)'; g.beginPath(); g.ellipse(s * 0.1, s * 0.22, s * 1.2, s * 0.3, 0, 0, TAU); g.fill();
    const gr = g.createLinearGradient(0, -s * 0.3, 0, s * 0.3); gr.addColorStop(0, '#9a7a4a'); gr.addColorStop(0.6, '#5a3c1c'); gr.addColorStop(1, '#2a1808');
    g.fillStyle = gr; g.strokeStyle = 'rgba(20,10,4,0.8)'; g.lineWidth = Math.max(1.5, s * 0.07);
    g.beginPath(); g.moveTo(-s, -s * 0.15); g.lineTo(s * 0.95, -s * 0.2); g.quadraticCurveTo(s * 1.1, 0, s * 0.95, s * 0.22); g.lineTo(-s, s * 0.18); g.quadraticCurveTo(-s * 1.1, 0, -s, -s * 0.15); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(80,170,70,0.75)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-s * 0.6 + i * s * 0.4 + rnd() * s * 0.1, -s * 0.14, s * 0.18, s * 0.07, 0, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(30,15,6,0.5)'; g.lineWidth = 1; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-s * 0.9 + i * s * 0.45, -s * 0.05); g.lineTo(-s * 0.6 + i * s * 0.45, s * 0.12); g.stroke(); }
    g.beginPath(); g.ellipse(s * 0.95, 0, s * 0.1, s * 0.2, 0, 0, TAU); g.fillStyle = '#c9a06a'; g.fill(); g.stroke();
    g.restore();
  }

  GA.Decor3 = { lily: lily, reed: reed, log: log };
})(window.GA = window.GA || {});
