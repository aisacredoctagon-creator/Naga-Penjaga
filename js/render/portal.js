/* portal.js — PORTAL ringan (revisi 11; menggantikan effects.js yang berisi pusaran volumetrik, petir, partikel tersedot, riak, kabut, kunang-kunang, dan burung).
 * Dua sprite prarender per warna: CINCIN batu berukir rune (statis) dan PUSARAN datar (satu sprite). Per frame hanya dua drawImage; denyut = skala/opasitas singkat tiap bola keluar,
 * pusaran berputar pelan HANYA selama fase keluarnya bola (setelah itu statis). Siklus: tertutup (intro) → membuka 0,8 dtk saat hitung mundur → statis selama permainan → menutup saat stage selesai.
 * API (nama lama dipertahankan agar main.js/tes tidak berubah): setPath, entryD, portalPos, resetPortal, openPortal, closePortal, pulse, drawPortal. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  const P = { x: 0, y: 0, a: 0, d: 0, has: false, open: 0, target: 0, pulse: 0, spin: 0, rot: 0, col: null };
  const E = { L: null, path: null, R: 0 };
  const cache = Object.create(null);

  const hex = function (c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; };
  const mix = function (a, b, k) { return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * k); }).join(',') + ')'; };
  /** Warna portal dari warna rune peta: [terang, tengah, gelap]. */
  function colors(sceneId) {
    const m = GA.Maps && GA.Maps[sceneId], c = hex(m && m.pal && m.pal.rune ? m.pal.rune : '#b890ff');
    return [mix(c, [255, 255, 255], 0.55), 'rgb(' + c.join(',') + ')', mix(c, [8, 4, 24], 0.72)];
  }

  /** Sprite cincin: cincin batu gelap + bibir terang + 8 tanda rune berwarna; tengah transparan (diisi gelap oleh pusaran). */
  function ringSprite(R, px, col) {
    const key = 'r' + Math.round(R) + '|' + px.toFixed(2) + '|' + col[1]; if (cache[key]) return cache[key];
    const PR = R * 2.2, D = Math.ceil(PR * 2.3 * px), c = document.createElement('canvas'); c.width = c.height = D; const g = c.getContext('2d'), o = D / 2, u = px;
    g.translate(o, o); g.scale(u, u);
    const ring = function (r0, r1, fill) { g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.arc(0, 0, r0, 0, TAU, true); g.fill(); };
    ring(PR * 0.74, PR * 1.04, 'rgba(4,3,12,0.9)'); ring(PR * 0.78, PR * 1.0, '#4a4670'); ring(PR * 0.78, PR * 0.9, '#6a668e');      // tepi gelap, batu, bibir terang
    g.strokeStyle = '#1a1730'; g.lineWidth = Math.max(1.5, R * 0.07); g.setLineDash([2, R * 1.1]); g.beginPath(); g.arc(0, 0, PR * 0.94, 0, TAU); g.stroke(); g.setLineDash([]);      // celah antar-blok
    g.fillStyle = col[0]; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.save(); g.rotate(a); g.fillRect(PR * 0.8, -R * 0.07, R * 0.34, R * 0.14); g.restore(); }
    return (cache[key] = { c: c, d: D / px });
  }

  /** Sprite pusaran: cakram gelap + tiga lengan datar berwarna + inti terang. */
  function swirlSprite(R, px, col) {
    const key = 's' + Math.round(R) + '|' + px.toFixed(2) + '|' + col[1]; if (cache[key]) return cache[key];
    const PR = R * 2.2, D = Math.ceil(PR * 2 * px), c = document.createElement('canvas'); c.width = c.height = D; const g = c.getContext('2d'), o = D / 2;
    g.translate(o, o); g.scale(px, px);
    g.fillStyle = col[2]; g.beginPath(); g.arc(0, 0, PR * 0.8, 0, TAU); g.fill();
    for (let k = 0; k < 3; k++) {
      g.save(); g.rotate(k * TAU / 3); g.strokeStyle = k % 2 ? col[0] : col[1]; g.lineWidth = R * 0.32; g.lineCap = 'round'; g.beginPath();
      for (let i = 0; i <= 14; i++) { const u = i / 14, r = PR * (0.12 + u * 0.6), a = u * 3.4; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); g.restore();
    }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, PR * 0.15, 0, TAU); g.fill(); g.fillStyle = col[0]; g.beginPath(); g.arc(0, 0, PR * 0.26, 0, TAU); g.globalAlpha = 0.5; g.fill();
    return (cache[key] = { c: c, d: D / px });
  }

  /** Titik masuk jalur ke area bermain: portal diletakkan di sana (geser maju sampai lingkaran penuh berada di layar). */
  function entry(L, path, R) {
    const xs = path.xs, ys = path.ys, pl = L.play, st = path.step, PR = R * 2.2;
    const inside = function (i, m) { return xs[i] >= pl.x + m && xs[i] <= pl.x + pl.w - m && ys[i] >= pl.y + m && ys[i] <= pl.y + pl.h - m; };
    let first = -1;
    for (let i = 0; i < xs.length - 12; i++) if (inside(i, 2)) { first = i; break; }
    if (first < 0) return null;
    let pick = Math.min(xs.length - 12, first + Math.round(R * 3.6 / st));
    for (let i = first; i <= first + Math.round(R * 3.6 / st) && i < xs.length - 12; i++) if (inside(i, PR)) { pick = i; break; }
    return { x: xs[pick], y: ys[pick], a: Math.atan2(ys[pick + 10] - ys[pick], xs[pick + 10] - xs[pick]), d: pick * st };
  }

  function setPath(L, path, R, sceneId) {
    E.L = L; E.path = path; E.R = R;
    const p = path ? entry(L, path, R) : null;
    P.has = !!p; if (p) { P.x = p.x; P.y = p.y; P.a = p.a; P.d = p.d; }
    P.col = colors(sceneId);
    if (!p) { P.open = 0; P.target = 0; }
  }

  function drawPortal(ctx, t, dt) {
    dt = dt > 0 ? Math.min(dt, 0.25) : 0;
    if (!P.has) return;
    P.open = P.target > P.open ? Math.min(P.target, P.open + dt / 0.8) : Math.max(P.target, P.open - dt / 0.5);
    P.pulse = Math.max(0, P.pulse - dt * 3.2);
    if (P.spin > 0) { P.spin -= dt; P.rot += dt * 1.5; }
    if (P.open <= 0.001) return;
    const px = E.L.px, ring = ringSprite(E.R, px, P.col), sw = swirlSprite(E.R, px, P.col), k = P.open * P.open * (3 - 2 * P.open), sc = k * (1 + 0.12 * P.pulse);
    ctx.save(); ctx.translate(P.x, P.y); ctx.globalAlpha = Math.min(1, P.open * 1.4); ctx.scale(sc, sc);
    ctx.save(); ctx.rotate(P.rot); ctx.drawImage(sw.c, -sw.d / 2, -sw.d / 2, sw.d, sw.d); ctx.restore();
    ctx.drawImage(ring.c, -ring.d / 2, -ring.d / 2, ring.d, ring.d); ctx.restore();
  }

  const Effects = {
    quality: 2, setPath: setPath, setQuality: function (q) { this.quality = q; }, build: function () { },
    entryD: function () { return P.has ? P.d : 0; },
    portalPos: function () { return P.has ? { x: P.x, y: P.y, a: P.a } : null; },
    resetPortal: function (open) { P.open = open && P.has ? 1 : 0; P.target = P.open; P.pulse = 0; P.spin = 0; },
    openPortal: function () { if (P.has) { P.target = 1; P.spin = 1.2; } },
    closePortal: function () { P.target = 0; },
    pulse: function (s) { P.pulse = Math.min(1.2, P.pulse + (s || 0.7)); P.spin = Math.max(P.spin, 0.9); },
    drawPortal: drawPortal
  };
  GA.Effects = Effects;
})(window.GA = window.GA || {});
