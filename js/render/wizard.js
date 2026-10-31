/* render/wizard.js — Penyihir Jahat (boss akhir), sprite berlapis datar (revisi 11). Tanpa simulasi kain/IK, gradien, atau komposit aditif.
 *
 * Lapisan prarender (sekali per ukuran, lalu hanya drawImage): bayangan datar · jubah (+ bantalan bahu, sabuk, rune) · lengan kiri (turun / terangkat) · kepala bertudung
 * (4 ekspresi: normal, kena, tertawa, sihir/marah) · tongkat + lengan kanan (turun / terangkat) · siluet putih (kilat saat kena) · siluet ungu (kilat saat merapal).
 * Gerak: melayang naik-turun (sinus), kepala sedikit tertinggal, kristal berdenyut (satu cincin tipis). Merapal = ganti sprite lengan + cincin ungu + kilat ungu singkat;
 * kena = kilat putih berkedip; kalah = semua lapisan memudar sambil turun + satu cincin ungu.
 *
 * API: GA.Wizard.draw(ctx, boss, t) — boss: { x, y, R, hurt, attackT, castT, laughT, wrathT, defeated, defeatT }.
 *      GA.Wizard.drawFigure(ctx, x, y, R, t, mood) — pose untuk cerita/menu (mood: idle | hurt | attack | cast | laugh).
 * Satuan gambar U = 0,82·R; asal di tengah badan (kepala ≈ −1,1; ujung jubah ≈ +1,4). */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const OUT = '#12101f';
  const C = { robe: '#4a3786', robe2: '#33276a', hem: '#241a4d', hood: '#5a449e', hood2: '#3d2e78', dark: '#1c1233', skin: '#d9cfb4', bone: '#efe6cc', gold: '#e8c45c', wood: '#7a5233', rune: '#c77dff', eye: '#7dff8a', hot: '#ff4d7a' };

  let store = { key: '', set: null };

  /** Satu lapisan: kotak (x0, y0, w, h) dalam satuan U; fn menggambar dalam satuan U (garis tepi 0,05). */
  function part(s, x0, y0, w, h, fn) {
    const c = document.createElement('canvas'); c.width = Math.max(2, Math.ceil(w * s)); c.height = Math.max(2, Math.ceil(h * s));
    const g = c.getContext('2d'); g.scale(s, s); g.translate(-x0, -y0); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 0.05; g.strokeStyle = OUT;
    fn(g); return { c: c, x0: x0, y0: y0, w: w, h: h };
  }
  function ellipse(g, x, y, rx, ry, fill, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fillStyle = fill; g.fill(); g.stroke(); }
  function poly(g, pts, fill) { g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); g.fillStyle = fill; g.fill(); g.stroke(); }

  function robe(g) {
    // jubah: lonceng dengan ujung compang-camping, dua nada (sisi kiri lebih gelap)
    const hem = [[-0.98, 1.38], [-0.74, 1.2], [-0.52, 1.42], [-0.26, 1.22], [0, 1.44], [0.26, 1.2], [0.52, 1.42], [0.74, 1.2], [0.98, 1.38]];
    poly(g, [[-0.42, -0.72], [0.42, -0.72], [0.62, -0.2]].concat([[0.98, 1.38]], hem.slice().reverse().slice(1, 8), [[-0.98, 1.38], [-0.62, -0.2]]), C.robe);
    g.beginPath(); g.moveTo(-0.42, -0.72); g.lineTo(0.02, -0.72); g.lineTo(0.06, 1.3); g.lineTo(-0.52, 1.42); g.lineTo(-0.74, 1.2); g.lineTo(-0.98, 1.38); g.lineTo(-0.62, -0.2); g.closePath(); g.fillStyle = C.robe2; g.fill();
    g.beginPath(); g.moveTo(-0.42, -0.72); g.lineTo(0.42, -0.72); g.lineTo(0.62, -0.2); g.lineTo(0.98, 1.38); hem.slice().reverse().forEach(function (p) { g.lineTo(p[0], p[1]); }); g.lineTo(-0.62, -0.2); g.closePath(); g.stroke();
    g.strokeStyle = C.hem; g.lineWidth = 0.035; g.beginPath(); g.moveTo(0.04, 0.3); g.lineTo(0.08, 1.25); g.moveTo(0.4, 0.2); g.lineTo(0.62, 1.2); g.stroke(); g.strokeStyle = OUT; g.lineWidth = 0.05;
    // sabuk + gesper emas
    g.beginPath(); g.moveTo(-0.58, 0.12); g.lineTo(0.62, 0.12); g.lineTo(0.64, 0.3); g.lineTo(-0.6, 0.3); g.closePath(); g.fillStyle = '#3a2314'; g.fill(); g.stroke();
    ellipse(g, 0.02, 0.21, 0.1, 0.1, C.gold);
    // rune di dada (satu bentuk datar)
    poly(g, [[0.02, -0.5], [0.15, -0.34], [0.02, -0.14], [-0.11, -0.34]], C.rune);
    // bantalan bahu tulang
    ellipse(g, -0.5, -0.64, 0.24, 0.13, C.bone, -0.25); ellipse(g, 0.54, -0.64, 0.24, 0.13, C.bone, 0.25);
  }
  function arm(g, up, side) {      // lengan bebas: side -1 = kiri
    const sx = side * 0.52, hx = side * (up ? 0.98 : 0.8), hy = up ? -0.92 : 0.3;
    g.lineWidth = 0.2; g.strokeStyle = OUT; g.beginPath(); g.moveTo(sx, -0.5); g.lineTo(side * (up ? 0.86 : 0.74), up ? -0.5 : -0.1); g.lineTo(hx, hy + (up ? 0.1 : -0.06)); g.stroke();
    g.lineWidth = 0.13; g.strokeStyle = C.robe2; g.beginPath(); g.moveTo(sx, -0.5); g.lineTo(side * (up ? 0.86 : 0.74), up ? -0.5 : -0.1); g.lineTo(hx, hy + (up ? 0.1 : -0.06)); g.stroke();
    g.lineWidth = 0.05; g.strokeStyle = OUT; ellipse(g, hx, hy, 0.1, 0.1, C.skin);
    if (up) { for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(hx + side * 0.04, hy - 0.06); g.lineTo(hx + side * 0.06 + i * 0.07, hy - 0.26); g.lineWidth = 0.05; g.stroke(); } }
  }
  function head(g, mood) {
    // tudung runcing + wajah pucat berparut
    poly(g, [[-0.5, -0.5], [-0.46, -1.1], [-0.1, -1.55], [0.2, -1.74], [0.16, -1.4], [0.46, -1.05], [0.5, -0.5], [0, -0.42]], C.hood);
    g.beginPath(); g.moveTo(-0.5, -0.5); g.lineTo(-0.46, -1.1); g.lineTo(-0.1, -1.55); g.lineTo(0.02, -1.0); g.lineTo(-0.02, -0.44); g.closePath(); g.fillStyle = C.hood2; g.fill();
    ellipse(g, 0, -0.9, 0.3, 0.36, C.dark);
    ellipse(g, 0, -0.86, 0.23, 0.28, C.skin);
    g.lineWidth = 0.04; g.strokeStyle = '#8a5b5b'; g.beginPath(); g.moveTo(-0.14, -1.04); g.lineTo(-0.02, -0.84); g.stroke(); g.strokeStyle = OUT; g.lineWidth = 0.05;
    g.beginPath(); g.moveTo(0.02, -0.86); g.lineTo(0.09, -0.74); g.lineTo(0.0, -0.74); g.stroke();      // hidung
    const eye = mood === 'cast' ? C.rune : (mood === 'wrath' ? C.hot : C.eye);
    if (mood === 'hurt') { g.lineWidth = 0.045; g.strokeStyle = OUT; [-0.1, 0.1].forEach(function (x) { g.beginPath(); g.moveTo(x - 0.05, -0.98); g.lineTo(x + 0.05, -0.88); g.moveTo(x + 0.05, -0.98); g.lineTo(x - 0.05, -0.88); g.stroke(); }); }
    else { g.fillStyle = eye; [-0.1, 0.1].forEach(function (x) { g.beginPath(); g.ellipse(x, -0.93, 0.06, mood === 'laugh' ? 0.03 : 0.045, x < 0 ? 0.35 : -0.35, 0, TAU); g.fill(); }); }
    if (mood === 'laugh') { g.beginPath(); g.ellipse(0.0, -0.66, 0.1, 0.07, 0, 0, TAU); g.fillStyle = C.dark; g.fill(); g.stroke(); }
    else { g.lineWidth = 0.04; g.beginPath(); g.moveTo(-0.08, -0.65); g.lineTo(0.08, -0.65); g.stroke(); }
    // bahu-kerah tulang di bawah tudung
    g.lineWidth = 0.05; for (let i = -2; i <= 2; i++) ellipse(g, i * 0.16, -0.5 + Math.abs(i) * 0.03, 0.07, 0.08, C.bone);
  }
  function staff(g, up) {
    const hx = 0.88, hy = up ? -0.52 : -0.06;
    g.lineWidth = 0.2; g.strokeStyle = OUT; g.beginPath(); g.moveTo(0.52, -0.5); g.lineTo(up ? 0.74 : 0.72, up ? -0.55 : -0.1); g.lineTo(hx, hy + 0.04); g.stroke();
    g.lineWidth = 0.13; g.strokeStyle = C.robe2; g.beginPath(); g.moveTo(0.52, -0.5); g.lineTo(up ? 0.74 : 0.72, up ? -0.55 : -0.1); g.lineTo(hx, hy + 0.04); g.stroke();
    g.lineWidth = 0.13; g.strokeStyle = OUT; g.beginPath(); g.moveTo(hx, -1.1); g.lineTo(hx, 1.42); g.stroke();
    g.lineWidth = 0.07; g.strokeStyle = C.wood; g.beginPath(); g.moveTo(hx, -1.1); g.lineTo(hx, 1.42); g.stroke();
    g.lineWidth = 0.05; g.strokeStyle = OUT;
    poly(g, [[hx, -1.62], [hx + 0.17, -1.38], [hx, -1.1], [hx - 0.17, -1.38]], C.rune);
    poly(g, [[hx, -1.62], [hx + 0.17, -1.38], [hx, -1.38]], '#efd6ff');
    ellipse(g, hx, hy, 0.1, 0.1, C.skin);
  }

  function build(U, px) {
    const s = U * px, S = {};
    S.shadow = part(s, -1.1, 1.18, 2.2, 0.56, function (g) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 1.46, 0.9, 0.17, 0, 0, TAU); g.fill(); });
    S.robe = part(s, -1.2, -0.85, 2.4, 2.4, robe);
    S.armL = [part(s, -1.3, -0.8, 1.0, 1.4, function (g) { arm(g, false, -1); }), part(s, -1.3, -1.35, 1.1, 1.0, function (g) { arm(g, true, -1); })];
    S.head = { idle: null, hurt: null, laugh: null, cast: null, wrath: null };
    Object.keys(S.head).forEach(function (m) { S.head[m] = part(s, -0.66, -1.82, 1.32, 1.5, function (g) { head(g, m === 'idle' ? '' : m); }); });
    S.staff = [part(s, 0.4, -1.8, 1.0, 3.3, function (g) { staff(g, false); }), part(s, 0.4, -1.8, 1.0, 3.3, function (g) { staff(g, true); })];
    // siluet kilat: putih (kena) dan ungu (merapal) dari lapisan badan
    const box = { x0: -1.35, y0: -1.85, w: 2.7, h: 3.45 };
    ['#ffffff', '#a468ff'].forEach(function (col, i) {
      const p = part(s, box.x0, box.y0, box.w, box.h, function (g) { g.drawImage(S.robe.c, S.robe.x0, S.robe.y0, S.robe.w, S.robe.h); g.drawImage(S.armL[0].c, S.armL[0].x0, S.armL[0].y0, S.armL[0].w, S.armL[0].h); g.drawImage(S.head.idle.c, S.head.idle.x0, S.head.idle.y0, S.head.idle.w, S.head.idle.h); g.drawImage(S.staff[0].c, S.staff[0].x0, S.staff[0].y0, S.staff[0].w, S.staff[0].h); });
      const g = p.c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, p.c.width, p.c.height);
      S[i ? 'purple' : 'white'] = p;
    });
    return S;
  }
  function get(U, px) {
    const key = U + '@' + px;
    if (store.key !== key) { store.key = key; store.set = build(U, px); }
    return store.set;
  }
  function blit(ctx, p, U, dx, dy) { ctx.drawImage(p.c, p.x0 * U + dx, p.y0 * U + dy, p.w * U, p.h * U); }

  /* ---------- API ---------- */
  function draw(ctx, b, t) {
    const px = Math.round((ctx.getTransform().a || 1) * 4) / 4, U = Math.max(8, Math.round(b.R * 0.82 / 4) * 4), k = b.R * 0.82 / U, S = get(U, px);
    const U2 = U * k;
    let alpha = 1, sink = 0, dk = 0;
    if (b.defeated) { dk = clamp((b.defeatT - 0.25) / 1.9, 0, 1); if (dk >= 1) return; alpha = 1 - dk; sink = dk * 0.35 * U2; }
    const dtf = clamp(t - (b._pt == null ? t : b._pt), 0, 0.1); b._pt = t; if (b.castT > (b._pc || 0) + 0.05) b._fl = 0.3; b._pc = b.castT; if (b._fl > 0) b._fl -= dtf;
    const calm = GA.Quality && GA.Quality.calm(), float = calm ? 0 : Math.sin(t * 2.1) * 0.05 * U2, hf = calm ? 0 : Math.sin(t * 2.1 - 0.7) * 0.02 * U2;
    const laugh = !b.defeated && b.laughT > 0, castUp = b.castT > 0 || b.wrathT > 0, mood = b.defeated || b.hurt > 0 ? 'hurt' : (b.wrathT > 0 ? 'wrath' : (b.castT > 0 ? 'cast' : (laugh ? 'laugh' : 'idle')));
    const bounce = laugh ? Math.sin(t * 28) * 0.03 * U2 : 0, y = float + sink;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(0.86, 1); ctx.globalAlpha = alpha;
    ctx.drawImage(S.shadow.c, S.shadow.x0 * U2, S.shadow.y0 * U2, S.shadow.w * U2, S.shadow.h * U2);
    ctx.save(); ctx.scale(k, k); const u = U;
    blit(ctx, S.robe, u, 0, y / k); blit(ctx, S.armL[castUp ? 1 : 0], u, 0, y / k);
    blit(ctx, S.head[mood], u, 0, (y + hf + bounce) / k); blit(ctx, S.staff[castUp ? 1 : 0], u, 0, y / k);
    // kilat: putih saat kena (berkedip), ungu singkat saat mulai merapal
    if (b.hurt > 0 && !b.defeated && Math.floor(b.hurt * 22) % 2) { ctx.globalAlpha = 0.85 * alpha; blit(ctx, S.white, u, 0, y / k); }
    else if (b._fl > 0) { ctx.globalAlpha = 0.55 * alpha * Math.min(1, b._fl / 0.2); blit(ctx, S.purple, u, 0, y / k); }
    ctx.restore(); ctx.globalAlpha = 1;
    // cincin kristal (denyut tipis) · cincin sihir saat merapal · cincin amarah saat pergantian fase
    ctx.lineWidth = Math.max(1.5, 0.03 * U2);
    ctx.strokeStyle = C.rune; ctx.globalAlpha = (0.5 + 0.3 * Math.sin(t * 4)) * alpha; ctx.beginPath(); ctx.arc(0.88 * U2, -1.38 * U2 + y, 0.26 * U2 + Math.sin(t * 4) * 0.02 * U2, 0, TAU); ctx.stroke();
    if (b.castT > 0 && !b.defeated) { const c = (t * 0.9) % 1; ctx.globalAlpha = 1 - c; ctx.strokeStyle = '#b57dff'; ctx.lineWidth = Math.max(2, 0.07 * U2); ctx.beginPath(); ctx.arc(0.88 * U2, -1.38 * U2 + y, (0.3 + c * 1.5) * U2, 0, TAU); ctx.stroke(); }
    if (b.wrathT > 0 && !b.defeated) { const w = clamp(b.wrathT / 1.6, 0, 1), c = clamp(((1.8 - b.wrathT) * 1.1) % 1, 0, 1); ctx.globalAlpha = w * (1 - c); ctx.strokeStyle = C.hot; ctx.lineWidth = Math.max(2, 0.07 * U2); ctx.beginPath(); ctx.arc(0, 0.1 * U2, (0.6 + c * 1.5) * U2, 0, TAU); ctx.stroke(); }
    if (b.defeated && dk > 0.05) { ctx.globalAlpha = 1 - dk; ctx.strokeStyle = C.rune; ctx.lineWidth = Math.max(2, 0.08 * U2); ctx.beginPath(); ctx.arc(0, -0.4 * U2, (0.3 + dk * 1.8) * U2, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.restore();
  }

  function drawFigure(ctx, x, y, R, t, md) {
    draw(ctx, { x: x, y: y, R: R, hurt: md === 'hurt' ? 0.04 : 0, attackT: md === 'attack' ? 0.5 : 0, castT: md === 'cast' ? 0.5 : 0, laughT: md === 'laugh' || md === 'attack' ? 0.5 : 0, wrathT: 0, defeated: false, defeatT: 0 }, t);
  }

  GA.Wizard = { draw: draw, drawFigure: drawFigure, makeRig: function () { return {}; } };
})(window.GA = window.GA || {});
