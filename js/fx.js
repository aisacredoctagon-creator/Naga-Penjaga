/* fx.js — partikel, teks melayang, getar layar, kilatan layar. Memakai pool agar tidak alokasi per frame. */
(function (GA) {
  'use strict';

  const MAXP = 600, MAXT = 24;
  const decals = [];
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
      this.shakeAmp = 0; this.flashA = 0; decals.length = 0;
    },

    density: 1,   // kepadatan partikel pendek (diatur GA.Quality)
    spawn: function (x, y, vx, vy, life, size, col, shape, g) {
      if (this.density < 1 && (shape === 5 || shape === 6 || shape === 0 || shape === undefined) && Math.random() > this.density) return;
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

    /** Pecahan kristal + gelombang cahaya + percik debu sihir. r = radius bola. */
    shatter: function (x, y, cols, r) {
      const u = this.unit, shard = ['#1a0f2a', cols[1] || cols[0], '#2a1840', cols[0]];     // pecahan OBSIDIAN gelap dengan tepi bercahaya
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * 6.283, s = (110 + Math.random() * 300) * u;
        this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 70 * u, 0.55 + Math.random() * 0.5, r * (0.18 + Math.random() * 0.22), shard[i % shard.length], 4, 520);
      }
      for (let i = 0; i < 4; i++) { const a = Math.random() * 6.283; this.spawn(x, y, Math.cos(a) * 26, Math.sin(a) * 26 - 20, 0.8 + Math.random() * 0.5, r * (0.5 + Math.random() * 0.4), '#2a1840', 6, -30); }      // asap sihir
      this.ring(x, y, cols[0], r * 2.2);                                                                                                                                              // riak energi
      for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283, s = 40 + Math.random() * 120; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 30, 0.7 + Math.random() * 0.6, r * 0.12, cols[1] || cols[0], 5, -30); }
      this.spawn(x, y, 0, 0, 0.38, r * 2.4, cols[0], 7, 0);
      this.spawn(x, y, 0, 0, 0.5, r * 1.2, '#ffffff', 7, 0);
    },

    /** Ledakan api bola api: gelombang kejut, bara, asap, jelaga; good = emas bintang, selain itu asap + percik padam. */
    fireImpact: function (x, y, good, r) {
      const u = this.unit;
      this.spawn(x, y, 0, 0, 0.32, r * 2.7, good ? '#ffd27a' : '#ff7a3a', 7, 0);
      this.spawn(x, y, 0, 0, 0.2, r * 1.5, '#fff6c8', 7, 0);
      for (let i = 0; i < 16; i++) { const a = Math.random() * 6.283, s = (90 + Math.random() * 300) * u; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 40 * u, 0.4 + Math.random() * 0.6, r * (0.08 + Math.random() * 0.12), i % 3 ? '#ff9a2a' : '#ffe27a', 5, 260); }
      for (let i = 0; i < 5; i++) { const a = Math.random() * 6.283; this.spawn(x, y, Math.cos(a) * 30, Math.sin(a) * 30 - 40, 0.9 + Math.random() * 0.6, r * (0.4 + Math.random() * 0.3), '#3a3a44', 6, -40); }
      if (good) for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283, s = 140 + Math.random() * 220; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 80, 0.7 + Math.random() * 0.4, 4 * u, '#ffd23f', 1, 380); }
      this.scorch(x, y, r * 0.9);
    },

    /** Telur pecah: pecahan cangkang krem + kilatan hangat + debu. tint = warna elemen. */
    eggBreak: function (x, y, r, tint) {
      const u = this.unit;
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.283, s = (70 + Math.random() * 200) * u; this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 90 * u, 0.6 + Math.random() * 0.5, r * (0.12 + Math.random() * 0.14), i % 3 ? '#f4e6c4' : (tint || '#ffd27a'), 4, 520); }
      this.spawn(x, y, 0, 0, 0.4, r * 2.2, '#ffd27a', 7, 0);
      for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283; this.spawn(x, y, Math.cos(a) * 20, Math.sin(a) * 20 - 20, 0.8, r * 0.5, '#6a5a48', 6, -30); }
    },

    /** Bara kecil (aditif). */
    embers: function (x, y, vx, vy, n, size, col) {
      for (let i = 0; i < n; i++) this.spawn(x + (Math.random() - 0.5) * size, y + (Math.random() - 0.5) * size, vx + (Math.random() - 0.5) * 70, vy + (Math.random() - 0.5) * 70, 0.3 + Math.random() * 0.45, size * (0.25 + Math.random() * 0.35), col || '#ffb02e', 5, -20);
    },

    scorch: function (x, y, r) { decals.push({ x: x, y: y, r: r, age: 0 }); if (decals.length > 10) decals.shift(); },
    /** Jejak gosong sesaat (digambar di atas alur, di bawah bola). */
    drawDecals: function (ctx, dt) {
      for (let i = decals.length - 1; i >= 0; i--) {
        const d = decals[i]; d.age += dt; if (d.age > 4) { decals.splice(i, 1); continue; }
        const a = 0.35 * (1 - d.age / 4), g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 1.6); g.addColorStop(0, 'rgba(20,10,5,' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(20,10,5,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, d.r * 1.6, 0, 6.283); ctx.fill();
      }
    },

    /** Semburan api dari mulut: gelombang panas, bara ke depan, kilatan singkat. */
    muzzle: function (x, y, angle, r) {
      const u = this.unit, c = Math.cos(angle), s = Math.sin(angle);
      this.spawn(x + c * r * 0.6, y + s * r * 0.6, 0, 0, 0.26, r * 2.2, '#ffb44a', 7, 0);
      this.spawn(x, y, 0, 0, 0.14, r * 1.3, '#fff2b8', 7, 0);
      for (let i = 0; i < 10; i++) { const sp = (Math.random() - 0.5) * 0.9, v = (260 + Math.random() * 360) * u; this.spawn(x + c * r * 0.5, y + s * r * 0.5, Math.cos(angle + sp) * v, Math.sin(angle + sp) * v, 0.2 + Math.random() * 0.25, r * (0.12 + Math.random() * 0.14), i % 2 ? '#ff9a2a' : '#ffe27a', 5, 0); }
    },

    ring: function (x, y, col, maxR) {
      const p = parts[pi]; pi = (pi + 1) % MAXP;
      p.on = true; p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.life = 0.35; p.max = 0.35; p.size = maxR; p.col = col; p.shape = 3; p.g = 0; p.rot = 0; p.vr = 0;
    },

    text: function (x, y, str, col, size) {
      const t = texts[ti]; ti = (ti + 1) % MAXT;
      t.on = true; t.x = x; t.y = y; t.t = 0; t.max = 1.0; t.str = str; t.col = col || '#fff'; t.size = size || 28; t.vy = -52;
    },

    /** Popup melayang bergaya (naik lalu memudar). kind: score | combo | good | bad | info. */
    pop: function (x, y, str, kind, size) {
      const col = { score: '#ffd23f', combo: '#ff9a3c', good: '#7ee26f', bad: '#ff6a78', info: '#cfe0ff' }[kind] || '#fff';
      this.text(x, y, str, col, size || 28);
    },

    shake: function (a) { if (this.reduce) a *= 0.2; this.shakeAmp = Math.max(this.shakeAmp, a); },
    flash: function (a, col) { if (this.reduce) a *= 0.3; this.flashA = Math.max(this.flashA, a); if (col) this.flashCol = col; },

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
        if (p.shape === 7) {      // gelombang cahaya aditif
          const rr = p.size * (1 - k) + 4;
          ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1.5, rr * 0.28 * k);
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
          continue;
        }
        if (p.shape === 5) {      // bara aditif
          const rr = p.size * (0.4 + 0.6 * k);
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, rr * 1.8, 0, 6.283); ctx.globalAlpha *= 0.35; ctx.fill();
          ctx.globalAlpha = Math.min(1, k * 1.6); ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
          continue;
        }
        if (p.shape === 6) {      // asap
          ctx.globalAlpha *= 0.4; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.4 - k * 0.6), 0, 6.283); ctx.fill();
          continue;
        }
        ctx.fillStyle = p.col;
        if (p.shape === 4) {      // pecahan kristal (segitiga)
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(p.size, 0); ctx.lineTo(-p.size * 0.6, p.size * 0.7); ctx.lineTo(-p.size * 0.4, -p.size * 0.8); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); continue;
        }
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
        const fs = Math.round(t.size * pop);
        ctx.font = '800 ' + fs + 'px ' + GA.Theme.fonts.ui;
        ctx.lineWidth = Math.max(5, fs * 0.24); ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(34,14,4,0.94)';
        ctx.strokeText(t.str, t.x, t.y + 2);
        const tg = ctx.createLinearGradient(0, t.y - fs * 0.5, 0, t.y + fs * 0.5); tg.addColorStop(0, '#fffbe0'); tg.addColorStop(0.4, t.col); tg.addColorStop(1, t.col);
        ctx.fillStyle = tg; ctx.fillText(t.str, t.x, t.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.strokeText(t.str, t.x, t.y - 1);
      }
      ctx.globalAlpha = 1;
    }
  };

  GA.FX = FX;
})(window.GA = window.GA || {});
