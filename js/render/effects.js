/* effects.js — lapisan dinamis: PORTAL DIMENSI (tempat bola sihir muncul), riak & kilau kolam, berkas cahaya, kabut, kunang-kunang, burung.
 *
 * Portal: cincin batu berukir rune yang berputar, tiga lapis pusaran energi berbeda kecepatan, sinar cahaya, partikel yang tersedot dan
 * terpancar, riak di sekitarnya, dan denyut tiap kali sebuah bola keluar. Siklus: tertutup (intro) → membuka 0,8 dtk saat hitung mundur →
 * berpendar redup selama permainan → menutup saat step selesai. Warna mengikuti tema step.
 * Ringan: sprite cincin/pusaran dirender sekali (per warna); per frame hanya drawImage + beberapa partikel.
 * Jumlah efek mengikuti GA.Effects.quality (0 rendah, 1 sedang, 2 tinggi). */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  const E = { L: null, path: null, R: 0, map: null, ext: null, info: null, flies: [], ripples: [], quality: 2, bird: null, birdT: 12 };
  function mkPortal() { return { x: 0, y: 0, a: 0, d: 0, has: false, open: 0, target: 0, pulse: 0, col: null, parts: [], spawn: 0, rip: [], bolts: [], rot: 0, flash: 0 }; }
  const PS = [mkPortal()];     // satu portal (tempat bola sihir muncul)

  /** Warna portal per tema: [terang, tengah, gelap, inti]. */
  const PORTAL_COL = {
    forest: ['#e4ccff', '#9a62f0', '#2c1170', '#ffffff'], menu: ['#d4e0ff', '#7a8cf0', '#1c2070', '#ffffff'],
    volcano: ['#ffc4ec', '#d044b4', '#4a0a50', '#fff0fa'], grove: ['#d8ccff', '#8a6af0', '#241070', '#ffffff'], crystal: ['#cfe6ff', '#5aa0ff', '#14286a', '#ffffff'], tower2: ['#ffb0c8', '#a02aa0', '#2a0640', '#ffd0d8'], tower: ['#c9a0ff', '#6a2ad0', '#12053a', '#ff6a8a']
  };
  PORTAL_COL.bloom = PORTAL_COL.bloom || PORTAL_COL.grove;
  ['ashfield', 'magma'].forEach(function (k) { PORTAL_COL[k] = PORTAL_COL.volcano; });
  ['iceCave', 'amethyst'].forEach(function (k) { PORTAL_COL[k] = PORTAL_COL.crystal; });
  PORTAL_COL.library = PORTAL_COL.tower2;
  const sprites = Object.create(null);

  /* ---------- sprite portal (dirender sekali) ---------- */
  function swirlSprite(col, arms, twist, seed) {
    const key = 'sw' + col[0] + arms + twist + seed;
    if (sprites[key]) return sprites[key];
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.translate(S / 2, S / 2);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (let k = 0; k < arms; k++) {
      const a0 = k * TAU / arms + seed;
      for (let i = 0; i < 70; i++) {
        const t0 = i / 70, t1 = (i + 1) / 70, r0 = t0 * 118, r1 = t1 * 118, an0 = a0 + t0 * twist, an1 = a0 + t1 * twist;
        g.strokeStyle = t0 < 0.5 ? col[0] : col[1]; g.globalAlpha = (1 - t0) * 0.55 + 0.05; g.lineWidth = 3 + (1 - t0) * 13;
        g.beginPath(); g.moveTo(Math.cos(an0) * r0, Math.sin(an0) * r0); g.lineTo(Math.cos(an1) * r1, Math.sin(an1) * r1); g.stroke();
      }
    }
    g.globalAlpha = 1;
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 120); gr.addColorStop(0, col[3]); gr.addColorStop(0.18, col[0]); gr.addColorStop(0.6, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 120, 0, TAU); g.fill();
    return (sprites[key] = c);
  }

  function ringSprite(col) {
    const key = 'rg' + col[0];
    if (sprites[key]) return sprites[key];
    const S = 320, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), o = S / 2, R1 = 154, R0 = 112;
    g.translate(o, o);
    // cincin batu bertekstur (retakan voronoi) dengan bevel
    g.save(); g.beginPath(); g.arc(0, 0, R1, 0, TAU); g.arc(0, 0, R0, 0, TAU, true); g.clip();
    const sg = g.createLinearGradient(-R1, -R1, R1, R1); sg.addColorStop(0, '#8e8aa6'); sg.addColorStop(0.5, '#5a5674'); sg.addColorStop(1, '#2a2640'); g.fillStyle = sg; g.fillRect(-R1, -R1, R1 * 2, R1 * 2);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.75; g.fillStyle = g.createPattern(GA.Textures.voronoi(3, 128, 8), 'repeat'); g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.8; g.fillStyle = g.createPattern(GA.Textures.fbm(14, 256, 4), 'repeat'); g.fillRect(0, 0, S, S);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(-1.5, -2, R1 - 1.5, Math.PI * 0.95, Math.PI * 1.75); g.stroke();      // tepi terang kiri-atas
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R1, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, R0, 0, TAU); g.stroke();
    // rune bercahaya di cincin
    g.lineCap = 'round'; g.strokeStyle = col[0]; g.fillStyle = col[0]; g.lineWidth = 3.2; g.shadowColor = col[1]; g.shadowBlur = 10;
    const rr = (R0 + R1) / 2, rnd = GA.Noise.rng(9);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU, k = i % 4; g.save(); g.rotate(a); g.translate(rr, 0);
      g.beginPath();
      if (k === 0) { g.moveTo(-8, -10); g.lineTo(0, 10); g.lineTo(8, -10); } else if (k === 1) { g.moveTo(0, -11); g.lineTo(0, 11); g.moveTo(-7, -2); g.lineTo(7, 2); }
      else if (k === 2) { g.arc(0, 0, 8, 0.4, 5.6); } else { g.moveTo(-8, 8); g.lineTo(0, -10); g.lineTo(8, 8); g.moveTo(-5, 2); g.lineTo(5, 2); }
      g.stroke(); g.restore();
    }
    g.shadowBlur = 0;
    return (sprites[key] = c);
  }


  /* ---------- sprite tambahan portal: tanah gosong retak, pusaran fBm, cincin rune melayang ---------- */
  function groundSprite(col) {
    const key = 'gr' + col[1];
    if (sprites[key]) return sprites[key];
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), o = S / 2, rnd = GA.Noise.rng(77);
    g.translate(o, o);
    const sc = g.createRadialGradient(0, 0, 40, 0, 0, o); sc.addColorStop(0, 'rgba(8,2,18,0.8)'); sc.addColorStop(0.6, 'rgba(8,2,18,0.35)'); sc.addColorStop(1, 'rgba(8,2,18,0)');
    g.fillStyle = sc; g.beginPath(); g.arc(0, 0, o, 0, TAU); g.fill();                                  // gosong
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let k = 0; k < 11; k++) {                                                                      // retakan tanah radial
      let a = rnd() * TAU, d = 90 + rnd() * 20; const pts = [[Math.cos(a) * d, Math.sin(a) * d]];
      for (let s = 0; s < 6; s++) { a += (rnd() - 0.5) * 0.7; d += 20 + rnd() * 26; pts.push([Math.cos(a) * d, Math.sin(a) * d]); }
      g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 5; g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke();
      g.strokeStyle = col[1]; g.globalAlpha = 0.7; g.lineWidth = 1.6; g.shadowColor = col[1]; g.shadowBlur = 8; g.stroke(); g.globalAlpha = 1; g.shadowBlur = 0;
    }
    return (sprites[key] = c);
  }

  function fbmSprite(col) {
    const key = 'fb' + col[0];
    if (sprites[key]) return sprites[key];
    const S = 256, src = GA.Textures.fbm(21, 256, 5).getContext('2d').getImageData(0, 0, S, S).data, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data, h = col[0].replace('#', ''), cr = parseInt(h.substr(0, 2), 16), cg = parseInt(h.substr(2, 2), 16), cb = parseInt(h.substr(4, 2), 16);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4, dx = (x - 128) / 128, dy = (y - 128) / 128, rr = Math.sqrt(dx * dx + dy * dy), mask = Math.max(0, 1 - rr) * Math.min(1, rr * 5);      // lubang di pusat, memudar ke tepi
      const n = src[i] / 255, v = Math.pow(Math.max(0, n - 0.35) / 0.65, 1.6) * mask;
      d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = Math.min(255, v * 380);
    }
    g.putImageData(img, 0, 0);
    return (sprites[key] = c);
  }

  function runeRingSprite(col) {
    const key = 'rr' + col[0];
    if (sprites[key]) return sprites[key];
    const S = 384, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.translate(S / 2, S / 2);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = col[0]; g.shadowColor = col[1]; g.shadowBlur = 12; g.lineWidth = 3.4;
    g.globalAlpha = 0.5; g.beginPath(); g.arc(0, 0, 168, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 138, 0, TAU); g.stroke(); g.globalAlpha = 1;
    for (let i = 0; i < 10; i++) {
      g.save(); g.rotate(i / 10 * TAU); g.translate(153, 0); g.beginPath(); const k = i % 5;
      if (k === 0) { g.moveTo(-6, -9); g.lineTo(0, 9); g.lineTo(6, -9); } else if (k === 1) { g.moveTo(0, -10); g.lineTo(0, 10); g.moveTo(-6, -2); g.lineTo(6, 3); }
      else if (k === 2) { g.arc(0, 0, 7, 0.4, 5.6); } else if (k === 3) { g.moveTo(-7, 8); g.lineTo(0, -9); g.lineTo(7, 8); g.moveTo(-4, 3); g.lineTo(4, 3); } else { g.moveTo(-7, -7); g.lineTo(7, 7); g.moveTo(7, -7); g.lineTo(-7, 7); }
      g.stroke(); g.restore();
    }
    return (sprites[key] = c);
  }

  /* ---------- pengaturan jalur & portal ---------- */
  function entry(L, path, R) {
    const xs = path.xs, ys = path.ys, pl = L.play, st = path.step, PR = R * 2.2;
    const inside = function (i, m) { return xs[i] >= pl.x + m && xs[i] <= pl.x + pl.w - m && ys[i] >= pl.y + m && ys[i] <= pl.y + pl.h - m; };
    let first = -1;
    for (let i = 0; i < xs.length - 12; i++) if (inside(i, 2)) { first = i; break; }
    if (first < 0) return null;
    // geser maju sampai lingkaran portal penuh berada di layar, paling jauh 3,6R dari titik masuk
    let pick = Math.min(xs.length - 12, first + Math.round(R * 3.6 / st));
    for (let i = first; i <= first + Math.round(R * 3.6 / st) && i < xs.length - 12; i++) if (inside(i, PR)) { pick = i; break; }
    return { x: xs[pick], y: ys[pick], a: Math.atan2(ys[pick + 10] - ys[pick], xs[pick + 10] - xs[pick]), d: pick * st };
  }

  function setPath(L, path, R, sceneId) {
    E.L = L; E.path = path; E.R = R;
    const P = PS[0], p = path ? entry(L, path, R) : null;
    P.has = !!p; if (p) { P.x = p.x; P.y = p.y; P.a = p.a; P.d = p.d; }
    P.col = PORTAL_COL[sceneId] || PORTAL_COL.forest;
    if (!p) { P.open = 0; P.target = 0; }
  }

  function build(L, path, R, map, ext, info, lights) {
    E.L = L; E.map = map; E.ext = ext; E.info = info; E.lights = lights || [];
    const n = Math.round((map.fireflies || 30) * [0.3, 0.65, 1][E.quality]);
    if (E.flies.length !== n) {
      E.flies = [];
      for (let i = 0; i < n; i++) E.flies.push({ x: ext.x0 + Math.random() * ext.w, y: ext.y0 + Math.random() * ext.h, vx: (Math.random() - 0.5) * 12, vy: map.rise ? -(map.rise * (0.4 + Math.random())) : (Math.random() - 0.5) * 9, ph: Math.random() * TAU, s: 0.8 + Math.random() * 1.4 });
    }
    E.ripples = [];
    if (GA.Birds) GA.Birds.reset(ext, GA.Theme.scene, map.birds, E.quality);
  }

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }

  function drawPortal(ctx, t, dt) { PS.forEach(function (P) { drawPortalOne(P, ctx, t, dt); }); }

  function drawPortalOne(P, ctx, t, dt) {
    if (!P.has || P.open <= 0.001) { P.open = Math.max(0, P.open + (P.target - P.open) * Math.min(1, dt * 5)); return; }
    const open = P.open, R = E.R, col = P.col;
    P.open = P.target > P.open ? Math.min(P.target, P.open + dt / 0.8) : Math.max(P.target, P.open - dt / 0.5);
    P.pulse = Math.max(0, P.pulse - dt * 3.2); P.flash = Math.max(0, P.flash - dt * 2.5); P.rot += dt;
    const k = easeOut(open), size = R * 2.45 * k, pw = 0.62 + 0.38 * Math.sin(t * 2.1) * 0.5 + P.pulse * 0.6 + P.flash;
    ctx.save(); ctx.translate(P.x, P.y);
    // tanah gosong & retak di sekitar portal + bayangan cincin
    const gsz = size * 3.1; ctx.globalAlpha = Math.min(1, k * 1.2) * 0.9; ctx.drawImage(groundSprite(col), -gsz / 2, -gsz / 2, gsz, gsz); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.3 * k).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(size * 0.06, size * 0.1, size * 1.12, size * 1.1, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    // cahaya luar (menerangi sekitar)
    const gl = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 2.9);
    gl.addColorStop(0, col[1] + 'cc'); gl.addColorStop(1, 'rgba(120,60,220,0)'); ctx.globalAlpha = Math.min(1, pw * 0.8) * k; ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, size * 2.9, 0, TAU); ctx.fill();
    // sinar cahaya berputar pelan
    if (E.quality >= 1) {
      ctx.globalAlpha = 0.1 * k * (0.6 + pw * 0.5);
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + P.rot * 0.15, w = 0.09; ctx.fillStyle = col[0]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - w) * size * 3.4, Math.sin(a - w) * size * 3.4); ctx.lineTo(Math.cos(a + w) * size * 3.4, Math.sin(a + w) * size * 3.4); ctx.closePath(); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // rongga gelap dalam cincin
    const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.92); vg.addColorStop(0, col[2]); vg.addColorStop(1, '#05010f');
    ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(0, 0, size * 0.92, 0, TAU); ctx.fill();
    // tiga lapis pusaran dengan kecepatan dan arah berbeda
    ctx.globalCompositeOperation = 'lighter';
    const layers = [[swirlSprite(col, 3, 3.4, 0), 1.7, 1.0, 0.95], [swirlSprite(col, 4, -2.6, 1.3), -1.1, 0.78, 0.7], [swirlSprite(col, 2, 4.2, 2.1), 2.6, 0.5, 0.8]];
    layers.forEach(function (l) {
      ctx.save(); ctx.rotate(P.rot * l[1]); ctx.globalAlpha = Math.min(1, l[3] * (0.55 + pw * 0.5)) * k; const s = size * 0.92 * 2 * l[2]; ctx.drawImage(l[0], -s / 2, -s / 2, s, s); ctx.restore();
    });
    // pusaran fBm yang bergerak (dua lapis berlawanan arah) + lorong kedalaman: cincin yang menyusut ke pusat
    if (E.quality >= 1) {
      const fb = fbmSprite(col);
      [[0.35, 0.82, 0.6], [-0.23, 1.0, 0.45]].forEach(function (l) { ctx.save(); ctx.rotate(P.rot * l[0]); ctx.globalAlpha = Math.min(1, l[2] * (0.6 + pw * 0.5)) * k; const s = size * 0.92 * 2 * l[1]; ctx.drawImage(fb, -s / 2, -s / 2, s, s); ctx.restore(); });
      ctx.strokeStyle = col[0]; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const u = (t * 0.45 + i / 5) % 1, rr = size * 0.9 * (1 - u * 0.92), a0 = P.rot * (1.4 + i * 0.3) + i * 1.9;
        ctx.globalAlpha = Math.sin(Math.PI * u) * 0.5 * k; ctx.lineWidth = Math.max(1, size * 0.05 * (1 - u * 0.6));
        ctx.beginPath(); ctx.arc(0, 0, rr, a0, a0 + 2.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, rr, a0 + 3.4, a0 + 5.6); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // inti terang
    const cg =ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.34); cg.addColorStop(0, col[3]); cg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.globalAlpha = Math.min(1, 0.5 + pw * 0.6) * k; ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, size * 0.34, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // cincin rune berputar
    ctx.save(); ctx.rotate(-P.rot * 0.28); const rsz = size * 2.08; ctx.globalAlpha = Math.min(1, k * 1.4); ctx.drawImage(GA.Theme.sprite('portal') || ringSprite(col), -rsz / 2, -rsz / 2 * 1.0, rsz, rsz); ctx.restore();
    // cincin rune MELAYANG di atas portal (bayangan lembut di tanah), efek lensa di tepi, busur petir
    if (E.quality >= 1) {
      const fz = size * 2.5 * (1 + 0.02 * Math.sin(t * 1.7)), bob = Math.sin(t * 1.3) * size * 0.04;
      ctx.save(); ctx.rotate(P.rot * 0.22); ctx.globalAlpha = 0.22 * k; ctx.drawImage(runeRingSprite([ '#000000', '#000000' ]), -fz / 2 + size * 0.05, -fz / 2 + size * 0.16, fz, fz); ctx.restore();
      ctx.save(); ctx.translate(0, -bob); ctx.rotate(P.rot * 0.22); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.55 + 0.3 * pw) * k; ctx.drawImage(runeRingSprite(col), -fz / 2, -fz / 2, fz, fz); ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = Math.max(1, size * 0.03); ctx.globalAlpha = 0.28 * k;
      ctx.strokeStyle = 'rgba(255,90,120,1)'; ctx.beginPath(); ctx.arc(1.6, 0, size * 0.95, 0, TAU); ctx.stroke(); ctx.strokeStyle = 'rgba(90,150,255,1)'; ctx.beginPath(); ctx.arc(-1.6, 0, size * 0.95, 0, TAU); ctx.stroke();
      if (k > 0.8 && P.bolts.length < 3 && Math.random() < dt * 3.5) {
        const a = Math.random() * TAU, pts = []; let d = size * 0.98, aa = a;
        for (let i = 0; i < 5; i++) { pts.push([Math.cos(aa) * d, Math.sin(aa) * d]); d += size * (0.1 + Math.random() * 0.14); aa += (Math.random() - 0.5) * 0.35; }
        P.bolts.push({ pts: pts, life: 0.14 });
      }
      for (let i = P.bolts.length - 1; i >= 0; i--) {
        const b = P.bolts[i]; b.life -= dt; if (b.life <= 0) { P.bolts.splice(i, 1); continue; }
        const f = b.life / 0.14; ctx.lineJoin = 'round'; ctx.beginPath(); b.pts.forEach(function (p, j) { if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
        ctx.strokeStyle = col[1]; ctx.globalAlpha = 0.6 * f * k; ctx.lineWidth = Math.max(2, size * 0.07); ctx.stroke(); ctx.strokeStyle = col[3]; ctx.globalAlpha = 0.95 * f * k; ctx.lineWidth = Math.max(1, size * 0.025); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    // riak di sekitar portal
    if (E.quality >= 1) {
      if (P.rip.length < 3 && k > 0.8 && Math.random() < dt * 1.3) P.rip.push(0);
      ctx.lineWidth = 2;
      for (let i = P.rip.length - 1; i >= 0; i--) { P.rip[i] += dt / 1.6; const r = P.rip[i]; if (r >= 1) { P.rip.splice(i, 1); continue; } ctx.strokeStyle = col[0]; ctx.globalAlpha = 0.3 * (1 - r); ctx.beginPath(); ctx.arc(0, 0, size * (1.2 + r * 1.1), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // partikel tersedot (masuk) dan terpancar (keluar searah jalur)
    ctx.globalCompositeOperation = 'lighter';
    const want = Math.round([6, 14, 26][E.quality] * k);
    P.spawn -= dt;
    if (P.parts.length < want && P.spawn <= 0) {
      P.spawn = 0.03;
      if (Math.random() < 0.55) { const a = Math.random() * TAU, d = size * (1.6 + Math.random() * 0.8); P.parts.push({ in: true, x: Math.cos(a) * d, y: Math.sin(a) * d, a: a, d: d, life: 0, max: 0.9 + Math.random() * 0.5, s: 1 + Math.random() * 1.8 }); }
      else { const sp = (Math.random() - 0.5) * 1.1; P.parts.push({ in: false, x: 0, y: 0, vx: Math.cos(P.a + sp) * (90 + Math.random() * 120), vy: Math.sin(P.a + sp) * (90 + Math.random() * 120), life: 0, max: 0.5 + Math.random() * 0.6, s: 1 + Math.random() * 1.6 }); }
    }
    for (let i = P.parts.length - 1; i >= 0; i--) {
      const p = P.parts[i]; p.life += dt; const u = p.life / p.max;
      if (u >= 1) { P.parts.splice(i, 1); continue; }
      if (p.in) { const d = p.d * (1 - u * u), a = p.a + u * 2.4; p.x = Math.cos(a) * d; p.y = Math.sin(a) * d; } else { p.x += p.vx * dt; p.y += p.vy * dt; }
      ctx.globalAlpha = (p.in ? u : 1 - u) * 0.9 * k; ctx.fillStyle = p.in ? col[0] : col[3]; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (p.in ? 1.4 - u * 0.6 : 1), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- efek peta ---------- */
  function drawPond(ctx, t, dt) {
    const pd = E.info && E.info.pond; if (!pd || E.quality < 1) return;
    if (E.ripples.length < 3 && Math.random() < dt * 1.4) { const a = Math.random() * TAU, d = Math.random() * pd.r * 0.55; E.ripples.push({ x: pd.x + Math.cos(a) * d, y: pd.y + Math.sin(a) * d * 0.85, age: 0 }); }
    ctx.lineWidth = 1.6;
    for (let i = E.ripples.length - 1; i >= 0; i--) {
      const r = E.ripples[i]; r.age += dt; const k = r.age / 2.4;
      if (k >= 1) { E.ripples.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(' + pd.rip + ',' + (0.4 * (1 - k)).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(r.x, r.y, pd.r * 0.05 + k * pd.r * 0.26, (pd.r * 0.05 + k * pd.r * 0.26) * 0.7, 0, 0, TAU); ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const tw = Math.max(0, Math.sin(t * 2.1 + i * 1.7)); if (tw < 0.55) continue;
      const a = i * 1.9 + 0.5, d = pd.r * (0.55 + (i % 3) * 0.12), x = pd.x + Math.cos(a) * d, y = pd.y + Math.sin(a) * d * 0.8, s = 3 * tw;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.moveTo(x, y - s * 1.8); ctx.lineTo(x + s * 0.4, y); ctx.lineTo(x, y + s * 1.8); ctx.lineTo(x - s * 0.4, y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 1.8, y); ctx.lineTo(x, y + s * 0.4); ctx.lineTo(x + s * 1.8, y); ctx.lineTo(x, y - s * 0.4); ctx.closePath(); ctx.fill();
    }
  }

  function drawShafts(ctx, t) {
    const ex = E.ext, n = E.map ? E.map.shafts || 0 : 0; if (!n || E.quality < 1) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const x0 = ex.x0 + ex.w * (0.12 + i * 0.3), w = 60 + 30 * (i % 2), k = 0.55 + 0.45 * Math.sin(t * 0.35 + i * 2.1);
      const g = ctx.createLinearGradient(x0, ex.y0, x0 + ex.h * 0.45, ex.y1);
      g.addColorStop(0, E.map.pal.shaft); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = k; ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x0, ex.y0); ctx.lineTo(x0 + w, ex.y0); ctx.lineTo(x0 + w + ex.h * 0.45 + 30, ex.y1); ctx.lineTo(x0 + ex.h * 0.45 - 20, ex.y1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /** Cahaya dinamis: obor/anglo berkedip (api animasi), lubang lava berdenyut dan beruap, kristal berpendar. Sprite glow dibuat sekali per warna. */
  const glowSpr = Object.create(null);
  function glowSprite(col) {
    if (glowSpr[col]) return glowSpr[col];
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(' + col + ',0.9)'); gr.addColorStop(0.4, 'rgba(' + col + ',0.35)'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (glowSpr[col] = c);
  }
  function drawLights(ctx, t) {
    const ls = E.lights; if (!ls || !ls.length || E.quality < 1) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i], fl = 0.75 + 0.25 * Math.sin(t * (l.flame ? 13 : 2.2) + i * 2.3) * (l.flame ? Math.sin(t * 5.1 + i) : 1), r = l.r * (l.flame ? 0.85 + 0.15 * fl : 1);
      ctx.globalAlpha = (l.flame ? 0.55 : 0.4) * fl; ctx.drawImage(glowSprite(l.col), l.x - r, l.y - r, r * 2, r * 2);
      if (l.flame) {   // api obor
        const s = l.s * 0.5, sw = Math.sin(t * 9 + i * 3) * s * 0.25; ctx.globalAlpha = 1;
        [[1, '255,120,30'], [0.62, '255,210,90'], [0.3, '255,255,220']].forEach(function (k) { ctx.fillStyle = 'rgba(' + k[1] + ',0.85)'; ctx.beginPath(); ctx.moveTo(l.x - s * 0.45 * k[0], l.y); ctx.quadraticCurveTo(l.x - s * 0.5 * k[0] + sw, l.y - s * 0.9 * k[0], l.x + sw * 1.6, l.y - s * 1.9 * k[0] * (0.85 + 0.15 * fl)); ctx.quadraticCurveTo(l.x + s * 0.5 * k[0] + sw, l.y - s * 0.9 * k[0], l.x + s * 0.45 * k[0], l.y); ctx.closePath(); ctx.fill(); });
      } else if (l.steam && E.quality >= 2) {   // uap lubang lava
        for (let k = 0; k < 3; k++) { const ph = (t * 0.5 + k * 0.33 + i * 0.17) % 1; ctx.globalAlpha = 0.18 * (1 - ph); ctx.fillStyle = 'rgb(255,225,200)'; ctx.beginPath(); ctx.arc(l.x + Math.sin(ph * 5 + k) * 8, l.y - ph * 60, 8 + ph * 16, 0, TAU); ctx.fill(); }
      }
    }
    ctx.restore();
  }

  /** Kabut tipis yang bergerak pelan (dua lapis noise besar). */
  function drawMist(ctx, t) {
    if (!E.map || !E.map.mist || E.quality < 1 || !E.ext) return;
    const ex = E.ext, tex = GA.Textures.fbm(9, 256, 4);
    for (let i = 0; i < (E.quality >= 2 ? 2 : 1); i++) {
      const pat = ctx.createPattern(tex, 'repeat'); try { pat.setTransform(new DOMMatrix().scale(2.4 + i * 1.3)); } catch (e) { /* abaikan */ }
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.07 + i * 0.02; ctx.translate(t * (7 + i * 5) * (i ? -1 : 1), t * (3 + i * 2)); ctx.fillStyle = pat;
      ctx.fillRect(ex.x0 - 2000, ex.y0 - 2000, ex.w + 4000, ex.h + 4000); ctx.restore();
    }
  }

  function drawFlies(ctx, t, dt) {
    const ex = E.ext, col = E.map.pal.fly;
    for (let i = 0; i < E.flies.length; i++) {
      const p = E.flies[i];
      p.x += (p.vx + Math.sin(t * 0.8 + p.ph) * 7) * dt; p.y += (p.vy + Math.cos(t * 0.6 + p.ph) * 5) * dt;
        if (p.x < ex.x0 - 10) p.x = ex.x1 + 8; if (p.x > ex.x1 + 10) p.x = ex.x0 - 8; if (p.y < ex.y0 - 10) { p.y = ex.y1 + 8; p.x = ex.x0 + Math.random() * ex.w; } if (p.y > ex.y1 + 10) p.y = ex.y0 - 8;
      const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + p.ph);
      ctx.fillStyle = 'rgba(' + col + ',' + (0.14 + 0.28 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 5 * p.s, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,230,' + (0.5 + 0.5 * tw).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.3 * p.s, 0, TAU); ctx.fill();
    }
  }

  /** Burung kecil yang sesekali melintas (siluet + bayangan jatuh ke tanah). */
  function drawBird(ctx, t, dt) {
    if (!E.map || !E.map.birds || E.quality < 1 || !E.ext) return;
    const ex = E.ext;
    if (!E.bird) { E.birdT -= dt; if (E.birdT <= 0) { const l2r = Math.random() < 0.5; E.bird = { x: l2r ? ex.x0 - 30 : ex.x1 + 30, y: ex.y0 + ex.h * (0.2 + Math.random() * 0.5), vx: (l2r ? 1 : -1) * (70 + Math.random() * 40), ph: Math.random() * 6 }; E.birdT = 14 + Math.random() * 14; } return; }
    const b = E.bird; b.x += b.vx * dt; b.y += Math.sin(t * 0.8 + b.ph) * 12 * dt;
    if (b.x < ex.x0 - 60 || b.x > ex.x1 + 60) { E.bird = null; return; }
    const fl = Math.sin(t * 12 + b.ph), s = 11, dir = b.vx > 0 ? 1 : -1;
    [[0, 0, 1, E.map.birdCol || 'rgba(10,25,12,0.82)'], [30, 46, 0.8, 'rgba(0,0,0,0.18)']].forEach(function (o) {
      ctx.save(); ctx.translate(b.x + o[0], b.y + o[1]); ctx.scale(dir * o[2], o[2]); ctx.fillStyle = o[3];
      ctx.beginPath(); ctx.moveTo(s * 1.2, 0); ctx.quadraticCurveTo(s * 0.3, -s * 0.9 * fl - s * 0.2, -s * 0.9, -s * 1.4 * fl); ctx.quadraticCurveTo(-s * 0.2, -s * 0.1, -s * 0.5, 0);
      ctx.quadraticCurveTo(-s * 0.2, s * 0.1, -s * 0.9, s * 1.4 * fl); ctx.quadraticCurveTo(s * 0.3, s * 0.9 * fl + s * 0.2, s * 1.2, 0); ctx.fill(); ctx.restore();
    });
  }

  const Effects = {
    quality: 2, build: build, setPath: setPath,
    setQuality: function (q) { E.quality = q; this.quality = q; if (GA.Birds) GA.Birds.setQuality(q); },
    /** Burung (tampak atas, di bawah bola): update + gambar. Dipanggil dari main sebelum rantai. */
    drawBirds: function (ctx, t, dt) { if (GA.Birds) { GA.Birds.update(dt, t); GA.Birds.draw(ctx, t); } },
    entryD: function () { const P = PS[0]; return P.has ? P.d : 0; },
    portalPos: function () { const P = PS[0]; return P.has ? { x: P.x, y: P.y, a: P.a } : null; },
    /** Kendali portal: reset(open) mengatur keadaan awal; open()/close() animasi; pulse() saat bola keluar. */
    resetPortal: function (open) { PS.forEach(function (P) { P.open = open && P.has ? 1 : 0; P.target = open && P.has ? 1 : 0; P.pulse = 0; P.flash = 0; P.parts.length = 0; }); },
    openPortal: function () { PS.forEach(function (P) { if (P.has) { P.target = 1; P.flash = 0.9; } }); },
    closePortal: function () { PS.forEach(function (P) { P.target = 0; P.flash = 0.6; }); },
    pulse: function (s) { const P = PS[0]; P.pulse = Math.min(1.2, P.pulse + (s || 0.7)); },
    drawPortal: drawPortal,
    /** Efek di bawah rantai (ruang logis): kolam, kabut, berkas cahaya. */
    drawUnder: function (ctx, t, dt) { drawPond(ctx, t, dt); drawMist(ctx, t); drawLights(ctx, t); drawFlies(ctx, t, dt); },      // tanpa kerucut cahaya lebar; semuanya DI BAWAH bola
    /** Efek paling atas: kunang-kunang dan burung. */
    drawOver: function () { }      // tidak ada lagi efek di atas bola
  };

  GA.Effects = Effects;
})(window.GA = window.GA || {});
