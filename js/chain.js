/* chain.js — rantai bola yang bergerak di jalur + fungsi gambar bola (angka & bola khusus). */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;

  /* ---------- gambar bola ---------- */

  function drawBallBody(g, x, y, r, ci) {
    const pad = 4;
    if (ci < 0) { // bola api (peluru / bola siap tembak)
      const F = Theme.colors.fire, lw = Math.max(1.5, r * 0.06);
      const gl = g.createRadialGradient(x, y, r * 0.8, x, y, r + pad); gl.addColorStop(0, 'rgba(255,140,40,0.55)'); gl.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(x, y, r + pad, 0, 6.283); g.fill();
      const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.05, x, y, r * 1.02);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, F[0]); gr.addColorStop(0.65, F[1]); gr.addColorStop(1, F[2]);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      g.lineWidth = lw; g.strokeStyle = 'rgba(120,20,0,0.65)'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(x - r * 0.32, y - r * 0.46, r * 0.3, r * 0.15, -0.6, 0, 6.283); g.fill();
      return;
    }
    // orb sihir: cahaya luar, badan bergradien, cakram dalam, rune halus, kilau
    const c = Theme.ballColors[ci % Theme.ballColors.length], lw = Math.max(1.5, r * 0.06);
    const gl = g.createRadialGradient(x, y, r * 0.85, x, y, r + pad); gl.addColorStop(0, c[1]); gl.addColorStop(1, 'rgba(120,90,255,0)');
    g.globalAlpha = 0.5; g.fillStyle = gl; g.beginPath(); g.arc(x, y, r + pad, 0, 6.283); g.fill(); g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,20,0.28)';
    g.beginPath(); g.ellipse(x + r * 0.05, y + r * 0.2, r * 0.98, r * 0.92, 0, 0, 6.283); g.fill();     // bayangan relatif terhadap radius
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    gr.addColorStop(0, c[0]); gr.addColorStop(0.5, c[1]); gr.addColorStop(1, c[2]);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    g.lineWidth = lw; g.strokeStyle = 'rgba(10,5,40,0.55)'; g.stroke();
    const inner = g.createRadialGradient(x, y, r * 0.1, x, y, r * 0.74); inner.addColorStop(0, 'rgba(255,255,255,0.28)'); inner.addColorStop(1, 'rgba(255,255,255,0.02)');
    g.fillStyle = inner; g.beginPath(); g.arc(x, y, r * 0.74, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = Math.max(1, r * 0.04); g.lineCap = 'round';   // rune halus melingkar
    for (let i = 0; i < 8; i++) {
      const a = i * 0.7854 + 0.2, a2 = a + 0.32;
      g.beginPath(); g.arc(x, y, r * 0.84, a, a2); g.stroke();
      if (i % 2 === 0) { g.beginPath(); g.moveTo(x + Math.cos(a + 0.5) * r * 0.76, y + Math.sin(a + 0.5) * r * 0.76); g.lineTo(x + Math.cos(a + 0.5) * r * 0.9, y + Math.sin(a + 0.5) * r * 0.9); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.46, r * 0.3, r * 0.15, -0.6, 0, 6.283); g.fill();
  }

  /* Cache sprite bola per (radius terkuantisasi, warna). Radius berbeda (bola rantai, bola siap tembak,
   * bola preview) memakai sprite terdekat lalu diskalakan, jadi cache tidak ter-reset. */
  const spriteCache = { px: 0, map: Object.create(null), n: 0 };

  function getSprite(ci, r, px) {
    if (spriteCache.px !== px || spriteCache.n > 300) { spriteCache.px = px; spriteCache.map = Object.create(null); spriteCache.n = 0; }
    const qr = Math.max(2, Math.round(r / 2) * 2), key = qr + '|' + ci;
    let s = spriteCache.map[key];
    if (s) return s;
    const size = Math.ceil((qr * 2 + 8) * px);
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    g.scale(px, px);
    drawBallBody(g, qr + 4, qr + 4, qr, ci);
    s = spriteCache.map[key] = { cv: cv, qr: qr }; spriteCache.n++;
    return s;
  }

  /** Angka di dalam bola. Pecahan ("3/4") digambar bersusun; teks panjang otomatis diperkecil agar tidak keluar bola. */
  function drawLabel(ctx, text, x, y, r, color) {
    const fill = color || '#fff', edge = 'rgba(15,10,50,0.88)';
    if (GA.MathText.isFrac(text.replace(/\s/g, ''))) {
      const size = GA.MathText.fit(ctx, text, r * 1.7, r * 1.7, r * 0.95);
      GA.MathText.draw(ctx, text, x, y, size, fill, edge);
      return;
    }
    const len = text.length;
    let size = Math.min(r * 0.98, (r * 3.1) / Math.max(len, 1));
    ctx.font = '800 ' + size.toFixed(1) + 'px ' + Theme.fonts.ui;
    const maxW = r * 1.72;
    for (let i = 0; i < 10 && size > 8 && ctx.measureText(text).width > maxW; i++) {
      size *= Math.max(0.8, maxW / ctx.measureText(text).width); ctx.font = '800 ' + size.toFixed(1) + 'px ' + Theme.fonts.ui;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.22);
    ctx.strokeStyle = edge;
    ctx.strokeText(text, x, y + size * 0.04);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y + size * 0.04);
  }

  /** Gambar bola (orb sihir atau, bila ci < 0, bola api) + teks. px = piksel perangkat per unit logis. */
  function drawBall(ctx, x, y, r, ci, text, px, sx, rot, t) {
    const img = Theme.sprite('ball');
    if (sx !== undefined && sx !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); x = 0; y = 0; }
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else if (ci >= 0 && GA.Balls) GA.Balls.drawOrb(ctx, x, y, r, ci, rot || 0, px || 1, !!text, t);
    else {
      const s = getSprite(ci, r, px || 1);
      const k = r / s.qr, d = (s.qr * 2 + 8) * k;   // sprite terdekat diskalakan ke radius sebenarnya
      ctx.drawImage(s.cv, x - (s.qr + 4) * k, y - (s.qr + 4) * k, d, d);
    }
    if (text) drawLabel(ctx, text, x, y, r);
    if (sx !== undefined && sx !== 1) ctx.restore();
  }

  /** Kabut sihir di atas bola: angka tersamarkan. amt 0..1 = kepekatan. */
  function drawFog(ctx, x, y, r, t, amt) {
    ctx.save(); ctx.globalAlpha = Math.min(1, amt);
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 1.1); g.addColorStop(0, 'rgba(120,90,190,0.95)'); g.addColorStop(0.75, 'rgba(90,60,160,0.9)'); g.addColorStop(1, 'rgba(70,40,130,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.08, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(210,190,255,0.55)';
    for (let i = 0; i < 4; i++) { const a = t * 1.4 + i * 1.57; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.35, y + Math.sin(a * 1.3) * r * 0.3, r * 0.34, 0, 6.283); ctx.fill(); }
    ctx.font = '800 ' + (r * 0.9).toFixed(1) + 'px ' + Theme.fonts.ui; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText('?', x, y + r * 0.04);
    ctx.restore();
  }

  function eggPath(ctx, x, y, w, h) {
    ctx.beginPath(); ctx.moveTo(x, y - h);
    ctx.bezierCurveTo(x + w * 0.95, y - h * 0.95, x + w * 1.05, y + h * 0.7, x, y + h);
    ctx.bezierCurveTo(x - w * 1.05, y + h * 0.7, x - w * 0.95, y - h * 0.95, x, y - h); ctx.closePath();
  }

  /** Bola khusus: 'curse' (kutukan, jangan ditembak) | 'frost' (beku, rantai melambat) | 'egg' (telur emas, pulihkan telur) */
  function drawSpecial(ctx, kind, x, y, r, t) {
    const lw = Math.max(1.5, r * 0.06);
    GA.Balls.layer(ctx, 'shadow', x, y, r);
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    if (kind === 'curse') {
      const gl = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.3); gl.addColorStop(0, 'rgba(120,255,120,' + (0.35 + 0.15 * Math.sin(t * 5)).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(120,255,120,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, 6.283); ctx.fill();
      gr.addColorStop(0, '#6a4a8a'); gr.addColorStop(0.5, '#2a1646'); gr.addColorStop(1, '#0c0618');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(150,255,140,0.7)'; ctx.stroke();
      ctx.fillStyle = '#e8ffe0'; ctx.beginPath(); ctx.arc(x, y - r * 0.05, r * 0.4, 0, 6.283); ctx.fill(); ctx.fillRect(x - r * 0.22, y + r * 0.2, r * 0.44, r * 0.28);
      ctx.fillStyle = '#2a1646'; ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.08, r * 0.1, 0, 6.283); ctx.arc(x + r * 0.15, y - r * 0.08, r * 0.1, 0, 6.283); ctx.fill();
      ctx.fillRect(x - r * 0.05, y + r * 0.22, r * 0.03, r * 0.22); ctx.fillRect(x + r * 0.04, y + r * 0.22, r * 0.03, r * 0.22);
      ctx.strokeStyle = 'rgba(150,255,140,0.55)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.beginPath(); ctx.arc(x, y, r * 0.82, t * 2, t * 2 + 2.2); ctx.stroke();
    } else if (kind === 'frost') {
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#a8e6ff'); gr.addColorStop(1, '#3aa0d8');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(20,80,130,0.6)'; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, r * 0.09); ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = i * 1.0472 + 0.2, cx = Math.cos(a) * r * 0.66, cy = Math.sin(a) * r * 0.66; ctx.beginPath(); ctx.moveTo(x - cx, y - cy); ctx.lineTo(x + cx, y + cy); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.5, r * 0.3, r * 0.14, -0.6, 0, 6.283); ctx.fill();
    } else { // egg
      const gl = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.35); gl.addColorStop(0, 'rgba(255,225,110,' + (0.5 + 0.2 * Math.sin(t * 6)).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(255,225,110,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, 6.283); ctx.fill();
      gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.5, '#f6c445'); gr.addColorStop(1, '#a8741a');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = 'rgba(120,70,0,0.6)'; ctx.stroke();
      const eg = ctx.createRadialGradient(x - r * 0.12, y - r * 0.25, r * 0.05, x, y, r * 0.65); eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.4, '#ffe48a'); eg.addColorStop(1, '#d9961e');
      ctx.fillStyle = eg; ctx.strokeStyle = 'rgba(130,80,0,0.7)'; ctx.lineWidth = Math.max(1.5, r * 0.05); eggPath(ctx, x, y + r * 0.02, r * 0.44, r * 0.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(190,120,20,0.45)'; ctx.beginPath(); ctx.arc(x + r * 0.1, y + r * 0.12, r * 0.06, 0, 6.283); ctx.arc(x - r * 0.12, y + r * 0.28, r * 0.05, 0, 6.283); ctx.arc(x + r * 0.05, y - r * 0.18, r * 0.045, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(t * 7)).toFixed(2) + ')'; const sx = x + r * 0.55, sy = y - r * 0.5;
      ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.2); ctx.lineTo(sx + r * 0.06, sy - r * 0.06); ctx.lineTo(sx + r * 0.2, sy); ctx.lineTo(sx + r * 0.06, sy + r * 0.06); ctx.lineTo(sx, sy + r * 0.2); ctx.lineTo(sx - r * 0.06, sy + r * 0.06); ctx.lineTo(sx - r * 0.2, sy); ctx.lineTo(sx - r * 0.06, sy - r * 0.06); ctx.closePath(); ctx.fill();
    }
    GA.Balls.layer(ctx, 'gloss', x, y, r);   // kilau, rim light, dan sisi gelap yang sama dengan orb
  }

  /* ---------- rantai ---------- */
  const tmp = { x: 0, y: 0, a: 0 };

  class Chain {
    constructor(path, opts) {
      this.zones = null; this.overWindows = null;   // zona kecepatan; jendela jembatan (bola di sini digambar di atas jembatan)
      this.entryD = 0; this.onEmerge = null;   // jarak titik portal; bola yang melewatinya "keluar" dari portal
      this.path = path;
      this.r = opts.r;
      this.D = this.r * 2 + 1;
      this.speed = opts.speed;
      this.maxBalls = opts.maxBalls;
      this.closeSpeed = opts.closeSpeed || 520;
      this.balls = [];
      this.nextId = 1;
      this.labeler = opts.labeler || defaultLabeler;
      this.pending = 0;          // pergeseran tertunda (+maju / -mundur)
      this.backSpeed = 800;
      this.fwdSpeed = 800;
      this.slowT = 0; this.fastT = 0; this.hold = 0;
      this.speedMul = 1;         // pengali dari fase boss / dsb.
      this.paused = false;
      this.lastCi = 0;
      this.minFront = this.r * 8; // posisi minimum bola terdepan saat rantai ditarik mundur
    }

    setPath(path, ratio) {
      this.path = path;
      for (const b of this.balls) b.d *= ratio;
    }

    makeBall(d) {
      const b = { id: this.nextId++, d: d, kind: 'num', value: 0, text: '', ci: 0, x: 0, y: 0, a: 0, flipT: 0, nv: null, nt: null, wob: 0, red: 0, fog: 0, fogAge: 0, out: d >= this.entryD, rot: 0 };
      this.lastCi = b.ci = (this.lastCi + 1 + Math.floor(Math.random() * 7)) % 8;
      this.labeler(b);
      return b;
    }

    /** Isi awal rantai: n bola, bola depan di frontD, lalu luncurkan masuk dengan `slide` px. */
    fill(n, frontD, slide) {
      this.balls.length = 0;
      for (let i = 0; i < n; i++) this.balls.push(this.makeBall(frontD - slide - i * this.D));
      this.pending = slide;
      this.spawnMore();
    }

    spawnMore() {
      let guard = 6;
      while (guard-- > 0 && this.balls.length < this.maxBalls) {
        const tail = this.balls[this.balls.length - 1];
        if (tail && tail.d < -this.D) break;
        this.balls.push(this.makeBall(tail ? Math.min(tail.d - this.D, 0) : 0));
      }
    }

    visible(b) { return b.d >= this.entryD && b.d <= this.path.length; }

    update(dt) {
      if (this.slowT > 0) this.slowT -= dt;
      if (this.fastT > 0) this.fastT -= dt;
      if (this.hold > 0) this.hold -= dt;
      let mul = this.speedMul;
      if (this.slowT > 0) mul *= 0.3;
      if (this.fastT > 0) mul *= 2.3;
      if (this.zones && this.balls.length) { const f = this.balls[0].d; for (let z = 0; z < this.zones.length; z++) if (f >= this.zones[z].from && f <= this.zones[z].to) mul *= this.zones[z].mul; }   // zona kecepatan jalur
      const v = (this.paused || this.hold > 0) ? 0 : this.speed * mul;

      let shift = 0;
      if (this.pending !== 0) {
        const sp = this.pending > 0 ? this.fwdSpeed : this.backSpeed;
        const s = Math.min(Math.abs(this.pending), sp * dt);
        shift = this.pending > 0 ? s : -s;
        this.pending -= shift;
        if (Math.abs(this.pending) < 0.01) this.pending = 0;
      }

      const bs = this.balls, D = this.D;
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        if (i === 0) b.d += v * dt + shift;
        else {
          const target = bs[i - 1].d - D;
          let nd;
          if (b.d < target - 0.5) nd = b.d + Math.max(v, this.closeSpeed) * dt + shift;
          else nd = b.d + v * dt + shift;
          b.d = nd > target ? target : nd;
        }
        // animasi
        if (b.flipT > 0) {
          const before = b.flipT; b.flipT -= dt;
          if (before > 0.18 && b.flipT <= 0.18 && b.nv !== null) { b.value = b.nv; b.text = b.nt; b.nv = null; }
          if (b.flipT <= 0) { b.flipT = 0; if (b.nv !== null) { b.value = b.nv; b.text = b.nt; b.nv = null; } }
        }
        if (b.wob > 0) b.wob -= dt;
        if (b.red > 0) b.red -= dt;
        if (b.fog > 0) { b.fog -= dt; b.fogAge += dt; } else b.fogAge = 0;
        this.path.at(b.d, tmp);
        b.x = tmp.x; b.y = tmp.y; b.a = tmp.a;
        if (!b.out && b.d >= this.entryD) { b.out = true; if (this.onEmerge) this.onEmerge(b); }   // keluar dari portal
      }
      this.spawnMore();
    }

    /** Geser seluruh rantai: positif = maju, negatif = mundur. */
    retreat(px, speed) {
      // jangan sampai seluruh rantai keluar layar: bola terdepan tetap di atas minFront
      if (this.balls.length) px = Math.max(0, Math.min(px, this.balls[0].d + this.pending - this.minFront));
      this.pending -= px;
      this.backSpeed = speed || 800;
    }

    frontD() { return this.balls.length ? this.balls[0].d : 0; }

    holeReached() { return this.balls.length > 0 && this.balls[0].d >= this.path.length - this.r * 0.3; }

    /** Cari bola yang bersentuhan dengan lingkaran (x,y,r). */
    hit(x, y, r) {
      const bs = this.balls, rr = this.r * 0.92 + r;
      let best = null, bd = 1e9;
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        if (b.d < this.entryD || b.d > this.path.length) continue;
        const dx = b.x - x, dy = b.y - y, d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 < bd) { bd = d2; best = b; }
      }
      return best;
    }

    remove(ball) {
      const i = this.balls.indexOf(ball);
      if (i >= 0) this.balls.splice(i, 1);
      return i;
    }

    /** Beri label ulang semua bola angka (soal baru). fn(ball) mengisi value & text. */
    /** Tukar isi dua bola angka (kelelawar penyihir / mantra): label bertukar dengan animasi balik. */
    swapLabels(a, b) {
      const av = a.nv !== null ? a.nv : a.value, at = a.nt !== null ? a.nt : a.text;
      const bv = b.nv !== null ? b.nv : b.value, bt = b.nt !== null ? b.nt : b.text;
      a.nv = bv; a.nt = bt; a.flipT = 0.36; b.nv = av; b.nt = at; b.flipT = 0.36;
    }

    relabel(fn) {
      for (const b of this.balls) {
        if (b.kind !== 'num') continue;
        const vis = this.visible(b);
        const old = b.value, oldT = b.text;
        fn(b);
        if (vis && (b.value !== old || b.text !== oldT)) { b.nv = b.value; b.nt = b.text; b.value = old; b.text = oldT; b.flipT = 0.36; }
      }
    }

    /** pass: 0 = semua kecuali bola di atas jembatan, 1 = hanya bola di atas jembatan (digambar setelah penutup depan). */
    isOver(b) { const w = this.overWindows; if (!w) return false; for (let i = 0; i < w.length; i++) if (b.d >= w[i][0] && b.d <= w[i][1]) return true; return false; }
    drawOver(ctx, t, px) { if (this.overWindows && this.overWindows.length) this.draw(ctx, t, px, 1); }

    draw(ctx, t, px, pass) {
      const r = this.r, bs = this.balls, len = this.path.length;
      const aura = this.slowT > 0 ? 'rgba(120,210,255,0.55)' : (this.fastT > 0 ? 'rgba(255,150,50,0.55)' : null);
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i];
        if (this.overWindows && this.overWindows.length && this.isOver(b) !== (pass === 1)) continue;
        if (b.d < this.entryD - r * 0.6 || b.d > len + r * 2) continue;
        let x = b.x, y = b.y, rr = r, alpha = 1;
        const em = Math.max(0, Math.min(1, (b.d - this.entryD) / (this.D * 1.7)));   // animasi keluar portal: kecil, transparan, bercahaya → ukuran penuh
        if (em < 1) { const k = em * em * (3 - 2 * em); rr = r * (0.34 + 0.66 * k); alpha = Math.min(1, em * 2.4 + 0.05); }
        if (b.d > len - r * 0.2) rr = Math.max(0.2, r * (1 - (b.d - (len - r * 0.2)) / (r * 2))); // jatuh ke lubang
        if (b.wob > 0) x += Math.sin(t * 70) * 4 * (b.wob / 0.5);
        if (aura) { ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, y, rr + 5, 0, 6.283); ctx.fill(); }
        if (em < 1) {
          const gl = ctx.createRadialGradient(x, y, 0, x, y, rr * 2.1); gl.addColorStop(0, 'rgba(255,235,255,' + (0.85 * (1 - em)).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(180,120,255,0)');
          ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, rr * 2.1, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        }
        if (alpha < 1) ctx.globalAlpha = alpha;
        if (b.kind === 'num') {
          let sx = 1;
          if (b.flipT > 0) sx = Math.max(0.05, Math.abs(Math.cos(Math.PI * (1 - b.flipT / 0.36))));
          drawBall(ctx, x, y, rr, b.ci, b.text, px, sx, b.d / r * 0.85, t);
          if (b.red > 0) { ctx.fillStyle = 'rgba(255,40,60,' + (0.55 * b.red / 0.5).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill(); }
          if (b.fog > 0) drawFog(ctx, x, y, rr, t, Math.min(1, b.fogAge * 4, b.fog * 3));
        } else {
          drawSpecial(ctx, b.kind, x, y, rr, t);
        }
        if (alpha < 1) ctx.globalAlpha = 1;
      }
    }
  }

  function defaultLabeler(b) {
    b.kind = 'num';
    b.value = 1 + Math.floor(Math.random() * 20);
    b.text = String(b.value);
  }

  GA.Chain = { Chain: Chain, drawBall: drawBall, drawSpecial: drawSpecial, drawLabel: drawLabel, drawFog: drawFog, eggPath: eggPath };
})(window.GA = window.GA || {});
