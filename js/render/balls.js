/* balls.js — bola sihir bergaya DATAR (revisi 11): badan satu warna dengan 2 nada, rim gelap tipis, highlight kecil, motif rune sederhana yang BERBEDA per warna (aksesibilitas buta warna),
 * dan plakat gelap kecil di tengah supaya angka kontras. SATU atlas sprite per (radius terkuantisasi, px) — 8 warna × {dengan plakat, tanpa plakat} + bayangan datar + kilau — dirender sekali
 * (saat stage dimulai: `warm`) lalu hanya di-blit (drawImage). Tanpa rotasi 3D, bingkai malas, kabut/petir/asap, jejak, atau gradien per frame.
 * API (nama lama dipertahankan): warm(R, px), layer(ctx, 'shadow'|'gloss', x, y, r), drawOrb(ctx, x, y, r, ci, rot, px, hasText, t, heading, base), drawTrail (no-op), getSet, MOTIFS. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, TAU = Math.PI * 2;
  const store = { px: 0, n: 0, map: Object.create(null) };

  /** 8 motif rune (garis) berbeda: dipakai bersama bola khusus/uji keterbacaan. g sudah diterjemahkan ke pusat bola; r = radius. */
  const MOTIFS = [
    function (g, r) { for (let i = 0; i < 3; i++) { const a = i * TAU / 3; g.beginPath(); g.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.36, a + 2.4, a + 5.2); g.stroke(); } },
    function (g, r) { for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5; g.beginPath(); g.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * 0.2, a + 1.2, a + 5.1); g.stroke(); } },
    function (g, r) { for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66); g.lineTo(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93); g.stroke(); } },
    function (g, r) { g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 1.6, rr = r * (0.62 + 0.3 * t); if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); },
    function (g, r) { for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.78, cx = Math.cos(a) * r * 0.78, cy = Math.sin(a) * r * 0.78, s = r * 0.14; g.beginPath(); g.moveTo(cx + s, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s, cy); g.lineTo(cx, cy - s); g.closePath(); g.stroke(); } },
    function (g, r) { for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; g.beginPath(); g.arc(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * (i % 2 ? 0.04 : 0.075), 0, TAU); g.stroke(); } },
    function (g, r) { g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, rr = r * (i % 2 ? 0.7 : 0.9); if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.stroke(); },
    function (g, r) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; if (i) g.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); else g.moveTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); } g.closePath(); g.stroke(); }
  ];

  function mk(w) { const c = document.createElement('canvas'); c.width = c.height = w; return c; }

  /** Satu sprite bola: warna ci, dengan/tanpa plakat angka. */
  function orbSprite(qr, px, ci, plaque) {
    const pad = 4, S = Math.ceil((qr * 2 + pad * 2) * px), c = mk(S), g = c.getContext('2d'), o = qr + pad, col = Theme.ballColors[ci % 8];
    g.scale(px, px); g.translate(o, o);
    g.fillStyle = col[2]; g.beginPath(); g.arc(0, 0, qr, 0, TAU); g.fill();                                       // nada gelap (dasar)
    g.fillStyle = col[1]; g.beginPath(); g.arc(-qr * 0.08, -qr * 0.1, qr * 0.9, 0, TAU); g.fill();                 // nada utama (bergeser ke kiri-atas = bulan sabit gelap di kanan-bawah)
    g.strokeStyle = col[0]; g.globalAlpha = 0.85; g.lineWidth = Math.max(1.5, qr * 0.08); g.lineCap = 'round'; g.lineJoin = 'round'; MOTIFS[ci % 8](g, qr * 0.9); g.globalAlpha = 1;      // rune berbeda per warna
    g.strokeStyle = '#12101f'; g.lineWidth = Math.max(1.6, qr * 0.1); g.beginPath(); g.arc(0, 0, qr - g.lineWidth / 2, 0, TAU); g.stroke();      // rim gelap tipis
    g.strokeStyle = col[0]; g.globalAlpha = 0.55; g.lineWidth = Math.max(1, qr * 0.05); g.beginPath(); g.arc(0, 0, qr * 0.84, Math.PI * 1.05, Math.PI * 1.55); g.stroke(); g.globalAlpha = 1;      // pantulan rim
    if (plaque) { g.fillStyle = 'rgba(14,9,32,0.86)'; g.beginPath(); g.arc(0, 0, qr * 0.6, 0, TAU); g.fill(); g.strokeStyle = col[0]; g.globalAlpha = 0.7; g.lineWidth = Math.max(1, qr * 0.05); g.stroke(); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-qr * 0.42, -qr * 0.55, qr * 0.2, qr * 0.1, -0.6, 0, TAU); g.fill();      // highlight kecil
    return c;
  }

  function shadowSprite(qr, px) {
    const S = Math.ceil((qr * 2 + 16) * px), c = mk(S), g = c.getContext('2d'); g.scale(px, px); g.translate(qr + 8, qr + 8);
    g.fillStyle = 'rgba(2,3,10,0.38)'; g.beginPath(); g.arc(0, 0, qr * 1.02, 0, TAU); g.fill(); return c;
  }
  function glossSprite(qr, px) {
    const S = Math.ceil((qr * 2 + 10) * px), c = mk(S), g = c.getContext('2d'); g.scale(px, px); g.translate(qr + 5, qr + 5);
    g.strokeStyle = '#12101f'; g.lineWidth = Math.max(1.6, qr * 0.1); g.beginPath(); g.arc(0, 0, qr - g.lineWidth / 2, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-qr * 0.42, -qr * 0.55, qr * 0.2, qr * 0.1, -0.6, 0, TAU); g.fill(); return c;
  }

  function getSet(ci, r, px) {
    if (store.px !== px || store.n > 24) { store.px = px; store.map = Object.create(null); store.n = 0; }
    const qr = Math.max(4, Math.round(r / 2) * 2);
    let s = store.map[qr];
    if (!s) { s = store.map[qr] = { qr: qr, orb: [], bare: [], shadow: shadowSprite(qr, px), gloss: glossSprite(qr, px), pad: 4 }; store.n++; for (let i = 0; i < 8; i++) { s.orb.push(orbSprite(qr, px, i, true)); s.bare.push(orbSprite(qr, px, i, false)); } }
    return s;
  }

  /** Siapkan atlas untuk radius R (dipanggil selama layar pembuka stage). */
  function warm(R, px) { getSet(0, R, px); getSet(0, R * 1.08, px); getSet(0, R * 1.12, px); }

  function drawOrb(ctx, x, y, r, ci, rot, px, hasText) {
    const s = getSet(ci, r, px || store.px || 1), k = r / s.qr, d = (s.qr * 2 + s.pad * 2) * k, spr = (hasText ? s.orb : s.bare)[ci % 8];
    ctx.drawImage(s.shadow, x + r * 0.12 - (s.qr + 8) * k, y + r * 0.22 - (s.qr + 8) * k, (s.qr * 2 + 16) * k, (s.qr * 2 + 16) * k);
    ctx.drawImage(spr, x - (s.qr + s.pad) * k, y - (s.qr + s.pad) * k, d, d);
  }


  /** Bola khusus datar: 'frost' (beku: biru muda + kristal putih) dan 'egg' (telur emas: emas + telur) — sprite prarender per radius. */
  function specialSprite(qr, px, kind) {
    const pad = 4, S = Math.ceil((qr * 2 + pad * 2) * px), c = mk(S), g = c.getContext('2d'), o = qr + pad;
    g.scale(px, px); g.translate(o, o); g.lineCap = 'round'; g.lineJoin = 'round';
    if (kind === 'frost') {
      g.fillStyle = '#2b78b8'; g.beginPath(); g.arc(0, 0, qr, 0, TAU); g.fill(); g.fillStyle = '#8ad0f4'; g.beginPath(); g.arc(-qr * 0.08, -qr * 0.1, qr * 0.9, 0, TAU); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, qr * 0.1);
      for (let i = 0; i < 3; i++) { const a = i * 1.0472 + 0.2, cx = Math.cos(a) * qr * 0.66, cy = Math.sin(a) * qr * 0.66; g.beginPath(); g.moveTo(-cx, -cy); g.lineTo(cx, cy); g.stroke(); }
    } else {
      g.fillStyle = '#a8741a'; g.beginPath(); g.arc(0, 0, qr, 0, TAU); g.fill(); g.fillStyle = '#f6c445'; g.beginPath(); g.arc(-qr * 0.08, -qr * 0.1, qr * 0.9, 0, TAU); g.fill();
      g.fillStyle = '#fff2b8'; g.strokeStyle = '#7a4a08'; g.lineWidth = Math.max(1.5, qr * 0.06);
      const w = qr * 0.44, h = qr * 0.6; g.beginPath(); g.moveTo(0, -h); g.bezierCurveTo(w * 0.95, -h * 0.95, w * 1.05, h * 0.7, 0, h); g.bezierCurveTo(-w * 1.05, h * 0.7, -w * 0.95, -h * 0.95, 0, -h); g.closePath(); g.fill(); g.stroke();
    }
    g.strokeStyle = '#12101f'; g.lineWidth = Math.max(1.6, qr * 0.1); g.beginPath(); g.arc(0, 0, qr - g.lineWidth / 2, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(-qr * 0.42, -qr * 0.55, qr * 0.2, qr * 0.1, -0.6, 0, TAU); g.fill();
    return c;
  }
  function drawSpecial(ctx, kind, x, y, r) {
    const s = getSet(0, r, store.px || 1), k = r / s.qr, key = 'sp' + kind;
    if (!s[key]) s[key] = specialSprite(s.qr, store.px || 1, kind);
    ctx.drawImage(s.shadow, x + r * 0.12 - (s.qr + 8) * k, y + r * 0.22 - (s.qr + 8) * k, (s.qr * 2 + 16) * k, (s.qr * 2 + 16) * k);
    ctx.drawImage(s[key], x - (s.qr + s.pad) * k, y - (s.qr + s.pad) * k, (s.qr * 2 + s.pad * 2) * k, (s.qr * 2 + s.pad * 2) * k);
  }
  function layer(ctx, kind, x, y, r) {
    const s = getSet(0, r, store.px || 1), k = r / s.qr;
    if (kind === 'shadow') ctx.drawImage(s.shadow, x + r * 0.12 - (s.qr + 8) * k, y + r * 0.22 - (s.qr + 8) * k, (s.qr * 2 + 16) * k, (s.qr * 2 + 16) * k);
    else ctx.drawImage(s.gloss, x - (s.qr + 5) * k, y - (s.qr + 5) * k, (s.qr * 2 + 10) * k, (s.qr * 2 + 10) * k);
  }

  GA.Balls = { drawSpecial: drawSpecial, warm: warm, layer: layer, drawOrb: drawOrb, drawTrail: function () { }, getSet: getSet, MOTIFS: MOTIFS };
})(window.GA = window.GA || {});
