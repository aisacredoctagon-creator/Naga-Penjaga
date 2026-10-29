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
  const LABEL_FILL = '#fff4d6', LABEL_EDGE = 'rgba(10,4,26,0.96)';
  function drawLabel(ctx, text, x, y, r, color) {
    const fill = color || LABEL_FILL, edge = LABEL_EDGE;
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
    ctx.lineJoin = 'round';
    ctx.lineWidth = size * 0.52; ctx.strokeStyle = 'rgba(190,150,255,0.2)'; ctx.strokeText(text, x, y + size * 0.04);      // pendar tipis
    ctx.lineWidth = Math.max(3, size * 0.22);
    ctx.strokeStyle = edge;
    ctx.strokeText(text, x, y + size * 0.04);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y + size * 0.04);
  }

  /** Gambar bola (orb sihir atau, bila ci < 0, bola api) + teks. px = piksel perangkat per unit logis. */
  function drawBall(ctx, x, y, r, ci, text, px, sx, rot, t, heading, base) {
    const img = Theme.sprite('ball');
    if (sx !== undefined && sx !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); x = 0; y = 0; }
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else if (ci >= 0 && GA.Balls) GA.Balls.drawOrb(ctx, x, y, r, ci, rot || 0, px || 1, !!text, t, heading || 0, base);
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
  const tmp = { x: 0, y: 0, a: 0 }, tA = { x: 0, y: 0, a: 0 }, tB = { x: 0, y: 0, a: 0 };
  const SNAP = 1.5;      // px: selisih sekecil ini dianggap rapat (bola menempel pada bola di depannya)

  /** Rantai bola sihir. Posisi tiap bola = jarak busur `d` sepanjang jalur. Semua kecepatan/jarak dibaca dari `gp` (config/gameplay.js)
   * dalam satuan diameter bola; `unit` = 2r piksel. Bola dijaga rapat oleh solver pembatas jarak tiap frame: bola ke-i tidak boleh
   * lebih maju dari (bola i-1) - jarak sentuh; yang tertinggal menyusul dengan GAP_CLOSE_SPEED. */
  class Chain {
    constructor(path, opts) {
      this.path = path;
      this.r = opts.r;
      this.gp = opts.gp || GA.Gameplay.resolve('sedang', 0);
      this.pxSpeed = opts.speed || 0;   // px/dtk: hanya rantai dekoratif menu; rantai permainan memakai gp.CHAIN_BASE_SPEED (diameter/dtk)
      this.maxBalls = opts.maxBalls || 999;
      this.labeler = opts.labeler || defaultLabeler;
      this.zones = null; this.overWindows = null;   // zona kecepatan; jendela jembatan (bola di sini digambar di atas jembatan)
      this.spawnQ = []; this.useQueue = false; this.ff = false;   // antrean bola yang belum keluar & percepatan saat tidak ada target terlihat
      this.idx = 0; this.entryD = 0; this.onEmerge = null;  // jarak titik portal; bola yang melewatinya "keluar" dari portal
      this.balls = [];
      this.nextId = 1;
      this.pending = 0;          // pergeseran tertunda (+maju / -mundur), px
      this.backSpeed = 0; this.fwdSpeed = 0;
      this.slowT = 0; this.fastT = 0; this.hold = 0;
      this.speedMul = 1;         // pengali dari fase boss / dsb.
      this.paused = false;
      this.lastCi = 0;
      this.minFront = this.r * 8; // posisi minimum bola terdepan saat rantai ditarik mundur
      this.entry = { phase: 'done', t: 0, total: 0, v: 0 };   // fase masuk cepat: 'fast' -> 'ease' -> 'done'
      this.pressure = 0;         // tekanan bertahap 0..1 (naik pelan, turun bila jawaban benar beruntun)
      this.clock = 0; this.vNow = 0;
      this.stats = { firstOut: -1, allOut: -1, fastEnd: -1, lastInsert: -1 };
    }

    get unit() { return this.r * 2; }
    /** Jarak sentuh pusat-ke-pusat bola bersebelahan (px). */
    get D() { return this.r * 2 * this.gp.BALL_SPACING_FACTOR; }
    /** Kecepatan dasar kepala rantai (px/dtk), tanpa pengali fase masuk/tekanan. */
    get speed() { return this.pxSpeed || this.gp.CHAIN_BASE_SPEED * this.unit; }
    get closeSpeed() { return this.gp.GAP_CLOSE_SPEED * this.unit; }

    /** Pindah jalur (layar berputar / ukuran berubah): posisi relatif sepanjang jalur dipertahankan, bola yang rapat dirapatkan ulang. */
    setPath(path, newR) {
      const bs = this.balls, k = this.path && this.path.length ? path.length / this.path.length : 1, contig = [];
      for (let i = 1; i < bs.length; i++) contig.push(bs[i - 1].d - bs[i].d < this.D * 1.25);
      if (newR) { this.r = newR; this.minFront = newR * 8; }
      this.path = path;
      for (const b of bs) b.d *= k;
      for (let i = 1; i < bs.length; i++) if (contig[i - 1]) { bs[i].d = bs[i - 1].d - this.behind(bs[i - 1].d); bs[i].vo = 0; }
    }

    /** Selisih busur dari titik dPrev ke belakang sehingga JARAK LURUS pusat-pusat = D (di tikungan busur sedikit lebih panjang dari D). */
    behind(dPrev) {
      const S = this.D, p = this.path;
      p.at(dPrev, tA);
      let x = S;
      for (let k = 0; k < 2; k++) {
        p.at(dPrev - x, tB);
        const ch = Math.hypot(tA.x - tB.x, tA.y - tB.y);
        if (ch < 1) break;
        x = Math.max(S * 0.9, Math.min(S * 1.6, x * S / ch));
      }
      return x;
    }

    /** spec: { qid, kind } — qid = indeks soal di dek (bola target), kind = 'num' | 'curse' | 'frost' | 'egg'. `out` = sudah terlihat (rantai dekoratif). */
    makeBall(d, spec, out) {
      const b = { ch: this, id: this.nextId++, d: d, vo: 0, lag: 0, kind: 'num', value: 0, text: '', ci: 0, x: 0, y: 0, a: 0, flipT: 0, nv: null, nt: null, wob: 0, red: 0, fog: 0, fogAge: 0,
        out: !!out, emT: out ? 1e3 : 0, rot: 0, qid: spec && spec.qid != null ? spec.qid : null, want: spec ? spec.kind || 'num' : null };
      this.lastCi = b.ci = (this.lastCi + 1 + Math.floor(Math.random() * 7)) % 8;
      this.labeler(b);
      this.path.at(d, tmp); b.x = tmp.x; b.y = tmp.y; b.a = tmp.a;
      return b;
    }

    /** Aliran bola: SATU antrean kontinu yang keluar dari portal tanpa jeda. specs: [{ qid, kind }]. Fase masuk cepat dimulai. */
    setQueue(specs) {
      this.spawnQ = specs.slice(); this.useQueue = true; this.balls.length = 0;
      this.entry.phase = 'fast'; this.entry.t = 0; this.entry.total = specs.length; this.clock = 0; this.pressure = 0;
      this.stats.firstOut = this.stats.allOut = this.stats.fastEnd = -1;
      this.spawnMore();
    }
    /** Bola target yang lolos ke sarang dikembalikan ke antrean (soal belum selesai) — keluar lagi dari portal dan menyusul ke ekor rantai. */
    requeue(spec) { this.spawnQ.unshift(spec); this.useQueue = true; }

    /** Isi awal rantai dekoratif (menu): n bola, bola depan di frontD, lalu luncurkan masuk dengan `slide` px. */
    fill(n, frontD, slide) {
      this.balls.length = 0;
      let d = frontD - slide;
      for (let i = 0; i < n; i++) { const b = this.makeBall(d, null, d >= this.entryD); this.balls.push(b); d -= this.behind(d); }
      this.pending = slide;
      this.spawnMore();
    }

    spawnMore() {
      const bs = this.balls;
      if (this.useQueue) {
        const q = this.spawnQ, line = this.entryD - 2 * this.D;
        let g = 16;
        while (g-- > 0 && q.length) {
          const tail = bs[bs.length - 1];
          if (tail && tail.d <= line) break;      // sudah ada cadangan bola di belakang portal
          // aliran kontinu: tepat sejarak sentuh di belakang ekor; bola yang kembali dari sarang keluar di portal lalu menyusul
          const d = tail ? Math.min(tail.d - this.behind(tail.d), this.entryD) : this.entryD;
          bs.push(this.makeBall(d, q.shift(), false));
        }
        return;
      }
      let guard = 6;
      while (guard-- > 0 && bs.length < this.maxBalls) {
        const tail = bs[bs.length - 1];
        if (tail && tail.d < -this.D) break;
        bs.push(this.makeBall(tail ? Math.min(tail.d - this.behind(tail.d), 0) : 0, null, false));
      }
    }

    visible(b) { return b.d >= this.entryD && b.d <= this.path.length; }

    /** Kecepatan kepala saat fase masuk (px/dtk): minimal DASAR x ENTRY_MULT, dan cukup cepat agar bola fase masuk habis keluar dalam SPAWN_FILL_TIME. */
    entryStep(dt, vNormal, head) {
      const e = this.entry;
      if (e.phase === 'done') return vNormal;
      const gp = this.gp, unit = this.r * 2, D = this.D;
      if (e.phase === 'fast') {
        const vis = Math.max(unit, this.path.length - this.entryD), cap = this.entryD + gp.ENTRY_HEAD_FRAC * vis;
        const nFast = Math.max(1, Math.min(e.total, Math.floor((cap - this.entryD) / D) + 1));
        e.v = Math.min(gp.ENTRY_MAX_DPS * unit, Math.max(this.speed * gp.CHAIN_ENTRY_SPEED_MULT, nFast * D / gp.SPAWN_FILL_TIME));
        const tail = this.balls[this.balls.length - 1];
        if ((!this.spawnQ.length && (!tail || tail.out)) || head >= cap) { e.phase = 'ease'; e.t = 0; this.stats.fastEnd = this.clock; }
        else return e.v;
      }
      e.t += dt;      // transisi halus ke kecepatan normal
      const k = Math.min(1, e.t / Math.max(0.05, gp.ENTRY_EASE_TIME)), s = k * k * (3 - 2 * k);
      if (k >= 1) e.phase = 'done';
      return e.v + (vNormal - e.v) * s;
    }

    update(dt) {
      if (!(dt > 0)) return;
      const gp = this.gp;
      if (dt > gp.MAX_DT) dt = gp.MAX_DT;      // tab di-resume / FPS jatuh: jangan melompat
      this.clock += dt;
      if (this.slowT > 0) this.slowT -= dt;
      if (this.fastT > 0) this.fastT -= dt;
      if (this.hold > 0) this.hold -= dt;
      const bs = this.balls, unit = this.r * 2, base = this.speed, head = bs.length ? bs[0].d : 0;

      // semua pengali berlaku untuk SELURUH rantai (bukan per bola) supaya kerapatan terjaga
      let mul = this.speedMul;
      if (this.slowT > 0) mul *= gp.FROST_SLOW_MULT;
      if (this.fastT > 0) mul *= gp.FAST_MULT;
      if (this.zones && bs.length) { for (let z = 0; z < this.zones.length; z++) if (head >= this.zones[z].from && head <= this.zones[z].to) mul *= this.zones[z].mul; }   // zona kecepatan jalur
      if (!this.paused && this.entry.phase === 'done') this.pressure = Math.min(1, this.pressure + dt / gp.PRESSURE_RAMP_TIME);
      mul *= 1 + gp.CHAIN_PRESSURE_RAMP * this.pressure;                   // tekanan bertahap
      const rem = (this.path.length - head) / unit;                         // melambat dekat sarang (tidak pernah berhenti)
      if (gp.NEST_SLOW_DIAMS > 0 && rem < gp.NEST_SLOW_DIAMS) mul *= gp.NEST_SLOW_MULT + (1 - gp.NEST_SLOW_MULT) * Math.max(0, rem) / gp.NEST_SLOW_DIAMS;
      let v = this.entryStep(dt, base * mul, head);
      if (this.ff && v < base * gp.FF_MULT) v = base * gp.FF_MULT;         // tidak ada bola target terlihat: percepat
      if (this.paused || this.hold > 0) v = 0;
      this.vNow = v;

      let shift = 0;
      if (this.pending !== 0) {
        const sp = this.pending > 0 ? (this.fwdSpeed || gp.RETREAT_SPEED * unit) : (this.backSpeed || gp.RETREAT_SPEED * unit);
        const s = Math.min(Math.abs(this.pending), sp * dt);
        shift = this.pending > 0 ? s : -s;
        this.pending -= shift;
        if (Math.abs(this.pending) < 0.01) this.pending = 0;
      }

      const close = this.closeSpeed, voStep = this.D / Math.max(0.03, gp.INSERT_TIME) * dt, em = gp.EMERGE_ANIM_TIME;
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        if (i === 0) { b.d += v * dt + shift; b.lag = 0; }
        else {
          // solver pembatas jarak: tidak boleh melewati (bola di depan - jarak sentuh); tertinggal -> menyusul dengan GAP_CLOSE_SPEED
          const prev = bs[i - 1], target = prev.d - this.behind(prev.d);
          if (target - b.d <= SNAP) b.d = target;
          else { const nd = b.d + Math.max(v, close) * dt + shift; b.d = nd > target ? target : nd; }
          b.lag = Math.max(0, target - b.d);
        }
        if (b.vo !== 0) b.vo = Math.abs(b.vo) <= voStep ? 0 : b.vo - (b.vo > 0 ? voStep : -voStep);
        // animasi
        if (b.flipT > 0) {
          const before = b.flipT; b.flipT -= dt;
          if (before > 0.18 && b.flipT <= 0.18 && b.nv !== null) { b.value = b.nv; b.text = b.nt; b.nv = null; }
          if (b.flipT <= 0) { b.flipT = 0; if (b.nv !== null) { b.value = b.nv; b.text = b.nt; b.nv = null; } }
        }
        if (b.wob > 0) b.wob -= dt;
        if (b.red > 0) b.red -= dt;
        if (b.fog > 0) { b.fog -= dt; b.fogAge += dt; } else b.fogAge = 0;
        if (b.emT < em) b.emT += dt;
        this.path.at(b.d + b.vo, tmp);
        b.x = tmp.x; b.y = tmp.y; b.a = tmp.a;
        if (!b.out && b.d >= this.entryD) {      // keluar dari portal
          b.out = true; b.emT = 0;
          if (this.stats.firstOut < 0) this.stats.firstOut = this.clock;
          if (this.onEmerge) this.onEmerge(b);
        }
      }
      if (this.stats.allOut < 0 && this.useQueue && !this.spawnQ.length && bs.length && bs[bs.length - 1].out) this.stats.allOut = this.clock;
      this.spawnMore();
    }

    /** Geser seluruh rantai: positif = maju, negatif = mundur. */
    retreat(px, speed) {
      // jangan sampai seluruh rantai keluar layar: bola terdepan tetap di atas minFront
      if (this.balls.length) px = Math.max(0, Math.min(px, this.balls[0].d + this.pending - this.minFront));
      this.pending -= px;
      this.backSpeed = speed || this.gp.RETREAT_SPEED * this.unit;
    }

    /** Jawaban benar beruntun: tekanan bertahap turun (0..1). */
    relieve(x) { this.pressure = Math.max(0, this.pressure - x); }

    /** Sisipkan bola baru di indeks k (antara balls[k-1] dan balls[k], k >= 1). Bagian belakang terdorong mundur satu jarak sentuh;
     * tetangga bergeser halus selama INSERT_TIME (offset visual `vo` meluruh), sesudahnya tidak ada celah. Dipakai bola kutukan/beku yang disisipkan. */
    insert(k, spec) {
      const bs = this.balls; k = Math.max(1, Math.min(bs.length, k));
      const prev = bs[k - 1], d = prev.d - this.behind(prev.d);
      const nb = this.makeBall(d, spec, true); nb.emT = 0;      // muncul membesar
      bs.splice(k, 0, nb);
      for (let i = k + 1; i < bs.length; i++) { const nd = bs[i - 1].d - this.behind(bs[i - 1].d); bs[i].vo += bs[i].d - nd; bs[i].d = nd; }
      this.stats.lastInsert = this.clock;
      return nb;
    }

    frontD() { return this.balls.length ? this.balls[0].d : 0; }

    /** true bila ada bola yang masih bergeser cepat menutup celah (tembakan saat itu bisa meleset ke bola tetangga). */
    settling() {
      const bs = this.balls;
      for (let i = 1; i < bs.length; i++) { if (bs[i].out && bs[i].lag > SNAP) return true; }
      return this.pending > 1 || this.pending < -1;
    }

    /** true selama animasi sisip / bola baru keluar / celah menutup (pengecualian tes kerapatan). */
    animating() {
      const bs = this.balls, em = this.gp.EMERGE_ANIM_TIME;
      for (let i = 0; i < bs.length; i++) if (bs[i].vo !== 0 || bs[i].lag > SNAP || bs[i].emT < em) return true;
      return this.pending !== 0;
    }

    /** Rasio jarak lurus pusat-pusat bola bersebelahan terhadap diameter, hanya untuk pasangan yang terlihat dan tidak sedang beranimasi. */
    spacing(out) {
      out = out || { min: 9, max: 0, n: 0, gaps: 0 };
      const bs = this.balls, dia = this.r * 2, em = this.gp.EMERGE_ANIM_TIME;
      out.min = 9; out.max = 0; out.n = 0; out.gaps = 0;
      for (let i = 1; i < bs.length; i++) {
        const a = bs[i - 1], b = bs[i];
        if (!(a.d >= this.entryD && b.d >= this.entryD && a.d <= this.path.length)) continue;
        const q = Math.hypot(a.x - b.x, a.y - b.y) / dia;
        if (b.vo !== 0 || a.vo !== 0 || b.lag > SNAP || b.emT < em) { if (q > 1.05) out.gaps++; continue; }
        out.n++; if (q < out.min) out.min = q; if (q > out.max) out.max = q; if (q > 1.05) out.gaps++;
      }
      return out;
    }

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
      if (i >= 0) this.balls.splice(i, 1);      // bagian belakang menyusul dengan GAP_CLOSE_SPEED (solver di update), bagian depan tetap berjalan
      return i;
    }

    /** Tukar isi dua bola angka (kelelawar penyihir / mantra): label bertukar dengan animasi balik. */
    swapLabels(a, b) {
      const av = a.nv !== null ? a.nv : a.value, at = a.nv !== null ? a.nt : a.text;
      const bv = b.nv !== null ? b.nv : b.value, bt = b.nv !== null ? b.nt : b.text;
      a.nv = bv; a.nt = bt; a.flipT = 0.36; b.nv = av; b.nt = at; b.flipT = 0.36;
      const q = a.qid; a.qid = b.qid; b.qid = q;       // pasangan soal ikut berpindah bersama angkanya
    }

    /** Beri label ulang semua bola angka (soal baru). fn(ball) mengisi value & text. */
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

    /** ?debug=chain: garis hijau = rapat, merah + lingkaran = celah (> 1,05 diameter), oranye = terlalu tumpang tindih (< 0,96). */
    drawDebug(ctx) {
      const bs = this.balls, dia = this.r * 2;
      ctx.save(); ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 1; i < bs.length; i++) {
        const a = bs[i - 1], b = bs[i];
        if (!(this.visible(a) || this.visible(b))) continue;
        const q = Math.hypot(a.x - b.x, a.y - b.y) / dia;
        ctx.strokeStyle = q > 1.05 ? 'rgba(255,30,30,0.95)' : (q < 0.96 ? 'rgba(255,170,0,0.95)' : 'rgba(70,255,120,0.6)');
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        if (q > 1.05) { ctx.fillStyle = 'rgba(255,0,0,0.35)'; ctx.beginPath(); ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, this.r * 0.75, 0, 6.283); ctx.fill(); }
      }
      ctx.restore();
    }

    draw(ctx, t, px, pass) {
      const r = this.r, bs = this.balls, len = this.path.length, emA = Math.max(0.03, this.gp.EMERGE_ANIM_TIME);
      if (pass !== 1 && GA.Quality && GA.Quality.level !== 'rendah' && GA.Balls.drawTrail) {   // jejak kabut gelap di belakang bola terakhir rantai
        for (let i = 0; i < bs.length; i++) {
          const b = bs[i], nx = bs[i + 1];
          if (b.out && b.d < len - r * 2 && (!nx || nx.d < b.d - this.D * 1.8) && !this.paused) GA.Balls.drawTrail(ctx, b.x, b.y, r, b.a, t);
        }
      }
      const aura = this.slowT > 0 ? 'rgba(120,210,255,0.55)' : (this.fastT > 0 ? 'rgba(255,150,50,0.55)' : null);
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i];
        if (this.overWindows && this.overWindows.length && this.isOver(b) !== (pass === 1)) continue;
        if (b.d + b.vo < this.entryD - r * 0.6 || b.d > len + r * 2) continue;
        let x = b.x, y = b.y, rr = r, alpha = 1;
        const em = Math.max(0, Math.min(1, b.emT / emA));   // animasi keluar portal (berbasis waktu, singkat): agak kecil & bercahaya -> ukuran penuh
        if (em < 1) { const k = em * em * (3 - 2 * em); rr = r * (0.6 + 0.4 * k); alpha = Math.min(1, em * 3 + 0.2); }
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
          drawBall(ctx, x, y, rr, b.ci, b.text, px, sx, b.d / r + b.id * 1.7, t, b.a, r);   // menggelinding: sudut = jarak ÷ radius
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

  GA.Chain = { LABEL_FILL: LABEL_FILL, Chain: Chain, drawBall: drawBall, drawSpecial: drawSpecial, drawLabel: drawLabel, drawFog: drawFog, eggPath: eggPath };
})(window.GA = window.GA || {});
