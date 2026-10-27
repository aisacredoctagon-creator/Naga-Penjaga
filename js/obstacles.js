/* obstacles.js — rintangan yang bisa dikonfigurasi per step.
 *
 * cfg = {
 *   rocks:    [{ a: -60, dist: 100, r: 20 }, ...]    // akar berduri (statis): sudut (derajat, 0=kanan, -90=atas), jarak dari naga
 *   crystals: [{ a: -140, dist: 104, r: 17 }, ...]   // kristal pemantul (peluru memantul sekali)
 *   movers: [
 *     { type:'sweep', offset:-95, range:170, speed:1.3, r:16, kind:'lava' },    // bolak-balik (sumbu panjang layar)
 *     { type:'orbit', radius:92, speed:1.6, count:1, r:14, kind:'bolt' }         // berputar mengelilingi naga
 *   ]
 * }
 * Peluru yang mengenai akar/lava/petir hilang dan satu telur berkurang (diurus main.js). Kristal memantulkan peluru.
 * Kelelawar penyihir (BatSwarm) menukar isi dua bola. Kabut sihir diatur main.js lewat Chain (bola.fog).
 */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;
  const PI2 = Math.PI * 2;

  class ObstacleSet {
    constructor(cfg, shooter, portrait, opts) {
      cfg = cfg || {}; opts = opts || {};
      this.cx = shooter.x; this.cy = shooter.y; this.portrait = !!portrait;
      const clear = opts.clear || function () { return 1e9; };          // jarak titik ke tepi alur
      const dragonR = opts.frogR || 40, K = 1 + ((opts.unit || 1) - 1) * 0.6; // rintangan ikut membesar sedikit
      const cx = this.cx, cy = this.cy;
      // geser mendekati naga sampai tidak menimpa alur
      const bnd = opts.bounds;   // batas layar: rintangan di luar layar (penembak di tepi bawah) dicerminkan ke atas naga
      const place = function (list, extra) {
        return (list || []).map(function (r, i) {
          const rr = (r.r || 20) * K, pts = [];
          for (let k = 0; k < 9; k++) pts.push(0.82 + ((Math.sin(i * 7.7 + k * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.3);
          const lo = Math.max(dragonR + rr + 10, (opts.muzzleR || 0) + rr * 0.95 + (opts.rObs || 12) + 8);   // jangan menimpa lintasan mulut naga: peluru yang keluar tidak boleh langsung menabrak
          const fit = function (a) { let d = Math.max(r.dist * K, lo), best = d, bc = -1e9; for (; d >= lo; d -= 3) { const c = clear(cx + Math.cos(a) * d, cy + Math.sin(a) * d); if (c > bc) { bc = c; best = d; } if (c >= rr + 4) { best = d; break; } } return { x: cx + Math.cos(a) * best, y: cy + Math.sin(a) * best }; };
          const a0 = r.a * Math.PI / 180; let pos = fit(a0);
          if (bnd && (pos.y > bnd.y1 - rr - 6 || pos.y < bnd.y0 + rr + 6)) { const alt = fit(-a0); if (alt.y <= bnd.y1 - rr - 6 && alt.y >= bnd.y0 + rr + 6) pos = alt; }
          return Object.assign({ x: pos.x, y: pos.y, r: rr, pts: pts, rot: i * 1.3, flash: 0 }, extra || {});
        });
      };
      this.rocks = place(cfg.rocks);
      this.crystals = place(cfg.crystals, { crystal: true });
      this.movers = [];
      (cfg.movers || []).forEach(function (m) {
        const mr = (m.r || 15) * K, lo = dragonR + mr + 8;
        if (m.type === 'orbit') {
          let rad = Math.max(m.radius * K, lo);
          for (; rad > lo; rad -= 3) { let ok = true; for (let k = 0; k < 16 && ok; k++) { const a = k * 0.3927; ok = clear(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad) >= mr + 2; } if (ok) break; }
          const n = m.count || 1;
          for (let i = 0; i < n; i++) this.movers.push({ type: 'orbit', kind: m.kind || 'bolt', radius: rad, speed: m.speed, phase: (m.phase || 0) + i * PI2 / n, r: mr, x: 0, y: 0, flash: 0 });
        } else {
          const sgn = (m.offset || 0) < 0 ? -1 : 1;
          let off = Math.max(Math.abs(m.offset || 0) * K, lo), range = m.range || 150;
          const free = function (o, rg) { // seluruh jalur sapuan harus di luar alur
            for (let k = -4; k <= 4; k++) { const s = k / 4 * rg, x = portrait ? cx + sgn * o : cx + s, y = portrait ? cy + s : cy + sgn * o; if (clear(x, y) < mr + 2) return false; }
            return true;
          };
          for (; range >= 70; range -= 10) { let o = off; for (; o >= lo; o -= 4) if (free(o, range)) break; if (o >= lo) { off = o; break; } if (range <= 80) { off = lo; break; } }
          this.movers.push({ type: 'sweep', kind: m.kind || 'lava', offset: sgn * off, range: range, speed: m.speed || 1.2, phase: m.phase || 0, r: mr, x: 0, y: 0, flash: 0 });
        }
      }, this);
      this.on = true;      // pengendali (boss): rintangan bergerak aktif atau tidak
      this.alpha = 1;
      this.t = 0;
      this.update(0);
    }

    setMovers(on) { this.on = !!on; }
    /** Anti-macet: rintangan bergerak menyingkir (memudar) sementara. */
    calm(sec) { this.calmT = sec; }
    get hasMovers() { return this.movers.length > 0; }

    update(dt) {
      this.t += dt;
      if (this.calmT > 0) this.calmT -= dt;
      const target = this.on && !(this.calmT > 0) ? 1 : 0;
      this.alpha += (target - this.alpha) * Math.min(1, dt * 4);
      for (const m of this.movers) {
        if (m.flash > 0) m.flash -= dt;
        if (m.type === 'orbit') {
          const a = m.phase + this.t * m.speed;
          m.x = this.cx + Math.cos(a) * m.radius; m.y = this.cy + Math.sin(a) * m.radius;
        } else {
          const s = Math.sin(m.phase + this.t * m.speed) * m.range;
          if (this.portrait) { m.x = this.cx + m.offset; m.y = this.cy + s; } else { m.x = this.cx + s; m.y = this.cy + m.offset; }
        }
      }
      for (const r of this.rocks) { if (r.flash > 0) r.flash -= dt; if (r.off > 0) r.off -= dt; }
      for (const c of this.crystals) { if (c.flash > 0) c.flash -= dt; if (c.off > 0) c.off -= dt; }
    }

    /** Kembalikan rintangan pelukai (akar, lava, petir) yang bersentuhan dengan lingkaran (x,y,r), atau null. */
    collide(x, y, r) {
      for (const o of this.rocks) { if (o.off > 0) continue; const rr = o.r * 0.92 + r; if ((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < rr * rr) return o; }
      if (this.alpha > 0.5) for (const o of this.movers) { const rr = o.r + r * 0.55; if ((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < rr * rr) return o; }
      return null;
    }

    /** Kristal yang bersentuhan dengan lingkaran (x,y,r), atau null. */
    crystalHit(x, y, r) {
      for (const o of this.crystals) { if (o.off > 0) continue; const rr = o.r * 0.95 + r; if ((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < rr * rr) return o; }
      return null;
    }

    /** Sinar pertama yang mengenai rintangan: { t, o, crystal } atau null. Untuk garis bidik (termasuk pantulan kristal). */
    rayFirst(x, y, dx, dy, m) {
      m = m == null ? 10 : m;   // m = radius tabrakan peluru dengan rintangan (Bullets.rObs), supaya garis bidik persis sama dengan tabrakan
      let best = null;
      const test = function (o, rad, crystal) {
        if (o.off > 0) return;
        const fx = o.x - x, fy = o.y - y, proj = fx * dx + fy * dy;
        if (proj < 0) return;
        const d2 = fx * fx + fy * fy - proj * proj;
        if (d2 > rad * rad) return;
        const t = proj - Math.sqrt(rad * rad - d2);
        if (t > 0 && (!best || t < best.t)) best = { t: t, o: o, crystal: crystal };
      };
      for (const o of this.rocks) test(o, o.r * 0.92 + m, false);
      for (const o of this.crystals) test(o, o.r * 0.95 + m, true);
      if (this.alpha > 0.5) for (const o of this.movers) test(o, o.r + m * 0.55, false);
      return best;
    }

    /** Jarak ke rintangan pertama sepanjang sinar. Infinity jika tidak ada. */
    rayDist(x, y, dx, dy, m) { const h = this.rayFirst(x, y, dx, dy, m); return h ? h.t : Infinity; }

    hitFlash(o) { o.flash = 0.3; }

    /** Posisi rintangan bergerak `ahead` detik dari sekarang (gerakannya deterministik). */
    moverAt(m, ahead, out) {
      const t = this.t + ahead;
      if (m.type === 'orbit') { const a = m.phase + t * m.speed; out.x = this.cx + Math.cos(a) * m.radius; out.y = this.cy + Math.sin(a) * m.radius; }
      else { const s = Math.sin(m.phase + t * m.speed) * m.range; if (this.portrait) { out.x = this.cx + m.offset; out.y = this.cy + s; } else { out.x = this.cx + s; out.y = this.cy + m.offset; } }
      return out;
    }

    /** Ray test prediktif: akankah peluru (kecepatan `speed`) dari (x0,y0) ke (x1,y1) menabrak rintangan bergerak di tengah jalan? Mengembalikan rintangan itu atau null.
     *  `m` = jari-jari tabrakan peluru. Dipakai uji otomatis (dan bisa dipakai pemilih soal). */
    predictedHit(x0, y0, x1, y1, speed, m) {
      if (this.alpha <= 0.5 || !this.movers.length) return null;
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, n = Math.max(1, Math.ceil(L / 20)), p = { x: 0, y: 0 };
      for (let k = 1; k <= n; k++) {
        const s = k / n, x = x0 + dx * s, y = y0 + dy * s, tau = L * s / speed;
        for (const o of this.movers) { this.moverAt(o, tau, p); const rr = o.r + m; if ((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < rr * rr) return o; }
      }
      return null;
    }

    /** Rintangan statis menyurut sementara (anti-macet): tidak menghalangi tembakan; 1 detik terakhir berkedip sebagai peringatan sebelum tumbuh lagi. */
    wilt(o, sec) { o.off = sec; }
    isStatic(o) { return this.rocks.indexOf(o) >= 0 || this.crystals.indexOf(o) >= 0; }

    draw(ctx, t) {
      // jalur orbit (petunjuk visual)
      for (const m of this.movers) {
        if (m.type === 'orbit' && this.alpha > 0.05) {
          ctx.globalAlpha = 0.18 * this.alpha; ctx.strokeStyle = '#ffd94a'; ctx.lineWidth = 3; ctx.setLineDash([6, 10]);
          ctx.beginPath(); ctx.arc(this.cx, this.cy, m.radius, 0, PI2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
          break;
        }
      }
      const ghost = function (o) { return o.off > 0 ? (o.off < 1 ? 0.35 + 0.3 * Math.sin(t * 16) : 0.14) : 1; };
      for (const o of this.rocks) { const a = ghost(o); ctx.globalAlpha = a; drawThorn(ctx, o, t); }
      for (const c of this.crystals) { const a = ghost(c); ctx.globalAlpha = a; drawCrystal(ctx, c, t); }
      ctx.globalAlpha = 1;
      if (this.alpha < 0.03) return;
      ctx.globalAlpha = this.alpha;
      for (const m of this.movers) {
        const sc = 0.6 + 0.4 * this.alpha, r = m.r * sc;
        if (m.kind === 'bolt') drawBolt(ctx, m, r, t); else drawLava(ctx, m, r, t);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- gambar rintangan ---------- */
  function drawThorn(ctx, o, t) {
    const img = Theme.sprite('rock');
    if (img) { ctx.drawImage(img, o.x - o.r * 1.15, o.y - o.r * 1.15, o.r * 2.3, o.r * 2.3); return; }
    const r = o.r;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + r * 0.6, r * 1.1, r * 0.55, 0, 0, PI2); ctx.fill();
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot + Math.sin(t * 1.3 + o.rot) * 0.03);
    const n = 9;
    // duri
    for (let i = 0; i < n; i++) {
      const a = i / n * PI2, len = r * (1.25 + o.pts[i % o.pts.length] * 0.55), w = 0.2;
      ctx.fillStyle = i % 2 ? '#3a2312' : '#4e3018';
      ctx.beginPath(); ctx.moveTo(Math.cos(a - w) * r * 0.7, Math.sin(a - w) * r * 0.7); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.lineTo(Math.cos(a + w) * r * 0.7, Math.sin(a + w) * r * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9c28a'; ctx.beginPath(); ctx.arc(Math.cos(a) * len, Math.sin(a) * len, r * 0.06, 0, PI2); ctx.fill();
    }
    // gumpalan akar
    ctx.beginPath();
    for (let i = 0; i < 14; i++) { const a = i / 14 * PI2, rr = r * (0.78 + o.pts[i % o.pts.length] * 0.2); const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 2, 0, 0, r * 1.1); g.addColorStop(0, '#8a5a30'); g.addColorStop(0.6, '#5a3a1e'); g.addColorStop(1, '#2a180a');
    ctx.fillStyle = g; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#1e1008'; ctx.stroke();
    ctx.strokeStyle = 'rgba(20,10,4,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.3 + i * 0.22), i * 1.1, i * 1.1 + 2.2); ctx.stroke(); }
    ctx.fillStyle = 'rgba(100,200,90,0.85)'; ctx.beginPath(); ctx.ellipse(r * 0.2, -r * 0.45, r * 0.3, r * 0.13, 0.5, 0, PI2); ctx.fill();
    ctx.restore();
    if (o.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (o.flash / 0.3).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, PI2); ctx.fill(); }
  }

  function drawCrystal(ctx, o, t) {
    const r = o.r, pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + o.rot);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + r * 0.9, r * 0.9, r * 0.4, 0, 0, PI2); ctx.fill();
    const gl = ctx.createRadialGradient(o.x, o.y, r * 0.3, o.x, o.y, r * 2); gl.addColorStop(0, 'rgba(120,230,255,' + (0.35 + 0.2 * pulse).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(120,230,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(o.x, o.y, r * 2, 0, PI2); ctx.fill();
    ctx.save(); ctx.translate(o.x, o.y);
    const top = [0, -r * 1.25], rt = [r * 0.85, -r * 0.2], rb = [r * 0.55, r * 1.0], bt = [0, r * 1.25], lb = [-r * 0.55, r * 1.0], lt = [-r * 0.85, -r * 0.2];
    const poly = function (pts, fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    poly([top, rt, rb, bt, lb, lt], '#7fe3ff');
    poly([top, rt, [0, 0]], '#d9f8ff'); poly([rt, rb, [0, 0]], '#4cc3ee'); poly([rb, bt, lb, [0, 0]], '#2a8fd0'); poly([lb, lt, [0, 0]], '#6fd2f5'); poly([lt, top, [0, 0]], '#b4efff');
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.5; ctx.strokeStyle = '#1b5f8c'; ctx.beginPath(); ctx.moveTo(top[0], top[1]); [rt, rb, bt, lb, lt].forEach(function (p) { ctx.lineTo(p[0], p[1]); }); ctx.closePath(); ctx.stroke();
    ctx.restore();
    if (o.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (o.flash / 0.3).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(o.x, o.y, r * 1.1, 0, PI2); ctx.fill(); }
  }

  function drawLava(ctx, m, r, t) {
    const img = Theme.sprite('mover');
    if (img) { ctx.drawImage(img, m.x - r * 1.3, m.y - r * 1.3, r * 2.6, r * 2.6); return; }
    const gl = ctx.createRadialGradient(m.x, m.y, r * 0.3, m.x, m.y, r * 2.3); gl.addColorStop(0, 'rgba(255,140,40,0.55)'); gl.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(m.x, m.y, r * 2.3, 0, PI2); ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI2, rr = r * (1 + 0.14 * Math.sin(t * 5 + i * 1.9)); const px = m.x + Math.cos(a) * rr, py = m.y + Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.closePath();
    const g = ctx.createRadialGradient(m.x - r * 0.25, m.y - r * 0.3, 1, m.x, m.y, r * 1.05); g.addColorStop(0, '#fff6b0'); g.addColorStop(0.35, '#ffb02e'); g.addColorStop(0.8, '#e2411a'); g.addColorStop(1, '#8a1d0c');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#4a0f06'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(40,10,5,0.75)'; ctx.beginPath(); ctx.arc(m.x - r * 0.3, m.y - r * 0.05, r * 0.14, 0, PI2); ctx.arc(m.x + r * 0.3, m.y - r * 0.05, r * 0.14, 0, PI2); ctx.fill();
    ctx.beginPath(); ctx.arc(m.x, m.y + r * 0.25, r * 0.22, 0.15, Math.PI - 0.15); ctx.strokeStyle = 'rgba(40,10,5,0.75)'; ctx.lineWidth = 2.5; ctx.stroke();
    if (m.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (m.flash / 0.3).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, PI2); ctx.fill(); }
  }

  function drawBolt(ctx, m, r, t) {
    const gl = ctx.createRadialGradient(m.x, m.y, r * 0.2, m.x, m.y, r * 2.4); gl.addColorStop(0, 'rgba(255,240,120,0.6)'); gl.addColorStop(1, 'rgba(120,120,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(m.x, m.y, r * 2.4, 0, PI2); ctx.fill();
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(t * 2.6);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * PI2, j = 0.35 * Math.sin(t * 18 + i * 2);
      ctx.strokeStyle = '#6a8cff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); ctx.lineTo(Math.cos(a + j) * r * 1.2, Math.sin(a + j) * r * 1.2); ctx.lineTo(Math.cos(a - j) * r * 1.6, Math.sin(a - j) * r * 1.6); ctx.stroke();
      ctx.strokeStyle = '#fff6a8'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    const g = ctx.createRadialGradient(m.x - r * 0.2, m.y - r * 0.2, 1, m.x, m.y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#ffe45a'); g.addColorStop(1, '#e08a10');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, r * 0.85, 0, PI2); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#5b3b00'; ctx.stroke();
    if (m.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (m.flash / 0.3).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, PI2); ctx.fill(); }
  }

  /* ---------- kelelawar penyihir: terbang melintas, lalu menukar isi dua bola ---------- */
  class BatSwarm {
    /** cfg = { every: detik antar serangan }. Kelelawar muncul tiap `every` detik (dengan sedikit variasi). */
    constructor(cfg) { this.every = cfg.every || 15; this.timer = this.every * 0.6; this.bat = null; }
    /** Jadwalkan kelelawar berikutnya sekarang (dipakai mantra boss). */
    summon() { this.timer = 0; }
    update(dt, env) {
      // env: { chain, W, H, onSwap(a,b), active }
      if (!env.active) { this.bat = null; return; }
      if (!this.bat) {
        this.timer -= dt;
        if (this.timer <= 0) {
          const vis = env.chain.balls.filter(function (b) { return b.kind === 'num' && env.chain.visible(b); });
          if (vis.length >= 3) {
            const a = vis[Math.floor(Math.random() * vis.length)];
            let b = a; for (let k = 0; k < 6 && (b === a || b.text === a.text); k++) b = vis[Math.floor(Math.random() * vis.length)];
            if (b !== a && b.text !== a.text) {
              const fromLeft = a.x > env.W / 2;
              this.bat = { a: a, b: b, t: 0, dur: 2.4, swapped: false, x: 0, y: 0, sx: fromLeft ? env.W + 60 : -60, sy: Math.max(60, a.y - 140) };
              this.timer = this.every * (0.8 + Math.random() * 0.5);
            } else this.timer = 1;
          } else this.timer = 1;
        }
        return;
      }
      const bt = this.bat; bt.t += dt;
      const k = bt.t / bt.dur;
      // terbang dari tepi → bola a (titik 0,5) → tepi seberang
      const ex = env.W - bt.sx, ey = bt.sy - 40;
      const ax = bt.a.x, ay = bt.a.y - 24;
      if (k < 0.5) { const u = k / 0.5, e = u * u * (3 - 2 * u); bt.x = bt.sx + (ax - bt.sx) * e; bt.y = bt.sy + (ay - bt.sy) * e + Math.sin(u * 9) * 10; }
      else { const u = (k - 0.5) / 0.5, e = u * u * (3 - 2 * u); bt.x = ax + (ex - ax) * e; bt.y = ay + (ey - ay) * e + Math.sin(u * 9) * 10; }
      if (k >= 0.5 && !bt.swapped) {
        bt.swapped = true;
        if (env.chain.balls.indexOf(bt.a) >= 0 && env.chain.balls.indexOf(bt.b) >= 0) env.onSwap(bt.a, bt.b);
      }
      if (k >= 1) this.bat = null;
    }
    draw(ctx, t) {
      const b = this.bat; if (!b) return;
      const flap = Math.sin(t * 22) * 0.6, s = 20;
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.fillStyle = '#2a1650'; ctx.strokeStyle = '#120a28'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      for (let sd = -1; sd <= 1; sd += 2) {
        ctx.beginPath(); ctx.moveTo(sd * 4, 0);
        ctx.quadraticCurveTo(sd * s * 0.8, -s * (0.9 + flap), sd * s * 1.5, -s * (0.1 + flap * 0.4));
        ctx.quadraticCurveTo(sd * s * 1.1, s * 0.15, sd * s * 0.75, s * 0.05); ctx.quadraticCurveTo(sd * s * 0.5, s * 0.5, sd * 4, s * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.32, s * 0.45, 0, 0, PI2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.26, -s * 0.2); ctx.lineTo(-s * 0.2, -s * 0.55); ctx.lineTo(-s * 0.04, -s * 0.28); ctx.moveTo(s * 0.26, -s * 0.2); ctx.lineTo(s * 0.2, -s * 0.55); ctx.lineTo(s * 0.04, -s * 0.28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff5ad2'; ctx.beginPath(); ctx.arc(-s * 0.12, -s * 0.02, s * 0.07, 0, PI2); ctx.arc(s * 0.12, -s * 0.02, s * 0.07, 0, PI2); ctx.fill();
      ctx.restore();
      // garis sihir ke dua bola yang akan tertukar (sebelum menukar)
      if (!b.swapped) {
        ctx.strokeStyle = 'rgba(200,150,255,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([5, 7]);
        ctx.beginPath(); ctx.moveTo(b.a.x, b.a.y); ctx.lineTo(b.b.x, b.b.y); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  }

  GA.Obstacles = {
    create: function (cfg, shooter, portrait, opts) { return new ObstacleSet(cfg, shooter, portrait, opts); },
    ObstacleSet: ObstacleSet, BatSwarm: BatSwarm
  };
})(window.GA = window.GA || {});
