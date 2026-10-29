/* hazards.js — RINTANGAN per zona di sekitar naga penembak (tahap f). Setiap rintangan bersifat SEMENTARA dan diberi PERINGATAN ±1 detik.
 *
 * Mekanik (satu jenis perilaku, banyak tampilan):
 *   slow     memperlambat peluru, tidak memblokir           thorn (semak berduri tipis)
 *   deflect  membelokkan peluru yang melintas               wave (arus/ombak)
 *   reflect  memantulkan peluru satu kali                   lily (teratai/batu licin), crystal (kristal pemantul)
 *   strike   menghancurkan peluru saat AKTIF (telur hilang) geyser (lahar), hotrock (batu panas jatuh), stalactite, rune (petir rune, lajur)
 *   veil     menyamarkan angka bola di area                 spore (jamur spora)
 *   blind    menutup garis bidik sementara (asap kutukan)   hands (tangan bayangan)
 * Siklus: peringatan (warn, ≥ 1 dtk, lingkaran berdenyut + tanda seru) → aktif (on) → memudar (fade) → hilang.
 *
 * Aturan keadilan (dijaga di sini, diuji otomatis di ?test=1):
 *   - jumlah busur bidik yang tertutup rintangan (pemblokir) sekaligus ≤ 30% dari 360°;
 *   - rintangan tidak muncul di alur, di lintasan mulut naga, atau menimpa rintangan lain;
 *   - sebelum muncul, diuji bahwa masih ada bola target terlihat yang punya garis tembak terbuka (ctx.targetsOpen);
 *   - tidak ada yang permanen: semua punya umur.
 * Jumlah jenis bertambah kumulatif per stage (data di levels.js); jumlah serentak dibatasi `maxTotal` (Gameplay.HAZ_MAX). Kecepatan muncul mengikuti kesulitan. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2, rr = function (a, b) { return a + Math.random() * (b - a); };

  /** Definisi jenis. r = radius (px logis, dikali skala bola), warn = detik peringatan, on = detik aktif (persisten: umur), base = jeda muncul dasar (dtk). */
  const KINDS = {
    thorn:      { mech: 'slow',    r: [24, 30], warn: 1.0, on: [10, 14], base: 15, max: 2, blocks: true },
    wave:       { mech: 'deflect', r: [48, 58], warn: 1.0, on: [7, 10],  base: 18, max: 1, blocks: false },
    lily:       { mech: 'reflect', r: [20, 24], warn: 1.0, on: [9, 13],  base: 20, max: 1, blocks: true },
    crystal:    { mech: 'reflect', r: [19, 23], warn: 1.0, on: [9, 13],  base: 22, max: 1, blocks: true },
    geyser:     { mech: 'strike',  r: [26, 32], warn: 1.0, on: [1.4, 1.8], base: 9,  max: 1, blocks: true },
    hotrock:    { mech: 'strike',  r: [28, 34], warn: 1.2, on: [0.6, 0.8], base: 12, max: 1, blocks: true },
    stalactite: { mech: 'strike',  r: [22, 28], warn: 1.0, on: [0.6, 0.8], base: 12, max: 1, blocks: true },
    rune:       { mech: 'strike',  r: [18, 22], warn: 1.0, on: [0.5, 0.6], base: 13, max: 1, blocks: true, lane: true },
    spore:      { mech: 'veil',    r: [60, 76], warn: 1.0, on: [3.0, 4.0], base: 15, max: 1, blocks: false },
    hands:      { mech: 'blind',   r: [40, 46], warn: 1.0, on: [2.2, 3.0], base: 18, max: 1, blocks: false }
  };
  const FADE = 0.5;

  /** Gaya tampilan menurut zona (dari Theme.scene): hijau (hutan/rawa), arang (api), es, rune. */
  const SKIN = {
    twig:  { thorn: ['#3a6a2a', '#6a4a22', '#a8d060'], lily: ['#7ac860', '#2f7a3a'], crystal: ['#bfe8ff', '#4a90d0'], hot: '255,150,50' },
    ash:   { thorn: ['#3a2a24', '#6a3a22', '#ff8a3a'], lily: ['#7a6a60', '#3a2e2a'], crystal: ['#ffd8b0', '#d05a20'], hot: '255,120,30' },
    frost: { thorn: ['#6a8aa8', '#c0dcf0', '#ffffff'], lily: ['#c8e8ff', '#5a90c8'], crystal: ['#e0f4ff', '#5aa0e0'], hot: '160,210,255' },
    rune:  { thorn: ['#3a2a58', '#6a4a98', '#d0a8ff'], lily: ['#a890e0', '#4a3a88'], crystal: ['#e8d0ff', '#9a60e8'], hot: '190,140,255' }
  };

  class HazardSet {
    /** cfg = [{ kind, every }] ; c = { R, W, H, play, shooter, muzzleR, rObs(), clear(x,y), targetsOpen(), randomBall(), fog(x,y,r,dur), warn(e), style } */
    constructor(cfg, c) {
      this.c = c; this.list = []; this.on = true; this.t = 0; this.nid = 1; this.blind = 0; this.calmT = 0;
      this.timers = {}; this.cfg = {};
      (cfg || []).forEach(function (h) { this.cfg[h.kind] = h; this.timers[h.kind] = rr(0.45, 0.9) * h.every; }, this);
      this.stats = { spawned: 0, rejected: 0, minWarn: 9, maxCover: 0, byKind: {} };
    }

    setOn(v) { this.on = !!v; }
    clearAll() { this.list.length = 0; this.blind = 0; }

    phase(e) { return e.t < e.warn ? 'warn' : (e.t < e.warn + e.dur ? 'on' : 'fade'); }
    isOn(e) { return e.t >= e.warn && e.t < e.warn + e.dur; }

    /** Posisi rintangan (semua diam di tempat). */
    pos(e, out) {
      out.x = e.x; out.y = e.y;
      return out;
    }

    /** Busur (radian) yang ditutup rintangan pemblokir dari penembak. */
    coverage(extra) {
      const c = this.c, s = c.shooter, rO = c.rObs();
      let sum = 0;
      const add = function (e) { const d = Math.max(1, Math.hypot(e.x - s.x, e.y - s.y)); sum += 2 * Math.asin(Math.min(1, (e.r + rO) / d)); };
      this.list.forEach(function (e) { if (KINDS[e.kind].blocks) add(e); });
      if (extra) add(extra);
      return sum;
    }

    /** Coba munculkan satu rintangan; diuji aturan keadilan. true = berhasil. */
    spawn(kind) {
      const c = this.c, K = KINDS[kind], R = c.R, rad = rr(K.r[0], K.r[1]) * (0.75 + 0.25 * R / 25), s = c.shooter, rO = c.rObs(), bd = c.bounds;
      const e = { id: this.nid++, kind: kind, mech: K.mech, r: rad, x: 0, y: 0, t: 0, warn: K.warn, dur: rr(K.on[0], K.on[1]), dir: Math.random() < 0.5 ? -1 : 1, rot: Math.random() * TAU, lane: !!K.lane, fired: false, bounced: 0 };
      if (K.mech === 'veil') {
        const b = c.randomBall(); if (!b) return false; e.x = b.x; e.y = b.y;
      } else {
        let ok = false;
        for (let k = 0; k < 14 && !ok; k++) {
          const a = Math.random() * TAU, d = c.muzzleR + rad + rO + 12 + Math.random() * R * 4.2;
          let x = s.x + Math.cos(a) * d, y = s.y + Math.sin(a) * d;
          if (K.lane) { y = s.y - rr(c.muzzleR + 40, c.muzzleR + R * 4); x = s.x + rr(-R * 5, R * 5); }
          if (x < bd.x0 + rad + 6 || x > bd.x1 - rad - 6 || y < bd.y0 + rad + 6 || y > bd.y1 - rad - 6) continue;
          if (K.mech !== 'blind' && c.clear(x, y) < rad + 6) continue;
          let clash = false; for (const o of this.list) if (Math.hypot(o.x - x, o.y - y) < o.r + rad + 12) { clash = true; break; }
          if (clash) continue;
          e.x = x; e.y = y; ok = true;
        }
        if (!ok) return false;
      }
      // aturan keadilan: busur tertutup ≤ 30%, dan masih ada target terjangkau
      if (K.blocks) {
        if (this.coverage(e) > 0.3 * TAU) { this.stats.rejected++; return false; }
        this.list.push(e);
        if (!c.targetsOpen()) { this.list.pop(); this.stats.rejected++; return false; }
        this.list.pop();
      }
      this.list.push(e); this.stats.spawned++; this.stats.byKind[kind] = (this.stats.byKind[kind] || 0) + 1; this.stats.minWarn = Math.min(this.stats.minWarn, e.warn);
      if (c.warn) c.warn(e);
      return true;
    }

    update(dt) {
      this.t += dt; if (this.calmT > 0) this.calmT -= dt;
      for (let i = this.list.length - 1; i >= 0; i--) {
        const e = this.list[i]; e.t += dt;
        if (this.isOn(e) && !e.fired) {
          e.fired = true;
          if (this.c.activate) this.c.activate(e);
          if (e.mech === 'veil') this.c.fog(e.x, e.y, e.r, e.dur);
        }
        if (e.t >= e.warn + e.dur + FADE) this.list.splice(i, 1);
      }
      this.blind = this.list.some(function (e) { return e.mech === 'blind' && this.isOn(e); }, this) ? Math.min(1, this.blind + dt * 4) : Math.max(0, this.blind - dt * 4);
      if (!this.on || this.calmT > 0) return;
      for (const k in this.cfg) {
        this.timers[k] -= dt;
        if (this.timers[k] > 0) continue;
        const n = this.list.filter(function (e) { return e.kind === k; }).length;
        if (n < KINDS[k].max && this.list.length < (this.c.maxTotal || 99) && this.spawn(k)) this.timers[k] = this.cfg[k].every * rr(0.8, 1.2); else this.timers[k] = 1.2;
        this.stats.maxCover = Math.max(this.stats.maxCover, this.coverage() / TAU);
      }
    }

    /** Hapus semua rintangan pemblokir sesaat (anti-macet). */
    calm(sec) { this.calmT = sec || 3; this.list = this.list.filter(function (e) { return !KINDS[e.kind].blocks; }); }

    /** Efek pada peluru b (dipanggil tiap langkah kecil). Hasil: null | 'kill' | 'bounce'. */
    bullet(b, dt) {
      const rO = this.c.rObs(), p = { x: 0, y: 0 };
      for (let i = 0; i < this.list.length; i++) {
        const e = this.list[i], K = KINDS[e.kind];
        if (e.mech === 'veil' || e.mech === 'blind') continue;
        if (e.mech === 'strike' && !this.isOn(e)) continue;
        if (e.mech !== 'strike' && this.phase(e) !== 'on') continue;
        this.pos(e, p);
        let hit;
        if (e.lane) hit = Math.abs(b.x - p.x) < e.r + rO && b.y > this.c.play.y && b.y < this.c.shooter.y - this.c.muzzleR;
        else { const dx = b.x - p.x, dy = b.y - p.y, q = e.r + rO * 0.55; hit = dx * dx + dy * dy < q * q; }
        if (!hit) continue;
        if (e.mech === 'strike') { e.hit = 0.3; return 'kill'; }
        if (e.mech === 'slow') { b.hz = b.hz || {}; if (!b.hz[e.id]) { b.hz[e.id] = 1; b.vx *= 0.55; b.vy *= 0.55; e.hit = 0.25; } }
        else if (e.mech === 'deflect') { const a = e.dir * 2.8 * dt, ca = Math.cos(a), sa = Math.sin(a), vx = b.vx * ca - b.vy * sa, vy = b.vx * sa + b.vy * ca; b.vx = vx; b.vy = vy; }
        else if (e.mech === 'reflect') {
          e.hit = 0.25;
          if (b.bounces >= 1) return 'absorb';
          let nx = b.x - p.x, ny = b.y - p.y; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
          const away = e.r * 0.95 + rO + 2; b.x = p.x + nx * away; b.y = p.y + ny * away; b.bounces++;
          return 'bounce';
        }
      }
      return null;
    }

    /** Apakah garis (x0,y0)→(x1,y1) terhalang rintangan pemblokir yang SEDANG aktif atau hampir aktif (peringatan)? Mengembalikan rintangan atau null. */
    blocksLine(x0, y0, x1, y1, ahead) {
      const rO = this.c.rObs(), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, p = { x: 0, y: 0 };
      for (let i = 0; i < this.list.length; i++) {
        const e = this.list[i]; if (!KINDS[e.kind].blocks) continue;
        const te = e.t + (ahead || 0); if (te > e.warn + e.dur) continue;                 // sudah selesai pada saat peluru tiba
        if (e.lane) { if ((x0 - e.x) * (x1 - e.x) < 0 || Math.abs(x1 - e.x) < e.r + rO || Math.abs(x0 - e.x) < e.r + rO) return e; continue; }
        p.x = e.x; p.y = e.y;
        const fx = p.x - x0, fy = p.y - y0, proj = fx * ux + fy * uy; if (proj < 0 || proj > L) continue;
        const d2 = fx * fx + fy * fy - proj * proj, q = e.r + rO * 0.55; if (d2 < q * q) return e;
      }
      return null;
    }

    /** Hapus satu rintangan (anti-macet). */
    remove(e) { const i = this.list.indexOf(e); if (i >= 0) this.list.splice(i, 1); }

    /* ---------------- gambar ---------------- */
    warnRing(ctx, e, t, col) {
      const u = Math.min(1, e.t / e.warn), pulse = 0.5 + 0.5 * Math.sin(t * 14);
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 30; ctx.globalAlpha = 0.45 + 0.4 * pulse;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1.15 - 0.15 * u), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 0.55 + 0.4 * pulse; ctx.fillStyle = col; const s = e.r * 0.4;               // tanda seru (segitiga peringatan)
      ctx.beginPath(); ctx.moveTo(e.x, e.y - s); ctx.lineTo(e.x + s * 0.95, e.y + s * 0.7); ctx.lineTo(e.x - s * 0.95, e.y + s * 0.7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a0a0a'; ctx.fillRect(e.x - s * 0.08, e.y - s * 0.4, s * 0.16, s * 0.55); ctx.beginPath(); ctx.arc(e.x, e.y + s * 0.45, s * 0.1, 0, TAU); ctx.fill();
      ctx.restore();
    }

    draw(ctx, t) {
      const sk = SKIN[this.c.style] || SKIN.twig, p = { x: 0, y: 0 };
      for (let i = 0; i < this.list.length; i++) {
        const e = this.list[i], ph = this.phase(e), fade = ph === 'fade' ? 1 - (e.t - e.warn - e.dur) / FADE : 1, hot = sk.hot, warnCol = 'rgba(255,200,70,0.95)';
        ctx.save(); ctx.globalAlpha = fade;
        if (e.lane) {
          const x = e.x, y0 = this.c.play.y, y1 = this.c.shooter.y - this.c.muzzleR;
          if (ph === 'warn') { ctx.strokeStyle = 'rgba(200,150,255,' + (0.45 + 0.4 * Math.sin(t * 14)).toFixed(2) + ')'; ctx.lineWidth = e.r * 1.2; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 40; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.setLineDash([]); this.warnRing(ctx, { x: x, y: (y0 + y1) / 2, r: e.r * 1.6, t: e.t, warn: e.warn }, t, warnCol); }
          else { ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; const jag = function (w, a, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.globalAlpha = a * fade; ctx.beginPath(); ctx.moveTo(x, y0); for (let yy = y0, k = 0; yy < y1; yy += 22, k++) ctx.lineTo(x + Math.sin(k * 3.1 + t * 90) * 11, yy); ctx.lineTo(x, y1); ctx.stroke(); }; jag(e.r * 1.4, 0.35, 'rgba(160,110,255,1)'); jag(e.r * 0.5, 0.95, '#ffffff'); }
          ctx.restore(); continue;
        }
        this.pos(e, p);
        const x = p.x, y = p.y, r = e.r;
        if (ph === 'warn') {
          this.warnRing(ctx, e, t, e.mech === 'veil' ? 'rgba(190,230,150,0.9)' : warnCol);
          if (e.mech === 'strike') { const u = e.t / e.warn; ctx.fillStyle = 'rgba(' + hot + ',' + (0.12 + 0.18 * u).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(e.x, e.y, r * (0.5 + 0.5 * u), 0, TAU); ctx.fill(); }
          if (e.mech === 'slow' || e.mech === 'reflect') { ctx.globalAlpha = 0.35 * fade * (e.t / e.warn); this.drawBody(ctx, e, x, y, r, t, sk); }
          ctx.restore(); continue;
        }
        this.drawBody(ctx, e, x, y, r, t, sk);
        ctx.restore();
      }
    }

    drawBody(ctx, e, x, y, r, t, sk) {
      const hit = e.hit > 0 ? (e.hit -= 0.016, 1) : 0, hot = sk.hot;
      switch (e.kind) {
        case 'thorn': {
          const c = sk.thorn; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.5, r * 1.1, r * 0.5, 0, 0, TAU); ctx.fill();
          ctx.save(); ctx.translate(x, y); ctx.rotate(e.rot + Math.sin(t * 1.3) * 0.03);
          for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, l = r * (1.15 + 0.3 * ((i * 37) % 10) / 10); ctx.fillStyle = i % 2 ? c[1] : c[0]; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.17) * r * 0.6, Math.sin(a - 0.17) * r * 0.6); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.lineTo(Math.cos(a + 0.17) * r * 0.6, Math.sin(a + 0.17) * r * 0.6); ctx.closePath(); ctx.fill(); }
          const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, 2, 0, 0, r * 0.85); g.addColorStop(0, c[2]); g.addColorStop(0.5, c[1]); g.addColorStop(1, '#1a1008'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, TAU); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(15,8,4,0.8)'; ctx.stroke();
          ctx.strokeStyle = 'rgba(20,10,4,0.5)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.25 + i * 0.2), i * 1.2, i * 1.2 + 2.2); ctx.stroke(); }
          ctx.restore(); break;
        }
        case 'lily': case 'crystal': {
          const c = sk[e.kind];
          if (e.kind === 'lily') {
            ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.35, r * 1.05, r * 0.6, 0, 0, TAU); ctx.fill();
            const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); ctx.fillStyle = g; ctx.strokeStyle = 'rgba(10,40,20,0.8)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, e.rot + 0.25, e.rot + TAU - 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
          } else {
            const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); ctx.fillStyle = g; ctx.strokeStyle = 'rgba(20,40,90,0.8)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x, y - r * 1.25); ctx.lineTo(x + r * 0.85, y - r * 0.2); ctx.lineTo(x + r * 0.55, y + r); ctx.lineTo(x - r * 0.55, y + r); ctx.lineTo(x - r * 0.85, y - r * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
          }
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.4 * hit).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 0.78, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
          if (hit) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
          break;
        }
        case 'wave': {
          ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, 'rgba(150,225,255,0.28)'); g.addColorStop(1, 'rgba(150,225,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(200,245,255,0.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          for (let k = 0; k < 3; k++) { const a = ((t * 0.7 + k / 3) % 1) * TAU * e.dir; ctx.beginPath(); ctx.arc(x, y, r * (0.45 + 0.17 * k), a, a + 1.5 * e.dir, e.dir < 0); ctx.stroke(); const ex = x + Math.cos(a + 1.5 * e.dir) * r * (0.45 + 0.17 * k), ey = y + Math.sin(a + 1.5 * e.dir) * r * (0.45 + 0.17 * k), ta = a + 1.5 * e.dir + e.dir * Math.PI / 2; ctx.beginPath(); ctx.moveTo(ex + Math.cos(ta - 2.5) * 7, ey + Math.sin(ta - 2.5) * 7); ctx.lineTo(ex, ey); ctx.lineTo(ex + Math.cos(ta + 2.5) * 7, ey + Math.sin(ta + 2.5) * 7); ctx.stroke(); }
          ctx.globalCompositeOperation = 'source-over'; break;
        }
        case 'geyser': {
          const u = Math.max(0, Math.min(1, (e.t - e.warn) / 0.25)), h = r * 2.6 * u * (0.85 + 0.15 * Math.sin(t * 30));
          ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8); g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(0.4, 'rgba(' + hot + ',0.6)'); g.addColorStop(1, 'rgba(' + hot + ',0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(' + hot + ',0.85)'; ctx.beginPath(); ctx.moveTo(x - r * 0.7, y); ctx.quadraticCurveTo(x - r * 0.9, y - h * 0.6, x, y - h); ctx.quadraticCurveTo(x + r * 0.9, y - h * 0.6, x + r * 0.7, y); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,250,210,0.95)'; ctx.beginPath(); ctx.moveTo(x - r * 0.35, y); ctx.quadraticCurveTo(x - r * 0.4, y - h * 0.5, x, y - h * 0.8); ctx.quadraticCurveTo(x + r * 0.4, y - h * 0.5, x + r * 0.35, y); ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
        }
        case 'hotrock': case 'stalactite': {
          const u = Math.max(0, Math.min(1, (e.t - e.warn) / 0.12)), ice = e.kind === 'stalactite';
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x + 3, y + r * 0.6, r * 1.1, r * 0.5, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(' + hot + ',' + (0.8 * (1 - u)).toFixed(2) + ')'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r * (1 + u * 0.9), 0, TAU); ctx.stroke();      // gelombang kejut
          const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); g.addColorStop(0, ice ? '#ffffff' : '#ffd08a'); g.addColorStop(0.5, ice ? '#9ad0f0' : '#7a3a22'); g.addColorStop(1, ice ? '#3a70a8' : '#241008'); ctx.fillStyle = g; ctx.strokeStyle = 'rgba(10,6,4,0.85)'; ctx.lineWidth = 2;
          ctx.beginPath(); if (ice) { ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x + r * 0.7, y + r * 0.6); ctx.lineTo(x - r * 0.7, y + r * 0.6); ctx.closePath(); } else { for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, rr2 = r * (0.8 + 0.25 * ((i * 53) % 10) / 10); if (i) ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); else ctx.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } ctx.closePath(); }
          ctx.fill(); ctx.stroke(); break;
        }
        case 'spore': {
          const pf = HazardSet.puff(); for (let i = 0; i < 6; i++) { const a = t * 0.6 + i * 1.05, d = r * 0.35 * (1 + 0.2 * Math.sin(t * 2 + i)), s = r * (0.9 + 0.2 * Math.sin(t + i)); ctx.globalAlpha *= 0.55; ctx.drawImage(pf, x + Math.cos(a) * d - s / 2, y + Math.sin(a) * d - s / 2, s, s); ctx.globalAlpha /= 0.55; }
          ctx.fillStyle = 'rgba(230,255,170,0.8)'; for (let i = 0; i < 12; i++) { const a = i * 2.4 + t, d = r * (0.2 + 0.6 * ((i * 17) % 10) / 10); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a * 1.3) * d, 2, 0, TAU); ctx.fill(); }
          break;
        }
        case 'hands': break;        // digambar di drawOver (di atas garis bidik)
      }
    }

    /** Asap kutukan & tangan bayangan yang menutup sebagian garis bidik (di atas semuanya, tepat di sekitar naga). */
    drawOver(ctx, t, aim) {
      for (let i = 0; i < this.list.length; i++) {
        const e = this.list[i]; if (e.kind !== 'hands') continue;
        const ph = this.phase(e), s = this.c.shooter;
        if (ph === 'warn') { this.warnRing(ctx, { x: s.x + Math.cos(aim) * (this.c.muzzleR + 70), y: s.y + Math.sin(aim) * (this.c.muzzleR + 70), r: e.r, t: e.t, warn: e.warn }, t, 'rgba(190,130,255,0.95)'); continue; }
        const a = ph === 'fade' ? 1 - (e.t - e.warn - e.dur) / FADE : Math.min(1, (e.t - e.warn) * 4), pf = HazardSet.puff();
        ctx.save(); ctx.globalAlpha = 0.8 * a;
        for (let k = 0; k < 7; k++) { const d = this.c.muzzleR + 46 + k * 26, w = Math.sin(t * 3 + k) * 10, sz = e.r * (1.5 + 0.2 * Math.sin(t * 2 + k)); ctx.drawImage(pf, s.x + Math.cos(aim) * d - Math.sin(aim) * w - sz / 2, s.y + Math.sin(aim) * d + Math.cos(aim) * w - sz / 2, sz, sz); }
        // dua tangan bayangan menjulur dari sisi
        ctx.fillStyle = 'rgba(20,8,34,0.85)'; ctx.strokeStyle = 'rgba(150,90,220,0.7)'; ctx.lineWidth = 2;
        for (let sd = -1; sd <= 1; sd += 2) { const bx = s.x + Math.cos(aim) * (this.c.muzzleR + 80) + Math.cos(aim + sd * Math.PI / 2) * 70 * (1 - 0.5 * a), by = s.y + Math.sin(aim) * (this.c.muzzleR + 80) + Math.sin(aim + sd * Math.PI / 2) * 70 * (1 - 0.5 * a); ctx.beginPath(); ctx.ellipse(bx, by, 22, 12, aim + sd * 0.6, 0, TAU); ctx.fill(); ctx.stroke(); for (let f = -2; f <= 2; f++) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(aim + f * 0.35 + Math.sin(t * 6 + f) * 0.1) * 30, by + Math.sin(aim + f * 0.35 + Math.sin(t * 6 + f) * 0.1) * 30); ctx.stroke(); } }
        ctx.restore();
      }
    }
  }
  HazardSet.puff = (function () { let c = null; return function () { if (c) return c; c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(120,150,70,0.85)'); gr.addColorStop(0.55, 'rgba(70,40,110,0.4)'); gr.addColorStop(1, 'rgba(30,10,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; }; })();

  GA.Hazards = { create: function (cfg, c) { return new HazardSet(cfg, c); }, KINDS: KINDS, FADE: FADE };
})(window.GA = window.GA || {});
