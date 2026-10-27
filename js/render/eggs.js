/* eggs.js — TELUR naga (tampak atas) dan SARANG telur.
 *
 * Telur: cangkang bersisik seperti kulit reptil (pola sisik dengan relief), bintik, urat halus, cahaya hangat dari dalam (subsurface palsu),
 * rim light, denyut. Tiga varian elemen (api, es, hutan). Keadaan: ok (denyut), threat (bergetar & bersinar merah), crack (retak), empty (kosong/redup).
 * Sarang: bayangan kontak, cincin batu (berlumut / basal / es / rune), ranting, tulang, sisik, abu & bara; cahaya telur menyinari sarang.
 * Semua sprite dirender sekali per (ukuran, varian) dan di-cache; per frame hanya drawImage + cahaya aditif.
 * Gambar sendiri bisa menimpa sarang lewat Theme.sprite('nest') (assets/manifest.json). */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  const store = { px: 0, map: Object.create(null), n: 0 };

  const EL = {
    fire:   { c: ['#ffe2b4', '#ff8a3a', '#9a2a0c'], glow: '255,150,60', fleck: 'rgba(110,30,10,0.45)' },
    ice:    { c: ['#f0fbff', '#8fd0f5', '#3a78b8'], glow: '140,210,255', fleck: 'rgba(30,70,130,0.4)' },
    forest: { c: ['#f4ffd8', '#9ad468', '#37722a'], glow: '170,255,120', fleck: 'rgba(30,80,20,0.42)' }
  };
  const SCENE_STYLE = { forest: 'twig', grove: 'twig', swamp: 'twig', bloom: 'twig', swampDusk: 'twig', coast: 'twig', volcano: 'ash', ashfield: 'ash', magma: 'ash', crystal: 'frost', iceCave: 'frost', amethyst: 'frost', tower: 'rune', tower2: 'rune', library: 'rune', menu: 'twig' };

  function tpx(ctx) { const m = ctx.getTransform ? ctx.getTransform().a : 1; return Math.max(0.5, Math.round(m * 4) / 4); }   // piksel perangkat per unit logis (kunci cache)
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function eggPath(g, w, h) {
    g.beginPath(); g.moveTo(0, -h);
    g.bezierCurveTo(w * 0.95, -h * 0.95, w * 1.05, h * 0.7, 0, h);
    g.bezierCurveTo(-w * 1.05, h * 0.7, -w * 0.95, -h * 0.95, 0, -h); g.closePath();
  }
  function cache(key, make, px) {
    if (store.px !== px || store.n > 120) { store.px = px; store.map = Object.create(null); store.n = 0; }
    return store.map[key] || (store.n++, store.map[key] = make());
  }

  /* ---------- sprite telur (tegak, ujung runcing di atas), pusat di tengah ---------- */
  function renderEgg(el, w, px) {
    const E = EL[el], h = w * 1.34, pad = 4, S = Math.ceil((w * 2.2 + pad * 2) * px), SH = Math.ceil((h * 2 + pad * 2) * px), c = mk(S, SH), g = c.getContext('2d');
    g.scale(px, px); g.translate(S / 2 / px, SH / 2 / px);
    const rnd = GA.Noise.rng(el.charCodeAt(0) * 7 + Math.round(w));
    g.save(); eggPath(g, w, h); g.clip();
    const bg = g.createRadialGradient(-w * 0.3, -h * 0.35, w * 0.1, 0, 0, h * 1.15); bg.addColorStop(0, E.c[0]); bg.addColorStop(0.5, E.c[1]); bg.addColorStop(1, E.c[2]);
    g.fillStyle = bg; g.fillRect(-w * 1.3, -h * 1.1, w * 2.6, h * 2.2);
    // kulit bersisik: sisik tumpang-tindih dengan relief (garis gelap bawah + kilau atas)
    const s = w * 0.34; g.lineWidth = Math.max(0.8, w * 0.045); g.lineCap = 'round';
    for (let row = 0, y = -h; y < h * 1.1; y += s * 0.78, row++) for (let x = -w * 1.3 + (row % 2) * s * 0.5; x < w * 1.3; x += s) {
      g.strokeStyle = 'rgba(30,10,0,0.3)'; g.beginPath(); g.arc(x, y, s * 0.52, 0.15, Math.PI - 0.15); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.arc(x, y - s * 0.07, s * 0.46, Math.PI + 0.5, TAU - 0.5); g.stroke();
    }
    // bintik & urat
    g.fillStyle = E.fleck; for (let i = 0; i < 22; i++) { g.beginPath(); g.arc((rnd() - 0.5) * w * 1.8, (rnd() - 0.5) * h * 1.8, w * (0.02 + rnd() * 0.05), 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(60,20,10,0.22)'; g.lineWidth = Math.max(0.7, w * 0.03);
    for (let k = 0; k < 3; k++) { let x = (rnd() - 0.5) * w * 1.2, y = -h * 0.8; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += (rnd() - 0.5) * w * 0.5; y += h * 0.32; g.lineTo(x, y); } g.stroke(); }
    // cahaya dari dalam (subsurface palsu): pusat hangat, tepi tipis tembus cahaya
    g.globalCompositeOperation = 'screen';
    const ig = g.createRadialGradient(w * 0.05, h * 0.15, 0, w * 0.05, h * 0.15, h * 0.85); ig.addColorStop(0, 'rgba(' + E.glow + ',0.55)'); ig.addColorStop(1, 'rgba(' + E.glow + ',0)');
    g.fillStyle = ig; g.fillRect(-w * 1.3, -h * 1.1, w * 2.6, h * 2.2);
    g.globalCompositeOperation = 'source-over';
    // sisi gelap kanan-bawah + kilau kiri-atas (satu arah cahaya)
    const sd = g.createLinearGradient(-w, -h, w, h); sd.addColorStop(0, 'rgba(255,255,255,0.18)'); sd.addColorStop(0.5, 'rgba(0,0,0,0)'); sd.addColorStop(1, 'rgba(10,0,20,0.42)');
    g.fillStyle = sd; g.fillRect(-w * 1.3, -h * 1.1, w * 2.6, h * 2.2);
    g.restore();
    // rim light tipis dan garis tepi
    g.save(); eggPath(g, w, h); g.lineWidth = Math.max(1.2, w * 0.07); g.strokeStyle = 'rgba(30,10,0,0.7)'; g.stroke(); g.restore();
    g.save(); g.beginPath(); g.ellipse(-w * 0.34, -h * 0.4, w * 0.2, h * 0.28, -0.4, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = Math.max(1, w * 0.05); g.beginPath(); g.arc(0, 0, w * 0.86, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
    return { c: c, w: S / px, h: SH / px };
  }

  /** Gambar satu telur. o: { el, rot, state: ok|threat|crack|empty, t, i, hud }. w = lebar dasar telur. */
  function drawEgg(ctx, x, y, w, o) {
    o = o || {}; const el = EL[o.el] ? o.el : 'forest', E = EL[el], t = o.t || 0, i = o.i || 0, st = o.state || 'ok', px = o.px || tpx(ctx);
    const spr = cache(el + '|' + Math.round(w * 2) + '|' + px, function () { return renderEgg(el, Math.round(w * 2) / 2, px); }, px);
    ctx.save(); ctx.translate(x, y);
    if (st === 'empty') { ctx.globalAlpha = 0.3; ctx.rotate(o.rot || 0); ctx.drawImage(spr.c, -spr.w / 2, -spr.h / 2, spr.w, spr.h); ctx.globalAlpha = 1; ctx.restore(); return; }
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3), thr = st === 'threat' || st === 'crack';
    // cahaya hangat yang menyinari sekitar (aditif)
    const gr = w * (2.1 + 0.25 * pulse), gcol = thr ? '255,70,40' : E.glow, ga = thr ? 0.35 + 0.3 * Math.abs(Math.sin(t * 9 + i)) : 0.26 + 0.14 * pulse;
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(0, 0, w * 0.3, 0, 0, gr); gl.addColorStop(0, 'rgba(' + gcol + ',' + ga.toFixed(2) + ')'); gl.addColorStop(1, 'rgba(' + gcol + ',0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    if (thr) ctx.translate(Math.sin(t * 34 + i * 1.7) * w * 0.05, Math.cos(t * 29 + i) * w * 0.04);        // bergetar saat terancam
    const wp = !o.hud && GA.Dragon && GA.Dragon.Dragon ? GA.Dragon.Dragon.pulse : 0;       // kepakan naga membuat telur bergetar sedikit
    if (wp > 0.02) ctx.translate(Math.sin(t * 47 + i * 2) * w * 0.07 * wp, Math.cos(t * 41 + i) * w * 0.06 * wp);
    const k = 1 + 0.025 * pulse; ctx.rotate(o.rot || 0); ctx.scale(k, k);
    ctx.drawImage(spr.c, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    if (st === 'crack') {                                                                                    // retak bercahaya
      ctx.strokeStyle = 'rgba(40,12,4,0.9)'; ctx.lineWidth = Math.max(1, w * 0.07); ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.moveTo(-w * 0.55, -w * 0.1); ctx.lineTo(-w * 0.2, w * 0.18); ctx.lineTo(0, -w * 0.12); ctx.lineTo(w * 0.28, w * 0.2); ctx.lineTo(w * 0.6, -w * 0.05); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,' + (190 + (pulse * 50) | 0) + ',90,0.8)'; ctx.lineWidth = Math.max(0.8, w * 0.03); ctx.stroke();
    }
    ctx.restore();
  }

  function hexRock(g, x, y, r, rnd, pal) {
    g.save(); g.translate(x, y); g.rotate(rnd() * TAU);
    g.beginPath(); const n = 8; for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (0.8 + rnd() * 0.25); if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.82); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.82); } g.closePath();
    const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1); gr.addColorStop(0, pal[0]); gr.addColorStop(0.55, pal[1]); gr.addColorStop(1, pal[2]);
    g.fillStyle = gr; g.fill(); g.lineJoin = 'round'; g.lineWidth = Math.max(1.2, r * 0.1); g.strokeStyle = 'rgba(15,8,4,0.75)'; g.stroke();
    g.restore();
  }

  /* ---------- sprite sarang: gaya per tema ---------- */
  const NEST = {
    twig:  { rock: ['#a9a48e', '#6c6856', '#34301f'], moss: 'rgba(70,140,56,0.7)', twig: ['#5a3a1c', '#a8793a', '#d6a55a'], bowl: ['#4a2e12', '#2a1608'], scale: '#e8c45a', ash: false },
    ash:   { rock: ['#6a5a58', '#3a2e2e', '#1a1212'], moss: 'rgba(255,110,30,0.75)', twig: ['#2a1a14', '#5a3a2a', '#8a5a3a'], bowl: ['#1e0e0a', '#0e0604'], scale: '#d9602a', ash: true },
    frost: { rock: ['#e8f4ff', '#9ab8e0', '#4a6aa0'], moss: 'rgba(200,240,255,0.9)', twig: ['#7a8aa8', '#c0d4ec', '#f0f8ff'], bowl: ['#2a3a5c', '#121c36'], scale: '#9ae0ff', ash: false },
    rune:  { rock: ['#9a8cc0', '#5a4e88', '#241a48'], moss: 'rgba(184,144,255,0.8)', twig: ['#2a1a40', '#5a3a80', '#9a70d0'], bowl: ['#1a0e30', '#0a0418'], scale: '#c9a0ff', ash: false }
  };

  function renderNest(R, px, style) {
    const P = NEST[style] || NEST.twig, S = Math.ceil(R * 2.7 * px), c = mk(S), g = c.getContext('2d'), rnd = GA.Noise.rng(31 + style.length * 7 + Math.round(R));
    g.scale(px, px); g.translate(R * 1.35, R * 1.35);
    // bayangan kontak
    const sh = g.createRadialGradient(R * 0.06, R * 0.14, R * 0.6, R * 0.06, R * 0.14, R * 1.3); sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(R * 0.06, R * 0.14, R * 1.3, 0, TAU); g.fill();
    // cincin batu (berlumut / basal / es / rune)
    const nR = 15; for (let i = 0; i < nR; i++) { const a = i / nR * TAU + rnd() * 0.2, rr = R * (0.98 + rnd() * 0.06); hexRock(g, Math.cos(a) * rr, Math.sin(a) * rr, R * (0.2 + rnd() * 0.07), rnd, P.rock); }
    g.lineCap = 'round';
    // lumut / lapisan es / lekuk bercahaya di batu (kiri-atas)
    g.fillStyle = P.moss; for (let i = 0; i < nR; i++) { const a = i / nR * TAU + 0.25; g.beginPath(); g.ellipse(Math.cos(a) * R * 0.99 - R * 0.05, Math.sin(a) * R * 0.99 - R * 0.07, R * 0.1, R * 0.05, a, 0, TAU); g.fill(); }
    // mangkuk sarang
    const bg = g.createRadialGradient(0, 0, R * 0.1, 0, 0, R * 0.86); bg.addColorStop(0, P.bowl[1]); bg.addColorStop(1, P.bowl[0]);
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, R * 0.84, 0, TAU); g.fill();
    // ranting melingkar (gelap di bawah, terang di atas)
    for (let i = 0; i < 90; i++) {
      const a = rnd() * TAU, rr = R * (0.45 + rnd() * 0.42), len = R * (0.18 + rnd() * 0.3), ta = a + Math.PI / 2 + (rnd() - 0.5) * 0.9, x = Math.cos(a) * rr, y = Math.sin(a) * rr, lw = R * (0.035 + rnd() * 0.035);
      g.strokeStyle = P.twig[0]; g.lineWidth = lw * 1.5; g.beginPath(); g.moveTo(x - Math.cos(ta) * len / 2, y - Math.sin(ta) * len / 2); g.lineTo(x + Math.cos(ta) * len / 2, y + Math.sin(ta) * len / 2); g.stroke();
      g.strokeStyle = P.twig[1 + (i % 2)]; g.lineWidth = lw; g.beginPath(); g.moveTo(x - Math.cos(ta) * len / 2 - 0.6, y - Math.sin(ta) * len / 2 - 0.8); g.lineTo(x + Math.cos(ta) * len / 2 - 0.6, y + Math.sin(ta) * len / 2 - 0.8); g.stroke();
    }
    // tulang kecil
    g.strokeStyle = '#efe6cc'; g.fillStyle = '#efe6cc'; g.lineWidth = R * 0.05;
    for (let i = 0; i < 4; i++) { const a = rnd() * TAU, rr = R * (0.6 + rnd() * 0.2), x = Math.cos(a) * rr, y = Math.sin(a) * rr, d = a + 1.2, l = R * 0.13; g.beginPath(); g.moveTo(x - Math.cos(d) * l, y - Math.sin(d) * l); g.lineTo(x + Math.cos(d) * l, y + Math.sin(d) * l); g.stroke(); [-1, 1].forEach(function (s) { g.beginPath(); g.arc(x + Math.cos(d) * l * s, y + Math.sin(d) * l * s, R * 0.04, 0, TAU); g.fill(); }); }
    // sisik naga yang rontok
    g.fillStyle = P.scale; g.strokeStyle = 'rgba(20,8,0,0.6)'; g.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const a = rnd() * TAU, rr = R * (0.4 + rnd() * 0.4); g.save(); g.translate(Math.cos(a) * rr, Math.sin(a) * rr); g.rotate(rnd() * TAU); g.beginPath(); g.moveTo(0, -R * 0.06); g.quadraticCurveTo(R * 0.06, 0, 0, R * 0.07); g.quadraticCurveTo(-R * 0.06, 0, 0, -R * 0.06); g.fill(); g.stroke(); g.restore(); }
    // abu & bara padam (gaya api)
    if (P.ash) { g.fillStyle = 'rgba(30,24,22,0.5)'; for (let i = 0; i < 12; i++) { const a = rnd() * TAU, rr = R * rnd() * 0.75; g.beginPath(); g.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, R * (0.05 + rnd() * 0.1), R * 0.05, rnd() * 3, 0, TAU); g.fill(); } }
    // vignette dalam: rongga lebih gelap di tengah tempat telur duduk
    const iv = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 0.8); iv.addColorStop(0, 'rgba(0,0,0,0.28)'); iv.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = iv; g.beginPath(); g.arc(0, 0, R * 0.8, 0, TAU); g.fill();
    return { c: c, d: S / px };
  }

  /** Posisi telur ke-i (0..N-1) dalam sarang. nest = { x, y }, r = radius bola. Dipakai untuk efek telur pecah. */
  function eggPos(nest, r, i, N) {
    const R = r * 2.1, a = -Math.PI / 2 + i * TAU / N;
    return { x: nest.x + Math.cos(a) * R * 0.48, y: nest.y + Math.sin(a) * R * 0.48 + R * 0.05 };
  }
  function styleFor(scene) { return SCENE_STYLE[scene] || 'twig'; }
  function elFor(scene, i) { const s = styleFor(scene); return s === 'ash' ? 'fire' : (s === 'frost' ? 'ice' : (s === 'rune' ? ['fire', 'ice', 'forest'][i % 3] : 'forest')); }

  /** Gambar sarang + telur. at = { x, y }; r = radius bola; eggs = telur tersisa; threat 0..1 = bola sihir mendekat. */
  function drawNest(ctx, at, r, t, eggs, maxEggs, shake, threat, o) {
    o = o || {}; threat = threat || 0;
    const px = o.px || tpx(ctx), scene = o.scene || (GA.Theme && GA.Theme.scene) || 'forest', style = o.style || styleFor(scene), N = maxEggs || 5, have = eggs == null ? N : eggs, R = r * 2.1;
    const img = GA.Theme.sprite && GA.Theme.sprite('nest');
    ctx.save(); ctx.translate(at.x + (shake > 0 ? Math.sin(t * 70) * 3 : 0), at.y);
    const spr = img ? null : cache('nest|' + Math.round(R) + '|' + style + '|' + px, function () { return renderNest(R, px, style); }, px);
    if (img) ctx.drawImage(img, -R * 1.15, -R * 1.15, R * 2.3, R * 2.3); else ctx.drawImage(spr.c, -spr.d / 2, -spr.d / 2, spr.d, spr.d);
    // cahaya telur menyinari sarang (lebih terang bila telur lebih banyak), merah berdenyut saat terancam
    const lit = have / N, pulse = 0.5 + 0.5 * Math.sin(t * 2.2), gcol = EL[elFor(scene, 0)].glow;
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(0, R * 0.05, R * 0.2, 0, R * 0.05, R * 1.5); gl.addColorStop(0, 'rgba(' + gcol + ',' + (0.3 * lit * (0.7 + 0.3 * pulse)).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(' + gcol + ',0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, R * 0.05, R * 1.5, 0, TAU); ctx.fill();
    if (threat > 0.15) { const rg = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 1.9); rg.addColorStop(0, 'rgba(255,60,40,0.55)'); rg.addColorStop(1, 'rgba(255,60,40,0)'); ctx.globalAlpha = threat * (0.5 + 0.5 * Math.sin(t * 9)); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, R * 1.9, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (style === 'ash') for (let i = 0; i < 5; i++) { const a = i * 1.7 + 0.4, d = R * (0.5 + 0.3 * Math.sin(i * 2.3)), fl = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i * 1.9)); ctx.fillStyle = 'rgba(255,' + (110 + i * 20) + ',40,' + (0.55 * fl).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, R * 0.035 * (0.6 + fl), 0, TAU); ctx.fill(); }   // bara berkedip
    ctx.globalCompositeOperation = 'source-over';
    // telur: satu slot per telur, melingkar; yang hilang → rongga + pecahan cangkang
    const w = r * 0.42;
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + i * TAU / N, ex = Math.cos(a) * R * 0.48, ey = Math.sin(a) * R * 0.48 + R * 0.05, rot = a + Math.PI / 2 + Math.sin(i * 4.1) * 0.35;
      if (i >= have) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(ex, ey + w * 0.2, w * 0.9, w * 1.1, rot, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(236,222,190,0.85)'; ctx.strokeStyle = 'rgba(60,40,20,0.6)'; ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) { const sa = k * 2.1 + i; ctx.beginPath(); ctx.moveTo(ex + Math.cos(sa) * w * 0.5, ey + Math.sin(sa) * w * 0.5); ctx.lineTo(ex + Math.cos(sa + 0.5) * w * 0.9, ey + Math.sin(sa + 0.5) * w * 0.9); ctx.lineTo(ex + Math.cos(sa + 0.9) * w * 0.55, ey + Math.sin(sa + 0.9) * w * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        continue;
      }
      drawEgg(ctx, ex, ey, w, { el: elFor(scene, i), rot: rot, t: t, i: i, px: px, state: threat > 0.8 ? 'crack' : (threat > 0.15 ? 'threat' : 'ok') });
    }
    ctx.restore();
  }

  GA.Eggs = { draw: drawEgg, el: EL, elFor: elFor, styleFor: styleFor };
  GA.Nest = { draw: drawNest, eggPos: eggPos, styleFor: styleFor, STYLES: NEST };
})(window.GA = window.GA || {});
