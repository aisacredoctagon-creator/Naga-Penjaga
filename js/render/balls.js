/* balls.js — bola sihir 3D: kristal bernebula dengan ukiran rune, kilau tetap tegak, plakat angka, dan bayangan ke alur.
 *
 * Dipisah menjadi lapisan yang di-cache sebagai sprite (per radius terkuantisasi × warna):
 *   body    badan + nebula + rune (BERPUTAR mengikuti gerak bola; tanpa bayangan arah)
 *   gloss   pencahayaan tetap (kilau, rim light, bayangan sisi gelap) — sama untuk semua warna, TIDAK ikut berputar
 *   plaque  plakat gelap bertepi emas di tengah, supaya angka selalu terbaca di semua warna
 *   shadow  bayangan lembut ke alur
 * Tiap warna punya motif rune berbeda (8 motif) agar bisa dibedakan tanpa bergantung pada warna saja. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, TAU = Math.PI * 2;
  const store = { px: 0, map: Object.create(null), n: 0 };

  /* ---------- 8 motif rune (digambar sebagai goresan pada cincin 0,68r – 0,92r) ---------- */
  const MOTIFS = [
    function (g, r) { for (let i = 0; i < 3; i++) { const a = i * TAU / 3; g.beginPath(); g.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.36, a + 2.4, a + 5.2); g.stroke(); } },                         // triskelion
    function (g, r) { for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5; g.beginPath(); g.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * 0.2, a + 1.2, a + 5.1); g.stroke(); } },        // sabit
    function (g, r) { for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66); g.lineTo(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93); g.stroke(); g.beginPath(); g.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.07, 0, TAU); g.stroke(); } }, // silang
    function (g, r) { g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 1.6, rr = r * (0.62 + 0.3 * t); if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); }, // spiral
    function (g, r) { for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.78; const cx = Math.cos(a) * r * 0.78, cy = Math.sin(a) * r * 0.78, s = r * 0.14; g.beginPath(); g.moveTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); g.lineTo(cx - Math.sin(a) * s * 0.7, cy + Math.cos(a) * s * 0.7); g.lineTo(cx - Math.cos(a) * s, cy - Math.sin(a) * s); g.lineTo(cx + Math.sin(a) * s * 0.7, cy - Math.cos(a) * s * 0.7); g.closePath(); g.stroke(); } }, // belah ketupat
    function (g, r) { for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; g.beginPath(); g.arc(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * (i % 2 ? 0.04 : 0.075), 0, TAU); g.stroke(); } },  // titik
    function (g, r) { g.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, rr = r * (i % 2 ? 0.7 : 0.9); if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); }, // zigzag
    function (g, r) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3; if (i) g.lineTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); else g.moveTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82); } g.closePath(); g.stroke(); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.3; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66); g.lineTo(-Math.cos(a) * r * 0.66, -Math.sin(a) * r * 0.66); g.stroke(); } } // heksagon
  ];

  function mk(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

  function renderBody(qr, ci, px) {
    const pad = 5, size = Math.ceil((qr * 2 + pad * 2) * px), c = mk(size), g = c.getContext('2d'), col = Theme.ballColors[ci % Theme.ballColors.length];
    const o = qr + pad, r = qr;
    g.scale(px, px); g.translate(o, o);
    // cahaya luar tipis
    const gl = g.createRadialGradient(0, 0, r * 0.85, 0, 0, r + pad); gl.addColorStop(0, col[1]); gl.addColorStop(1, 'rgba(140,100,255,0)');
    g.globalAlpha = 0.5; g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r + pad, 0, TAU); g.fill(); g.globalAlpha = 1;
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
    const bg = g.createRadialGradient(0, 0, 0, 0, 0, r); bg.addColorStop(0, col[0]); bg.addColorStop(0.45, col[1]); bg.addColorStop(1, col[2]);
    g.fillStyle = bg; g.fillRect(-r, -r, r * 2, r * 2);
    // nebula (noise berlapis) + gumpalan terang yang berputar bersama badan
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const tex = GA.Textures.fbm(77, 256, 5);
    g.translate((o - r) * px, (o - r) * px);   // geser pola agar tiap bola bervariasi
    g.restore();
    GA.Noise.overlay(g, size, size, tex, 'soft-light', 0.95, qr * 2 * px / 256 * 1.5 + ci * 0.03);
    GA.Noise.overlay(g, size, size, tex, 'overlay', 0.22, qr * 2 * px / 256 * 3.1);
    const rnd = GA.Noise.rng(ci * 31 + 5);
    g.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) {
      const a = rnd() * TAU, d = r * (0.2 + rnd() * 0.4), bx = Math.cos(a) * d, by = Math.sin(a) * d, br = r * (0.35 + rnd() * 0.25);
      const bgr = g.createRadialGradient(bx, by, 0, bx, by, br); bgr.addColorStop(0, col[0]); bgr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.34; g.fillStyle = bgr; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // rune terukir (gelap di bawah, terang di atas → tampak diukir)
    g.lineCap = 'round'; g.lineJoin = 'round'; const m = MOTIFS[ci % MOTIFS.length], lw = Math.max(1.3, r * 0.095);
    g.save(); g.translate(r * 0.025, r * 0.035); g.strokeStyle = 'rgba(8,0,40,0.5)'; g.lineWidth = lw; m(g, r); g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.88)'; g.lineWidth = lw * 0.85; m(g, r);
    // cincin kristal dalam
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = Math.max(1, r * 0.04); g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.stroke();
    g.restore();
    return c;
  }

  function renderGloss(qr, px) {
    const pad = 5, size = Math.ceil((qr * 2 + pad * 2) * px), c = mk(size), g = c.getContext('2d'), r = qr, o = qr + pad;
    g.scale(px, px); g.translate(o, o);
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
    // sisi gelap kanan-bawah + sisi terang kiri-atas (satu arah cahaya)
    const sh = g.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.15, -r * 0.1, -r * 0.1, r * 1.25); sh.addColorStop(0, 'rgba(255,255,255,0.14)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(6,0,40,0.36)');
    g.fillStyle = sh; g.fillRect(-r, -r, r * 2, r * 2);
    // pantulan lingkungan (bulan sabit terang di sisi bawah-kanan)
    g.strokeStyle = 'rgba(210,235,255,0.26)'; g.lineWidth = r * 0.12; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, r * 0.8, 0.15, 1.15); g.stroke();
    g.restore();
    // tepi bevel kaca
    const bv = g.createLinearGradient(-r, -r, r, r); bv.addColorStop(0, 'rgba(255,255,255,0.75)'); bv.addColorStop(0.45, 'rgba(255,255,255,0.0)'); bv.addColorStop(1, 'rgba(0,0,30,0.5)');
    g.strokeStyle = bv; g.lineWidth = Math.max(1.4, r * 0.1); g.beginPath(); g.arc(0, 0, r * 0.93, 0, TAU); g.stroke();
    // kilau utama (lembut) dan titik panas
    const sp = g.createRadialGradient(-r * 0.34, -r * 0.44, 0, -r * 0.34, -r * 0.44, r * 0.46); sp.addColorStop(0, 'rgba(255,255,255,0.8)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sp; g.beginPath(); g.ellipse(-r * 0.34, -r * 0.44, r * 0.4, r * 0.24, -0.62, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.52, r * 0.1, r * 0.055, -0.62, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(r * 0.5, r * 0.46, r * 0.045, 0, TAU); g.fill();
    // garis tepi
    g.strokeStyle = 'rgba(12,4,48,0.7)'; g.lineWidth = Math.max(1.4, r * 0.07); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    return c;
  }

  function renderPlaque(qr, px) {
    const pad = 3, size = Math.ceil((qr * 2 + pad * 2) * px), c = mk(size), g = c.getContext('2d'), r = qr * 0.58, o = qr + pad;
    g.scale(px, px); g.translate(o, o);
    const bg = g.createRadialGradient(0, -r * 0.2, r * 0.1, 0, 0, r); bg.addColorStop(0, 'rgba(52,28,110,0.8)'); bg.addColorStop(1, 'rgba(18,8,48,0.84)');
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.lineWidth = Math.max(1.2, qr * 0.05); g.strokeStyle = 'rgba(255,225,150,0.7)'; g.stroke();                       // trim emas
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(0, 0, r * 0.93, 0.2, 2.9); g.stroke();                    // inner shadow bawah
    g.strokeStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.arc(0, 0, r * 0.93, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); // highlight atas
    return c;
  }

  function renderShadow(qr, px) {
    const size = Math.ceil((qr * 2 + 16) * px), c = mk(size), g = c.getContext('2d'), o = qr + 8;
    g.scale(px, px); g.translate(o, o);
    const gr = g.createRadialGradient(0, 0, qr * 0.2, 0, 0, qr * 1.15); gr.addColorStop(0, 'rgba(8,2,28,0.55)'); gr.addColorStop(0.75, 'rgba(8,2,28,0.25)'); gr.addColorStop(1, 'rgba(8,2,28,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, qr * 1.15, 0, TAU); g.fill();
    return c;
  }

  function getSet(ci, r, px) {
    if (store.px !== px || store.n > 400) { store.px = px; store.map = Object.create(null); store.n = 0; }
    const qr = Math.max(4, Math.round(r / 2) * 2), key = qr + '|' + ci;
    let s = store.map[key];
    if (s) return s;
    const shared = store.map['s' + qr] || (store.map['s' + qr] = { gloss: renderGloss(qr, px), plaque: renderPlaque(qr, px), shadow: renderShadow(qr, px) });
    s = store.map[key] = { body: renderBody(qr, ci, px), gloss: shared.gloss, plaque: shared.plaque, shadow: shared.shadow, qr: qr }; store.n++;
    return s;
  }

  /** Gambar bola sihir 3D. rot = rotasi badan (radian); label = tampilkan plakat; t = waktu (kerlip kilau). */
  function drawOrb(ctx, x, y, r, ci, rot, px, label, t) {
    const s = getSet(ci, r, px), k = r / s.qr, bodyD = (s.qr * 2 + 10) * k, o = (s.qr + 5) * k;
    ctx.drawImage(s.shadow, x + r * 0.12 - (s.qr + 8) * k, y + r * 0.3 - (s.qr + 8) * k, (s.qr * 2 + 16) * k, (s.qr * 2 + 16) * k);
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(s.body, -o, -o, bodyD, bodyD); ctx.restore(); }
    else ctx.drawImage(s.body, x - o, y - o, bodyD, bodyD);
    ctx.drawImage(s.gloss, x - o, y - o, bodyD, bodyD);
    if (t) {   // kerlip kilau halus
      const tw = 0.5 + 0.5 * Math.sin(t * 2.6 + ci * 1.7);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.4 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.52, r * 0.07 * (0.7 + tw), 0, TAU); ctx.fill();
    }
    if (label) { const pq = (s.qr * 2 + 6) * k; ctx.drawImage(s.plaque, x - (s.qr + 3) * k, y - (s.qr + 3) * k, pq, pq); }
  }

  /** Lapisan bersama untuk bola khusus (kutukan, beku, telur emas) agar tampil 3D sama seperti orb: bayangan atau kilau. */
  function layer(ctx, kind, x, y, r) {
    const s = getSet(0, r, store.px || 1), k = r / s.qr, o = (s.qr + 5) * k, d = (s.qr * 2 + 10) * k;
    if (kind === 'shadow') ctx.drawImage(s.shadow, x + r * 0.12 - (s.qr + 8) * k, y + r * 0.3 - (s.qr + 8) * k, (s.qr * 2 + 16) * k, (s.qr * 2 + 16) * k);
    else ctx.drawImage(s.gloss, x - o, y - o, d, d);
  }

  GA.Balls = { layer: layer, drawOrb: drawOrb, getSet: getSet, MOTIFS: MOTIFS };
})(window.GA = window.GA || {});
