/* fx.js — efek ringan (revisi 11): partikel kecil dari pool tetap (maks. 80, tanpa alokasi per frame), cincin kilas, dan popup teks DOM. Tanpa getar layar, kilatan layar penuh, asap, bayangan,
 * `lighter`/`shadowBlur`. Tiap ledakan ≤ 8 partikel. "Efek: Mati" (Quality level rendah / prefers-reduced-motion) = nol partikel; popup skor tetap tampil (DOM, transform/opacity). */
(function (GA) {
  'use strict';

  const MAXP = 80;
  const parts = [];
  for (let i = 0; i < MAXP; i++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 4, col: '#fff', rot: 0, vr: 0, shape: 0, g: 0 });

  let pi = 0;
  const FX = {
    unit: 1,   // skala efek relatif terhadap bola (radius bola / 25)
    shakeAmp: 0, flashA: 0, flashCol: '255,60,80', reduce: false, density: 1,

    /** Jumlah partikel aktif dan popup DOM yang tampil (untuk profil ?debug=perf). */
    count: function () { let n = 0; for (let i = 0; i < MAXP; i++) if (parts[i].on) n++; return { parts: n, texts: GA.HUD && GA.HUD.popCount ? GA.HUD.popCount() : 0, decals: 0 }; },
    reset: function () { for (let i = 0; i < MAXP; i++) parts[i].on = false; if (GA.HUD && GA.HUD.clearPops) GA.HUD.clearPops(); },
    off: function () { return this.reduce || this.density <= 0; },

    spawn: function (x, y, vx, vy, life, size, col, shape, g) {
      if (this.off()) return;
      const p = parts[pi]; pi = (pi + 1) % MAXP;
      p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size;
      p.col = col; p.shape = shape || 0; p.rot = Math.random() * 6.28; p.vr = (Math.random() - 0.5) * 12; p.g = g == null ? 420 : g;
    },

    /** Ledakan bola: ≤ 8 serpihan warna + satu cincin. */
    burst: function (x, y, cols, n) {
      n = Math.min(8, n || 8);
      for (let i = 0; i < n; i++) { const u = this.unit, a = Math.random() * 6.283, s = (110 + Math.random() * 200) * u; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 50 * u, 0.4 + Math.random() * 0.3, (3 + Math.random() * 4) * u, cols[i % cols.length], i % 4 === 0 ? 1 : 0); }
      this.ring(x, y, cols[1] || cols[0], 40 * this.unit);
    },
    confetti: function (x, y, n) {
      const pal = ['#ff4d5e', '#ffd23f', '#2fbf71', '#3b82f6', '#8b5cf6', '#ec4899'];
      for (let i = 0; i < Math.min(10, n); i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 200 + Math.random() * 360; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 1 + Math.random() * 0.7, 4 + Math.random() * 3, pal[i % pal.length], 2, 500); }
    },
    /** Bola hancur: ≤ 8 pecahan sprite + satu cincin. r = radius bola. */
    shatter: function (x, y, cols, r) {
      const u = this.unit;
      for (let i = 0; i < 8; i++) { const a = Math.random() * 6.283, s = (100 + Math.random() * 220) * u; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 60 * u, 0.45 + Math.random() * 0.3, r * (0.16 + Math.random() * 0.16), i % 2 ? cols[0] : cols[1] || cols[0], 4, 520); }
      this.ring(x, y, cols[0], r * 2);
    },
    /** Bola api mengenai: cincin kilas + ≤ 6 percik. */
    fireImpact: function (x, y, good, r) {
      this.ring(x, y, good ? '#ffd27a' : '#ff7a3a', r * 1.9);
      for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283, s = (90 + Math.random() * 200) * this.unit; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 40 * this.unit, 0.3 + Math.random() * 0.3, r * (0.1 + Math.random() * 0.1), i % 2 ? '#ff9a2a' : (good ? '#ffd23f' : '#e0e0f0'), good && i % 3 === 0 ? 1 : 5); }
    },
    /** Telur pecah: ≤ 6 pecahan cangkang + kilas. */
    eggBreak: function (x, y, r) {
      for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283, s = (70 + Math.random() * 150) * this.unit; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 80 * this.unit, 0.5 + Math.random() * 0.3, r * (0.12 + Math.random() * 0.12), i % 3 ? '#f4e6c4' : '#e8c070', 4, 480); }
      this.ring(x, y, '#ffd27a', r * 1.8);
    },
    /** Bara kecil (ekor bola api: dibatasi sedikit). */
    embers: function (x, y, vx, vy, n, size, col) {
      for (let i = 0; i < Math.min(n, 1); i++) this.spawn(x + (Math.random() - 0.5) * size, y + (Math.random() - 0.5) * size, vx * 0.5, vy * 0.5, 0.22 + Math.random() * 0.2, size * (0.2 + Math.random() * 0.25), col || '#ff9a3a', 5, -20);
    },
    scorch: function () { },
    drawDecals: function () { },
    /** Semburan dari mulut: satu cincin + ≤ 4 percik. */
    muzzle: function (x, y, angle, r) {
      const c = Math.cos(angle), s = Math.sin(angle); this.ring(x + c * r * 0.6, y + s * r * 0.6, '#ffb44a', r * 1.6);
      for (let i = 0; i < 4; i++) { const sp = (Math.random() - 0.5) * 0.8, v = (240 + Math.random() * 240) * this.unit; this.spawn(x + c * r * 0.5, y + s * r * 0.5, Math.cos(angle + sp) * v, Math.sin(angle + sp) * v, 0.18 + Math.random() * 0.15, r * (0.1 + Math.random() * 0.08), '#ffcf55', 5, 0); }
    },
    ring: function (x, y, col, maxR) {
      if (this.off()) return;
      const p = parts[pi]; pi = (pi + 1) % MAXP;
      p.on = true; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.life = 0.3; p.max = 0.3; p.size = maxR; p.col = col; p.shape = 3; p.g = 0; p.rot = 0; p.vr = 0;
    },

    /** Popup teks melayang = elemen DOM kecil (transform/opacity), lihat HUD.pop. */
    text: function (x, y, str, col, size) { if (GA.HUD && GA.HUD.pop) GA.HUD.pop(x, y, str, col, size); },
    pop: function (x, y, str, kind, size) {
      const col = { score: '#ffd23f', combo: '#ff9a3c', good: '#7ee26f', bad: '#ff6a78', info: '#cfe0ff' }[kind] || '#fff';
      this.text(x, y, str, col, size || 28);
    },

    /** Getar layar dan kilatan layar penuh dihapus (tanda no-op supaya pemanggil lama tetap aman). */
    shake: function () { },
    flash: function () { },
    shakeOffset: function (out) { out.x = 0; out.y = 0; return out; },

    update: function (dt) {
      for (let i = 0; i < MAXP; i++) {
        const p = parts[i]; if (!p.on) continue;
        p.life -= dt; if (p.life <= 0) { p.on = false; continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
    },

    draw: function (ctx) {
      for (let i = 0; i < MAXP; i++) {
        const p = parts[i]; if (!p.on) continue;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        if (p.shape === 3) { ctx.strokeStyle = p.col; ctx.lineWidth = 5 * k + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k) + 6, 0, 6.283); ctx.stroke(); continue; }
        ctx.fillStyle = p.col;
        if (p.shape === 4) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(p.size, 0); ctx.lineTo(-p.size * 0.6, p.size * 0.7); ctx.lineTo(-p.size * 0.4, -p.size * 0.8); ctx.closePath(); ctx.fill(); ctx.restore(); continue; }
        if (p.shape === 1) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); for (let j = 0; j < 5; j++) { const a = j * 1.2566 - 1.5708, a2 = a + 0.6283, r = p.size * 1.6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45); } ctx.closePath(); ctx.fill(); ctx.restore(); continue; }
        if (p.shape === 2) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.restore(); continue; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * k), 0, 6.283); ctx.fill();      // 0 = serpihan, 5 = bara (lingkaran datar)
      }
      ctx.globalAlpha = 1;
    }
  };
  GA.FX = FX;
})(window.GA = window.GA || {});
