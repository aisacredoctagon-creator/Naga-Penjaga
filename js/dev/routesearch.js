/* dev/routesearch.js — pencari rute grid (revisi 10). Dimuat dengan ?debug=route. Dipakai SEKALI untuk membuat data TPL di js/maps/paths.js; hasilnya divalidasi memakai validator asli.
 *   GA.RouteSearch.search(cfg)                      DFS rute jalan-sendiri pada grid persegi panjang berpusat di naga (jarak baris cfg.sx, cfg.sy; geseran ox/oy ∈ {0, 0,5}).
 *   GA.RouteSearch.evalRoute(nodes, ox, oy, flip, stage, size, bossK, R)   bangun jalur sungguhan (GA.Paths.routeGeom + validator) → { ok, issues, lenD, route }
 *   GA.RouteSearch.sheet(items, ...)                lembar pratinjau.
 * Batas rute (dicek DFS secara kasar, lalu pasti oleh validator): dua ujung (portal, sarang) ≥ 208 px dari pivot, jarak portal-sarang ≥ 0,55 × sisi terpanjang, sudut ≥ 150°, bagian jalur setelah 16R dari
 * awal ≥ sprite + 3R dari portal, dan sebelum 16R terakhir ≥ sprite + 3R dari sarang. */
(function (GA) {
  'use strict';
  function search(cfg) {
    const R = cfg.R, pl = cfg.pl, pv = { x: pl.x + pl.w / 2, y: pl.y + pl.h / 2 };
    const py = cfg.sy || 2.8 * R, pxs = cfg.sx || py, wn = cfg.wn, PR = GA.Paths.SPR_PORTAL * R, NR = GA.Paths.SPR_NEST * R;
    const cl = { P: PR + 3 * R + (cfg.mP == null ? 3 : cfg.mP), N: NR + 3 * R + (cfg.mN == null ? 3 : cfg.mN) }, EX = 16 * R;
    const nodes = [], idx = {}, ci0 = cfg.ox || 0, rj0 = cfg.oy || 0;
    for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) {
      const x = pv.x + (i + ci0) * pxs, y = pv.y + (j + rj0) * py;
      if (x < cfg.xmin - 0.01 || x > cfg.xmax + 0.01 || y < cfg.ymin - 0.01 || y > cfg.ymax + 0.01) continue;
      if (Math.hypot(x - pv.x, y - pv.y) < wn) continue;
      idx[i + ',' + j] = nodes.length; nodes.push({ i: i, j: j, x: x, y: y, n: [] });
    }
    nodes.forEach(function (a) { [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { const k = idx[(a.i + d[0]) + ',' + (a.j + d[1])]; if (k != null) a.n.push(k); }); });
    const okEdge = {};
    nodes.forEach(function (a, ia) { a.n.forEach(function (ib) { const b = nodes[ib]; let m = 1e9; const L = Math.hypot(b.x - a.x, b.y - a.y); for (let s = 0; s <= L; s += 6) { const t = s / L; m = Math.min(m, Math.hypot(a.x + (b.x - a.x) * t - pv.x, a.y + (b.y - a.y) * t - pv.y)); } okEdge[ia + '>' + ib] = m >= wn - 0.5; }); });
    const startOK = function (a) { return a.x >= pl.x + PR - 0.01 && a.x <= pl.x + pl.w - PR + 0.01 && a.y >= pl.y + PR - 0.01 && a.y <= pl.y + pl.h - PR + 0.01 && Math.hypot(a.x - pv.x, a.y - pv.y) >= cfg.minPv; };
    const endOK = function (a) { return a.x >= pl.x + NR - 0.01 && a.x <= pl.x + pl.w - NR + 0.01 && a.y >= pl.y + NR - 0.01 && a.y <= pl.y + pl.h - NR + 0.01 && Math.hypot(a.x - pv.x, a.y - pv.y) >= cfg.minPv; };
    const out = []; let visits = 0; const maxOut = cfg.maxOut || 4000, budget = cfg.budget || 4e7, vis = new Uint8Array(nodes.length), pts = [], pathNodes = [];
    function rec(cur, prev, s, P0) {
      if (++visits > budget || out.length >= maxOut) return;
      const a = nodes[cur];
      if (s >= cfg.Lmin && endOK(a) && pts.length > 5) {
        const d = Math.hypot(a.x - P0.x, a.y - P0.y), long = Math.max(pl.w, pl.h);
        let da = Math.abs(Math.atan2(P0.y - pv.y, P0.x - pv.x) - Math.atan2(a.y - pv.y, a.x - pv.x)); if (da > Math.PI) da = 2 * Math.PI - da;
        if (d >= 0.55 * long + 2 && da * 180 / Math.PI >= 150.5) {
          let ok = true;
          for (let k = 0; k < pts.length; k++) { const q = pts[k]; if (s - q[2] > EX && Math.hypot(q[0] - a.x, q[1] - a.y) < cl.N) { ok = false; break; } }
          if (ok) out.push({ nodes: pathNodes.map(function (k) { return [nodes[k].i, nodes[k].j]; }), len: s, dist: d, ang: da * 180 / Math.PI });
        }
      }
      if (s > cfg.Lmax) return;
      for (let k = 0; k < a.n.length; k++) {
        const nb = a.n[k]; if (vis[nb] || nb === prev || !okEdge[cur + '>' + nb]) continue;
        const b = nodes[nb], L = Math.hypot(b.x - a.x, b.y - a.y); let bad = false; const base = pts.length;
        for (let t = 6; t <= L + 0.01; t += 6) { const f = Math.min(1, t / L), x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, ss = s + t; if (ss > EX && Math.hypot(x - P0.x, y - P0.y) < cl.P) { bad = true; break; } pts.push([x, y, ss]); }
        if (!bad) { vis[nb] = 1; pathNodes.push(nb); rec(nb, cur, s + L, P0); pathNodes.pop(); vis[nb] = 0; }
        pts.length = base;
      }
    }
    nodes.forEach(function (a, ia) {
      if (!startOK(a) || (cfg.startFilter && !cfg.startFilter(a))) return;
      vis[ia] = 1; pathNodes.length = 0; pathNodes.push(ia); pts.length = 0; pts.push([a.x, a.y, 0]);
      rec(ia, -1, 0, a); vis[ia] = 0;
    });
    return { nodes: nodes, out: out, visits: visits };
  }

  /** Bangun jalur sungguhan untuk rute (nodes = [[i,j],...]) dan kembalikan hasil validator. size = [w, h] viewport (mis. [844, 390]); R opsional (bola stage). */
  function evalRoute(nodes, ox, oy, flip, stage, size, bossK, Rst, keep) {
    const G = GA.game, prev = GA.devViewport; if (!keep) { GA.devViewport = { w: size[0], h: size[1] }; G.relayout(); }
    const L = G.layout, R = Rst || L.ballR, T = GA.Paths.TPL;
    T.__t = { ox: ox, oy: oy, nodes: nodes.map(function (n) { return n[0] + ',' + n[1]; }).join(' ') };
    GA.Paths.registerRoute('__t', { stage: stage, p: ['__t', flip || ''], l: ['__t', flip || ''], boss: bossK ? { p: bossK[0], l: bossK[1] } : null });
    let res;
    try { const p = GA.Path.forLayout('__t', L, R), rep = p.report; res = { ok: rep.ok, issues: rep.issues.map(function (i) { return i.kind + ': ' + i.msg; }), kinds: rep.issues.map(function (i) { return i.kind; }), lenD: p.length / (2 * R), route: rep.star && rep.star.route, spiral: rep.star && rep.star.spiral, boss: p.boss, path: p, L: L, R: R }; }
    catch (e) { res = { ok: false, issues: ['ERR ' + e.message], kinds: ['err'], lenD: 0 }; }
    delete T.__t; if (!keep) { GA.devViewport = prev || null; G.relayout(); }
    return res;
  }

  /** Lembar pratinjau: items = [{ pts | dense: [[x,y]...], r, label, boss }]. */
  function sheet(items, w, h, pl, pv, R, scale, cols) {
    cols = cols || Math.min(items.length, 3); const rowsN = Math.ceil(items.length / cols), cw = w * scale, ch = h * scale, cv = document.createElement('canvas'); cv.width = cols * (cw + 6); cv.height = rowsN * (ch + 6); const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
    items.forEach(function (it, n) {
      const ox = (n % cols) * (cw + 6), oy = Math.floor(n / cols) * (ch + 6); g.save(); g.translate(ox, oy); g.scale(scale, scale);
      g.fillStyle = '#16402c'; g.fillRect(0, 0, w, h); g.fillStyle = '#0c2018'; g.fillRect(0, 0, w, pl.y);
      const d = it.dense || GA.Paths.filletPath(it.pts, it.r); g.strokeStyle = 'rgba(150,110,60,0.5)'; g.lineWidth = R * 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); d.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.stroke();
      g.strokeStyle = '#4de8ff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(75,224,138,0.5)'; g.beginPath(); g.arc(pv.x, pv.y, GA.Paths.wingNeed(R) - R - 2, 0, 7); g.fill();
      const P = d[0], N = d[d.length - 1], sp = GA.Paths.SPR_PORTAL, sn = GA.Paths.SPR_NEST;
      g.fillStyle = '#b69cff'; g.beginPath(); g.arc(P[0], P[1], sp * R, 0, 7); g.fill(); g.strokeStyle = 'rgba(182,156,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(P[0], P[1], (sp + 3) * R, 0, 7); g.stroke();
      g.fillStyle = '#ff9a2a'; g.beginPath(); g.arc(N[0], N[1], sn * R, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,154,42,0.6)'; g.beginPath(); g.arc(N[0], N[1], (sn + 3) * R, 0, 7); g.stroke();
      if (it.boss) { g.strokeStyle = '#ff5a5a'; g.lineWidth = 3; g.beginPath(); g.arc(it.boss.x, it.boss.y, it.boss.R, 0, 7); g.stroke(); }
      g.fillStyle = '#fff'; g.font = '22px monospace'; g.fillText(it.label, 8, pl.y + 24); g.restore();
    });
    return cv;
  }
  GA.RouteSearch = { search: search, evalRoute: evalRoute, sheet: sheet };
})(window.GA = window.GA || {});
