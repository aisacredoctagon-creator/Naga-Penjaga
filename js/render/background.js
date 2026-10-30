/* background.js — peta berlapis, dirender SEKALI per layout lalu di-cache (offscreen canvas).
 *
 * Lapisan statis:
 *   under  = dasar bertekstur (map.base) → parit jalur (relief) → kolam/lava/kolam sihir & altar → dekorasi (disortir menurut y,
 *            bayangan seragam) → pencahayaan
 *   glow   = bagian yang MENYALA (retakan lava, rune lantai, halo kristal/obor); digambar aditif dengan denyut
 *   front  = penutup depan (daun / stalaktit & batu / pilar & spanduk, jembatan batu, vignette). Digambar SETELAH rantai bola sehingga
 *            bola tampak lewat di bawahnya; hanya bola di jendela jembatan (path.overWindows) digambar setelahnya.
 * Lapisan dinamis (portal, riak, cahaya obor, kunang-kunang/bara) ada di effects.js. Peta berbasis data: GA.Maps[id] (maps/*.js).
 * Lapisan dibuat sampai tepi layar (termasuk letterbox) supaya latar menyatu. */
(function (GA) {
  'use strict';
  const N = GA.Noise, D = GA.Decor, D2 = GA.Decor2, TAU = Math.PI * 2;
  const S = { key: '', map: null, L: null, under: null, front: null, glow: null, E: null, info: null, lights: [] };

  function ext(L) {
    const x0 = -L.ox / L.scale, y0 = -L.oy / L.scale, w = L.cssW / L.scale, h = L.cssH / L.scale;
    return { x0: x0, y0: y0, x1: x0 + w, y1: y0 + h, w: w, h: h };
  }

  /** Kanvas luar layar: ruang logis → piksel kanvas × qs. */
  function layer(canvas, L, qs) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(canvas.width * qs)); c.height = Math.max(1, Math.round(canvas.height * qs));
    const g = c.getContext('2d'); g.setTransform(L.px * qs, 0, 0, L.px * qs, L.dpr * L.ox * qs, L.dpr * L.oy * qs);
    return { c: c, g: g, qs: qs };
  }

  /* ---------- jarak ke jalur ---------- */
  function pathField(path) {
    const pts = [];
    if (path) for (let i = 0; i < path.xs.length; i += 4) pts.push(path.xs[i], path.ys[i]);
    const dist = function (x, y) {
      let m = 1e12;
      for (let i = 0; i < pts.length; i += 2) { const dx = pts[i] - x, dy = pts[i + 1] - y, d = dx * dx + dy * dy; if (d < m) m = d; }
      return Math.sqrt(m);
    };
    const nearest = function (x, y) {
      let m = 1e12, bx = 0, by = 0;
      for (let i = 0; i < pts.length; i += 2) { const dx = pts[i] - x, dy = pts[i + 1] - y, d = dx * dx + dy * dy; if (d < m) { m = d; bx = pts[i]; by = pts[i + 1]; } }
      return { d: Math.sqrt(m), x: bx, y: by };
    };
    return { dist: dist, nearest: nearest };
  }

  /* ---------- dasar bertekstur: satu painter per jenis peta ---------- */
  function blotches(g, E, pal, rnd, div, alpha) {
    const nb = Math.round(E.w * E.h / div);
    for (let i = 0; i < nb; i++) {
      const x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h, r = 50 + rnd() * 140, c = pal.blotch[(rnd() * pal.blotch.length) | 0];
      const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = alpha[0] + rnd() * alpha[1]; g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }

  /** Retakan bercabang: garis gelap di dasar + garis menyala di lapisan glow. */
  function crack(g, gl, x, y, ang, len, w, rnd, col, depth) {
    if (len < 14 || depth > 4) return;
    const segs = Math.ceil(len / 16); let px = x, py = y, a = ang;
    for (let i = 0; i < segs; i++) {
      a += (rnd() - 0.5) * 0.9; const nx = px + Math.cos(a) * 16, ny = py + Math.sin(a) * 16, ww = w * (1 - i / segs * 0.6);
      g.strokeStyle = 'rgba(8,2,2,0.7)'; g.lineWidth = ww * 2.2; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      gl.strokeStyle = col; gl.lineWidth = ww; gl.beginPath(); gl.moveTo(px, py); gl.lineTo(nx, ny); gl.stroke();
      if (rnd() < 0.22) crack(g, gl, nx, ny, a + (rnd() < 0.5 ? 0.8 : -0.8), len * 0.5, w * 0.7, rnd, col, depth + 1);
      px = nx; py = ny;
    }
  }

  const BASES = {
    moss: function (u, gl, E, map, rnd, tex, field) {
      const g = u.g, pal = map.pal;
      blotches(g, E, pal, rnd, 9000, [0.16, 0.22]);
      for (let i = 0; i < E.w * E.h / 9000 * 0.12; i++) {
        const x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h, r = 30 + rnd() * 60;
        const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, pal.soil[0]); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = 0.2; g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      N.overlay(g, u.c.width, u.c.height, tex, 'soft-light', 0.85, 1.6 * u.qs + 0.2); N.overlay(g, u.c.width, u.c.height, tex, 'overlay', 0.28, 5 * u.qs + 0.5);
      const ng = Math.min(2600, Math.round(E.w * E.h / 160)); g.lineCap = 'round';
      for (let i = 0; i < ng; i++) {
        const x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h, a = -Math.PI / 2 + (rnd() - 0.5) * 1.2, l = 3 + rnd() * 6;
        g.strokeStyle = rnd() < 0.5 ? 'rgba(20,70,30,0.16)' : 'rgba(190,240,130,0.14)'; g.lineWidth = 1 + rnd();
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
      }
    },
    // batu basal gelap: blok retak (Voronoi) + retakan lava menyala
    basalt: function (u, gl, E, map, rnd, tex, field) {
      const g = u.g, pal = map.pal;
      blotches(g, E, pal, rnd, 8000, [0.22, 0.26]);
      N.overlay(g, u.c.width, u.c.height, GA.Textures.voronoi(17, 128, 9), 'multiply', 0.75, 2.2 * u.qs + 0.3);
      N.overlay(g, u.c.width, u.c.height, tex, 'soft-light', 0.9, 1.6 * u.qs + 0.2); N.overlay(g, u.c.width, u.c.height, tex, 'overlay', 0.3, 5 * u.qs + 0.5);
      gl.lineCap = 'round'; g.lineCap = 'round';
      const nc = Math.round(E.w * E.h / 26000);
      for (let i = 0; i < nc; i++) {
        const x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h; if (field && field.dist(x, y) < 70) continue;
        crack(g, gl, x, y, rnd() * TAU, 70 + rnd() * 110, 2.4 + rnd() * 1.6, rnd, rnd() < 0.7 ? 'rgba(255,140,40,0.9)' : 'rgba(255,210,90,0.9)', 0);
      }
      for (let i = 0; i < E.w * E.h / 900; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(200,180,170,0.10)' : 'rgba(0,0,0,0.18)'; g.fillRect(E.x0 + rnd() * E.w, E.y0 + rnd() * E.h, 1 + rnd() * 2, 1 + rnd() * 2); }   // abu
    },
    // gua kristal: batu biru-ungu dengan lumut menyala dan genangan air
    cave: function (u, gl, E, map, rnd, tex, field) {
      const g = u.g, pal = map.pal;
      blotches(g, E, pal, rnd, 8500, [0.2, 0.24]);
      N.overlay(g, u.c.width, u.c.height, GA.Textures.voronoi(23, 128, 8), 'multiply', 0.6, 2.6 * u.qs + 0.3);
      N.overlay(g, u.c.width, u.c.height, tex, 'soft-light', 0.9, 1.6 * u.qs + 0.2); N.overlay(g, u.c.width, u.c.height, tex, 'overlay', 0.28, 5 * u.qs + 0.5);
      for (let i = 0; i < E.w * E.h / 42000; i++) {          // genangan air cermin
        const x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h, rx = 26 + rnd() * 46; if (field && field.dist(x, y) < rx + 56) continue;
        const wg = g.createRadialGradient(x - rx * 0.3, y - rx * 0.2, 2, x, y, rx); wg.addColorStop(0, pal.water[0]); wg.addColorStop(0.7, pal.water[1]); wg.addColorStop(1, pal.water[2]);
        g.fillStyle = 'rgba(10,14,40,0.5)'; g.beginPath(); g.ellipse(x + 2, y + 3, rx * 1.08, rx * 0.66, 0.2, 0, TAU); g.fill();
        g.fillStyle = wg; g.beginPath(); g.ellipse(x, y, rx, rx * 0.6, 0.2, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1.6; g.stroke();
      }
      for (let i = 0; i < E.w * E.h / 2500; i++) {            // lumut / serbuk menyala
        const x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h; if (field && field.dist(x, y) < 40) continue;
        gl.fillStyle = rnd() < 0.5 ? 'rgba(120,230,255,0.8)' : 'rgba(190,150,255,0.8)'; gl.beginPath(); gl.arc(x, y, 0.8 + rnd() * 1.6, 0, TAU); gl.fill();
      }
    },
    // lantai menara: ubin batu + lingkaran rune menyala
    flags: function (u, gl, E, map, rnd, tex, field) {
      const g = u.g, pal = map.pal, tw = 96, th = 58;
      for (let row = Math.floor(E.y0 / th) - 1, y = row * th; y < E.y1; row++, y += th) {
        for (let x = E.x0 - tw + ((row & 1) ? tw / 2 : 0); x < E.x1; x += tw) {
          const c = pal.blotch[(rnd() * pal.blotch.length) | 0]; g.fillStyle = c; g.globalAlpha = 0.55 + rnd() * 0.3; g.fillRect(x + 1, y + 1, tw - 2, th - 2);
          g.globalAlpha = 1; g.strokeStyle = 'rgba(2,0,12,0.75)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, tw - 2, th - 2);
          g.strokeStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.moveTo(x + 2, y + th - 2); g.lineTo(x + 2, y + 2); g.lineTo(x + tw - 2, y + 2); g.stroke();
        }
      }
      N.overlay(g, u.c.width, u.c.height, GA.Textures.voronoi(29, 128, 8), 'multiply', 0.45, 2.4 * u.qs + 0.3);
      N.overlay(g, u.c.width, u.c.height, tex, 'soft-light', 0.9, 1.6 * u.qs + 0.2);
      const nr = Math.round(E.w * E.h / 120000) + 2; gl.lineCap = 'round';
      for (let i = 0; i < nr; i++) {                              // lingkaran rune menyala di lantai (jauh dari alur)
        const x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h, r = 40 + rnd() * 50; if (field && field.dist(x, y) < r + 50) continue;
        gl.strokeStyle = pal.runeCol; gl.lineWidth = 2.4;
        gl.beginPath(); gl.arc(x, y, r, 0, TAU); gl.stroke(); gl.beginPath(); gl.arc(x, y, r * 0.78, 0, TAU); gl.stroke();
        const k = 5 + ((rnd() * 3) | 0); gl.beginPath(); for (let j = 0; j <= k; j++) { const a = (j * 2 / k * Math.PI) * 2 % TAU + 0.3, px = x + Math.cos(a) * r * 0.78, py = y + Math.sin(a) * r * 0.78; if (j) gl.lineTo(px, py); else gl.moveTo(px, py); } gl.stroke();
        for (let j = 0; j < 12; j++) { const a = j / 12 * TAU; gl.beginPath(); gl.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); gl.lineTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05); gl.stroke(); }
      }
    }
  };

  /* ---------- parit jalur yang tampak terukir ---------- */
  function carve(u, L, path, R, pal, rnd, tex) {
    const g = u.g, G = 2 * R + 10, p = path.poly();
    g.save(); g.beginPath(); g.rect(0, 0, L.W, L.H); g.clip();
    g.lineCap = 'round'; g.lineJoin = 'round';
    const stroke = function (w, col, ox, oy, alpha) { g.save(); g.translate(ox || 0, oy || 0); g.globalAlpha = alpha == null ? 1 : alpha; g.lineWidth = w; g.strokeStyle = col; g.stroke(p); g.restore(); };
    for (let k = 0; k < 7; k++) stroke(G + 50 - k * 6.5, '#000', 2, 3, 0.05);
    stroke(G + 18, 'rgba(0,0,0,0.5)', 2.6, 3.6, 0.55);
    stroke(G + 14, pal.lip[1], -1.6, -2.4, 0.7);
    stroke(G + 12, pal.bed[0], 0, 0, 1);
    const tb = document.createElement('canvas'); tb.width = u.c.width; tb.height = u.c.height;
    const t = tb.getContext('2d'); t.setTransform(g.getTransform()); t.lineCap = 'round'; t.lineJoin = 'round';
    const bs = function (w, col, ox, oy, a) { t.save(); t.translate(ox || 0, oy || 0); t.globalAlpha = a == null ? 1 : a; t.lineWidth = w; t.strokeStyle = col; t.stroke(p); t.restore(); };
    bs(G + 4, pal.bed[0], 0, 0, 1); bs(G - 3, pal.bed[1], 1.2, 1.8, 1); bs(G - 11, pal.bed[2], 1.6, 2.4, 1); bs(G - 22, pal.bed[3], 2, 3, 0.75);
    N.overlay(t, tb.width, tb.height, tex, 'soft-light', 0.95, 1.2 * u.qs + 0.2);
    N.overlay(t, tb.width, tb.height, tex, 'multiply', 0.22, 4 * u.qs + 0.4);
    t.save(); t.globalCompositeOperation = 'destination-in'; t.strokeStyle = '#000'; t.lineWidth = G + 4; t.stroke(p); t.restore();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tb, 0, 0); g.restore();
    const n = path.xs.length;
    for (let i = 6; i < n - 6; i += 9) {
      if (rnd() < 0.55) continue;
      const a = Math.atan2(path.ys[i + 3] - path.ys[i - 3], path.xs[i + 3] - path.xs[i - 3]), off = (rnd() - 0.5) * G * 0.72;
      const x = path.xs[i] - Math.sin(a) * off, y = path.ys[i] + Math.cos(a) * off, s = 1.5 + rnd() * 3;
      g.fillStyle = 'rgba(20,12,8,0.3)'; g.beginPath(); g.ellipse(x + 1, y + 1.4, s, s * 0.7, a, 0, TAU); g.fill();
      g.fillStyle = rnd() < 0.5 ? 'rgba(235,225,200,0.4)' : 'rgba(120,100,90,0.5)'; g.beginPath(); g.ellipse(x, y, s, s * 0.7, a, 0, TAU); g.fill();
    }
    g.save(); g.setLineDash([2, 16]); stroke(2.4, 'rgba(255,240,200,0.18)', -0.5, -0.8, 1); g.restore();
    g.restore();
  }

  /* ---------- dekorasi: tabel jenis → ukuran, jarak aman, penggambar ---------- */
  const SPEC = {
    
    grass: { s: [10, 18], c: 6 }, flower: { s: [9, 15], c: 6 }, mush: { s: [12, 19], c: 8 }, glowshroom: { s: [12, 19], c: 8 }, rubble: { s: [8, 16], c: function (s) { return s * 0.9 + 4; } },
    rock: { s: [12, 28], c: function (s) { return s * 0.9 + 6; }, big: true }, fern: { s: [34, 60], c: function (s) { return s * 0.85; }, big: true }, leaf: { s: [44, 70], c: function (s) { return s * 0.95; }, big: true },
    crystal: { s: [18, 34], c: function (s) { return s * 1.3; }, big: true }, stalag: { s: [16, 30], c: function (s) { return s * 0.9 + 4; }, big: true },
    bones: { s: [22, 34], c: function (s) { return s * 1.7; }, big: true }, torch: { s: [22, 30], c: function (s) { return s * 0.6 + 8; }, big: true }, pillar: { s: [26, 36], c: function (s) { return s * 0.8 + 8; }, big: true },
    vent: { s: [16, 26], c: function (s) { return s + 4; }, big: true }, brazier: { s: [20, 28], c: function (s) { return s * 0.8 + 6; }, big: true }
  };
  const DRAW = {
    grass: function (g, it, pal, r) { D.grass(g, it.x, it.y, it.s, r, pal.grassA, pal.grassB); },
    flower: function (g, it, pal, r) { D.shade(g, it.x, it.y, it.s * 0.5, it.s * 0.2, 0.2); D.flower(g, it.x, it.y, it.s, pal.flowers[(r() * pal.flowers.length) | 0]); },
    mush: function (g, it, pal, r) { const c = pal.cap[(r() * pal.cap.length) | 0]; D.mushroom(g, it.x, it.y, it.s, r, c); if (r() < 0.6) D.mushroom(g, it.x + it.s * 0.9, it.y + it.s * 0.35, it.s * 0.65, r, c); },
    glowshroom: function (g, it, pal, r) { return D2.glowshroom(g, it.x, it.y, it.s, r, pal.cap[0]); },
    rock: function (g, it, pal, r, map) { D.rock(g, it.x, it.y, it.s, r, pal, map.moss !== false); if (map.moss !== false && r() < 0.5) D.grass(g, it.x + it.s * 0.9, it.y + it.s * 0.3, it.s * 0.6, r, pal.grassA, pal.grassB); },
    rubble: function (g, it, pal, r) { D.rock(g, it.x, it.y, it.s, r, pal, false); D.rock(g, it.x + it.s * 1.4, it.y + it.s * 0.4, it.s * 0.6, r, pal, false); },
    fern: function (g, it, pal, r) { D.fern(g, it.x, it.y, it.s, r, pal.leaf[(r() * 3) | 0]); },
    leaf: function (g, it, pal, r) { D.leafCluster(g, it.x, it.y, it.s, r, pal.leaf[(r() * 3) | 0], 5, 2.6); },
    statue: function (g, it, pal, r) { D.statue(g, it.x, it.y, it.s, r, pal); },
    crystal: function (g, it, pal, r) { return D2.crystal(g, it.x, it.y, it.s, r, pal.crystal[(r() * pal.crystal.length) | 0]); },
    stalag: function (g, it, pal, r) { D2.stalag(g, it.x, it.y, it.s, r, pal); },
    bones: function (g, it, pal, r) { D2.bones(g, it.x, it.y, it.s, r); },
    torch: function (g, it, pal) { return D2.torch(g, it.x, it.y, it.s, pal); },
    pillar: function (g, it, pal) { D2.pillar(g, it.x, it.y, it.s, pal); },
    vent: function (g, it) { return D2.vent(g, it.x, it.y, it.s); },
    brazier: function (g, it, pal) { return D2.brazier(g, it.x, it.y, it.s, pal); }
  };
  function pick(mix, r) { let s = 0; for (const k in mix) s += mix[k]; r *= s; for (const k in mix) { r -= mix[k]; if (r <= 0) return k; } return 'grass'; }

  /** Zona boss + bilah HP (tidak boleh ditumpuk dekorasi): persegi di sekitar boss. */
  function inBoss(boss, R, x, y, rad) { return !!boss && Math.abs(x - boss.x) < 200 + rad && y > boss.y - R * 3.6 - rad && y < boss.y + R * 3.6 + rad; }

  /** Zona bersih INV-8 (revisi 10): lingkaran sprite + 2R di sekitar portal (titik awal jalur) dan sarang (titik akhir): tanpa dekorasi, objek depan, rintangan, atau label lain. Jalur lama (tanpa portal/sarang rute) memakai 3,8R di sarang. */
  function clearZones(path, R, hole) {
    const P = GA.Paths, sp = P && P.SPR_PORTAL ? P.SPR_PORTAL : 2.2, sn = P && P.SPR_NEST ? P.SPR_NEST : 2.3, c2 = P && P.CLEAR8 ? P.CLEAR8 : 2;
    return [{ x: path.xs[0], y: path.ys[0], r: (sp + c2) * R }, { x: hole.x, y: hole.y, r: (sn + c2) * R }];
  }
  function inZones(zones, x, y, rad) { if (!zones) return false; for (let i = 0; i < zones.length; i++) if (Math.hypot(x - zones[i].x, y - zones[i].y) < zones[i].r + rad) return true; return false; }
  /** Ruas (x0,y0)-(x1,y1) memasuki zona (dengan tambahan pad)? */
  function zoneHitSeg(zones, x0, y0, x1, y1, pad) {
    if (!zones) return false;
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i], dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1; let t = ((z.x - x0) * dx + (z.y - y0) * dy) / l2; t = Math.max(0, Math.min(1, t));
      if (Math.hypot(x0 + dx * t - z.x, y0 + dy * t - z.y) < z.r + (pad || 0)) return true;
    }
    return false;
  }

  function scatter(u, gl, E, L, field, hole, shooter, pondR, R, map, rnd, boss, zones) {
    const pal = map.pal, g = u.g, items = [], placed = [], lights = [];
    const n = Math.round(E.w * E.h / 5400 * map.density);
    const ok = function (x, y, rad, clr) {
      if (x > 0 && x < L.W && y < L.hud + R * 1.5 && y > -1) return false;
      if (field.dist(x, y) < R * 2.2 + clr) return false;      // dekorasi tidak menyentuh area jalur (garis tengah ± 2,2R)
      if (Math.hypot(x - shooter.x, y - shooter.y) < pondR * 1.25 + rad) return false;
      if (inZones(zones, x, y, rad)) return false;      // INV-8: zona bersih portal dan sarang (sprite + 2R) tanpa dekorasi
      if (inBoss(boss, R, x, y, rad)) return false;
      return true;
    };
    const free = function (x, y, rad) { for (let i = 0; i < placed.length; i++) { const p = placed[i]; if (Math.hypot(x - p[0], y - p[1]) < (rad + p[2]) * 0.7) return false; } return true; };
    for (let i = 0, got = 0; i < 400 && got < map.statues; i++) {       // patung naga di dekat tepi peta
      const side = rnd(), x = side < 0.5 ? E.x0 + 30 + rnd() * 90 : E.x1 - 30 - rnd() * 90, y = E.y0 + E.h * (0.18 + rnd() * 0.7), s = 34 + rnd() * 10;
      if (!ok(x, y - s, s * 1.2, s * 1.4) || !ok(x, y, s, s) || !free(x, y, s * 1.5)) continue;
      placed.push([x, y, s * 1.5]); items.push({ t: 'statue', x: x, y: y, s: s }); got++;
    }
    for (let i = 0; i < n * 7 && items.length < n + map.statues; i++) {
      const t = pick(map.mix, rnd()), sp = SPEC[t], x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h, s = sp.s[0] + rnd() * (sp.s[1] - sp.s[0]);
      const clr = typeof sp.c === 'function' ? sp.c(s) : sp.c;
      if (!ok(x, y, s, clr)) continue;
      if (sp.big && !free(x, y, s)) continue;
      if (sp.big) placed.push([x, y, s]);
      items.push({ t: t, x: x, y: y, s: s, seed: (rnd() * 1e9) | 0 });
    }
    items.sort(function (a, b) { return a.y - b.y; });
    items.forEach(function (it) {
      const r = N.rng(it.seed || 7), L2 = DRAW[it.t](g, it, pal, r, map);
      if (L2) { lights.push(L2); const hg = gl.createRadialGradient(L2.x, L2.y, 0, L2.x, L2.y, L2.r * 0.6); hg.addColorStop(0, 'rgba(' + L2.col + ',0.45)'); hg.addColorStop(1, 'rgba(' + L2.col + ',0)'); gl.fillStyle = hg; gl.beginPath(); gl.arc(L2.x, L2.y, L2.r * 0.6, 0, TAU); gl.fill(); }
    });
    return lights;
  }

  /* ---------- penutup depan ---------- */
  function paintFront(f, u, E, L, field, hole, shooter, pondR, R, map, rnd, path, zones) {
    const boss = path && path.boss;
    const g = f.g, pal = map.pal, avoid = [], kind = map.front || 'leaf';
    const dark = ['rgba(5,22,10,0.20)', 'rgba(5,22,10,0.20)', 'rgba(5,22,10,0.20)'];
    // (1) penutup yang menjuntai ke tepi parit; ujungnya berhenti 1,3R dari garis tengah (tidak menutupi bola)
    let made = kind === 'none' ? 99 : 0;
    for (let i = 0; i < 400 && made < 9; i++) {
      const x = E.x0 + rnd() * E.w, y = E.y0 + rnd() * E.h;
      if (x > 0 && x < L.W && y < L.hud + 10) continue;
      const nr = field.nearest(x, y), d = nr.d;
      if (d < R * 4.6 || d > R * 7.5) continue;      // objek depan: ujungnya berhenti >= 2,6R dari garis tengah jalur (1,5R di luar tepi alur) dan DI BAWAH bola
      if (Math.hypot(x - shooter.x, y - shooter.y) < pondR * 1.4) continue;
      if (Math.hypot(nr.x - hole.x, nr.y - hole.y) < R * 4.5 || zoneHitSeg(zones, x, y, x + Math.cos(Math.atan2(nr.y - y, nr.x - x)) * (d - R * 3.2), y + Math.sin(Math.atan2(nr.y - y, nr.x - x)) * (d - R * 3.2), R * 2)) continue;
      if (inBoss(boss, R, x, y, 40)) continue;
      if (avoid.some(function (a) { return Math.hypot(a[0] - x, a[1] - y) < R * 4; })) continue;
      const ang = Math.atan2(nr.y - y, nr.x - x), len = d - R * 3.2;
      avoid.push([x, y]);
      if (kind === 'leaf') {
        for (let k = 0; k < 3; k++) {
          const a = ang + (k - 1) * 0.42 + (rnd() - 0.5) * 0.15, l = len * (0.85 + rnd() * 0.25 - Math.abs(k - 1) * 0.12);
          D.leaf(f.g, x, y, l, a, pal.leafFront); D.leaf(u.g, x + D.LX * l * 0.45, y + D.LY * l * 0.45, l, a, dark, false);
        }
        D.fern(g, x - Math.cos(ang) * R * 0.3, y - Math.sin(ang) * R * 0.3, R * 1.6, rnd, pal.leafFront);
      } else {          // batu yang menonjol di tepi parit
        const rr = Math.min(len * 0.5, R * 1.1), cx = x + Math.cos(ang) * (len - rr), cy = y + Math.sin(ang) * (len - rr);
        D.rock(g, cx, cy, rr, rnd, pal, false); if (rr > R * 0.7) D.rock(g, x + Math.cos(ang) * rr * 0.4, y + Math.sin(ang) * rr * 0.4, rr * 0.8, rnd, pal, false);
      }
      made++;
    }
    // (2) elemen sudut/tepi peta (jauh dari jalur)
    if (kind === 'leaf') {
      [[E.x0, E.y0, 0.3], [E.x1, E.y0, Math.PI - 0.3], [E.x0, E.y1, -0.3], [E.x1, E.y1, Math.PI + 0.3]].forEach(function (c) {
        for (let k = 0; k < 4; k++) {
          const a = c[2] + (rnd() - 0.5) * 1.2, ox = c[0], oy = c[1];
          let l = R * (3.2 + rnd() * 1.6);
          for (; l > R; l -= 6) { const tx = ox + Math.cos(a) * l, ty = oy + Math.sin(a) * l; if (field.dist(tx, ty) > R * 3.2 && field.dist((ox + tx) / 2, (oy + ty) / 2) > R * 3.2 && !zoneHitSeg(zones, ox, oy, tx, ty, 0)) break; }
          if (l > R) D.leaf(g, ox, oy, l, a, pal.leafFront);
        }
      });
    } else if (kind === 'stone') {
      for (let x = E.x0 - 20; x < E.x1 + 20; x += 36 + rnd() * 40) {         // stalaktit menggantung dari tepi atas
        const len = 36 + rnd() * 70, w = 12 + rnd() * 16; if (field.dist(x, E.y0 + len) < R * 2.6 + w * 0.5 || zoneHitSeg(zones, x, E.y0 - 4, x, E.y0 + len, w)) continue; D2.stalactite(g, x, E.y0 - 4, len, w, pal);
      }
      for (let k = 0; k < 6; k++) { const x = E.x0 + rnd() * E.w, y = E.y1 - rnd() * 18, s = 26 + rnd() * 30; if (field.dist(x, y - s) > R * 2.6 + s && !inZones(zones, x, y - s * 0.5, s)) D.rock(g, x, y, s, rnd, pal, false); }
    } else if (kind === 'hall') {
      const cols = pal.banners || [['#6a2ab0', '#4a1a88', '#2a0e55'], ['#a02a60', '#781a48', '#480c2c']];
      for (let x = E.x0 + 30 + rnd() * 30, i = 0; x < E.x1 - 30; x += 120 + rnd() * 90, i++) { const w = 38 + rnd() * 12, h = 70 + rnd() * 70; if (field.dist(x + w / 2, E.y0 + h * 0.7) > R * 2.6 + w * 0.6 && !zoneHitSeg(zones, x + w / 2, E.y0, x + w / 2, E.y0 + h, w)) D2.banner(g, x, E.y0 - 6, w, h, cols[i % 2], pal.trim || '#e0b860'); }
      [[E.x0 + 10, E.y0 + 20], [E.x1 - 10, E.y0 + 20], [E.x0 + 10, E.y1 + 10], [E.x1 - 10, E.y1 + 10]].forEach(function (c) { if (field.dist(c[0], c[1] - 40) > R * 3 + 30 && !inZones(zones, c[0], c[1] - 20, 50)) D2.pillar(g, c[0], c[1], 40, pal); });
    }
    // (3) jembatan batu di jalur atas (persilangan)
    if (path && path.bridges) path.bridges.forEach(function (b) { D2.bridge(g, b, R, pal); });
  }

  /* ---------- gambar latar buatan sendiri (opsional): map.art = { landscape, portrait } ---------- */
  const artCache = Object.create(null);
  function artImage(map, L) {
    const url = map.art && map.art[L.portrait ? 'portrait' : 'landscape']; if (!url) return null;
    let a = artCache[url];
    if (!a) { a = artCache[url] = { img: new Image(), ok: false, bad: false }; a.img.onload = function () { a.ok = true; Background.invalidate(); if (Background.onArtReady) Background.onArtReady(); }; a.img.onerror = function () { a.bad = true; }; a.img.src = url; }
    return a.ok ? a.img : null;
  }

  /* ---------- bangun semua lapisan ---------- */
  function build(canvas, L, map, path, R) {
    const key = [map.id, canvas.width, canvas.height, L.scale.toFixed(3), path ? path.presetId + ':' + Math.round(path.length) : '-', R, map.seed].join('|');
    if (S.key === key && S.under) return;
    S.key = key; S.map = map; S.L = L;
    const qs = Math.min(1, 1700 / Math.max(canvas.width, canvas.height)), E = ext(L), pal = map.pal;
    const u = layer(canvas, L, qs), f = layer(canvas, L, qs), gl = layer(canvas, L, qs * 0.6);
    gl.g.globalCompositeOperation = 'lighter';
    const tex = N.tile(256, map.seed, 4, 6);
    const field = pathField(path);
    const gr = u.g.createLinearGradient(0, E.y0, 0, E.y1); gr.addColorStop(0, pal.ground[0]); gr.addColorStop(1, pal.ground[1]);
    u.g.fillStyle = gr; u.g.fillRect(E.x0, E.y0, E.w, E.h);
    const art = artImage(map, L);   // bila ada gambar: dasar + dekorasi + kolam diganti gambar; alur, altar efek, portal, dan jembatan tetap dari kode
    if (art) { const sc = Math.max(E.w / art.naturalWidth, E.h / art.naturalHeight); u.g.drawImage(art, E.x0 + (E.w - art.naturalWidth * sc) / 2, E.y0 + (E.h - art.naturalHeight * sc) / 2, art.naturalWidth * sc, art.naturalHeight * sc); }
    else (BASES[map.base || 'moss'])(u, gl.g, E, map, N.rng(map.seed + 1), tex, path ? field : null);
    let info = { pond: null, hole: { x: 0, y: 0 } }, lights = [];
    if (path) {
      const hole = GA.Path.holeXY(path), sh = path.shooter; const dr0 = 0, dr = GA.Theme.dragon.radiusRatio * R;
      carve(u, L, path, R, pal, N.rng(map.seed + 2), tex);
      let pondR = dr * 1.95;
      pondR = Math.max(dr * 1.5, Math.min(pondR, field.dist(sh.x, sh.y) - R - 18));
      const slabR = Math.min(dr * 1.45, pondR * 0.78);
      if (!art) { D.pond(u.g, sh.x, sh.y, pondR, pal, N.rng(map.seed + 3)); D.slab(u.g, sh.x, sh.y, slabR, pal, N.rng(map.seed + 4)); }
      if (pal.poolGlow) { const g2 = gl.g, pg = g2.createRadialGradient(sh.x, sh.y, slabR * 0.6, sh.x, sh.y, pondR * 1.25); pg.addColorStop(0, 'rgba(' + pal.poolGlow + ',0.0)'); pg.addColorStop(0.7, 'rgba(' + pal.poolGlow + ',0.5)'); pg.addColorStop(1, 'rgba(' + pal.poolGlow + ',0)'); g2.fillStyle = pg; g2.beginPath(); g2.arc(sh.x, sh.y, pondR * 1.25, 0, TAU); g2.fill(); }
      if (pal.runeCol) { const g2 = gl.g; g2.strokeStyle = pal.runeCol; g2.lineWidth = 2.4; g2.beginPath(); g2.ellipse(sh.x, sh.y, slabR * 0.78, slabR * 0.7, 0, 0, TAU); g2.stroke(); }
      const zones = clearZones(path, R, hole);      // zona bersih portal + sarang (revisi 10)
      if (!art) lights = scatter(u, gl.g, E, L, field, hole, sh, pondR, R, map, N.rng(map.seed + 5), path.boss, zones);
      paintFront(f, u, E, L, field, hole, sh, pondR, R, art ? Object.assign({}, map, { front: 'none' }) : map, N.rng(map.seed + 6), path, zones);
      info = { pond: { x: sh.x, y: sh.y, r: pondR, rip: pal.ripple || '255,255,255' }, hole: hole };
    }
    const g = u.g, lg = g.createLinearGradient(E.x0, E.y0, E.x1, E.y1);
    lg.addColorStop(0, pal.warm); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, pal.cool);
    g.fillStyle = lg; g.fillRect(E.x0, E.y0, E.w, E.h);
    if (pal.tint) { g.fillStyle = pal.tint; g.fillRect(E.x0, E.y0, E.w, E.h); }
    { const cx = E.x0 + E.w / 2, cy = E.y0 + E.h / 2, rr = Math.hypot(E.w, E.h) / 2;      // vignette di lapisan DASAR (bukan di atas bola)
      const vg = g.createRadialGradient(cx, cy, rr * 0.45, cx, cy, rr); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, pal.vignette); g.fillStyle = vg; g.fillRect(E.x0, E.y0, E.w, E.h); }
    S.under = u.c; S.front = f.c; S.glow = gl.c; S.E = E; S.info = info; S.lights = lights; S.qs = qs; S.mask = null;
    if (GA.Effects) GA.Effects.build(L, path, R, map, E, info, lights);
  }

  const Background = {
    build: build,
    reduceMotion: false,
    drawBack: function (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(S.under, 0, 0, ctx.canvas.width, ctx.canvas.height);
    },
    /** Lapisan menyala (retakan lava, rune, halo): aditif, berdenyut pelan. Dipanggil dalam ruang piksel. */
    drawGlow: function (ctx, t) {
      if (!S.glow || !S.map || !S.map.glow || (GA.Quality && !GA.Quality.glow)) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (S.map.glow.base || 0.55) + (S.map.glow.amp || 0.25) * Math.sin(t * (S.map.glow.speed || 1.3));
      ctx.drawImage(S.glow, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
    },
    /** ox/oy: gesekan layar (piksel kanvas) saat getar, agar penutup ikut bergetar bersama rantai. */
    drawFront: function (ctx, ox, oy, t) {
      if (!S.front) return;
      const sw = GA.Effects.quality >= 1 && !Background.reduceMotion ? (Math.sin((t || 0) * 0.9) * 0.0042 + Math.sin((t || 0) * 1.9 + 1) * 0.0018) : 0, H = ctx.canvas.height;
      ctx.save(); ctx.setTransform(1, 0, sw, 1, (ox || 0) - sw * H * 0.5, oy || 0); ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(S.front, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
    },
    /** Alpha tertinggi lapisan depan (objek depan) di dalam lingkaran logis (x, y, r): dipakai ?debug=layers dan uji geometri. */
    frontCover: function (x, y, r) {
      if (!S.front) return 0;
      if (!S.mask) { const w = Math.max(1, S.front.width >> 2), h = Math.max(1, S.front.height >> 2), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(S.front, 0, 0, w, h); S.mask = { w: w, h: h, d: g.getImageData(0, 0, w, h).data }; }
      const L = S.L, m = S.mask, k = L.px * S.qs / 4, ox = L.dpr * L.ox * S.qs / 4, oy = L.dpr * L.oy * S.qs / 4; let best = 0;
      for (let ring = 0; ring < 3; ring++) for (let i = 0, n = ring ? 8 : 1; i < n; i++) {
        const a = i / n * 6.2832, rr = r * ring / 2, px = Math.round((x + Math.cos(a) * rr) * k + ox), py = Math.round((y + Math.sin(a) * rr) * k + oy);
        if (px < 0 || py < 0 || px >= m.w || py >= m.h) continue;
        const al = m.d[(py * m.w + px) * 4 + 3] / 255; if (al > best) best = al;
      }
      return best;
    },
    has: function (id) { return !!(GA.Maps && GA.Maps[id]); },
    info: function () { return S.info; },
    invalidate: function () { S.key = ''; }
  };

  GA.Background = Background;
})(window.GA = window.GA || {});
