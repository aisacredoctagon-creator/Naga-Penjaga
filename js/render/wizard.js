/* render/wizard.js — rig & gambar Penyihir Jahat (boss akhir), seluruhnya kode (tanpa aset gambar).
 *
 * Sosok tinggi-kurus berjubah compang-camping: jubah kain disimulasikan (verlet, 7 lajur × 7 titik), tudung runcing, wajah pucat
 * berparut dengan mata hijau/ungu menyala, bantalan bahu bertumpuk (tulang + logam berkarat), sabuk & tali kulit, lengan dua ruas
 * (IK) dengan jari panjang bercincin, tongkat berkristal berisi energi telur curian.
 * Tekstur prosedural (anyaman kain, kulit, karat, tulang) ditumpuk di atas warna dasar lewat clip.
 *
 * API: GA.Wizard.draw(ctx, boss, t) — boss: { x, y, R, hurt, attackT, castT, laughT, wrathT, defeated, defeatT, phaseIdx, rig }.
 *      GA.Wizard.drawFigure(ctx, x, y, R, t, mood) — pose statis untuk cerita/menu.
 * Koordinat gambar memakai satuan U = 0,82·R (lebar ×0,86) dengan titik asal di tengah badan (kepala ≈ −1, ujung jubah ≈ +1,3).
 */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  const OUT = '#0d0720';
  const COL = { top: '#5d4299', bot: '#170b33', hood: '#43307a', leather: '#4d3121', rust: '#80512c', metal: '#6a5e58', bone: '#e6deC6', skin: '#d0c5ab', gold: '#e8c45c', green: '#7dff8a', purple: '#c77dff' };
  const q = function () { return GA.Effects ? GA.Effects.quality : 2; };

  /* ---------- tekstur prosedural: ubin transparan 64px yang ditumpuk di atas warna dasar ---------- */
  const tiles = {};
  function rng(seed) { let s = seed | 0 || 1; return function () { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296; }; }
  function tile(kind) {
    if (tiles[kind]) return tiles[kind];
    const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), r = rng(kind.length * 977 + kind.charCodeAt(0) * 31);
    if (kind === 'cloth') {          // anyaman: benang silang + serat kusut
      for (let i = 0; i < S; i += 4) {
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, i, S, 1.4); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, i + 1.6, S, 1);
        g.fillStyle = 'rgba(0,0,0,0.24)'; g.fillRect(i, 0, 1.4, S); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(i + 1.6, 0, 1, S);
      }
      for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,' + (0.06 + r() * 0.1).toFixed(2) + ')' : 'rgba(255,255,255,' + (0.04 + r() * 0.07).toFixed(2) + ')'; g.fillRect(r() * S, r() * S, 1 + r() * 6, 1); }
    } else if (kind === 'leather') {  // butiran + lipatan
      for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.55 ? 'rgba(0,0,0,' + (0.1 + r() * 0.15).toFixed(2) + ')' : 'rgba(255,220,170,' + (0.05 + r() * 0.1).toFixed(2) + ')'; g.beginPath(); g.arc(r() * S, r() * S, 0.5 + r() * 1.2, 0, TAU); g.fill(); }
      g.lineWidth = 0.9; for (let i = 0; i < 9; i++) { g.strokeStyle = 'rgba(0,0,0,0.22)'; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + r() * 14 - 7, y + r() * 8, x + r() * 20 - 10, y + r() * 14 - 7); g.stroke(); }
    } else if (kind === 'rust') {     // bercak karat, goresan, lubang kecil
      for (let i = 0; i < 20; i++) { const x = r() * S, y = r() * S, rad = 3 + r() * 8, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(' + (150 + r() * 60 | 0) + ',' + (70 + r() * 30 | 0) + ',20,0.42)'); gr.addColorStop(1, 'rgba(150,70,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); }
      g.lineWidth = 0.7; for (let i = 0; i < 10; i++) { g.strokeStyle = 'rgba(255,235,210,0.2)'; const x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 14 - 7, y + r() * 6 - 3); g.stroke(); }
      for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(25,10,0,0.35)'; g.fillRect(r() * S, r() * S, 1, 1); }
    } else {                          // tulang: noda krem, retakan, pori
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '120,95,50' : '255,250,230') + ',' + (0.08 + r() * 0.12).toFixed(2) + ')'; g.beginPath(); g.ellipse(r() * S, r() * S, 2 + r() * 7, 1.5 + r() * 5, r() * 3, 0, TAU); g.fill(); }
      g.lineWidth = 0.8; for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(70,45,20,0.38)'; let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += r() * 8 - 4; y += 2 + r() * 5; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 24; i++) { g.fillStyle = 'rgba(60,40,15,0.3)'; g.fillRect(r() * S, r() * S, 1, 1); }
    }
    return (tiles[kind] = c);
  }
  const pats = {};
  function pat(g, kind) { return pats[kind] || (pats[kind] = g.createPattern(tile(kind), 'repeat')); }
  /** Tumpuk tekstur di dalam jalur yang sedang aktif (path belum dibersihkan). */
  function tex(g, kind, a, scale) {
    if (q() < 1) return;
    g.save(); g.clip(); g.globalAlpha = a; g.fillStyle = pat(g, kind); const s = scale || 0.5; g.scale(s, s); g.fillRect(-400, -400, 800, 800); g.restore();
  }

  function ell(g, x, y, rx, ry, fill, tk, rot) {
    g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fillStyle = fill; g.fill(); if (tk) tex(g, tk, 0.55, 0.5);
    g.lineWidth = 0.028; g.strokeStyle = OUT; g.stroke();
  }
  function limb(g, ax, ay, bx, by, wa, wb, fill, tk) {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    g.beginPath(); g.moveTo(ax + nx * wa / 2, ay + ny * wa / 2); g.lineTo(bx + nx * wb / 2, by + ny * wb / 2); g.lineTo(bx - nx * wb / 2, by - ny * wb / 2); g.lineTo(ax - nx * wa / 2, ay - ny * wa / 2); g.closePath();
    g.fillStyle = fill; g.fill(); if (tk) tex(g, tk, 0.5, 0.5); g.lineWidth = 0.028; g.strokeStyle = OUT; g.stroke();
  }

  /* ---------- jubah kain (verlet) ---------- */
  const NC = 7, NJ = 7, SEG = 0.3, TATTER = [0.2, 0.08, 0.26, 0.1, 0.22, 0.06, 0.18];
  const restX = function (k, j) { return (-0.5 + k / (NC - 1)) * (1 + 0.24 * j / (NJ - 1)); };
  const restY = function (j) { return -0.58 + j * SEG; };

  function makeRig() {
    const cols = [];
    for (let k = 0; k < NC; k++) { const pts = []; for (let j = 0; j < NJ; j++) pts.push({ x: restX(k, j), y: restY(j), px: restX(k, j), py: restY(j) }); cols.push(pts); }
    return { cols: cols, lastT: null, bobX: 0, bobY: 0, hL: { x: -0.86, y: 0.2 }, spreadL: 0.35, staff: 0.05, grip: { x: 0.8, y: 0.14 }, parts: [], dp: [], snap: null, blocks: null, ps: 0, pc: 0 };
  }

  function simulate(rig, dt, t, wind) {
    const C = rig.cols, bx = rig.bobX, by = rig.bobY, steps = dt > 1 / 45 ? 2 : 1, h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (let k = 0; k < NC; k++) {
        for (let j = 0; j < NJ; j++) {
          const p = C[k][j];
          if (j === 0) { p.x = restX(k, 0) + bx; p.y = restY(0) + by; p.px = p.x; p.py = p.y; continue; }
          const vx = (p.x - p.px) * 0.962, vy = (p.y - p.py) * 0.962; p.px = p.x; p.py = p.y;
          const f = j / (NJ - 1);
          const ax = (restX(k, j) + bx * 0.45 - p.x) * 15 + wind * Math.sin(t * 1.7 + j * 0.65 + k * 0.45) * f * 2.4;
          const ay = (restY(j) + by * 0.45 - p.y) * 11 + 3.2;
          p.x += vx + ax * h * h; p.y += vy + ay * h * h;
        }
      }
      for (let it = 0; it < 2; it++) {
        for (let k = 0; k < NC; k++) {
          for (let j = 1; j < NJ; j++) {
            const a = C[k][j - 1], b = C[k][j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6, df = (d - SEG) / d;
            if (j === 1) { b.x -= dx * df; b.y -= dy * df; } else { a.x += dx * df * 0.5; a.y += dy * df * 0.5; b.x -= dx * df * 0.5; b.y -= dy * df * 0.5; }
          }
        }
      }
    }
  }

  /** Titik bilinear pada kain: kf ∈ [0, NC−1], jf ∈ [0, NJ−1]. */
  function pt(rig, kf, jf, out) {
    const C = rig.cols, k0 = clamp(Math.floor(kf), 0, NC - 2), j0 = clamp(Math.floor(jf), 0, NJ - 2), fk = kf - k0, fj = jf - j0;
    const a = C[k0][j0], b = C[k0 + 1][j0], c = C[k0][j0 + 1], d = C[k0 + 1][j0 + 1];
    out.x = (a.x * (1 - fk) + b.x * fk) * (1 - fj) + (c.x * (1 - fk) + d.x * fk) * fj;
    out.y = (a.y * (1 - fk) + b.y * fk) * (1 - fj) + (c.y * (1 - fk) + d.y * fk) * fj;
    return out;
  }

  /** IK dua ruas: siku untuk bahu S → tangan T. sg: sisi tekuk (+1 kiri, −1 kanan). */
  function ik(sx, sy, tx, ty, l1, l2, sg, out) {
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1e-6; const dd = clamp(d, 0.12, l1 + l2 - 0.002);
    dx /= d; dy /= d;
    const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    out.x = sx + dx * a + (-dy) * hh * sg; out.y = sy + dy * a + dx * hh * sg;
    out.hx = sx + dx * dd; out.hy = sy + dy * dd;     // posisi tangan yang benar-benar tercapai
    return out;
  }

  /* ---------- pose, jubah & partikel per bingkai ---------- */
  function mood(b) {
    return { hurt: b.hurt > 0, wrath: b.wrathT > 0, atk: b.attackT > 0, cast: b.castT > 0, laugh: b.laughT > 0 && !(b.hurt > 0) };
  }

  function spawn(rig, x, y, vx, vy, max, col, s, add) {
    if (rig.parts.length > 110) return;
    rig.parts.push({ x: x, y: y, vx: vx, vy: vy, life: 0, max: max, col: col, s: s, add: add });
  }

  function step(rig, t, b) {
    const dt = rig.lastT == null ? 0 : clamp(t - rig.lastT, 0, 0.05); rig.lastT = t;
    const m = mood(b), wr = b.wrathT > 0 ? Math.min(1, b.wrathT / 0.5) : 0;
    rig.bobY = Math.sin(t * 1.8) * 0.05 - wr * 0.22 + (m.laugh ? Math.sin(t * 28) * 0.012 : 0);
    rig.bobX = Math.sin(t * 0.9) * 0.03 + (m.hurt ? Math.sin(t * 70) * 0.025 : 0);
    if (dt > 0) simulate(rig, dt, t, m.wrath ? 2.4 : (m.cast ? 1.5 : 0.7));
    // pose tangan kiri (bebas) & tongkat (kanan), dihaluskan
    let hx = -0.86, hy = 0.2 + Math.sin(t * 1.6) * 0.03, sp = 0.35, sa = 0.05 + Math.sin(t * 1.1) * 0.025;
    if (m.hurt) { hx = -0.9; hy = -0.95; sp = 1; sa = 0.25; }
    else if (m.wrath) { hx = -1.15; hy = -0.7 + Math.sin(t * 9) * 0.04; sp = 1; sa = -0.12; }
    else if (m.atk) { hx = -0.95; hy = -0.15; sp = 1; sa = 0.62; }
    else if (m.cast) { hx = -0.98; hy = -0.88 + Math.sin(t * 12) * 0.03; sp = 1; sa = 0.4 + Math.sin(t * 10) * 0.04; }
    else if (m.laugh) { hx = -0.3; hy = 0.12 + Math.sin(t * 28) * 0.02; sp = 0; }
    const k = 1 - Math.exp(-dt * 12);
    rig.hL.x += (hx - rig.hL.x) * k; rig.hL.y += (hy - rig.hL.y) * k; rig.spreadL += (sp - rig.spreadL) * k; rig.staff += (sa - rig.staff) * k;
    rig.grip.x = 0.8 + rig.bobX * 0.8; rig.grip.y = 0.14 + rig.bobY - (m.wrath ? 0.3 : 0) - (m.hurt ? 0.1 : 0);
    // partikel
    if (dt > 0) {
      const cx = rig.grip.x + Math.sin(rig.staff) * 1.68, cy = rig.grip.y - Math.cos(rig.staff) * 1.68, ph = b.phaseIdx || 0;
      rig.pc += dt * (7 + ph * 3 + (m.cast ? 24 : 0) + (m.hurt ? 40 : 0) + (m.wrath ? 55 : 0));
      while (rig.pc >= 1 && q() >= 1) {
        rig.pc -= 1; const green = Math.random() < 0.5, a = Math.random() * TAU;
        if (m.wrath && Math.random() < 0.6) spawn(rig, (Math.random() - 0.5) * 1.2, 0.9 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3, -0.7 - Math.random() * 0.8, 0.9 + Math.random() * 0.5, '#ff5a8a', 0.025 + Math.random() * 0.03, true);
        else if (m.cast && Math.random() < 0.6) spawn(rig, rig.hL.x, rig.hL.y - 0.08, Math.cos(a) * 0.5, Math.sin(a) * 0.5 - 0.3, 0.5 + Math.random() * 0.4, Math.random() < 0.5 ? COL.green : COL.purple, 0.02 + Math.random() * 0.025, true);
        else spawn(rig, cx + Math.cos(a) * 0.1, cy + Math.sin(a) * 0.1, Math.cos(a) * 0.12, -0.18 - Math.random() * 0.25, 0.9 + Math.random() * 0.8, green ? COL.green : COL.purple, 0.018 + Math.random() * 0.025, true);
      }
      for (let i = rig.parts.length - 1; i >= 0; i--) { const p = rig.parts[i]; p.life += dt; if (p.life >= p.max) { rig.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 0.1 * dt; }
    }
  }

  /* ---------- bagian-bagian gambar ---------- */
  function drawPad(g, s, x, y, t) {
    g.save(); g.translate(x, y); g.rotate(s * 0.32);
    ell(g, 0, 0.05, 0.3, 0.15, COL.leather, 'leather');
    ell(g, s * 0.01, -0.04, 0.26, 0.125, COL.rust, 'rust');
    g.fillStyle = '#2a1a10'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * 0.1, -0.03 + Math.abs(i) * 0.012, 0.016, 0, TAU); g.fill(); }
    ell(g, s * 0.02, -0.12, 0.2, 0.09, COL.bone, 'bone');
    g.fillStyle = COL.bone; g.strokeStyle = OUT; g.lineWidth = 0.025;
    for (let i = 0; i < 2; i++) { const ox = s * (0.2 + i * 0.05), oy = -0.04 - i * 0.1; g.beginPath(); g.moveTo(ox, oy + 0.05); g.lineTo(ox + s * 0.14, oy - 0.1 - i * 0.03); g.lineTo(ox - s * 0.02, oy - 0.06); g.closePath(); g.fill(); tex(g, 'bone', 0.5, 0.5); g.stroke(); }
    g.restore();
  }

  function drawHand(g, x, y, ang, spread, closed, glow, t) {
    g.save(); g.translate(x, y); g.rotate(ang - Math.PI / 2 * 0 + 0);   // sumbu +x = arah jari
    if (glow > 0 && q() >= 1) { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(0.12, 0, 0, 0.12, 0, 0.32); gr.addColorStop(0, 'rgba(160,255,170,' + (0.5 * glow).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(160,255,170,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0.12, 0, 0.32, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
    ell(g, 0.03, 0, 0.075, 0.062, COL.skin, null);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const base = (i - 1.5) * spread * 0.3, l1 = closed ? 0.07 : 0.14 - Math.abs(i - 1.5) * 0.012, l2 = closed ? 0.05 : 0.12 - Math.abs(i - 1.5) * 0.01, curl = closed ? 1.5 : 0.12 + Math.sin(t * 2 + i) * 0.04;
      const x1 = 0.08 + Math.cos(base) * l1, y1 = (i - 1.5) * 0.03 + Math.sin(base) * l1, x2 = x1 + Math.cos(base + curl) * l2, y2 = y1 + Math.sin(base + curl) * l2;
      g.strokeStyle = OUT; g.lineWidth = 0.05; g.beginPath(); g.moveTo(0.08, (i - 1.5) * 0.03); g.lineTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = COL.skin; g.lineWidth = 0.03; g.stroke();
      g.fillStyle = '#2a1a2e'; g.beginPath(); g.arc(x2, y2, 0.018, 0, TAU); g.fill();          // kuku runcing gelap
      if (i === 1 || i === 3) { g.fillStyle = COL.gold; g.strokeStyle = OUT; g.lineWidth = 0.012; g.beginPath(); g.arc(x1 * 0.9 + 0.01, y1 * 0.9, 0.022, 0, TAU); g.fill(); g.stroke(); }   // cincin
    }
    g.strokeStyle = OUT; g.lineWidth = 0.05; g.beginPath(); g.moveTo(0.02, -0.05); g.lineTo(0.1, -0.12 - (closed ? 0 : spread * 0.04)); g.stroke(); g.strokeStyle = COL.skin; g.lineWidth = 0.03; g.stroke();   // ibu jari
    g.restore();
  }

  /** Kristal tongkat berisi energi telur curian: ukuran & cahaya naik bersama fase. */
  function drawCrystal(g, t, b, m) {
    const ph = b.phaseIdx || 0, pulse = 0.5 + 0.5 * Math.sin(t * 2.6), big = 1 + ph * 0.14 + (m.cast ? 0.25 : 0) + (m.wrath ? 0.35 : 0);
    // cakar tulang melingkupi kristal
    g.strokeStyle = OUT; g.fillStyle = COL.bone; g.lineWidth = 0.025;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(i * 0.04, -1.46); g.quadraticCurveTo(i * 0.28, -1.62, i * 0.14, -1.95); g.quadraticCurveTo(i * 0.2, -1.62, i * 0.07, -1.45); g.closePath(); g.fill(); tex(g, 'bone', 0.5, 0.5); g.stroke(); }
    // badan kristal
    g.beginPath(); g.moveTo(0, -1.98); g.lineTo(0.15, -1.78); g.lineTo(0.12, -1.55); g.lineTo(0, -1.45); g.lineTo(-0.12, -1.55); g.lineTo(-0.15, -1.78); g.closePath();
    const cg = g.createLinearGradient(-0.15, -1.9, 0.15, -1.5); cg.addColorStop(0, 'rgba(150,255,170,0.9)'); cg.addColorStop(0.5, 'rgba(120,70,200,0.85)'); cg.addColorStop(1, 'rgba(60,30,120,0.9)');
    g.fillStyle = cg; g.fill(); g.lineWidth = 0.03; g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.014; g.beginPath(); g.moveTo(0, -1.98); g.lineTo(0, -1.45); g.moveTo(-0.15, -1.78); g.lineTo(0.12, -1.55); g.moveTo(0.15, -1.78); g.lineTo(-0.12, -1.55); g.stroke();
    // inti: telur berpendar + pusaran
    g.save(); g.translate(0, -1.7); g.globalCompositeOperation = 'lighter';
    const egg = g.createRadialGradient(0, 0, 0, 0, 0, 0.16 * big); egg.addColorStop(0, 'rgba(255,255,255,' + (0.9).toFixed(2) + ')'); egg.addColorStop(0.35, 'rgba(160,255,170,' + (0.6 + pulse * 0.3).toFixed(2) + ')'); egg.addColorStop(1, 'rgba(160,90,255,0)');
    g.fillStyle = egg; g.beginPath(); g.ellipse(0, 0, 0.075 * big, 0.1 * big, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(210,190,255,0.75)'; g.lineWidth = 0.014; g.lineCap = 'round';
    for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(0, 0, 0.09 + i * 0.03, t * (2.2 - i * 0.9) + i * 2, t * (2.2 - i * 0.9) + i * 2 + 2.2); g.stroke(); }
    g.restore();
    // percik mengorbit
    if (q() >= 1) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const a = t * (1.6 + i * 0.2) + i * 1.6, rr = 0.21 + 0.05 * i; g.fillStyle = i % 2 ? 'rgba(199,125,255,0.9)' : 'rgba(125,255,138,0.9)'; g.beginPath(); g.arc(Math.cos(a) * rr, -1.7 + Math.sin(a) * rr * 0.7, 0.018, 0, TAU); g.fill(); } g.restore(); }
    // cahaya besar
    if (q() >= 1) { g.save(); g.globalCompositeOperation = 'lighter'; const rg = g.createRadialGradient(0, -1.7, 0.05, 0, -1.7, 0.75 * big); rg.addColorStop(0, 'rgba(150,255,170,' + (0.32 + pulse * 0.12).toFixed(2) + ')'); rg.addColorStop(0.5, 'rgba(150,90,255,0.14)'); rg.addColorStop(1, 'rgba(150,90,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(0, -1.7, 0.75 * big, 0, TAU); g.fill(); g.restore(); }
  }

  function drawStaff(g, rig, t, b, m) {
    const gx = rig.grip.x, gy = rig.grip.y;
    g.save(); g.translate(gx, gy); g.rotate(rig.staff);
    // tiang berbuku
    g.lineCap = 'round'; g.lineJoin = 'round'; const wig = function (y) { return Math.sin(y * 7.3) * 0.012 + Math.sin(y * 17) * 0.006; };
    g.beginPath(); for (let y = 1.3; y >= -1.5; y -= 0.1) { if (y > 1.29) g.moveTo(wig(y), y); else g.lineTo(wig(y), y); }
    g.strokeStyle = OUT; g.lineWidth = 0.1; g.stroke(); g.strokeStyle = '#51371f'; g.lineWidth = 0.07; g.stroke(); g.strokeStyle = 'rgba(190,140,80,0.5)'; g.lineWidth = 0.02; g.save(); g.translate(-0.016, 0); g.stroke(); g.restore();
    [-0.9, -0.25, 0.5].forEach(function (y) { ell(g, wig(y), y, 0.062, 0.03, COL.rust, 'rust'); });     // cincin besi berkarat
    drawCrystal(g, t, b, m);
    g.restore();
  }

  function drawFace(g, t, b, m) {
    const hurt = m.hurt, boost = m.wrath ? 1.6 : (m.cast || m.atk ? 1.25 : 1) + 0.06 * (b.phaseIdx || 0);
    const jaw = m.laugh ? 0.07 + 0.03 * Math.abs(Math.sin(t * 26)) : (m.atk || hurt ? 0.05 : 0);
    // rongga tudung gelap
    g.beginPath(); g.ellipse(0, -1.0, 0.255, 0.31, 0, 0, TAU); g.fillStyle = '#080412'; g.fill();
    g.save(); g.beginPath(); g.ellipse(0, -1.0, 0.245, 0.3, 0, 0, TAU); g.clip();
    const sg = g.createRadialGradient(0, -1.04, 0.02, 0, -0.98, 0.32); sg.addColorStop(0, hurt ? '#e2b9b0' : '#d7ccb2'); sg.addColorStop(0.7, '#8d836c'); sg.addColorStop(1, '#3d362c');
    g.fillStyle = sg; g.fillRect(-0.3, -1.35, 0.6, 0.7);
    // pipi cekung, rongga mata, hidung
    g.fillStyle = 'rgba(30,18,24,0.4)'; g.beginPath(); g.ellipse(-0.13, -0.9, 0.07, 0.12, 0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0.13, -0.9, 0.07, 0.12, -0.3, 0, TAU); g.fill();
    g.fillStyle = 'rgba(10,4,20,0.55)'; g.beginPath(); g.ellipse(-0.1, -1.04, 0.085, 0.062, -0.12, 0, TAU); g.fill(); g.beginPath(); g.ellipse(0.1, -1.04, 0.085, 0.062, 0.12, 0, TAU); g.fill();
    g.fillStyle = 'rgba(40,25,30,0.55)'; g.beginPath(); g.moveTo(0, -1.0); g.lineTo(0.035, -0.9); g.lineTo(-0.02, -0.9); g.closePath(); g.fill();
    // mulut: seringai tipis, atau terbuka saat tertawa
    if (jaw > 0.04) {
      g.fillStyle = '#2a0610'; g.beginPath(); g.ellipse(0, -0.8 + jaw * 0.5, 0.1, jaw, 0, 0, TAU); g.fill();
      g.fillStyle = '#eadfc4'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 0.034 - 0.015, -0.8 - jaw * 0.5); g.lineTo(i * 0.034, -0.8 - jaw * 0.5 + 0.035); g.lineTo(i * 0.034 + 0.015, -0.8 - jaw * 0.5); g.fill(); }
    } else { g.strokeStyle = '#2a0610'; g.lineWidth = 0.02; g.lineCap = 'round'; g.beginPath(); g.moveTo(-0.09, -0.8); g.quadraticCurveTo(0, -0.77, 0.09, -0.82); g.stroke(); }
    // parut menyilang mata kiri + jahitan
    g.strokeStyle = '#b87878'; g.lineWidth = 0.022; g.beginPath(); g.moveTo(-0.17, -1.24); g.lineTo(-0.04, -0.9); g.stroke();
    g.strokeStyle = '#4a2430'; g.lineWidth = 0.011; for (let i = 0; i < 5; i++) { const u = 0.1 + i * 0.19, x = -0.17 + 0.13 * u, y = -1.24 + 0.34 * u; g.beginPath(); g.moveTo(x - 0.018, y + 0.006); g.lineTo(x + 0.018, y - 0.006); g.stroke(); }
    g.restore();
    // alis marah
    g.strokeStyle = '#150a1f'; g.lineWidth = 0.034; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.19, -1.12 - (hurt ? 0.02 : 0)); g.lineTo(-0.03, -1.07 + (m.atk || m.wrath ? 0.02 : 0)); g.stroke(); g.beginPath(); g.moveTo(0.19, -1.12); g.lineTo(0.03, -1.07 + (m.atk || m.wrath ? 0.02 : 0)); g.stroke();
    // mata menyala: kiri hijau, kanan ungu
    for (let s = -1; s <= 1; s += 2) {
      const ex = s * 0.1, ey = -1.04, col = s < 0 ? COL.green : COL.purple, rgb = s < 0 ? '125,255,138' : '199,125,255';
      if (hurt) { g.strokeStyle = '#150a1f'; g.lineWidth = 0.024; g.beginPath(); g.moveTo(ex - 0.045, ey - 0.03); g.lineTo(ex + 0.045, ey + 0.03); g.moveTo(ex + 0.045, ey - 0.03); g.lineTo(ex - 0.045, ey + 0.03); g.stroke(); continue; }
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(ex, ey, 0, ex, ey, 0.17 * boost); gr.addColorStop(0, 'rgba(' + rgb + ',0.8)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.beginPath(); g.arc(ex, ey, 0.17 * boost, 0, TAU); g.fill();
      g.restore();
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, 0.05, 0.025 * Math.min(1.4, boost), s * 0.32, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.ellipse(ex, ey, 0.032, 0.016 * Math.min(1.4, boost), s * 0.32, 0, TAU); g.fill();
    }
  }

  function drawHood(g, rig, t, b, m) {
    const sway = Math.sin(t * 1.3) * 0.05 + (m.laugh ? Math.sin(t * 28) * 0.012 : 0), tipX = 0.15 + sway + (m.laugh ? -0.05 : 0), tipY = -1.88 - (m.laugh ? 0.04 : 0);
    g.beginPath(); g.moveTo(-0.5, -0.6);
    g.bezierCurveTo(-0.6, -1.0, -0.42, -1.4, tipX - 0.07, tipY + 0.28);
    g.quadraticCurveTo(tipX - 0.02, tipY + 0.06, tipX, tipY);
    g.quadraticCurveTo(tipX + 0.12, tipY + 0.3, 0.3, -1.36);
    g.bezierCurveTo(0.52, -1.2, 0.62, -0.9, 0.5, -0.6);
    g.lineTo(0.37, -0.52); g.lineTo(0.2, -0.62); g.lineTo(0.02, -0.5); g.lineTo(-0.2, -0.62); g.lineTo(-0.36, -0.52); g.closePath();
    const hg = g.createLinearGradient(0, -1.9, 0, -0.55); hg.addColorStop(0, '#5a4396'); hg.addColorStop(1, '#241548');
    g.fillStyle = hg; g.fill(); tex(g, 'cloth', 0.6, 0.45); g.lineWidth = 0.03; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke();
    // lipatan tudung
    g.strokeStyle = 'rgba(10,4,30,0.45)'; g.lineWidth = 0.03; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-0.42, -0.7); g.quadraticCurveTo(-0.5, -1.0, -0.3, -1.3); g.moveTo(0.42, -0.7); g.quadraticCurveTo(0.5, -1.0, 0.32, -1.28); g.stroke();
    drawFace(g, t, b, m);
    // tepi rongga: bayangan tudung menutupi wajah
    g.save(); g.beginPath(); g.ellipse(0, -1.0, 0.25, 0.305, 0, 0, TAU); g.clip();
    const sh = g.createRadialGradient(0, -1.02, 0.1, 0, -1.02, 0.31); sh.addColorStop(0, 'rgba(8,4,18,0)'); sh.addColorStop(1, 'rgba(8,4,18,0.65)'); g.fillStyle = sh; g.fillRect(-0.3, -1.4, 0.6, 0.8);
    g.restore();
    g.strokeStyle = '#1b1038'; g.lineWidth = 0.05; g.beginPath(); g.ellipse(0, -1.0, 0.262, 0.318, 0, 0, TAU); g.stroke();
    // wajah menyala tertimpa cahaya mata (di atas bayangan)
  }

  function drawRobe(g, rig, t, b, m) {
    const C = rig.cols;
    g.beginPath(); g.moveTo(C[0][0].x, C[0][0].y);
    for (let j = 1; j < NJ; j++) g.lineTo(C[0][j].x, C[0][j].y);
    for (let k = 0; k < NC; k++) {
      const p = C[k][NJ - 1]; g.lineTo(p.x + (k % 2 ? 0.02 : -0.02), p.y + TATTER[k]);
      if (k < NC - 1) { const n = C[k + 1][NJ - 1]; g.lineTo((p.x + n.x) / 2, (p.y + n.y) / 2 - 0.05); }
    }
    for (let j = NJ - 2; j >= 0; j--) g.lineTo(C[NC - 1][j].x, C[NC - 1][j].y);
    g.closePath();
    const rg = g.createLinearGradient(0, -0.6, 0, 1.35); rg.addColorStop(0, COL.top); rg.addColorStop(1, COL.bot);
    g.fillStyle = rg; g.fill();
    tex(g, 'cloth', 0.65, 0.45);
    // cahaya dari sihirnya sendiri: sisi kanan (tongkat) menghijau, bagian bawah keunguan
    if (q() >= 1) { g.save(); g.clip(); g.globalCompositeOperation = 'lighter'; const lg = g.createLinearGradient(-0.6, 0, 0.7, 0); lg.addColorStop(0, 'rgba(160,80,255,0.1)'); lg.addColorStop(1, 'rgba(120,255,150,' + (m.wrath ? 0.28 : 0.15) + ')'); g.fillStyle = lg; g.fillRect(-1, -0.7, 2, 2.2); g.restore(); }
    g.lineWidth = 0.03; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke();
    // lipatan kain mengikuti lajur
    g.lineCap = 'round';
    for (let k = 1; k < NC - 1; k++) {
      g.beginPath(); for (let j = 1; j < NJ; j++) { if (j === 1) g.moveTo(C[k][j].x, C[k][j].y); else g.lineTo(C[k][j].x, C[k][j].y); }
      g.strokeStyle = 'rgba(8,3,26,0.42)'; g.lineWidth = 0.035; g.stroke();
      g.save(); g.translate(0.022, 0); g.strokeStyle = 'rgba(190,160,255,0.1)'; g.lineWidth = 0.016; g.stroke(); g.restore();
    }
    // tambalan kain & jahitan
    const a = { x: 0, y: 0 }, bb = { x: 0, y: 0 }, c = { x: 0, y: 0 }, d = { x: 0, y: 0 };
    [[1.6, 3.6], [4.5, 4.9]].forEach(function (pp) {
      pt(rig, pp[0] - 0.4, pp[1] - 0.45, a); pt(rig, pp[0] + 0.4, pp[1] - 0.35, bb); pt(rig, pp[0] + 0.35, pp[1] + 0.45, c); pt(rig, pp[0] - 0.45, pp[1] + 0.35, d);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(bb.x, bb.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fillStyle = '#5b3d2e'; g.fill(); tex(g, 'cloth', 0.7, 0.45);
      g.strokeStyle = OUT; g.lineWidth = 0.02; g.setLineDash([0.04, 0.035]); g.stroke(); g.setLineDash([]);
    });
  }

  function drawBelt(g, rig, t, b) {
    const pts = [], tmp = { x: 0, y: 0 };
    for (let i = 0; i <= 8; i++) { pt(rig, i * (NC - 1) / 8, 2.15, tmp); pts.push({ x: tmp.x, y: tmp.y + 0.03 * Math.sin(i / 8 * Math.PI) }); }
    // tali kulit menyilang dada
    const s0 = pt(rig, 4.9, 0.25, { x: 0, y: 0 }), s1 = pt(rig, 1.1, 2.15, { x: 0, y: 0 });
    limb(g, s0.x, s0.y, s1.x, s1.y, 0.075, 0.075, COL.leather, 'leather');
    g.strokeStyle = 'rgba(230,200,150,0.55)'; g.lineWidth = 0.01; g.setLineDash([0.03, 0.03]); g.beginPath(); g.moveTo(s0.x, s0.y); g.lineTo(s1.x, s1.y); g.stroke(); g.setLineDash([]);
    // sabuk
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y - 0.055); pts.forEach(function (p) { g.lineTo(p.x, p.y - 0.055); }); for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].x, pts[i].y + 0.055); g.closePath();
    g.fillStyle = COL.leather; g.fill(); tex(g, 'leather', 0.6, 0.5); g.lineWidth = 0.026; g.strokeStyle = OUT; g.stroke();
    const m = pts[4]; g.beginPath(); g.rect(m.x - 0.085, m.y - 0.075, 0.17, 0.15); g.fillStyle = COL.metal; g.fill(); tex(g, 'rust', 0.9, 0.5); g.lineWidth = 0.026; g.stroke();
    g.beginPath(); g.rect(m.x - 0.045, m.y - 0.04, 0.09, 0.08); g.fillStyle = '#2c1d14'; g.fill();
    // jimat tulang bergoyang
    [1, 3, 5, 7].forEach(function (i, n) {
      const p = pts[i], ang = Math.sin(t * 2.1 + i) * 0.25 + (rig.bobX) * 2, ln = 0.18 + (n % 2) * 0.07, ex = p.x + Math.sin(ang) * ln, ey = p.y + 0.05 + Math.cos(ang) * ln;
      g.strokeStyle = '#2a1a10'; g.lineWidth = 0.012; g.beginPath(); g.moveTo(p.x, p.y + 0.04); g.lineTo(ex, ey); g.stroke();
      if (n % 2) { ell(g, ex, ey + 0.03, 0.025, 0.05, COL.bone, 'bone', ang); } else { g.beginPath(); g.arc(ex, ey + 0.02, 0.032, 0, TAU); g.fillStyle = COL.gold; g.fill(); g.lineWidth = 0.016; g.strokeStyle = OUT; g.stroke(); }
    });
  }

  function drawGorget(g) {
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.2, x = Math.sin(a) * 0.36, y = -0.68 + (1 - Math.cos(a)) * 0.2;
      g.save(); g.translate(x, y); g.rotate(a * 0.9); g.beginPath(); g.rect(-0.04, -0.045, 0.08, 0.1); g.fillStyle = COL.bone; g.fill(); tex(g, 'bone', 0.6, 0.5); g.lineWidth = 0.02; g.strokeStyle = OUT; g.stroke(); g.restore();
    }
  }

  /** Seluruh sosok hidup pada asal (0,0), skala U sudah diterapkan. */
  function living(g, rig, t, b, noShield) {
    const m = mood(b), bx = rig.bobX, by = rig.bobY, bounce = m.laugh ? Math.sin(t * 28) * 0.03 : 0;
    const sy = -0.62 + by + bounce, sxL = -0.46 + bx, sxR = 0.46 + bx;
    // cahaya lantai & bayangan
    const lift = clamp(-by * 4 + 0.5, 0, 1.4);
    g.save(); g.fillStyle = 'rgba(0,0,0,' + (0.26 - lift * 0.05).toFixed(2) + ')'; g.beginPath(); g.ellipse(0, 1.62, 0.8 - lift * 0.08, 0.15, 0, 0, TAU); g.fill();
    if (q() >= 1) { g.globalCompositeOperation = 'lighter'; const fl = g.createRadialGradient(0.2, 1.6, 0, 0.2, 1.6, 1.15); fl.addColorStop(0, 'rgba(140,255,160,' + (m.wrath ? 0.28 : 0.14) + ')'); fl.addColorStop(0.6, 'rgba(150,90,255,0.08)'); fl.addColorStop(1, 'rgba(150,90,255,0)'); g.fillStyle = fl; g.beginPath(); g.ellipse(0.2, 1.6, 1.15, 0.26, 0, 0, TAU); g.fill(); }
    g.restore();
    // aura amarah saat pergantian fase
    if (m.wrath && q() >= 1) {
      g.save(); g.globalCompositeOperation = 'lighter'; const w = clamp(b.wrathT / 1.6, 0, 1);
      const ag = g.createRadialGradient(0, 0, 0.2, 0, 0, 1.9); ag.addColorStop(0, 'rgba(255,60,120,' + (0.4 * w).toFixed(2) + ')'); ag.addColorStop(0.5, 'rgba(150,50,255,' + (0.22 * w).toFixed(2) + ')'); ag.addColorStop(1, 'rgba(150,50,255,0)'); g.fillStyle = ag; g.beginPath(); g.arc(0, 0, 1.9, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,140,190,' + (0.55 * w).toFixed(2) + ')'; g.lineWidth = 0.04;
      for (let i = 0; i < 3; i++) { const u = ((1.6 - b.wrathT) * 1.1 + i / 3) % 1; g.globalAlpha = (1 - u) * w; g.beginPath(); g.arc(0, 0.1, 0.5 + u * 1.5, 0, TAU); g.stroke(); }
      g.restore();
    }
    // tubuh berkedip saat terkena (tampil lewat perisai)
    if (b.hurt > 0 && !noShield && Math.floor(b.hurt * 22) % 2) g.globalAlpha = 0.55;
    drawRobe(g, rig, t, b, m); drawBelt(g, rig, t, b);
    // lengan kiri (bebas)
    const el = ik(sxL, sy + 0.04, rig.hL.x, rig.hL.y, 0.44, 0.5, 1, { x: 0, y: 0 });
    limb(g, sxL, sy + 0.04, el.x, el.y, 0.2, 0.17, '#3a2a68', 'cloth'); ell(g, el.x, el.y, 0.085, 0.085, '#3a2a68', 'cloth');
    limb(g, el.x, el.y, el.hx, el.hy, 0.17, 0.12, '#3a2a68', 'cloth');
    const angL = Math.atan2(el.hy - el.y, el.hx - el.x);
    ell(g, el.hx - Math.cos(angL) * 0.02, el.hy - Math.sin(angL) * 0.02, 0.085, 0.07, '#2c1f54', 'cloth', angL);   // manset compang-camping
    drawHand(g, el.hx, el.hy, angL, rig.spreadL, m.laugh, m.cast || m.wrath ? 1 : 0, t);
    // lengan kanan + tongkat
    const gx = rig.grip.x, gy = rig.grip.y, er = ik(sxR, sy + 0.04, gx, gy, 0.44, 0.5, -1, { x: 0, y: 0 });
    limb(g, sxR, sy + 0.04, er.x, er.y, 0.2, 0.17, '#3a2a68', 'cloth'); ell(g, er.x, er.y, 0.085, 0.085, '#3a2a68', 'cloth');
    limb(g, er.x, er.y, er.hx, er.hy, 0.17, 0.12, '#3a2a68', 'cloth');
    drawStaff(g, rig, t, b, m);
    const angR = Math.atan2(er.hy - er.y, er.hx - er.x);
    ell(g, er.hx - Math.cos(angR) * 0.02, er.hy - Math.sin(angR) * 0.02, 0.085, 0.07, '#2c1f54', 'cloth', angR);
    drawHand(g, er.hx, er.hy, angR + 0.5, 0.4, true, 0, t);
    // bantalan bahu bertumpuk + kerah tulang
    drawPad(g, -1, sxL - 0.02, sy, t); drawPad(g, 1, sxR + 0.02, sy, t); g.save(); g.translate(bx, by + bounce * 0.5); drawGorget(g); g.restore();
    // kepala: ikut bergoyang, terdongak saat tertawa
    g.save(); g.translate(bx, by + bounce * 0.7); if (m.laugh) { g.translate(0, -0.03); g.rotate(-0.07 + Math.sin(t * 28) * 0.012); } drawHood(g, rig, t, b, m); g.restore();
    g.globalAlpha = 1;
    // partikel energi
    if (q() >= 1) {
      g.save(); g.globalCompositeOperation = 'lighter';
      rig.parts.forEach(function (p) { const u = p.life / p.max; g.globalAlpha = (1 - u) * 0.9; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.s * (1 - u * 0.5), 0, TAU); g.fill(); });
      g.restore();
    }
    // perisai sihir saat terkena
    if (b.hurt > 0 && !noShield) {
      const u = clamp(b.hurt / 0.5, 0, 1), fl = 0.65 + 0.35 * Math.sin(t * 50);
      g.save(); g.beginPath(); g.ellipse(0, -0.1, 1.0, 1.95, 0, 0, TAU); g.clip();
      g.globalCompositeOperation = 'lighter';
      const sg = g.createRadialGradient(0, -0.1, 0.6, 0, -0.1, 1.95); sg.addColorStop(0, 'rgba(120,200,255,0)'); sg.addColorStop(1, 'rgba(140,220,255,' + (0.5 * u * fl).toFixed(2) + ')'); g.fillStyle = sg; g.fillRect(-1.2, -2.2, 2.4, 4.4);
      g.strokeStyle = 'rgba(190,240,255,' + (0.55 * u * fl).toFixed(2) + ')'; g.lineWidth = 0.014;
      for (let r = -4; r <= 4; r++) for (let c = -3; c <= 3; c++) { const hx = c * 0.34 + (r & 1 ? 0.17 : 0), hy = r * 0.3 - 0.1; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; g.lineTo(hx + Math.cos(a) * 0.19, hy + Math.sin(a) * 0.19); } g.closePath(); g.stroke(); }
      g.restore();
      g.save(); g.strokeStyle = 'rgba(190,240,255,' + (0.7 * u * fl).toFixed(2) + ')'; g.lineWidth = 0.03; g.beginPath(); g.ellipse(0, -0.1, 1.0, 1.95, 0, 0, TAU); g.stroke(); g.restore();
    }
  }

  /* ---------- hancur menjadi abu & energi ungu ---------- */
  const GX = 12, GY = 16, SNAP = { x0: -1.9, y0: -2.6, w: 3.8, h: 4.4, sc: 1.5 };
  function makeSnap(rig, U, t, b) {
    const sc = SNAP.sc * U / 1, c = document.createElement('canvas'); c.width = Math.ceil(SNAP.w * sc); c.height = Math.ceil(SNAP.h * sc);
    const g = c.getContext('2d'); g.scale(sc, sc); g.translate(-SNAP.x0, -SNAP.y0);
    living(g, rig, t, b, true);
    rig.snap = { c: c, sc: sc }; rig.blocks = new Uint8Array(GX * GY); rig.dp = [];
  }
  function hash(a, b2) { const s = Math.sin(a * 127.1 + b2 * 311.7) * 43758.5453; return s - Math.floor(s); }

  function drawDefeat(ctx, rig, b, U, t, dt) {
    if (!rig.snap) makeSnap(rig, U, t, b);
    const k = b.defeatT / 2.2, S = rig.snap, bw = SNAP.w / GX, bh = SNAP.h / GY;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + (0.26 * (1 - clamp(k, 0, 1))).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(0, 1.62 * U, 0.8 * U, 0.15 * U, 0, 0, TAU); ctx.fill();
    // retak bercahaya sebelum hancur
    if (k < 0.12 && q() >= 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 60); ctx.fillStyle = 'rgba(190,120,255,0.25)'; ctx.beginPath(); ctx.ellipse(0, -0.1 * U, 0.9 * U, 1.8 * U, 0, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        const i = gy * GX + gx, hs = hash(gx, gy), delay = (gy / GY) * 0.5 + hs * 0.3, p = clamp((k - delay) / 0.4, 0, 1);
        if (p >= 1) { if (!rig.blocks[i]) { rig.blocks[i] = 1; if (q() >= 1) for (let n = 0; n < 2; n++) addDp(rig, (SNAP.x0 + (gx + 0.5) * bw) * U, (SNAP.y0 + (gy + 0.5) * bh) * U, U); } continue; }
        const ox = p * p * (0.2 + hs * 0.5) * U, oy = -p * (0.25 + hs * 0.6) * U, sw = SNAP.w * S.sc / GX, sh = SNAP.h * S.sc / GY;
        ctx.globalAlpha = 1 - p * p; const sz = 1 - p * 0.45;
        ctx.drawImage(S.c, gx * sw, gy * sh, sw, sh, (SNAP.x0 + gx * bw) * U + ox + bw * U * (1 - sz) / 2, (SNAP.y0 + gy * bh) * U + oy + bh * U * (1 - sz) / 2, bw * U * sz + 0.6, bh * U * sz + 0.6);
        if (p > 0 && !rig.blocks[i] && Math.random() < 0.25 && q() >= 1) addDp(rig, (SNAP.x0 + (gx + 0.5) * bw) * U + ox, (SNAP.y0 + (gy + 0.5) * bh) * U + oy, U);
      }
    }
    ctx.globalAlpha = 1;
    // partikel abu (abu-abu) dan energi (ungu, aditif)
    for (let i = rig.dp.length - 1; i >= 0; i--) {
      const p = rig.dp[i]; p.life += dt; if (p.life >= p.max) { rig.dp.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx += 30 * dt; p.vy -= 20 * dt;
      const u = p.life / p.max; ctx.globalAlpha = (1 - u) * (p.ash ? 0.7 : 0.9); ctx.globalCompositeOperation = p.ash ? 'source-over' : 'lighter'; ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 - u * 0.4), 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // letupan energi terakhir
    if (k > 0.85 && k < 1.2 && q() >= 1) { const u = (k - 0.85) / 0.35; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - u) * 0.8; ctx.strokeStyle = '#c77dff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -0.5 * U, U * (0.3 + u * 1.7), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  function addDp(rig, x, y, U) {
    if (rig.dp.length > 140) return;
    const ash = Math.random() < 0.55;
    rig.dp.push({ x: x, y: y, vx: (Math.random() - 0.3) * 40, vy: -20 - Math.random() * 50, life: 0, max: 0.6 + Math.random() * 0.4, s: U * (ash ? 0.02 + Math.random() * 0.03 : 0.025 + Math.random() * 0.035), ash: ash, col: ash ? (Math.random() < 0.5 ? '#6c6674' : '#3b3744') : (Math.random() < 0.6 ? '#c77dff' : '#7dff8a') });
  }

  /* ---------- API ---------- */
  function draw(ctx, b, t) {
    const rig = b.rig || (b.rig = makeRig());
    step(rig, t, b);
    const U = b.R * 0.82, dt = rig.dtLast = clamp(t - (rig.t2 == null ? t : rig.t2), 0, 0.05); rig.t2 = t;
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(0.86, 1);      // sosok tinggi-kurus
    if (b.defeated) drawDefeat(ctx, rig, b, U, t, dt);
    else { ctx.scale(U, U); living(ctx, rig, t, b, false); }
    ctx.restore();
  }

  const stat = makeRig();
  function drawFigure(ctx, x, y, R, t, md) {
    const b = { x: x, y: y, R: R, hurt: md === 'hurt' ? 0.3 : 0, attackT: md === 'attack' ? 0.5 : 0, castT: md === 'cast' ? 0.5 : 0, laughT: md === 'laugh' ? 0.5 : 0, wrathT: 0, defeated: false, defeatT: 0, phaseIdx: 0, rig: stat };
    draw(ctx, b, t);
  }

  GA.Wizard = { draw: draw, drawFigure: drawFigure, makeRig: makeRig };
})(window.GA = window.GA || {});
