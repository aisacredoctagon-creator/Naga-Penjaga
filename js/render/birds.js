/* birds.js — burung terbang TAMPAK ATAS: sayap berbulu (bulu primer & sekunder yang beranimasi), kawanan longgar (boids ringan), bayangan di tanah
 * yang berubah menurut ketinggian, goyangan angin, dan sesekali hinggap di tepi peta. Spesies per zona: gagak & elang (hutan), camar (rawa),
 * kelelawar (gua & menara). Tidak menerima input, digambar DI BAWAH bola (tidak pernah menutupi bola/angka), dikurangi di kualitas rendah.
 *   Birds.reset(ext, sceneId, enabled, quality)   Birds.update(dt, t)   Birds.draw(ctx, t) */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;

  const SPECIES = {
    crow:  { size: 13, body: '#1c1c26', wing: '#262634', tip: '#0e0e16', head: '#1c1c26', beak: '#6a6a72', flap: 9.5, glide: 0.35, feathers: true },
    eagle: { size: 22, body: '#5a3c22', wing: '#6e4a2a', tip: '#2a1a0e', head: '#e8dcc0', beak: '#e8b84a', flap: 4.2, glide: 0.8, feathers: true },
    gull:  { size: 15, body: '#f4f4f0', wing: '#d8dce0', tip: '#2a2a32', head: '#f4f4f0', beak: '#f0a030', flap: 7, glide: 0.55, feathers: true },
    bat:   { size: 12, body: '#2a1c30', wing: '#3a2842', tip: '#1a1022', head: '#2a1c30', beak: '#2a1c30', flap: 11, glide: 0.2, feathers: false }
  };
  const BY_SCENE = { forest: ['crow', 'crow', 'eagle'], grove: ['crow', 'crow', 'eagle'], bloom: ['crow', 'eagle'], menu: ['crow'], swamp: ['gull'], swampDusk: ['bat', 'gull'], coast: ['gull'], crystal: ['bat'], iceCave: ['bat'], amethyst: ['bat'], tower: ['bat'], tower2: ['bat'], library: ['bat'], volcano: ['bat'], ashfield: ['bat'], magma: ['bat'] };

  const B = { ext: null, kinds: [], on: false, q: 2, flocks: [], next: 6, perched: 0 };

  function reset(ext, scene, enabled, quality) {
    B.ext = ext; B.kinds = BY_SCENE[scene] || ['crow']; B.on = !!enabled && !!ext; B.q = quality == null ? 2 : quality; B.flocks.length = 0; B.next = 3 + Math.random() * 5; B.perched = 0;
  }

  function spawn() {
    const e = B.ext, kind = B.kinds[Math.floor(Math.random() * B.kinds.length)], sp = SPECIES[kind];
    const n = kind === 'eagle' ? 1 : (B.q >= 2 ? 3 + Math.floor(Math.random() * 3) : 2), l2r = Math.random() < 0.5, ang = (l2r ? 0 : Math.PI) + (Math.random() - 0.5) * 0.7;
    const cx = l2r ? e.x0 - 40 : e.x1 + 40, cy = e.y0 + e.h * (0.15 + Math.random() * 0.6), spd = (kind === 'eagle' ? 55 : 80) + Math.random() * 30, fl = { kind: kind, birds: [], dir: ang, spd: spd };
    for (let i = 0; i < n; i++) {
      const off = i * 26 + Math.random() * 10, a = ang + Math.PI, sd = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 20;
      fl.birds.push({ x: cx + Math.cos(a) * off - Math.sin(ang) * sd, y: cy + Math.sin(a) * off + Math.cos(ang) * sd, z: 0.7 + Math.random() * 0.3, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, ph: Math.random() * TAU, st: 'fly', tm: 0, px: 0, py: 0, h: ang, glideT: Math.random() * 4, fold: 0 });
    }
    B.flocks.push(fl);
  }

  function update(dt, t) {
    if (!B.on || B.q < 1 || !B.ext) return;
    const e = B.ext, maxFlocks = B.q >= 2 ? 2 : 1;
    B.next -= dt; if (B.next <= 0 && B.flocks.length < maxFlocks) { spawn(); B.next = 9 + Math.random() * 12; }
    for (let fi = B.flocks.length - 1; fi >= 0; fi--) {
      const fl = B.flocks[fi], sp = SPECIES[fl.kind], bs = fl.birds;
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i];
        b.ph += dt * sp.flap * (b.glideT > 0 ? 1 : 0.15);        // meluncur: kepakan nyaris berhenti
        b.glideT -= dt; if (b.glideT < -1.2) b.glideT = 1 + Math.random() * 3;
        if (b.st === 'fly') {
          let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0;                      // boids: kohesi, keselarasan, pemisahan
          for (let j = 0; j < bs.length; j++) { if (j === i) continue; const o = bs[j], dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy; if (d2 < 120 * 120) { cx += o.x; cy += o.y; ax += o.vx; ay += o.vy; n++; if (d2 < 28 * 28) { sx -= dx; sy -= dy; } } }
          let tx = Math.cos(fl.dir) * fl.spd, ty = Math.sin(fl.dir) * fl.spd;
          if (n) { tx += (cx / n - b.x) * 0.35 + (ax / n - b.vx) * 0.3; ty += (cy / n - b.y) * 0.35 + (ay / n - b.vy) * 0.3; }
          tx += sx * 2 + Math.sin(t * 0.9 + b.ph) * 14; ty += sy * 2 + Math.cos(t * 0.7 + b.ph * 1.3) * 10;   // goyangan angin
          b.vx += (tx - b.vx) * Math.min(1, dt * 1.6); b.vy += (ty - b.vy) * Math.min(1, dt * 1.6);
          b.z += (0.75 + 0.2 * Math.sin(t * 0.8 + b.ph) - b.z) * Math.min(1, dt * 1.2);
          // sesekali hinggap di tepi peta (bukan elang)
          if (fl.kind !== 'eagle' && B.perched < 1 && b.x > e.x0 + 20 && b.x < e.x1 - 20 && Math.random() < dt * 0.012) { b.st = 'land'; b.px = Math.random() < 0.5 ? e.x0 + 10 : e.x1 - 10; b.py = e.y0 + e.h * (0.12 + Math.random() * 0.76); B.perched++; }
        } else if (b.st === 'land') {
          const dx = b.px - b.x, dy = b.py - b.y, d = Math.hypot(dx, dy) || 1, v = Math.min(Math.hypot(b.vx, b.vy), Math.max(14, d * 0.9));
          b.vx = dx / d * v; b.vy = dy / d * v; b.z += (0 - b.z) * Math.min(1, dt * 1.4); b.glideT = 1;
          if (d < 5) { b.st = 'perch'; b.tm = 2.5 + Math.random() * 3; b.vx = b.vy = 0; }
        } else if (b.st === 'perch') {
          b.z = 0; b.fold = Math.min(1, b.fold + dt * 4); b.tm -= dt; b.ph += dt * 0.5;
          if (b.tm <= 0) { b.st = 'takeoff'; b.tm = 0; B.perched = Math.max(0, B.perched - 1); }
        } else {   // lepas landas
          b.fold = Math.max(0, b.fold - dt * 3); b.tm += dt; b.vx += (Math.cos(fl.dir) * fl.spd - b.vx) * Math.min(1, dt * 1.8); b.vy += (Math.sin(fl.dir) * fl.spd - 14 - b.vy) * Math.min(1, dt * 1.8); b.z += (0.8 - b.z) * Math.min(1, dt * 0.9); b.glideT = 1;
          if (b.tm > 1.4) b.st = 'fly';
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.st !== 'perch') { const sp2 = Math.hypot(b.vx, b.vy); if (sp2 > 3) { let d = Math.atan2(b.vy, b.vx) - b.h; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; b.h += d * Math.min(1, dt * 5); } }
        if (b.x < e.x0 - 120 || b.x > e.x1 + 120 || b.y < e.y0 - 120 || b.y > e.y1 + 120) { if (b.st === 'perch' || b.st === 'land') B.perched = Math.max(0, B.perched - 1); bs.splice(i, 1); }
      }
      if (!bs.length) B.flocks.splice(fi, 1);
    }
  }

  /* ---------- gambar ---------- */
  function wingPts(sd, s, phi, fold) {
    const span = s * (1.2 - 0.9 * fold) * (0.72 + 0.28 * Math.cos(phi)), sweep = -0.28 + 0.3 * Math.sin(phi) + 0.5 * fold, dx = Math.sin(sweep) * 1, dy = sd * Math.cos(Math.abs(sweep) * 0.8);
    const rx = 0.12 * s, ry = sd * 0.11 * s, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    return { rx: rx, ry: ry, wx: rx + ux * span * 0.55, wy: ry + uy * span * 0.55, ux: ux, uy: uy, span: span };
  }

  function drawFeatherWing(ctx, sp, sd, s, phi, fold) {
    const w = wingPts(sd, s, phi, fold), nP = 5, nS = 5;
    // sekunder: di sepanjang lengan, mengarah ke belakang
    ctx.fillStyle = sp.wing; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6;
    for (let k = 0; k < nS; k++) {
      const u = (k + 0.5) / nS, px = w.rx + (w.wx - w.rx) * u, py = w.ry + (w.wy - w.ry) * u, len = s * (0.52 - 0.04 * k) * (1 - 0.5 * fold), a = Math.PI + sd * (0.12 + 0.05 * k) - sd * 0.1 * Math.sin(phi) * (1 - u);
      const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len, nx = -Math.sin(a) * s * 0.1, ny = Math.cos(a) * s * 0.1;
      ctx.beginPath(); ctx.moveTo(px + nx, py + ny); ctx.lineTo(ex + nx * 0.4, ey + ny * 0.4); ctx.quadraticCurveTo(ex + Math.cos(a) * s * 0.04, ey + Math.sin(a) * s * 0.04, ex - nx * 0.4, ey - ny * 0.4); ctx.lineTo(px - nx, py - ny); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // primer: kipas di ujung sayap (terpisah saat mengepak)
    ctx.fillStyle = sp.tip;
    for (let k = 0; k < nP; k++) {
      const spread = (k - (nP - 1) / 2) * (0.2 + 0.1 * Math.max(0, Math.sin(phi))), ba = Math.atan2(w.uy, w.ux) + sd * spread * -1 + sd * 0.25, len = s * (0.62 - 0.05 * Math.abs(k - 1)) * (1 - 0.6 * fold);
      const ex = w.wx + Math.cos(ba) * len, ey = w.wy + Math.sin(ba) * len, nx = -Math.sin(ba) * s * 0.075, ny = Math.cos(ba) * s * 0.075;
      ctx.beginPath(); ctx.moveTo(w.wx + nx, w.wy + ny); ctx.lineTo(ex + nx * 0.3, ey + ny * 0.3); ctx.quadraticCurveTo(ex + Math.cos(ba) * s * 0.05, ey + Math.sin(ba) * s * 0.05, ex - nx * 0.3, ey - ny * 0.3); ctx.lineTo(w.wx - nx, w.wy - ny); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = sp.body; ctx.lineWidth = Math.max(1.2, s * 0.1); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(w.rx, w.ry); ctx.lineTo(w.wx, w.wy); ctx.stroke();    // tulang lengan
    ctx.fillStyle = sp.wing; ctx.beginPath(); ctx.ellipse((w.rx + w.wx) / 2, (w.ry + w.wy) / 2, s * 0.3, s * 0.1, Math.atan2(w.wy - w.ry, w.wx - w.rx), 0, TAU); ctx.fill();   // penutup sayap
  }

  function drawBatWing(ctx, sp, sd, s, phi, fold) {
    const w = wingPts(sd, s, phi, fold), sc = 1 - 0.55 * fold;
    const tips = [[w.wx + w.ux * s * 0.35 * sc, w.wy + w.uy * s * 0.35 * sc], [w.wx - s * 0.08 + w.ux * s * 0.15, w.wy + sd * s * 0.4 * sc], [w.wx - s * 0.42 * sc, w.wy + sd * s * 0.3 * sc], [-s * 0.4, sd * s * 0.14]];
    ctx.fillStyle = sp.wing; ctx.strokeStyle = sp.tip; ctx.lineWidth = Math.max(0.8, s * 0.06); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(w.rx, w.ry); ctx.lineTo(w.wx, w.wy); ctx.lineTo(tips[0][0], tips[0][1]);
    for (let i = 0; i < 3; i++) { const a = tips[i], b = tips[i + 1]; ctx.quadraticCurveTo((a[0] + b[0]) / 2 + (w.wx - (a[0] + b[0]) / 2) * 0.35, (a[1] + b[1]) / 2 + (w.wy - (a[1] + b[1]) / 2) * 0.35, b[0], b[1]); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); tips.slice(0, 3).forEach(function (p) { ctx.moveTo(w.wx, w.wy); ctx.lineTo(p[0], p[1]); }); ctx.stroke();
  }

  function drawBird(ctx, b, kind, t, shadow) {
    const sp = SPECIES[kind], s = sp.size * (0.8 + 0.4 * b.z) * (1 - 0 * b.fold), amp = b.glideT > 0 ? 0.75 : sp.glide * 0.5, phi = Math.sin(b.ph) * amp * (1 - b.fold) + 0.3 * b.fold;
    ctx.save();
    if (shadow) {
      const off = b.z, ox = 26 * off, oy = 40 * off, sc = 0.92 - 0.1 * b.z;
      ctx.translate(b.x + ox, b.y + oy); ctx.rotate(b.h); ctx.scale(sc, sc); ctx.fillStyle = 'rgba(4,10,6,' + (0.13 + 0.12 * (1 - b.z)).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.2, 0, 0, TAU); ctx.fill();
      [-1, 1].forEach(function (sd) { const w = wingPts(sd, s, phi, b.fold); ctx.beginPath(); ctx.moveTo(w.rx, w.ry); ctx.lineTo(w.wx + w.ux * s * 0.5, w.wy + w.uy * s * 0.5); ctx.lineTo(w.wx - s * 0.5, w.wy); ctx.closePath(); ctx.fill(); });
      ctx.restore(); return;
    }
    ctx.translate(b.x, b.y); ctx.rotate(b.h);
    // ekor (kipas bulu) → sayap → badan → kepala
    ctx.fillStyle = sp.wing; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6;
    if (sp.feathers) for (let k = -2; k <= 2; k++) { const a = Math.PI + k * 0.16, ex = -s * 0.5 + Math.cos(a) * s * 0.5, ey = Math.sin(a) * s * 0.5, nx = -Math.sin(a) * s * 0.06, ny = Math.cos(a) * s * 0.06; ctx.beginPath(); ctx.moveTo(-s * 0.4 + nx, ny); ctx.lineTo(ex + nx, ey + ny); ctx.lineTo(ex - nx, ey - ny); ctx.lineTo(-s * 0.4 - nx, -ny); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = sp.body; ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 0.1); ctx.lineTo(-s * 0.75, 0); ctx.lineTo(-s * 0.35, s * 0.1); ctx.closePath(); ctx.fill(); }
    [-1, 1].forEach(function (sd) { if (sp.feathers) drawFeatherWing(ctx, sp, sd, s, phi, b.fold); else drawBatWing(ctx, sp, sd, s, phi, b.fold); });
    ctx.fillStyle = sp.body; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.19, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sp.head; ctx.beginPath(); ctx.arc(s * 0.5, 0, s * 0.15, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sp.beak; ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.05); ctx.lineTo(s * 0.8, 0); ctx.lineTo(s * 0.6, s * 0.05); ctx.closePath(); ctx.fill();
    if (kind === 'bat') { ctx.fillStyle = sp.tip; [-1, 1].forEach(function (sd) { ctx.beginPath(); ctx.moveTo(s * 0.52, sd * s * 0.07); ctx.lineTo(s * 0.6, sd * s * 0.22); ctx.lineTo(s * 0.46, sd * s * 0.12); ctx.closePath(); ctx.fill(); }); }   // telinga
    ctx.restore();
  }

  function draw(ctx, t) {
    if (!B.on || B.q < 1 || !B.flocks.length) return;
    ctx.save(); ctx.beginPath(); const e = B.ext; ctx.rect(e.x0 - 130, e.y0 - 130, e.w + 260, e.h + 260); ctx.clip();
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < B.flocks.length; i++) { const fl = B.flocks[i]; for (let j = 0; j < fl.birds.length; j++) drawBird(ctx, fl.birds[j], fl.kind, t, pass === 0); }
    ctx.restore();
  }

  GA.Birds = { reset: reset, update: update, draw: draw, setQuality: function (q) { B.q = q; if (q < 1) B.flocks.length = 0; }, SPECIES: SPECIES, state: B };
})(window.GA = window.GA || {});
