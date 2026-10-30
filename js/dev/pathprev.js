/* dev/pathprev.js — pratinjau jalur (revisi 8). Dimuat dengan ?debug=pathprev. GA.PathPrev.sheet(ids, [ukuran...]) → canvas berisi, untuk tiap ukuran layar, area bermain, zona HUD, naga + jangkauan sayap,
 * jalur (garis tengah), titik kontrol (kuning), posisi bola PENUH (20 bola pertama berwarna, sisa jalur berupa lingkaran samar), portal (ungu), sarang (oranye), serta panjang (diameter bola),
 * rasio terhadap panjang rantai 20 bola, persentase terhadap serpentin lama, dan pelanggaran validator (merah). GA.PathPrev.table(ids) → baris tabel panjang. Tanpa render game. */
(function (GA) {
  'use strict';
  const SIZES = [[390, 844], [844, 390], [1440, 900]];

  function build(id, sz) {
    const G = GA.game; GA.devViewport = { w: sz[0], h: sz[1] }; G.relayout();
    const L = G.layout, R = L.ballR, p = GA.Path.forLayout(id, L, R), rep = p.report || {};
    return { L: L, R: R, p: p, rep: rep, def: GA.Paths.resolve(id, L.portrait, L, R) };
  }

  function row(id, sz) {
    const b = build(id, sz), sp = b.rep.star && b.rep.star.spiral, D = 2 * b.R * 0.98, len = b.p.length;
    return { id: id, size: sz.join('x'), R: b.R, lenD: len / (2 * b.R), ratio: len / (20 * D), pct: sp ? sp.pct : null, issues: (b.rep.issues || []).map(function (i) { return i.kind; }), fit: b.def && b.def.fit };
  }

  function draw(g, b, id, sz, s, ox, oy) {
    const L = b.L, R = b.R, p = b.p, rep = b.rep, pl = L.play, D = 2 * R * 0.98;
    g.save(); g.translate(ox, oy); g.scale(s, s);
    g.fillStyle = '#0c2018'; g.fillRect(0, 0, L.W, L.H); g.fillStyle = '#16402c'; g.fillRect(pl.x, pl.y, pl.w, pl.h);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, L.W, L.hud); g.fillStyle = '#9fb'; g.font = '22px monospace'; g.fillText('HUD / zona informasi', 12, L.hud - 10);
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.setLineDash([6, 6]); g.strokeRect(pl.x + L.pad, pl.y + L.padTop, pl.w - 2 * L.pad, pl.h - L.padTop - L.pad); g.setLineDash([]);
    const c = p.shooter, wn = GA.Paths.wingNeed(R);
    g.fillStyle = 'rgba(75,224,138,0.5)'; g.beginPath(); g.arc(c.x, c.y, wn - R - 2, 0, 7); g.fill(); g.strokeStyle = '#4be08a'; g.lineWidth = 2; g.beginPath(); g.arc(c.x, c.y, GA.Paths.muzzleL(R), 0, 7); g.stroke();
    g.lineCap = 'round'; g.strokeStyle = 'rgba(150,110,60,0.45)'; g.lineWidth = R * 2; g.stroke(p.poly()); g.lineWidth = 2; g.strokeStyle = '#4de8ff'; g.stroke(p.poly());
    const nBall = Math.floor(p.length / D) + 1;
    for (let i = 0; i < nBall; i++) {
      p.at(i * D, { x: 0, y: 0, a: 0 }); const q = p.at(i * D, { x: 0, y: 0, a: 0 });
      g.beginPath(); g.arc(q.x, q.y, R * 0.96, 0, 7);
      if (i < 20) { g.fillStyle = 'hsla(' + (i * 47 % 360) + ',70%,55%,0.85)'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#000'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), q.x, q.y); }
      else { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.setLineDash([4, 4]); g.stroke(); g.setLineDash([]); }
    }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    (p.ctrl || []).forEach(function (q, i) { if (i % 14) return; g.fillStyle = '#ff0'; g.beginPath(); g.arc(q[0], q[1], 3, 0, 7); g.fill(); });
    g.fillStyle = '#b69cff'; g.beginPath(); g.arc(p.xs[0], p.ys[0], R * 1.4, 0, 7); g.fill(); g.fillStyle = '#ff9a2a'; g.beginPath(); g.arc(p.xs[p.xs.length - 1], p.ys[p.ys.length - 1], R * 0.9, 0, 7); g.fill();
    if (p.boss) { g.strokeStyle = '#ff5a5a'; g.lineWidth = 3; g.beginPath(); g.arc(p.boss.x, p.boss.y, p.boss.R || R * 2.45, 0, 7); g.stroke(); }
    (rep.star && rep.star.rayBad || []).forEach(function (q) { if (q) { g.fillStyle = 'rgba(255,40,40,0.55)'; g.beginPath(); g.arc(q[0], q[1], R, 0, 7); g.fill(); } });
    const sp = rep.star && rep.star.spiral, len = p.length;
    const lines = [id + '  ' + sz.join('×') + (L.portrait ? ' potret' : ' lanskap') + '  R ' + R,
      'panjang ' + (len / (2 * R)).toFixed(1) + ' d   rasio rantai-20 ' + (len / (20 * D)).toFixed(2) + (sp ? '   vs serpentin lama terpendek ' + sp.pct.toFixed(0) + '% (' + sp.old.toFixed(1) + ' d; rata-rata ' + sp.pctMean.toFixed(0) + '%)' : '')];
    if (b.def && b.def.fit && b.def.fit.n != null) lines.push('putaran ' + b.def.fit.n + '   pitch ' + b.def.fit.pitch.toFixed(1) + 'R   kunci ' + (sp ? sp.lockR.toFixed(2) + '×dia' : '-'));
    else if (rep.star && rep.star.inv1) lines.push('INV-1 peluru nyata ' + rep.star.inv1.fat + '/' + rep.star.inv1.tot + '   sinar tipis ' + rep.star.inv1.thin);
    (rep.issues || []).slice(0, 3).forEach(function (i) { lines.push('! ' + i.msg); });
    g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(pl.x + 4, pl.y + 4, Math.min(L.W - 8, 470), 12 + 22 * lines.length);
    g.font = '15px monospace'; lines.forEach(function (t, i) { g.fillStyle = i > 2 && t[0] === '!' ? '#ff9a7d' : '#fff'; g.fillText(t, pl.x + 10, pl.y + 24 + i * 22); });
    g.restore();
  }

  /** Satu gambar: tiap id satu baris, tiap ukuran satu kolom. */
  function sheet(ids, sizes, scale) {
    sizes = sizes || SIZES; scale = scale || 0.5;
    const cells = []; let W = 0, H = 0;
    ids.forEach(function (id, r) { let x = 0, rowH = 0; sizes.forEach(function (sz) { const b = build(id, sz); cells.push({ b: b, id: id, sz: sz, x: x, r: r }); x += b.L.W * scale + 6; rowH = Math.max(rowH, b.L.H * scale); W = Math.max(W, x); }); cells.forEach(function (c) { if (c.r === r) c.h = rowH; }); H += rowH + 6; });
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W); cv.height = Math.ceil(H); const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
    let y = 0, lastR = -1; cells.forEach(function (c) { if (c.r !== lastR) { if (lastR >= 0) y += cells.find(function (q) { return q.r === lastR; }).h + 6; lastR = c.r; } draw(g, c.b, c.id, c.sz, scale, c.x, y); });
    GA.devViewport = null; GA.game.relayout();
    return cv;
  }
  function table(ids, sizes) { const out = []; ids.forEach(function (id) { (sizes || SIZES).forEach(function (sz) { out.push(row(id, sz)); }); }); GA.devViewport = null; GA.game.relayout(); return out; }
  GA.PathPrev = { sheet: sheet, table: table, row: row };
})(window.GA = window.GA || {});
