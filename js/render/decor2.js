/* decor2.js — dekorasi tambahan untuk peta gunung api, gua kristal, dan menara penyihir (kristal, stalagmit, tulang naga purba, obor,
 * pilar, lubang uap lava, anglo, jamur bercahaya) serta penutup depan (stalaktit, spanduk, jembatan batu).
 * Arah cahaya sama dengan decor.js: sisi terang kiri-atas, bayangan jatuh ke kanan-bawah. Fungsi yang bercahaya mengembalikan
 * { x, y, r, col } untuk didaftarkan sebagai sumber cahaya dinamis (effects.js). */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2, LX = 0.55, LY = 0.8, D = GA.Decor;

  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }

  function crystal(g, x, y, s, rnd, col) {
    const n = 3 + ((rnd() * 3) | 0), pr = [];
    for (let i = 0; i < n; i++) pr.push({ dx: (i - (n - 1) / 2) * s * 0.34 + (rnd() - 0.5) * s * 0.15, h: s * (0.8 + rnd() * 1.0) * (1 - Math.abs(i - (n - 1) / 2) * 0.18), w: s * (0.2 + rnd() * 0.1), tilt: (rnd() - 0.5) * 0.18 });
    pr.sort(function (a, b) { return a.h - b.h; });
    pr.forEach(function (p) {            // bayangan
      g.fillStyle = 'rgba(4,6,24,0.3)'; g.beginPath(); g.moveTo(x + p.dx - p.w, y); g.lineTo(x + p.dx + p.w, y); g.lineTo(x + p.dx + p.w + p.h * LX * 0.9, y + p.h * LY * 0.55); g.lineTo(x + p.dx + p.h * LX * 0.9, y + p.h * LY * 0.55 + p.w * 0.4); g.closePath(); g.fill();
    });
    pr.forEach(function (p) {
      const bx = x + p.dx, tx = bx + p.tilt * p.h, ty = y - p.h, apex = ty - p.w * 0.9;
      const L = g.createLinearGradient(bx - p.w, 0, bx, 0); L.addColorStop(0, col[0]); L.addColorStop(1, col[1]);
      g.fillStyle = L; g.beginPath(); g.moveTo(bx - p.w, y); g.lineTo(tx - p.w * 0.8, ty); g.lineTo(tx, apex); g.lineTo(tx, y + p.w * 0.25); g.closePath(); g.fill();
      const Rr = g.createLinearGradient(bx, 0, bx + p.w, 0); Rr.addColorStop(0, col[1]); Rr.addColorStop(1, col[2]);
      g.fillStyle = Rr; g.beginPath(); g.moveTo(tx, y + p.w * 0.25); g.lineTo(tx, apex); g.lineTo(tx + p.w * 0.8, ty); g.lineTo(bx + p.w, y); g.closePath(); g.fill();
      g.lineJoin = 'round'; g.lineWidth = Math.max(1, s * 0.035); g.strokeStyle = 'rgba(10,10,50,0.55)'; g.beginPath(); g.moveTo(bx - p.w, y); g.lineTo(tx - p.w * 0.8, ty); g.lineTo(tx, apex); g.lineTo(tx + p.w * 0.8, ty); g.lineTo(bx + p.w, y); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(tx - p.w * 0.5, ty + p.h * 0.1); g.lineTo(tx - p.w * 0.45, y - p.h * 0.45); g.stroke();   // kilau tepi
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(tx - p.w * 0.8, ty); g.lineTo(tx, apex); g.lineTo(tx + p.w * 0.1, ty - p.w * 0.1); g.closePath(); g.fill();
    });
    return { x: x, y: y - s * 0.7, r: s * 2.2, col: hexRgb(col[1]) };
  }

  function stalag(g, x, y, s, rnd, pal) {
    const w = s * 0.6, h = s * (1.3 + rnd() * 0.7);
    g.fillStyle = 'rgba(6,6,20,0.32)'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + w, y); g.lineTo(x + h * LX * 0.85 + w * 0.2, y + h * LY * 0.5); g.closePath(); g.fill();
    const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, pal.stone[0]); gr.addColorStop(0.5, pal.stone[1]); gr.addColorStop(1, pal.stone[2]);
    g.fillStyle = gr; g.strokeStyle = 'rgba(20,16,30,0.6)'; g.lineWidth = Math.max(1.2, s * 0.05); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.5, y - h * 0.5, x + s * 0.05, y - h); g.quadraticCurveTo(x + w * 0.5, y - h * 0.5, x + w, y); g.quadraticCurveTo(x, y + w * 0.35, x - w, y); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = Math.max(1, s * 0.04); for (let k = 1; k < 4; k++) { const yy = y - h * k / 4, ww = w * (1 - k / 4) * 0.8; g.beginPath(); g.moveTo(x - ww, yy); g.quadraticCurveTo(x, yy + ww * 0.3, x + ww, yy); g.stroke(); }
  }

  function bones(g, x, y, s, rnd) {
    const ivory = '#eadfc4', sh = '#b7a88a';
    g.save(); g.translate(x, y); g.rotate((rnd() - 0.5) * 0.6); g.lineCap = 'round';
    g.strokeStyle = 'rgba(8,10,20,0.3)'; g.lineWidth = s * 0.16; g.beginPath(); g.moveTo(s * 0.12, s * 0.12); g.lineTo(s * 1.52, s * 0.12); g.stroke();   // bayangan tulang punggung
    g.strokeStyle = sh; g.lineWidth = s * 0.15; g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 1.4, 0); g.stroke(); g.strokeStyle = ivory; g.lineWidth = s * 0.1; g.beginPath(); g.moveTo(0, -s * 0.01); g.lineTo(s * 1.4, -s * 0.01); g.stroke();
    for (let i = 0; i < 6; i++) for (const sg of [-1, 1]) {
      const bx = s * (0.28 + i * 0.2), L = s * (0.55 - Math.abs(i - 2) * 0.07);
      g.strokeStyle = 'rgba(8,10,20,0.28)'; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(bx + s * 0.06, s * 0.06); g.quadraticCurveTo(bx + s * 0.1, sg * L * 0.75 + s * 0.06, bx - s * 0.1, sg * L + s * 0.06); g.stroke();
      g.strokeStyle = ivory; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(bx, 0); g.quadraticCurveTo(bx + s * 0.05, sg * L * 0.75, bx - s * 0.12, sg * L); g.stroke();
    }
    g.fillStyle = ivory; g.strokeStyle = 'rgba(80,60,30,0.6)'; g.lineWidth = Math.max(1, s * 0.03);
    g.beginPath(); g.ellipse(-s * 0.2, 0, s * 0.3, s * 0.2, 0, 0, TAU); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.42, -s * 0.05); g.lineTo(-s * 0.72, -s * 0.1); g.lineTo(-s * 0.72, s * 0.1); g.lineTo(-s * 0.42, s * 0.06); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2a2220'; g.beginPath(); g.ellipse(-s * 0.16, -s * 0.08, s * 0.05, s * 0.06, 0, 0, TAU); g.ellipse(-s * 0.16, s * 0.08, s * 0.05, s * 0.06, 0, 0, TAU); g.fill();
    g.restore();
  }

  function torch(g, x, y, s, pal) {
    g.fillStyle = 'rgba(8,8,20,0.34)'; g.beginPath(); g.moveTo(x - s * 0.1, y); g.lineTo(x + s * 0.1, y); g.lineTo(x + s * 1.4 * LX + s * 0.1, y + s * 1.4 * LY * 0.6); g.lineTo(x + s * 1.4 * LX - s * 0.1, y + s * 1.4 * LY * 0.6); g.closePath(); g.fill();
    g.fillStyle = pal.stone[1]; g.strokeStyle = 'rgba(20,16,30,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, s * 0.28, s * 0.16, 0, 0, TAU); g.fill(); g.stroke();
    const wg = g.createLinearGradient(x - s * 0.08, 0, x + s * 0.08, 0); wg.addColorStop(0, '#9a6a3a'); wg.addColorStop(1, '#4a2e16');
    g.fillStyle = wg; g.fillRect(x - s * 0.08, y - s * 1.35, s * 0.16, s * 1.35);
    g.fillStyle = '#3a3a48'; g.strokeStyle = 'rgba(10,10,20,0.7)'; g.beginPath(); g.moveTo(x - s * 0.22, y - s * 1.55); g.lineTo(x + s * 0.22, y - s * 1.55); g.lineTo(x + s * 0.12, y - s * 1.3); g.lineTo(x - s * 0.12, y - s * 1.3); g.closePath(); g.fill(); g.stroke();
    return { x: x, y: y - s * 1.65, r: s * 3.4, col: '255,170,70', flame: true, s: s };
  }

  function pillar(g, x, y, s, pal) {
    const w = s * 0.55, h = s * 1.9;
    g.fillStyle = 'rgba(8,8,24,0.34)'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + w, y); g.lineTo(x + w + h * LX * 1.0, y + h * LY * 0.55); g.lineTo(x - w + h * LX * 1.0, y + h * LY * 0.55 + w * 0.5); g.closePath(); g.fill();
    g.fillStyle = pal.stone[2]; g.beginPath(); g.ellipse(x, y, w * 1.15, w * 0.5, 0, 0, TAU); g.fill();
    const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, pal.stone[0]); gr.addColorStop(0.45, pal.stone[1]); gr.addColorStop(1, pal.stone[2]);
    g.fillStyle = gr; g.fillRect(x - w, y - h, w * 2, h); g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * w * 0.35, y - h); g.lineTo(x + k * w * 0.35, y); g.stroke(); }
    g.fillStyle = pal.stone[1]; g.strokeStyle = 'rgba(20,16,30,0.6)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y - h, w * 1.18, w * 0.52, 0, 0, TAU); g.fill(); g.stroke();
    const tg = g.createRadialGradient(x - w * 0.3, y - h - w * 0.15, 1, x, y - h, w); tg.addColorStop(0, pal.stone[0]); tg.addColorStop(1, pal.stone[1]); g.fillStyle = tg; g.beginPath(); g.ellipse(x, y - h - 2, w * 0.95, w * 0.4, 0, 0, TAU); g.fill();
  }

  function vent(g, x, y, s) {
    g.fillStyle = 'rgba(8,4,4,0.4)'; g.beginPath(); g.ellipse(x + s * 0.15, y + s * 0.15, s * 1.0, s * 0.62, 0, 0, TAU); g.fill();
    g.fillStyle = '#4a3a38'; g.strokeStyle = 'rgba(10,6,6,0.7)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(x, y, s * 0.95, s * 0.58, 0, 0, TAU); g.fill(); g.stroke();
    const gr = g.createRadialGradient(x, y, 0, x, y, s * 0.7); gr.addColorStop(0, '#fff2a8'); gr.addColorStop(0.45, '#ff9a24'); gr.addColorStop(1, '#6a1808'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, s * 0.7, s * 0.4, 0, 0, TAU); g.fill();
    return { x: x, y: y, r: s * 3.0, col: '255,130,40', steam: true };
  }

  function brazier(g, x, y, s, pal) {
    g.fillStyle = 'rgba(8,8,20,0.34)'; g.beginPath(); g.ellipse(x + s * 0.3, y + s * 0.25, s * 0.75, s * 0.3, 0.3, 0, TAU); g.fill();
    g.strokeStyle = '#2a2a34'; g.lineWidth = s * 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s * 0.4, y - s * 0.2); g.lineTo(x - s * 0.5, y + s * 0.2); g.moveTo(x + s * 0.4, y - s * 0.2); g.lineTo(x + s * 0.5, y + s * 0.2); g.moveTo(x, y - s * 0.1); g.lineTo(x, y + s * 0.25); g.stroke();
    const bg = g.createLinearGradient(x - s * 0.6, 0, x + s * 0.6, 0); bg.addColorStop(0, '#6a6a7a'); bg.addColorStop(1, '#22222c'); g.fillStyle = bg; g.beginPath(); g.ellipse(x, y - s * 0.3, s * 0.62, s * 0.3, 0, 0, TAU); g.fill();
    g.fillStyle = '#5a1808'; g.beginPath(); g.ellipse(x, y - s * 0.38, s * 0.5, s * 0.2, 0, 0, TAU); g.fill();
    return { x: x, y: y - s * 0.6, r: s * 3.0, col: '255,150,60', flame: true, s: s * 0.7 };
  }

  function glowshroom(g, x, y, s, rnd, col) {
    D.mushroom(g, x, y, s, rnd, col); if (rnd() < 0.6) D.mushroom(g, x + s * 0.8, y + s * 0.3, s * 0.6, rnd, col);
    return { x: x, y: y - s * 0.6, r: s * 2.2, col: '120,230,255' };
  }

  /* ---------- penutup depan ---------- */
  function stalactite(g, x, y, len, w, pal) {
    g.fillStyle = 'rgba(0,0,10,0.28)'; g.beginPath(); g.moveTo(x - w + w * LX * 0.5, y + w * 0.2); g.lineTo(x + w + w * LX * 0.5, y + w * 0.2); g.lineTo(x + w * LX * 0.5 + 8, y + len + 10); g.closePath(); g.fill();
    const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, pal.stone[1]); gr.addColorStop(0.45, pal.stone[2]); gr.addColorStop(1, '#0c0a14');
    g.fillStyle = gr; g.strokeStyle = 'rgba(8,6,16,0.8)'; g.lineWidth = 2; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(x - w, y - 4); g.quadraticCurveTo(x - w * 0.6, y + len * 0.5, x + w * 0.06, y + len); g.quadraticCurveTo(x + w * 0.6, y + len * 0.5, x + w, y - 4); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - w * 0.55, y + 2); g.quadraticCurveTo(x - w * 0.3, y + len * 0.5, x, y + len * 0.9); g.stroke();
  }

  function banner(g, x, y, w, h, col, trim) {
    g.fillStyle = 'rgba(0,0,10,0.3)'; g.fillRect(x + w * 0.1 + 8, y + 4, w, h);
    const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, col[0]); gr.addColorStop(0.5, col[1]); gr.addColorStop(1, col[2]);
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + w / 2, y + h - w * 0.28); g.lineTo(x, y + h); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + w * k / 4, y); g.lineTo(x + w * k / 4, y + h * 0.9); g.stroke(); }
    g.strokeStyle = trim; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + 4); g.moveTo(x + 4, y + h - 6); g.lineTo(x + w / 2, y + h - w * 0.28 - 4); g.lineTo(x + w - 4, y + h - 6); g.stroke();
    g.fillStyle = trim; g.beginPath(); g.arc(x + w / 2, y + h * 0.4, w * 0.16, 0, TAU); g.fill(); g.fillStyle = col[2]; g.beginPath(); g.arc(x + w / 2, y + h * 0.4, w * 0.08, 0, TAU); g.fill();
    g.fillStyle = '#6a4a22'; g.fillRect(x - 6, y - 6, w + 12, 8);
  }

  /** Jembatan batu di atas jalur: b = { x, y, a } (a = arah jalur ATAS). R = radius bola. */
  function bridge(g, b, R, pal) {
    const Ln = R * 7, Wd = R * 2 + 46;
    g.save(); g.translate(b.x, b.y); g.rotate(b.a);
    g.fillStyle = 'rgba(0,0,12,0.32)'; g.fillRect(-Ln / 2 + 8, -Wd / 2 + 12, Ln, Wd);
    const dg = g.createLinearGradient(0, -Wd / 2, 0, Wd / 2); dg.addColorStop(0, pal.stone[0]); dg.addColorStop(1, pal.stone[2]);
    g.fillStyle = dg; g.strokeStyle = 'rgba(20,16,30,0.7)'; g.lineWidth = 3; g.fillRect(-Ln / 2, -Wd / 2, Ln, Wd); g.strokeRect(-Ln / 2, -Wd / 2, Ln, Wd);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * R * 0.95, -Wd / 2 + 4); g.lineTo(k * R * 0.95, Wd / 2 - 4); g.stroke(); }
    // pagar batu di kedua sisi (jalan bola tetap terlihat di tengah)
    [-1, 1].forEach(function (sd) {
      const y0 = sd * (Wd / 2 - 7);
      g.fillStyle = pal.stone[1]; g.fillRect(-Ln / 2 - 4, y0 - 7, Ln + 8, 14); g.strokeRect(-Ln / 2 - 4, y0 - 7, Ln + 8, 14);
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-Ln / 2 - 4, y0 - 7, Ln + 8, 3);
      for (let k = -3; k <= 3; k += 2) { g.fillStyle = pal.stone[0]; g.fillRect(k * R * 0.95 - 7, y0 - 11, 14, 22); g.strokeRect(k * R * 0.95 - 7, y0 - 11, 14, 22); }
    });
    g.restore();
  }

  GA.Decor2 = { crystal: crystal, stalag: stalag, bones: bones, torch: torch, pillar: pillar, vent: vent, brazier: brazier, glowshroom: glowshroom, stalactite: stalactite, banner: banner, bridge: bridge };
})(window.GA = window.GA || {});
