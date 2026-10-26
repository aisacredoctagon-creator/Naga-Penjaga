/* fx.js — partikel, teks melayang, getar layar, kilatan layar. Memakai pool agar tidak alokasi per frame. */
(function (GA) {
  'use strict';

  const MAXP = 360, MAXT = 24;
  const parts = [], texts = [];
  for (let i = 0; i < MAXP; i++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 4, col: '#fff', rot: 0, vr: 0, shape: 0, g: 0 });
  for (let i = 0; i < MAXT; i++) texts.push({ on: false, x: 0, y: 0, t: 0, max: 1, str: '', col: '#fff', size: 24, vy: -40 });

  let pi = 0, ti = 0;
  const FX = {
    unit: 1,   // skala efek relatif terhadap bola (radius bola / 25)
    shakeAmp: 0, flashA: 0, flashCol: '255,60,80',

    reset: function () {
      parts.forEach(function (p) { p.on = false; });
      texts.forEach(function (t) { t.on = false; });
      this.shakeAmp = 0; this.flashA = 0;
    },

    spawn: function (x, y, vx, vy, life, size, col, shape, g) {
      const p = parts[pi]; pi = (pi + 1) % MAXP;
      p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size;
      p.col = col; p.shape = shape || 0; p.rot = Math.random() * 6.28; p.vr = (Math.random() - 0.5) * 12; p.g = g == null ? 420 : g;
    },

    /** Ledakan bola: serpihan warna + bintang. */
    burst: function (x, y, cols, n) {
      n = n || 18;
      for (let i = 0; i < n; i++) {
        const u = this.unit, a = Math.random() * 6.283, s = (120 + Math.random() * 260) * u;
        this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 60 * u, 0.5 + Math.random() * 0.5, (3 + Math.random() * 5) * u, cols[i % cols.length], i % 4 === 0 ? 1 : 0);
      }
      this.ring(x, y, cols[1] || cols[0], 46 * this.unit);
    },

    confetti: function (x, y, n) {
      const pal = ['#ff4d5e', '#ffd23f', '#2fbf71', '#3b82f6', '#8b5cf6', '#ec4899'];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, s = 200 + Math.random() * 420;
        this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 1.1 + Math.random() * 0.9, 4 + Math.random() * 4, pal[i % pal.length], 2, 500);
      }
    },

    ring: function (x, y, col, maxR) {
      const p = parts[pi]; pi = (pi + 1) % MAXP;
      p.on = true; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.life = 0.35; p.max = 0.35; p.size = maxR; p.col = col; p.shape = 3; p.g = 0; p.rot = 0; p.vr = 0;
    },

    text: function (x, y, str, col, size) {
      const t = texts[ti]; ti = (ti + 1) % MAXT;
      t.on = true; t.x = x; t.y = y; t.t = 0; t.max = 1.0; t.str = str; t.col = col || '#fff'; t.size = size || 28; t.vy = -52;
    },

    shake: function (a) { this.shakeAmp = Math.max(this.shakeAmp, a); },
    flash: function (a, col) { this.flashA = Math.max(this.flashA, a); if (col) this.flashCol = col; },

    update: function (dt) {
      for (let i = 0; i < MAXP; i++) {
        const p = parts[i]; if (!p.on) continue;
        p.life -= dt; if (p.life <= 0) { p.on = false; continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
      for (let i = 0; i < MAXT; i++) {
        const t = texts[i]; if (!t.on) continue;
        t.t += dt; if (t.t >= t.max) { t.on = false; continue; }
        t.y += t.vy * dt; t.vy *= (1 - 1.8 * dt);
      }
      this.shakeAmp = Math.max(0, this.shakeAmp - dt * 34);
      this.flashA = Math.max(0, this.flashA - dt * 1.6);
    },

    /** Offset getar untuk frame ini. */
    shakeOffset: function (out) {
      const a = this.shakeAmp;
      out.x = a > 0.2 ? (Math.random() - 0.5) * 2 * a : 0;
      out.y = a > 0.2 ? (Math.random() - 0.5) * 2 * a : 0;
      return out;
    },

    draw: function (ctx) {
      for (let i = 0; i < MAXP; i++) {
        const p = parts[i]; if (!p.on) continue;
        const k = p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        if (p.shape === 3) {
          ctx.strokeStyle = p.col; ctx.lineWidth = 5 * k + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - k) + 6, 0, 6.283); ctx.stroke();
          continue;
        }
        ctx.fillStyle = p.col;
        if (p.shape === 0) {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * k), 0, 6.283); ctx.fill();
        } else if (p.shape === 1) { // bintang
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const a = j * 1.2566 - 1.5708, a2 = a + 0.6283, r = p.size * 1.6;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
          }
          ctx.closePath(); ctx.fill(); ctx.restore();
        } else { // confetti
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < MAXT; i++) {
        const t = texts[i]; if (!t.on) continue;
        const k = t.t / t.max, pop = k < 0.15 ? 0.6 + k / 0.15 * 0.55 : 1.15 - Math.min(0.15, (k - 0.15));
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.font = '800 ' + Math.round(t.size * pop) + 'px ' + GA.Theme.fonts.ui;
        ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(20,30,70,0.85)';
        ctx.strokeText(t.str, t.x, t.y);
        ctx.fillStyle = t.col; ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    }
  };

  GA.FX = FX;
})(window.GA = window.GA || {});
