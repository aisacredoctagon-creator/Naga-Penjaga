/* scenery.js — latar tiap step (hutan → gunung api → menara penyihir) dengan lapisan parallax halus
 * dan partikel ambient (kunang-kunang, bara, percikan sihir). Warna ada di Theme.scenes.
 *
 * Lapisan (digambar dari belakang): langit+tanah+dekorasi → siluet jauh → siluet dekat → alur jalur.
 * Siluet jauh/dekat bergoyang pelan dengan amplitudo berbeda (parallax). Semua dirender ke canvas luar layar sekali
 * per perubahan ukuran/step, jadi per frame hanya beberapa drawImage. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;
  const TAU = Math.PI * 2;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

  const S = { L: null, scene: 'forest', layers: [], parts: [], ambient: 'firefly' };

  function mk(canvas, L) {
    const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d'); g.setTransform(L.px, 0, 0, L.px, L.dpr * L.ox, L.dpr * L.oy);
    return { c: c, g: g };
  }

  function tree(g, x, y, h, col) {   // pohon cemara siluet
    g.fillStyle = col;
    for (let k = 0; k < 3; k++) { const w = h * (0.34 - k * 0.06), yy = y - h * (0.2 + k * 0.28); g.beginPath(); g.moveTo(x, yy - h * 0.34); g.lineTo(x + w, yy + h * 0.08); g.lineTo(x - w, yy + h * 0.08); g.closePath(); g.fill(); }
    g.fillRect(x - h * 0.04, y - h * 0.14, h * 0.08, h * 0.16);
  }

  function baseLayer(canvas, L, C, id) {
    const o = mk(canvas, L), g = o.g, r = rng(7);
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = C.sky[0]; g.fillRect(0, 0, o.c.width, o.c.height);
    g.setTransform(L.px, 0, 0, L.px, L.dpr * L.ox, L.dpr * L.oy);
    const sk = g.createLinearGradient(0, 0, 0, L.H); sk.addColorStop(0, C.sky[0]); sk.addColorStop(1, C.sky[1]); g.fillStyle = sk; g.fillRect(0, 0, L.W, L.H);
    const gr = g.createLinearGradient(0, L.hud, 0, L.H); gr.addColorStop(0, C.ground[0]); gr.addColorStop(1, C.ground[1]);
    g.fillStyle = gr; g.fillRect(0, L.hud + 40, L.W, L.H); // tanah di bawah garis cakrawala
    g.fillStyle = gr; g.fillRect(0, L.hud, L.W, L.H - L.hud);
    if (id === 'forest' || id === 'menu') {
      g.fillStyle = 'rgba(255,255,255,0.06)'; for (let y = L.hud; y < L.H; y += 96) g.fillRect(0, y, L.W, 48);
      for (let i = 0; i < 70; i++) {   // bunga, rumput, jamur
        const x = r() * L.W, y = L.hud + r() * (L.H - L.hud), k = r();
        if (k < 0.5) { g.strokeStyle = 'rgba(20,90,50,0.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y - 9); g.moveTo(x, y); g.lineTo(x + 4, y - 8); g.stroke(); }
        else if (k < 0.85) { g.fillStyle = ['#fff6c8', '#ffd6ea', '#d8ccff'][i % 3]; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.2566) * 4, y + Math.sin(p * 1.2566) * 4, 3, 0, TAU); g.fill(); } g.fillStyle = '#f2a60c'; g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill(); }
        else { g.fillStyle = '#e8584a'; g.beginPath(); g.arc(x, y - 4, 6, Math.PI, 0); g.fill(); g.fillStyle = '#fff3e0'; g.fillRect(x - 1.6, y - 4, 3.2, 6); }
      }
      g.fillStyle = 'rgba(255,240,170,0.07)';   // berkas cahaya matahari
      for (let i = 0; i < 3; i++) { const x0 = 80 + i * 260; g.beginPath(); g.moveTo(x0, L.hud); g.lineTo(x0 + 70, L.hud); g.lineTo(x0 + 250, L.H); g.lineTo(x0 + 120, L.H); g.closePath(); g.fill(); }
    } else if (id === 'volcano') {
      for (let i = 0; i < 26; i++) {   // retakan lava bercahaya + batu
        const x = r() * L.W, y = L.hud + 30 + r() * (L.H - L.hud - 30), a = r() * 3;
        g.strokeStyle = 'rgba(255,120,40,' + (0.25 + r() * 0.3).toFixed(2) + ')'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 18); g.lineTo(x + Math.cos(a + 0.7) * 40, y + Math.sin(a + 0.7) * 26); g.stroke();
      }
      for (let i = 0; i < 7; i++) { const x = r() * L.W, y = L.hud + 40 + r() * (L.H - L.hud - 40); const lg = g.createRadialGradient(x, y, 2, x, y, 38); lg.addColorStop(0, 'rgba(255,170,60,0.55)'); lg.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = lg; g.beginPath(); g.arc(x, y, 38, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 14; i++) { const x = r() * L.W, y = L.hud + r() * (L.H - L.hud); g.beginPath(); g.ellipse(x, y, 10 + r() * 14, 6 + r() * 8, 0, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(120,230,255,0.5)'; for (let i = 0; i < 9; i++) { const x = r() * L.W, y = L.hud + 20 + r() * (L.H - L.hud - 20), h = 12 + r() * 14; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + 6, y); g.lineTo(x, y + 4); g.lineTo(x - 6, y); g.closePath(); g.fill(); }   // kristal
    } else { // tower
      g.fillStyle = 'rgba(255,255,255,0.045)'; for (let y = L.hud, j = 0; y < L.H; y += 64, j++) for (let x = (j % 2) * 64; x < L.W; x += 128) g.fillRect(x, y, 64, 64);
      g.strokeStyle = 'rgba(200,170,255,0.16)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { const x = r() * L.W, y = L.hud + 30 + r() * (L.H - L.hud - 30), rr = 20 + r() * 26; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, rr * 0.62, 0.4, 4.2); g.stroke(); }
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.5).toFixed(2) + ')'; g.beginPath(); g.arc(r() * L.W, r() * (L.hud + 60), 0.8 + r() * 1.3, 0, TAU); g.fill(); }
    }
    return o.c;
  }

  function farLayer(canvas, L, C, id) {
    const o = mk(canvas, L), g = o.g, r = rng(3), y0 = L.hud + 6;
    if (id === 'forest' || id === 'menu') { for (let x = -20; x < L.W + 40; x += 34 + r() * 20) tree(g, x, y0 + 70 + r() * 20, 80 + r() * 40, C.far); }
    else if (id === 'volcano') {
      g.fillStyle = C.far;
      [[150, 130], [430, 170], [760, 140]].forEach(function (m) { g.beginPath(); g.moveTo(m[0] - 140, y0 + 90); g.lineTo(m[0] - 18, y0 + 90 - m[1] * 0.6); g.lineTo(m[0] + 18, y0 + 90 - m[1] * 0.6); g.lineTo(m[0] + 140, y0 + 90); g.closePath(); g.fill(); });
      const lg = g.createRadialGradient(430, y0 + 90 - 170 * 0.6, 2, 430, y0 + 90 - 170 * 0.6, 60); lg.addColorStop(0, 'rgba(255,170,60,0.8)'); lg.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = lg; g.beginPath(); g.arc(430, y0 + 90 - 170 * 0.6, 60, 0, TAU); g.fill();
    } else {
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(L.W * 0.82, y0 + 40, 26, 0, TAU); g.fill(); g.fillStyle = C.sky[1]; g.beginPath(); g.arc(L.W * 0.82 + 10, y0 + 34, 24, 0, TAU); g.fill();
      g.fillStyle = C.far;
      [[0.1, 130], [0.28, 170], [0.5, 120], [0.68, 190], [0.92, 140]].forEach(function (t) { const x = L.W * t[0], h = t[1]; g.fillRect(x - 22, y0 + 90 - h, 44, h); g.beginPath(); g.moveTo(x - 30, y0 + 90 - h); g.lineTo(x, y0 + 90 - h - 46); g.lineTo(x + 30, y0 + 90 - h); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,215,120,0.8)'; g.fillRect(x - 4, y0 + 90 - h + 20, 8, 12); g.fillStyle = C.far; });
    }
    return o.c;
  }

  function nearLayer(canvas, L, C, id) {
    const o = mk(canvas, L), g = o.g, r = rng(5), yb = L.H;
    g.fillStyle = C.near;
    if (id === 'forest' || id === 'menu') { for (let i = 0; i < 7; i++) { const x = (i < 4 ? 0 : L.W) + (i < 4 ? 1 : -1) * r() * 50; g.beginPath(); g.ellipse(x, yb - r() * 40, 40 + r() * 34, 30 + r() * 20, 0, 0, TAU); g.fill(); } }
    else if (id === 'volcano') { for (let x = 10; x < L.W; x += 60 + r() * 40) { const h = 26 + r() * 34; g.beginPath(); g.moveTo(x - 24, yb + 4); g.lineTo(x - 6, yb - h); g.lineTo(x + 8, yb - h * 0.5); g.lineTo(x + 24, yb + 4); g.closePath(); g.fill(); } }
    else { [0.02, 0.98].forEach(function (t) { const x = L.W * t; g.fillRect(x - 16, L.hud + 40, 32, L.H); g.fillRect(x - 24, L.hud + 40, 48, 14); }); }
    return o.c;
  }

  function spawnParticles(L, kind) {
    const n = kind === 'ember' ? 46 : 34, a = [];
    for (let i = 0; i < n; i++) a.push({ x: Math.random() * L.W, y: L.hud + Math.random() * (L.H - L.hud), vx: (Math.random() - 0.5) * 14, vy: kind === 'firefly' ? (Math.random() - 0.5) * 10 : -(14 + Math.random() * 26), ph: Math.random() * TAU, s: 1 + Math.random() * 2 });
    return a;
  }

  const Scenery = {
    mode: "legacy",
    /** Bangun lapisan untuk layout L (canvas = canvas utama) dan scene tertentu. path/R: gambar alur di lapisan terakhir. */
    build: function (canvas, L, sceneId, path, R) {
      Theme.setScene(sceneId);
      if (GA.Background && GA.Background.has(sceneId)) { this.mode = "map"; GA.Background.build(canvas, L, GA.Maps[sceneId], path, R); S.L = L; return; }
      this.mode = "legacy";
      const C = Theme.sceneColors(), id = Theme.scene;
      S.L = L; S.scene = id; S.ambient = C.ambient;
      S.layers = [baseLayer(canvas, L, C, id), farLayer(canvas, L, C, id), nearLayer(canvas, L, C, id)];
      const tr = mk(canvas, L); tr.g.save(); tr.g.beginPath(); tr.g.rect(0, 0, L.W, L.H); tr.g.clip();
      if (path) GA.Path.drawTrack(tr.g, path, R); tr.g.restore(); S.layers.push(tr.c);
      if (!S.parts.length || S.partKind !== C.ambient) { S.parts = spawnParticles(L, C.ambient); S.partKind = C.ambient; }
    },

    /** Gambar lapisan latar (ruang piksel). Siluet bergoyang pelan: parallax halus. */
    drawBack: function (ctx, t) {
      if (this.mode === "map") { GA.Background.drawBack(ctx); GA.Background.drawGlow(ctx, t); return; }
      const L = S.L, k = L.px;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(S.layers[0], 0, 0);
      ctx.drawImage(S.layers[1], Math.sin(t * 0.22) * 5 * k, 0);
      ctx.drawImage(S.layers[2], Math.sin(t * 0.22 + 1.2) * 9 * k, 0);
      ctx.drawImage(S.layers[3], 0, 0);
    },

    /** Partikel ambient (ruang logis). */
    drawAmbient: function (ctx, t, dt) {
      if (this.mode === "map") { GA.Effects.drawUnder(ctx, t, dt); return; }
      const L = S.L, kind = S.ambient;
      for (let i = 0; i < S.parts.length; i++) {
        const p = S.parts[i];
        p.x += (p.vx + Math.sin(t * 0.8 + p.ph) * 6) * dt; p.y += p.vy * dt;
        if (p.y < L.hud - 10) { p.y = L.H + 6; p.x = Math.random() * L.W; }
        if (p.y > L.H + 10) p.y = L.hud; if (p.x < -10) p.x = L.W + 8; if (p.x > L.W + 10) p.x = -8;
        const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + p.ph);
        if (kind === 'firefly') { ctx.fillStyle = 'rgba(255,240,140,' + (0.2 + 0.5 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.s, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,220,' + (0.5 + 0.5 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 * p.s, 0, TAU); ctx.fill(); }
        else if (kind === 'ember') { ctx.fillStyle = 'rgba(255,' + (120 + tw * 100 | 0) + ',40,' + (0.35 + 0.5 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6 * p.s, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = 'rgba(210,180,255,' + (0.15 + 0.6 * tw).toFixed(2) + ')'; const s = 2 * p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y - s * 1.6); ctx.lineTo(p.x + s * 0.5, p.y); ctx.lineTo(p.x, p.y + s * 1.6); ctx.lineTo(p.x - s * 0.5, p.y); ctx.closePath(); ctx.fill(); }
      }
    },

    /** Penutup depan peta (daun, vignette): digambar setelah rantai. ox/oy = gesekan getar dalam piksel kanvas. */
    drawFront: function (ctx, ox, oy, t) { if (this.mode === "map") GA.Background.drawFront(ctx, ox, oy, t); },
    /** Efek paling atas (kunang-kunang). */
    drawOver: function (ctx, t, dt) { if (this.mode === "map") GA.Effects.drawOver(ctx, t, dt); }
  };

  GA.Scenery = Scenery;
})(window.GA = window.GA || {});
