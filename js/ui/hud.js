/* hud.js — HUD in-game yang digambar di canvas: bingkai kayu berukir bertrim emas di tepi atas (tidak menutupi jalur), plakat skor ala
 * odometer, plakat step (permata), plakat soal perkamen berbingkai emas dengan animasi ganti soal, bilah progres berisi api yang mengalir,
 * penghitung telur bercahaya, tombol Jeda, serta chip status dan panel umpan balik berbahan kayu.
 * Bingkai statis dirender sekali per ukuran (cache); hanya isi dinamis yang digambar tiap frame. Token warna: Theme.ui. */
(function (GA) {
  'use strict';
  const T = GA.Theme, MT = GA.MathText, TX = GA.Textures, U = T.ui, TAU = Math.PI * 2;
  const cache = { key: '', c: null, geo: null };

  function rr(ctx, x, y, w, h, r) { GA.Path.roundRect(ctx, x, y, w, h, r); }

  function metrics(L) {
    const btn = Math.min(76, Math.max(56, 48 / L.scale));
    if (L.portrait) return { h: 150, btn: btn, pause: { x: L.W - 12 - btn, y: 8, w: btn, h: btn } };
    return { h: 84, btn: btn, pause: { x: L.W - 12 - btn, y: (84 - btn) / 2, w: btn, h: btn } };
  }

  /** Susunan plakat (koordinat logis) untuk potret / lanskap. */
  function geo(L) {
    const m = metrics(L), W = L.W, p = m.pause;
    if (L.portrait) {
      const ex = 300; return { m: m, score: { x: 10, y: 8, w: 184, h: 58 }, step: { x: 200, y: 8, w: 92, h: 58 }, eggs: { x: ex, y: 8, w: p.x - 8 - ex, h: 58 },
        q: { x: 10, y: 74, w: W - 20, h: 58 }, prog: { x: 24, y: 137, w: W - 48, h: 8 } };
    }
    const q = { x: 272, y: 6, w: W - 272 - 252, h: 62 }, ex = W - 244;
    return { m: m, score: { x: 10, y: 10, w: 178, h: 64 }, step: { x: 194, y: 10, w: 72, h: 64 }, eggs: { x: ex, y: 10, w: p.x - 8 - ex, h: 64 }, q: q, prog: { x: q.x + 16, y: q.y + q.h + 5, w: q.w - 32, h: 8 } };
  }

  /* ---------- bingkai statis ---------- */
  function inset(g, r, rad) {
    rr(g, r.x, r.y, r.w, r.h, rad); const gr = g.createLinearGradient(0, r.y, 0, r.y + r.h); gr.addColorStop(0, '#120a05'); gr.addColorStop(1, '#2c180a'); g.fillStyle = gr; g.fill();
    g.save(); rr(g, r.x, r.y, r.w, r.h, rad); g.clip(); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(r.x, r.y, r.w, 5); g.restore();       // inner shadow atas
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,225,150,0.35)'; rr(g, r.x + 1, r.y + 1, r.w - 2, r.h - 2, rad); g.stroke();                       // bibir emas
    g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 1.5; rr(g, r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1, rad + 1); g.stroke();
  }

  function stud(g, x, y, r) {
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); gr.addColorStop(0, U.gold[0]); gr.addColorStop(0.6, U.gold[1]); gr.addColorStop(1, U.gold[2]);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(x + 0.8, y + 1.2, r, 0, TAU); g.fill(); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  function buildFrame(L) {
    const G = geo(L), m = G.m, key = [L.W, L.H, L.portrait, L.px.toFixed(2)].join('|');
    if (cache.key === key) return cache;
    const c = document.createElement('canvas'); c.width = Math.ceil(L.W * L.px); c.height = Math.ceil((m.h + 8) * L.px);
    const g = c.getContext('2d'); g.scale(L.px, L.px);
    const W = L.W, h = m.h;
    // papan kayu
    g.fillStyle = g.createPattern(TX.wood(256, 128, 7, [U.wood[0], U.wood[1]]), 'repeat'); g.fillRect(0, 0, W, h);
    const sh = g.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,220,160,0.2)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = sh; g.fillRect(0, 0, W, h);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, h, W, 8);
    // trim emas bawah + garis gelap
    const tg = g.createLinearGradient(0, h - 7, 0, h); tg.addColorStop(0, U.gold[0]); tg.addColorStop(0.5, U.gold[1]); tg.addColorStop(1, U.gold[2]);
    g.fillStyle = '#1a0d05'; g.fillRect(0, h - 8, W, 8); g.fillStyle = tg; g.fillRect(0, h - 7, W, 3); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, h - 7, W, 1);
    g.fillStyle = 'rgba(255,230,170,0.5)'; g.fillRect(0, 0, W, 2);
    // paku keling
    for (let x = 30; x < W; x += 96) if (!(x > G.q.x - 18 && x < G.q.x + G.q.w + 18 && L.portrait === false) ) stud(g, x, h - 13, 3);
    // cekungan: skor, step, telur
    [G.score, G.step, G.eggs].forEach(function (r) { inset(g, r, 12); });
    // plakat soal: bingkai emas + perkamen
    const q = G.q, gd = g.createLinearGradient(0, q.y, 0, q.y + q.h); gd.addColorStop(0, U.gold[0]); gd.addColorStop(0.45, U.gold[1]); gd.addColorStop(1, U.gold[2]);
    g.fillStyle = 'rgba(0,0,0,0.45)'; rr(g, q.x + 2, q.y + 4, q.w, q.h, 16); g.fill();
    g.fillStyle = gd; rr(g, q.x, q.y, q.w, q.h, 16); g.fill();
    const ix = q.x + 5, iy = q.y + 5, iw = q.w - 10, ih = q.h - 10, pg = g.createLinearGradient(0, iy, 0, iy + ih); pg.addColorStop(0, U.parchment[0]); pg.addColorStop(1, U.parchment[1]);
    g.fillStyle = pg; rr(g, ix, iy, iw, ih, 12); g.fill();
    g.save(); rr(g, ix, iy, iw, ih, 12); g.clip(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.5; g.drawImage(TX.fbm(8, 256, 4), ix, iy, Math.max(iw, 256), Math.max(ih, 256)); g.restore();
    g.save(); rr(g, ix, iy, iw, ih, 12); g.clip(); g.fillStyle = 'rgba(80,40,10,0.28)'; g.fillRect(ix, iy, iw, 4); g.fillRect(ix, iy + ih - 3, iw, 3); g.restore();   // inner shadow
    [[q.x + 9, q.y + 9], [q.x + q.w - 9, q.y + 9], [q.x + 9, q.y + q.h - 9], [q.x + q.w - 9, q.y + q.h - 9]].forEach(function (p) { stud(g, p[0], p[1], 2.8); });
    // saluran progres
    const pr = G.prog; rr(g, pr.x - 3, pr.y - 3, pr.w + 6, pr.h + 6, 8); g.fillStyle = '#150b05'; g.fill(); g.strokeStyle = U.gold[2]; g.lineWidth = 1.5; g.stroke();
    // tombol jeda: soket batu + muka emas
    const p = m.pause, cx = p.x + p.w / 2, cy = p.y + p.h / 2, rad = p.w / 2;
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(cx + 1, cy + 3, rad + 2, 0, TAU); g.fill();
    const sg = g.createRadialGradient(cx - rad * 0.3, cy - rad * 0.35, rad * 0.1, cx, cy, rad); sg.addColorStop(0, U.gold[0]); sg.addColorStop(0.55, U.gold[1]); sg.addColorStop(1, U.gold[2]);
    g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#3a200a'; g.stroke();
    g.fillStyle = '#2a160a'; g.beginPath(); g.arc(cx, cy, rad * 0.72, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,230,160,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, rad * 0.72, 0, TAU); g.stroke();
    const bw = rad * 0.17, bh = rad * 0.62; g.fillStyle = U.gold[0];
    rr(g, cx - bw * 1.7, cy - bh / 2, bw, bh, 2); g.fill(); rr(g, cx + bw * 0.7, cy - bh / 2, bw, bh, 2); g.fill();
    cache.key = key; cache.c = c; cache.geo = G;
    return cache;
  }

  /* ---------- isi dinamis ---------- */
  /** Telur di HUD: sprite telur bersisik yang sama dengan di sarang (elemen mengikuti tema); kosong = siluet redup. */
  /** Ikon alasan perubahan soal: ANSWERED_CORRECT = centang hijau, TIMEOUT = jam, LOST_TARGET = pusaran portal. */
  function reasonIcon(ctx, kind, x, y, r, a) {
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = kind === 'ANSWERED_CORRECT' ? '#2fbf71' : (kind === 'TIMEOUT' ? '#ff7a2e' : '#7a5cff'); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, r * 0.18);
    if (kind === 'ANSWERED_CORRECT') { ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(-r * 0.1, r * 0.35); ctx.lineTo(r * 0.5, -r * 0.35); ctx.stroke(); }
    else if (kind === 'TIMEOUT') { ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(0, 0); ctx.lineTo(r * 0.38, r * 0.22); ctx.stroke(); }
    else { ctx.beginPath(); for (let k = 0; k < 14; k++) { const u = k / 13, an = u * 7, rr2 = r * (0.1 + u * 0.55); ctx.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2); } ctx.stroke(); }
    ctx.restore();
  }

  function egg(ctx, x, y, s, filled, t, i) {

    GA.Eggs.draw(ctx, x, y, s * 0.31, { el: GA.Eggs.elFor(GA.Theme.scene, i), state: filled ? 'ok' : 'empty', t: t, i: i, rot: 0, hud: true });
  }

  function gem(ctx, x, y, s, state, t) {
    const col = state === 2 ? ['#d8ffd8', '#3fbf6a', '#146a34'] : (state === 1 ? ['#fff3b0', '#ffc23c', '#a8660a'] : ['#8a8478', '#4a463e', '#25221c']);
    ctx.save(); ctx.translate(x, y); const k = state === 1 ? 1 + 0.08 * Math.sin(t * 4) : 1; ctx.scale(k, k);
    if (state === 1) { const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.2); gl.addColorStop(0, 'rgba(255,220,100,0.6)'); gl.addColorStop(1, 'rgba(255,220,100,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, s * 1.2, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.8, 0); ctx.closePath();
    const g = ctx.createLinearGradient(-s, -s, s, s); g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(1, col[2]); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(20,10,0,0.8)'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(s * 0.35, -s * 0.1); ctx.lineTo(0, 0); ctx.lineTo(-s * 0.5, -s * 0.1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function fireBar(ctx, pr, pf, t, boss) {
    if (pf <= 0.001) return;
    const w = Math.max(10, pr.w * Math.min(1, pf));
    ctx.save(); rr(ctx, pr.x, pr.y, w, pr.h, 4); ctx.clip();
    const g = ctx.createLinearGradient(pr.x, 0, pr.x + pr.w, 0);
    if (boss) { g.addColorStop(0, '#5a2ad0'); g.addColorStop(0.6, '#b890ff'); g.addColorStop(1, '#ffffff'); } else { g.addColorStop(0, '#d9361a'); g.addColorStop(0.5, '#ff9a3c'); g.addColorStop(1, '#fff3a0'); }
    ctx.fillStyle = g; ctx.fillRect(pr.x, pr.y, w, pr.h);
    ctx.globalCompositeOperation = 'lighter';   // api mengalir: gelombang terang bergerak ke kanan
    for (let i = 0; i < 4; i++) { const x = pr.x + ((t * 60 + i * pr.w / 4) % pr.w); const sg = ctx.createLinearGradient(x - 24, 0, x + 24, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.5)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(x - 24, pr.y, 48, pr.h); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, pr.x + 1, pr.y + 1, w - 2, 2.5, 1.5); ctx.fill();
    // lidah api di ujung
    const tx = pr.x + w, ty = pr.y + pr.h / 2, fl = 0.8 + 0.2 * Math.sin(t * 18);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 14 * fl); fg.addColorStop(0, boss ? 'rgba(220,200,255,0.9)' : 'rgba(255,220,120,0.9)'); fg.addColorStop(1, 'rgba(255,120,30,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(tx, ty, 14 * fl, 0, TAU); ctx.fill(); ctx.restore();
  }

  function plank(ctx, x, y, w, h, col) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x, y + 4, w, h, 14); ctx.fill();
    ctx.fillStyle = ctx.createPattern(TX.wood(256, 128, 7, [U.wood[0], U.wood[1]]), 'repeat'); rr(ctx, x, y, w, h, 14); ctx.fill();
    ctx.save(); rr(ctx, x, y, w, h, 14); ctx.clip(); ctx.fillStyle = col; ctx.globalAlpha = 0.55; ctx.fillRect(x, y, w, h * 0.5); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + h - 5, w, 5); ctx.restore();
    ctx.lineWidth = 3; const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, U.gold[0]); g.addColorStop(1, U.gold[2]); ctx.strokeStyle = g; rr(ctx, x, y, w, h, 14); ctx.stroke();
  }

  function draw(ctx, run, L, t) {
    const F = buildFrame(L), G = F.geo, m = G.m, W = L.W, por = L.portrait, Fo = T.fonts;
    ctx.drawImage(F.c, 0, 0, W, m.h + 8);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';

    // skor: odometer (sel digit emas pada kaca gelap)
    const sc = G.score, txt = String(Math.max(0, Math.round(run.scoreShown))), n = Math.max(6, txt.length), padded = ('0000000' + txt).slice(-n);
    ctx.fillStyle = '#c9a060'; ctx.font = '700 11px ' + Fo.title; ctx.fillText('SKOR', sc.x + 12, sc.y + 14);
    const cw = (sc.w - 20) / n, ch = sc.h - 26, cy0 = sc.y + 19;
    for (let i = 0; i < n; i++) {
      const x = sc.x + 10 + i * cw, lead = i < n - txt.length;
      ctx.fillStyle = '#0c0603'; rr(ctx, x + 1, cy0, cw - 2, ch, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 1, cy0 + ch / 2, cw - 2, 1);
      const gg = ctx.createLinearGradient(0, cy0, 0, cy0 + ch); gg.addColorStop(0, lead ? '#5a4a2a' : U.gold[0]); gg.addColorStop(1, lead ? '#3a2e18' : U.gold[1]);
      ctx.fillStyle = gg; ctx.font = '800 ' + Math.floor(ch * 0.86) + 'px ' + Fo.ui; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(padded[i], x + cw / 2, cy0 + ch / 2 + 1);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    // stage: tiga permata + "n/3"
    const sp = G.step; ctx.fillStyle = '#c9a060'; ctx.font = '700 11px ' + Fo.title; ctx.textAlign = 'center'; ctx.fillText('STAGE', sp.x + sp.w / 2, sp.y + 14);
    for (let i = 0; i < 3; i++) gem(ctx, sp.x + sp.w / 2 + (i - 1) * (sp.w * 0.24), sp.y + sp.h * 0.5, sp.w * 0.09, i < run.stepNo - 1 ? 2 : (i === run.stepNo - 1 ? 1 : 0), t);
    ctx.fillStyle = U.gold[0]; ctx.font = '800 ' + (por ? 15 : 14) + 'px ' + Fo.ui; ctx.fillText(run.stepNo + '/3', sp.x + sp.w / 2, sp.y + sp.h - 7);
    ctx.textAlign = 'left';

    // telur: selalu 3 (nyawa); telur yang baru pecah bergetar sesaat
    const ep = G.eggs, n2 = run.maxLives, es = Math.min(ep.h * 0.95, (ep.w - 8) / n2 * 1.08);
    for (let i = 0; i < n2; i++) {
      const x = ep.x + ep.w / 2 + (i - (n2 - 1) / 2) * (ep.w - 14) / n2, lost = run.lifeLostT > 0 && i === run.lives;
      egg(ctx, x + (lost ? Math.sin(t * 60) * 3 : 0), ep.y + ep.h / 2 + (lost ? -3 : 0), es, i < run.lives, t, i);
    }

    // plakat soal
    const q = G.q, pop = run.qPop > 0 ? Math.min(1, run.qPop / 0.38) : 0, qt = run.q;
    if (qt) {
      const hasNote = !!qt.note, inner = q.h - (hasNote ? 30 : 20), ease = pop * pop;
      ctx.save(); rr(ctx, q.x + 6, q.y + 6, q.w - 12, q.h - 12, 11); ctx.clip();
      ctx.translate(q.x + q.w / 2, q.y + q.h / 2 + (hasNote ? -6 : 1) + ease * 16); ctx.globalAlpha = 1 - ease * 0.85; ctx.scale(1 + ease * 0.08, 1 + ease * 0.08);
      const size = MT.fit(ctx, qt.text, q.w - 140, inner, por ? 44 : 42);
      MT.draw(ctx, qt.text, 0, 0, size, '#2a1a3a', null);
      ctx.restore();
      if (pop > 0) {   // kilau menyapu plakat saat soal berganti
        ctx.save(); rr(ctx, q.x + 6, q.y + 6, q.w - 12, q.h - 12, 11); ctx.clip(); const sx = q.x + (1 - pop) * (q.w + 80) - 40, sg = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(sx - 30, q.y, 60, q.h); ctx.restore();
      }
      if (hasNote) { ctx.font = '700 13px ' + Fo.ui; ctx.fillStyle = '#9a3a10'; ctx.textAlign = 'center'; ctx.fillText(qt.note, q.x + q.w / 2, q.y + q.h - 10); ctx.textAlign = 'left'; }
    }
    // transisi soal yang sah: soal lama selesai (memudar + centang) lalu soal baru masuk; TIMEOUT / LOST_TARGET diberi ikon alasan singkat
    const tr = run.qTrans;
    if (tr) {
      const p = Math.min(1, tr.t / 0.38);
      if (tr.from && p < 1) {
        ctx.save(); rr(ctx, q.x + 6, q.y + 6, q.w - 12, q.h - 12, 11); ctx.clip();
        ctx.translate(q.x + q.w / 2, q.y + q.h / 2 - p * 14); ctx.globalAlpha = (1 - p) * 0.9;
        const sz = MT.fit(ctx, tr.from.text, q.w - 140, q.h - 20, por ? 44 : 42); MT.draw(ctx, tr.from.text, 0, 0, sz, tr.solved ? '#1f6b3a' : '#2a1a3a', null);
        ctx.restore();
      }
      const hold = tr.solved ? 0.6 : 1.3;
      if (tr.reason !== 'STEP_START' && tr.reason !== 'STEP_RESTART' && tr.t < hold) reasonIcon(ctx, tr.reason, q.x + q.w - 30, q.y + q.h / 2, Math.min(14, q.h * 0.28), Math.min(1, (hold - tr.t) / 0.25));
    }
    if (run.qExpire > 0) { ctx.save(); rr(ctx, q.x + 6, q.y + 6, q.w - 12, q.h - 12, 11); ctx.clip(); ctx.fillStyle = 'rgba(255,60,70,' + (0.2 + 0.2 * Math.sin(t * 30)).toFixed(2) + ')'; ctx.fillRect(q.x, q.y, q.w, q.h); ctx.restore(); }
    if (!qt && !(tr && tr.from && tr.t < 0.38)) {   // belum ada soal aktif: tiga titik berdenyut

      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(90,50,20,' + (0.25 + 0.55 * Math.max(0, Math.sin(t * 4 - i * 0.9))).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(q.x + q.w / 2 + (i - 1) * 18, q.y + q.h / 2, 5, 0, TAU); ctx.fill(); }
    }
    // progres soal "12/20" di sisi kiri plakat: ikon bola + angka
    {
      const bx = q.x + 18, by2 = q.y + q.h / 2, br = Math.min(11, q.h * 0.2);
      const og = ctx.createRadialGradient(bx - br * 0.3, by2 - br * 0.3, 1, bx, by2, br); og.addColorStop(0, '#d8b8ff'); og.addColorStop(0.6, '#7a3ae0'); og.addColorStop(1, '#2a1060');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(bx, by2, br, 0, TAU); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1a0a40'; ctx.stroke();
      ctx.font = '800 ' + (por ? 17 : 16) + 'px ' + Fo.ui; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#5a2a08';
      ctx.fillText(run.correct + '/' + run.total, bx + br + 6, by2 + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    if (run.qTimeMax) {   // batas waktu: sumbu menyala di tepi bawah plakat
      const f = Math.max(0, run.qTime / run.qTimeMax), tw = q.w - 44;
      ctx.fillStyle = 'rgba(60,30,10,0.25)'; rr(ctx, q.x + 22, q.y + q.h - 11, tw, 5, 2.5); ctx.fill();
      ctx.fillStyle = f > 0.5 ? '#2fbf71' : (f > 0.25 ? '#ffb02e' : '#ff4d5e'); rr(ctx, q.x + 22, q.y + q.h - 11, Math.max(5, tw * f), 5, 2.5); ctx.fill();
    }

    // progres (api)
    fireBar(ctx, G.prog, Math.min(1, run.progress), t, !!run.boss);

    // di bawah HUD: kombo, status, umpan balik
    const by = m.h + 12;
    if (run.combo >= 2) {
      const k = 1 + (run.comboPulse > 0 ? run.comboPulse * 0.6 : 0);
      ctx.save(); ctx.translate(16, by + 18); ctx.scale(k, k); ctx.font = '800 22px ' + Fo.ui; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(30,12,4,0.92)'; ctx.lineJoin = 'round';
      const ct = 'KOMBO ×' + run.combo; ctx.strokeText(ct, 0, 0); const cg = ctx.createLinearGradient(0, -12, 0, 12); cg.addColorStop(0, '#fff3a0'); cg.addColorStop(1, '#ff8a2a'); ctx.fillStyle = cg; ctx.fillText(ct, 0, 0); ctx.restore();
    }
    let sy = by + 18; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const chip = function (txt, col) {
      ctx.font = '800 15px ' + Fo.ui; const w = ctx.measureText(txt).width + 24, x1 = por ? W / 2 + w / 2 : W - 14;
      plank(ctx, x1 - w, sy - 14, w, 28, col); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(txt, x1 - w / 2, sy + 1); sy += 36; ctx.textAlign = 'right';
    };
    if (run.slowT > 0) chip('Lambat ' + Math.ceil(run.slowT) + 'd', '#3aa0e0');
    if (run.shooter && run.shooter.frozen) chip('Naga beku', '#5a80e0');

    if (run.feedback && run.feedback.t > 0) {
      const f = run.feedback, a = Math.min(1, f.t * 3); ctx.globalAlpha = a;
      let w = MT.measure(ctx, f.text, 26).w; ctx.font = '700 16px ' + Fo.ui; if (f.hint) w = Math.max(w, ctx.measureText(f.hint).width);
      w = Math.min(W - 24, w + 44); const h = f.hint ? 70 : 48, fy = por ? m.h + 56 : m.h + 12, fx = W / 2 - w / 2;
      plank(ctx, fx, fy, w, h, f.good ? '#2faa5a' : '#c83048');
      const fs = MT.fit(ctx, f.text, w - 28, f.hint ? 34 : h - 14, 26); MT.draw(ctx, f.text, W / 2, fy + (f.hint ? 22 : h / 2), fs, '#fff', 'rgba(30,10,4,0.9)', 4);
      if (f.hint) { ctx.font = '700 15px ' + Fo.ui; ctx.fillStyle = '#ffe9d0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.hint, W / 2, fy + 50, w - 20); }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  GA.HUD = { metrics: metrics, geo: geo, draw: draw, invalidate: function () { cache.key = ''; } };
})(window.GA = window.GA || {});
