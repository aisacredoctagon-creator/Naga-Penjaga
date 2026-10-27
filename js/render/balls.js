/* balls.js — bola sihir Penyihir Jahat: OBSIDIAN berurat energi, retakan bercahaya, rune bercahaya, asap tipis, jejak kabut gelap.
 *
 * Pendekatan: permukaan bola dibangkitkan SEKALI per warna sebagai peta ekuirektangular (urat energi dari noise punggungan, retakan,
 * 4 rune motif warna itu). Lalu bola dirender sebagai bola SUNGGUHAN: tiap piksel diproyeksikan ke bola, diputar, dan disampel dari peta
 * → 24 bingkai rotasi (16 di kualitas sedang, 12 di rendah) di-cache per (radius, warna) dan dibuat malas (satu bingkai per kebutuhan).
 * Bola menggelinding: sudut = jarak tempuh ÷ radius, sumbu putar tegak lurus arah jalan (bingkai diputar mengikuti arah jalur).
 *
 * Lapisan sprite (di-cache): halo (warna), shadow (jatuh ke alur), body (bingkai rotasi, TANPA cahaya arah), gloss (pencahayaan tetap:
 * sisi gelap, pantulan lingkungan, rim light, kilau spekular — tidak ikut berputar), plaque (segel gelap kontras untuk angka).
 * Tiap warna punya motif rune BERBEDA (8 motif) → bisa dibedakan tanpa bergantung pada warna (aksesibilitas buta warna). */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, TAU = Math.PI * 2, W = 256, H = 128;
  const store = { px: 0, n: 0, map: Object.create(null) };
  const texCache = Object.create(null);

  /* ---------- 8 motif rune (digambar sebagai goresan dalam lingkaran radius r) ---------- */
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

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function nFrames() { const q = GA.Quality && GA.Quality.level; return q === 'rendah' ? 12 : (q === 'sedang' ? 16 : 24); }

  /* ---------- peta permukaan obsidian (ekuirektangular W×H), satu per warna ---------- */
  function buildTexture(ci) {
    const col = Theme.ballColors[ci % Theme.ballColors.length], A0 = hex(col[0]), A1 = hex(col[1]), D = hex(col[2]), A = [0, 1, 2].map(function (i) { return A1[i] * 0.72 + A0[i] * 0.28; }), Bc = ci % 2 ? [190, 110, 255] : [90, 255, 170];   // urat utama = warna bola, urat kedua = ungu/hijau
    const fa = GA.Textures.fbm(11 + ci * 3, 256, 5), fb = GA.Textures.fbm(53 + ci * 7, 256, 4);
    const da = fa.getContext('2d').getImageData(0, 0, 256, 256).data, db = fb.getContext('2d').getImageData(0, 0, 256, 256).data;
    const c = mk(W, H), g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * 2 * 256 + x) * 4, n1 = da[i] / 255, n2 = db[(((y * 2 + 61) % 256) * 256 + ((x + 97) % 256)) * 4] / 255;
      const v1 = 1 - Math.abs(2 * n1 - 1), v2 = 1 - Math.abs(2 * n2 - 1);
      const e1 = smooth(0.93, 0.99, v1), h1 = smooth(0.87, 0.95, v1) * 0.22, e2 = smooth(0.945, 0.995, v2) * 0.62, h2 = smooth(0.9, 0.96, v2) * 0.14;
      const k = (y * W + x) * 4, bs = 0.55 + 0.9 * n1;
      d[k] = Math.min(255, 7 * bs + 5 + D[0] * 0.16 * n1 + (e1 + h1) * A[0] + (e2 + h2) * Bc[0]);
      d[k + 1] = Math.min(255, 4 * bs + 3 + D[1] * 0.16 * n1 + (e1 + h1) * A[1] + (e2 + h2) * Bc[1]);
      d[k + 2] = Math.min(255, 14 * bs + 9 + D[2] * 0.2 * n1 + (e1 + h1) * A[2] + (e2 + h2) * Bc[2]);
      d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // retakan bercahaya (jalan acak bergerigi)
    const rnd = GA.Noise.rng(ci * 17 + 3);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col[0];
    for (let k = 0; k < 5; k++) {
      let x = rnd() * W, y = 20 + rnd() * (H - 40), a = rnd() * TAU; const lw = 1.2 + rnd() * 1.2; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 9; s++) { a += (rnd() - 0.5) * 1.5; x += Math.cos(a) * 9; y += Math.sin(a) * 6; g.lineTo(x, y); }
      g.globalAlpha = 0.25; g.lineWidth = lw * 3.2; g.stroke(); g.globalAlpha = 0.9; g.lineWidth = lw; g.stroke();      // pendar (garis lebar redup) + inti terang
    }
    // rune di 4 bujur (tiap kotak 64×64 = 90°×90°, hampir tanpa distorsi di khatulistiwa)
    g.globalAlpha = 0.3; g.strokeStyle = col[0]; g.lineWidth = 7.5;
    for (let k = 0; k < 4; k++) { g.save(); g.translate(32 + k * 64, H / 2); MOTIFS[ci % 8](g, 27); g.restore(); }
    g.globalAlpha = 1; g.lineWidth = 3.4;
    for (let k = 0; k < 4; k++) { g.save(); g.translate(32 + k * 64, H / 2); MOTIFS[ci % 8](g, 27); g.restore(); } g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.3;
    for (let k = 0; k < 4; k++) { g.save(); g.translate(32 + k * 64, H / 2); MOTIFS[ci % 8](g, 27); g.restore(); }
    g.globalCompositeOperation = 'source-over';
    return g.getImageData(0, 0, W, H).data;
  }
  function texture(ci) { return texCache[ci] || (texCache[ci] = buildTexture(ci)); }

  /* ---------- geometri bola per (radius, px): dihitung sekali, dipakai semua bingkai ---------- */
  function geometry(qr, px) {
    const pad = 5, S = Math.ceil((qr * 2 + pad * 2) * px), R = qr * px, cx = S / 2, n = S * S;
    const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n), al = new Float32Array(n), sh = new Float32Array(n);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, ax = (x + 0.5 - cx) / R, ay = (y + 0.5 - cx) / R, r2 = ax * ax + ay * ay, rho = Math.sqrt(r2);
      nx[i] = ax; ny[i] = ay; nz[i] = Math.sqrt(Math.max(0, 1 - r2)); al[i] = Math.max(0, Math.min(1, (1 - rho) * R * 0.9 + 0.5)); sh[i] = 0.5 + 0.5 * Math.pow(nz[i], 0.6);
    }
    return { S: S, nx: nx, ny: ny, nz: nz, al: al, sh: sh };
  }

  function renderFrame(tex, geo, phi) {
    const S = geo.S, c = mk(S), g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data, n = S * S;
    const cp = Math.cos(phi), sp = Math.sin(phi), ct = Math.cos(0.45), st = Math.sin(0.45);
    for (let i = 0; i < n; i++) {
      const a = geo.al[i]; if (a <= 0) continue;
      const x = geo.nx[i], y = geo.ny[i], z = geo.nz[i];
      const qx = x * cp - z * sp, qz0 = x * sp + z * cp, qy = y * ct - qz0 * st, qz = y * st + qz0 * ct;
      const lon = Math.atan2(qx, qz), lat = Math.asin(qy < -1 ? -1 : (qy > 1 ? 1 : qy));
      let u = (lon / TAU + 0.5) * W - 0.5, v = (lat / Math.PI + 0.5) * H - 0.5; if (v < 0) v = 0; else if (v > H - 1.001) v = H - 1.001;
      const u0 = Math.floor(u), fu = u - u0, v0 = Math.floor(v), fv = v - v0, ua = ((u0 % W) + W) % W, ub = (ua + 1) % W, k00 = (v0 * W + ua) * 4, k10 = (v0 * W + ub) * 4, k01 = ((v0 + 1) * W + ua) * 4, k11 = ((v0 + 1) * W + ub) * 4;
      const w00 = (1 - fu) * (1 - fv), w10 = fu * (1 - fv), w01 = (1 - fu) * fv, w11 = fu * fv, s = geo.sh[i], o = i * 4;
      d[o] = (tex[k00] * w00 + tex[k10] * w10 + tex[k01] * w01 + tex[k11] * w11) * s;
      d[o + 1] = (tex[k00 + 1] * w00 + tex[k10 + 1] * w10 + tex[k01 + 1] * w01 + tex[k11 + 1] * w11) * s;
      d[o + 2] = (tex[k00 + 2] * w00 + tex[k10 + 2] * w10 + tex[k01 + 2] * w01 + tex[k11 + 2] * w11) * s;
      d[o + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* ---------- lapisan bersama ---------- */
  function renderGloss(qr, px) {
    const pad = 5, size = Math.ceil((qr * 2 + pad * 2) * px), c = mk(size), g = c.getContext('2d'), r = qr, o = qr + pad;
    g.scale(px, px); g.translate(o, o);
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
    // satu arah cahaya (kiri-atas): sisi gelap kanan-bawah + sedikit terang di kiri-atas
    const sh = g.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.1, -r * 0.1, -r * 0.1, r * 1.25); sh.addColorStop(0, 'rgba(210,190,255,0.16)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(2,0,18,0.55)');
    g.fillStyle = sh; g.fillRect(-r, -r, r * 2, r * 2);
    // pantulan lingkungan: bulan sabit dingin di kanan-bawah + jendela terang di kiri-atas
    g.strokeStyle = 'rgba(150,200,255,0.3)'; g.lineWidth = r * 0.14; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, r * 0.78, 0.1, 1.2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(-r * 0.62, -r * 0.5); g.lineTo(-r * 0.22, -r * 0.7); g.lineTo(-r * 0.1, -r * 0.52); g.lineTo(-r * 0.5, -r * 0.32); g.closePath(); g.fill();
    g.restore();
    // rim light tipis (kiri-atas, dingin) + sisi bevel kaca
    const bv = g.createLinearGradient(-r, -r, r, r); bv.addColorStop(0, 'rgba(190,230,255,0.85)'); bv.addColorStop(0.42, 'rgba(190,230,255,0)'); bv.addColorStop(0.75, 'rgba(120,70,255,0)'); bv.addColorStop(1, 'rgba(120,70,255,0.45)');
    g.strokeStyle = bv; g.lineWidth = Math.max(1.4, r * 0.09); g.beginPath(); g.arc(0, 0, r * 0.94, 0, TAU); g.stroke();
    // kilau spekular
    const sp = g.createRadialGradient(-r * 0.36, -r * 0.46, 0, -r * 0.36, -r * 0.46, r * 0.42); sp.addColorStop(0, 'rgba(255,255,255,0.85)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sp; g.beginPath(); g.ellipse(-r * 0.36, -r * 0.46, r * 0.38, r * 0.22, -0.62, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.97)'; g.beginPath(); g.ellipse(-r * 0.42, -r * 0.54, r * 0.09, r * 0.05, -0.62, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(r * 0.5, r * 0.46, r * 0.04, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(8,2,30,0.8)'; g.lineWidth = Math.max(1.4, r * 0.07); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    return c;
  }

  /** Segel gelap (hampir opak) di tengah: angka selalu terbaca di semua warna. */
  function renderPlaque(qr, px) {
    const pad = 3, size = Math.ceil((qr * 2 + pad * 2) * px), c = mk(size), g = c.getContext('2d'), r = qr * 0.6, o = qr + pad;
    g.scale(px, px); g.translate(o, o);
    const bg = g.createRadialGradient(0, -r * 0.25, r * 0.1, 0, 0, r); bg.addColorStop(0, 'rgba(34,18,64,0.97)'); bg.addColorStop(1, 'rgba(10,4,24,0.98)');
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.lineWidth = Math.max(1.2, qr * 0.05); g.strokeStyle = 'rgba(255,225,150,0.8)'; g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(0, 0, r * 0.92, 0.2, 2.9); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.26)'; g.beginPath(); g.arc(0, 0, r * 0.92, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    return c;
  }

  function renderShadow(qr, px) {
    const size = Math.ceil((qr * 2 + 16) * px), c = mk(size), g = c.getContext('2d'), o = qr + 8;
    g.scale(px, px); g.translate(o, o);
    const gr = g.createRadialGradient(0, 0, qr * 0.2, 0, 0, qr * 1.15); gr.addColorStop(0, 'rgba(6,0,20,0.6)'); gr.addColorStop(0.75, 'rgba(6,0,20,0.28)'); gr.addColorStop(1, 'rgba(6,0,20,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, qr * 1.15, 0, TAU); g.fill();
    return c;
  }

  function renderHalo(qr, px, ci) {
    const col = Theme.ballColors[ci % Theme.ballColors.length], pad = 8, size = Math.ceil((qr * 2 + pad * 2) * px), c = mk(size), g = c.getContext('2d'), o = qr + pad;
    g.scale(px, px); g.translate(o, o);
    const gl = g.createRadialGradient(0, 0, qr * 0.8, 0, 0, qr + pad); gl.addColorStop(0, col[1]); gl.addColorStop(1, 'rgba(120,80,255,0)');
    g.globalAlpha = 0.5; g.fillStyle = gl; g.beginPath(); g.arc(0, 0, qr + pad, 0, TAU); g.fill();
    return c;
  }

  /** Gumpalan asap/kabut gelap (sprite lembut) untuk asap permukaan dan jejak. */
  let puffSprite = null;
  function puff() {
    if (puffSprite) return puffSprite;
    const c = mk(64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(70,40,110,0.9)'); gr.addColorStop(0.5, 'rgba(34,16,64,0.45)'); gr.addColorStop(1, 'rgba(20,8,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (puffSprite = c);
  }

  function getSet(ci, r, px) {
    if (store.px !== px || store.n > 160) { store.px = px; store.map = Object.create(null); store.n = 0; }
    const qr = Math.max(4, Math.round(r / 2) * 2), key = qr + '|' + ci;
    let s = store.map[key];
    if (s) return s;
    const shared = store.map['s' + qr] || (store.map['s' + qr] = { gloss: renderGloss(qr, px), plaque: renderPlaque(qr, px), shadow: renderShadow(qr, px), geo: geometry(qr, px) });
    s = store.map[key] = { frames: new Array(nFrames()), n: nFrames(), halo: renderHalo(qr, px, ci), gloss: shared.gloss, plaque: shared.plaque, shadow: shared.shadow, geo: shared.geo, qr: qr, ci: ci }; store.n++;
    return s;
  }

  function frameOf(s, f) {
    return s.frames[f] || (s.frames[f] = renderFrame(texture(s.ci), s.geo, f / s.n * TAU));
  }

  /** Pemanasan cache (dipanggil saat layar pembuka step): bangun tekstur 8 warna + semua bingkai rotasi sedikit demi sedikit agar tidak ada patah saat bermain. */
  let warmT = 0;
  function warm(r, px) {
    clearTimeout(warmT); const tasks = [], n = nFrames();
    for (let ci = 0; ci < 8; ci++) tasks.push([ci, 0]);
    for (let f = 1; f < n; f++) for (let ci = 0; ci < 8; ci++) tasks.push([ci, f]);
    const step = function () { const k = tasks.shift(); if (!k) return; frameOf(getSet(k[0], r, px), k[1]); warmT = setTimeout(step, 6); };
    warmT = setTimeout(step, 30);
  }

  /** Gambar bola sihir. rot = sudut gelinding (radian, jarak ÷ radius); heading = arah gerak bola (sumbu gelinding tegak lurus arah ini);
   *  label = tampilkan segel gelap; t = waktu (kerlip kilau, asap). */
  function drawOrb(ctx, x, y, r, ci, rot, px, label, t, heading, base) {
    const s = getSet(ci, base || r, px), k = r / s.qr, bodyD = (s.qr * 2 + 10) * k, o = (s.qr + 5) * k, q = GA.Quality ? GA.Quality.level : 'tinggi';
    ctx.globalAlpha *= 0.55; ctx.drawImage(s.halo, x - (s.qr + 8) * k, y - (s.qr + 8) * k, (s.qr * 2 + 16) * k, (s.qr * 2 + 16) * k); ctx.globalAlpha /= 0.55;
    ctx.drawImage(s.shadow, x + r * 0.12 - (s.qr + 8) * k, y + r * 0.3 - (s.qr + 8) * k, (s.qr * 2 + 16) * k, (s.qr * 2 + 16) * k);
    const f = Math.floor((((rot || 0) % TAU) + TAU) % TAU / TAU * s.n) % s.n, fr = frameOf(s, f);
    if (heading) { ctx.save(); ctx.translate(x, y); ctx.rotate(heading); ctx.drawImage(fr, -o, -o, bodyD, bodyD); ctx.restore(); }
    else ctx.drawImage(fr, x - o, y - o, bodyD, bodyD);
    ctx.drawImage(s.gloss, x - o, y - o, bodyD, bodyD);
    if (t && q !== 'rendah') {
      const tw = 0.5 + 0.5 * Math.sin(t * 2.6 + ci * 1.7), pf = puff();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.14 + 0.35 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 0.52, r * 0.06 * (0.7 + tw), 0, TAU); ctx.fill();
      // asap tipis menjalar dari permukaan
      for (let i = 0; i < 2; i++) {
        const u = (t * 0.55 + i * 0.5 + ci * 0.13) % 1, a = ci * 1.3 + i * 3.1 + t * 0.3, px0 = x + Math.cos(a) * r * (0.5 + 0.55 * u), py0 = y + Math.sin(a) * r * (0.5 + 0.55 * u) - r * 0.35 * u, sz = r * (0.5 + 0.6 * u);
        ctx.globalAlpha = 0.5 * Math.sin(Math.PI * u); ctx.drawImage(pf, px0 - sz / 2, py0 - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
    if (label) { const pq = (s.qr * 2 + 6) * k; ctx.drawImage(s.plaque, x - (s.qr + 3) * k, y - (s.qr + 3) * k, pq, pq); }
  }

  /** Jejak kabut gelap di belakang bola yang bergerak (dipakai untuk bola terakhir tiap kelompok). heading = arah gerak. */
  function drawTrail(ctx, x, y, r, heading, t) {
    const pf = puff(), bx = Math.cos(heading + Math.PI), by = Math.sin(heading + Math.PI);
    for (let i = 0; i < 3; i++) {
      const d = r * (1.0 + i * 0.85), w = Math.sin(t * 3 + i * 1.6) * r * 0.18, sz = r * (1.7 - i * 0.2);
      ctx.globalAlpha = 0.5 - i * 0.14; ctx.drawImage(pf, x + bx * d - by * w - sz / 2, y + by * d + bx * w - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  /** Lapisan bersama untuk bola khusus (kutukan, beku, telur emas): bayangan atau kilau, agar tampil 3D sama seperti orb. */
  function layer(ctx, kind, x, y, r) {
    const s = getSet(0, r, store.px || 1), k = r / s.qr, o = (s.qr + 5) * k, d = (s.qr * 2 + 10) * k;
    if (kind === 'shadow') ctx.drawImage(s.shadow, x + r * 0.12 - (s.qr + 8) * k, y + r * 0.3 - (s.qr + 8) * k, (s.qr * 2 + 16) * k, (s.qr * 2 + 16) * k);
    else ctx.drawImage(s.gloss, x - o, y - o, d, d);
  }

  GA.Balls = { warm: warm, layer: layer, drawOrb: drawOrb, drawTrail: drawTrail, getSet: getSet, MOTIFS: MOTIFS };
})(window.GA = window.GA || {});
