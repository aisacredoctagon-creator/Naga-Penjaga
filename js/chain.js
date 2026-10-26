/* chain.js — rantai bola yang bergerak di jalur + fungsi gambar bola (angka & bola khusus). */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;

  /* ---------- gambar bola ---------- */
  const spriteCache = { key: '', list: [] };

  function drawBallBody(g, x, y, r, ci) {
    const c = Theme.ballColors[ci % Theme.ballColors.length];
    g.fillStyle = 'rgba(0,0,0,0.22)';
    g.beginPath(); g.ellipse(x + 1.5, y + r * 0.18 + 2, r * 0.98, r * 0.92, 0, 0, 6.283); g.fill();
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    gr.addColorStop(0, c[0]); gr.addColorStop(0.55, c[1]); gr.addColorStop(1, c[2]);
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.45, r * 0.34, r * 0.18, -0.6, 0, 6.283); g.fill();
  }

  function getSprite(ci, r, px) {
    const key = r + '|' + px;
    if (spriteCache.key !== key) { spriteCache.key = key; spriteCache.list = []; }
    let s = spriteCache.list[ci];
    if (s) return s;
    const size = Math.ceil((r * 2 + 8) * px);
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    g.scale(px, px);
    drawBallBody(g, r + 4, r + 4, r, ci);
    s = spriteCache.list[ci] = { cv: cv, off: r + 4, size: r * 2 + 8 };
    return s;
  }

  function drawLabel(ctx, text, x, y, r, color) {
    const len = text.length;
    const size = Math.min(r * 0.98, (r * 3.1) / Math.max(len, 1));
    ctx.font = '800 ' + size.toFixed(1) + 'px ' + Theme.fonts.ui;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.22);
    ctx.strokeStyle = 'rgba(15,20,50,0.85)';
    ctx.strokeText(text, x, y + size * 0.04);
    ctx.fillStyle = color || '#fff';
    ctx.fillText(text, x, y + size * 0.04);
  }

  /** Gambar bola berwarna + teks. px = piksel perangkat per unit logis (untuk cache sprite). */
  function drawBall(ctx, x, y, r, ci, text, px, sx) {
    const img = Theme.sprite('ball');
    if (sx !== undefined && sx !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1); x = 0; y = 0; }
    if (img) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    else {
      const s = getSprite(ci, r, px || 1);
      ctx.drawImage(s.cv, x - s.off, y - s.off, s.size, s.size);
    }
    if (text) drawLabel(ctx, text, x, y, r);
    if (sx !== undefined && sx !== 1) ctx.restore();
  }

  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
    ctx.closePath();
  }

  /** Bola khusus: 'bomb' | 'ice' | 'bolt' | 'life' */
  function drawSpecial(ctx, kind, x, y, r, t) {
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x + 1.5, y + r * 0.18 + 2, r, r * 0.92, 0, 0, 6.283); ctx.fill();
    if (kind === 'bomb') {
      gr.addColorStop(0, '#6b7280'); gr.addColorStop(0.5, '#2b2f3a'); gr.addColorStop(1, '#0d0f14');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y + 2, r * 0.92, 0, 6.283); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.stroke();
      ctx.fillStyle = '#50556a'; ctx.fillRect(x - r * 0.22, y - r * 1.0, r * 0.44, r * 0.3);
      ctx.strokeStyle = '#c9a66b'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(x, y - r * 1.0); ctx.quadraticCurveTo(x + r * 0.4, y - r * 1.3, x + r * 0.6, y - r * 1.05); ctx.stroke();
      const f = 0.7 + 0.3 * Math.sin(t * 24);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x + r * 0.62, y - r * 1.05, r * 0.2 * f, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ff6b2c'; ctx.beginPath(); ctx.arc(x + r * 0.62, y - r * 1.05, r * 0.11 * f, 0, 6.283); ctx.fill();
      // tengkorak kecil
      ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.36, 0, 6.283); ctx.fill();
      ctx.fillRect(x - r * 0.2, y + r * 0.2, r * 0.4, r * 0.28);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x - r * 0.14, y, r * 0.1, 0, 6.283); ctx.arc(x + r * 0.14, y, r * 0.1, 0, 6.283); ctx.fill();
      ctx.fillRect(x - r * 0.05, y + r * 0.2, r * 0.03, r * 0.2); ctx.fillRect(x + r * 0.03, y + r * 0.2, r * 0.03, r * 0.2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.4, r * 0.2, r * 0.1, -0.7, 0, 6.283); ctx.fill();
    } else if (kind === 'ice') {
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#a8e6ff'); gr.addColorStop(1, '#3aa0d8');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(20,80,130,0.6)'; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = i * 1.0472 + 0.2; const cx = Math.cos(a) * r * 0.66, cy = Math.sin(a) * r * 0.66;
        ctx.beginPath(); ctx.moveTo(x - cx, y - cy); ctx.lineTo(x + cx, y + cy); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.5, r * 0.3, r * 0.14, -0.6, 0, 6.283); ctx.fill();
    } else if (kind === 'bolt') {
      gr.addColorStop(0, '#ffe98a'); gr.addColorStop(0.5, '#ffb02e'); gr.addColorStop(1, '#b8590a');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(90,40,0,0.6)'; ctx.stroke();
      ctx.fillStyle = '#5b2bd0'; ctx.beginPath();
      ctx.moveTo(x + r * 0.15, y - r * 0.8); ctx.lineTo(x - r * 0.45, y + r * 0.1); ctx.lineTo(x - r * 0.02, y + r * 0.1);
      ctx.lineTo(x - r * 0.18, y + r * 0.8); ctx.lineTo(x + r * 0.5, y - r * 0.15); ctx.lineTo(x + r * 0.05, y - r * 0.15); ctx.closePath(); ctx.fill();
    } else { // life
      gr.addColorStop(0, '#ffe3ef'); gr.addColorStop(0.5, '#ff8fb8'); gr.addColorStop(1, '#c2185b');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(100,0,40,0.5)'; ctx.stroke();
      const s = r * (0.55 + 0.04 * Math.sin(t * 6));
      ctx.fillStyle = '#fff'; heartPath(ctx, x, y + r * 0.04, s); ctx.fill();
      ctx.fillStyle = '#e11d48'; heartPath(ctx, x, y + r * 0.04, s * 0.72); ctx.fill();
    }
  }

  /* ---------- rantai ---------- */
  const tmp = { x: 0, y: 0, a: 0 };

  class Chain {
    constructor(path, opts) {
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
      const b = { id: this.nextId++, d: d, kind: 'num', value: 0, text: '', ci: 0, x: 0, y: 0, a: 0, flipT: 0, nv: null, nt: null, wob: 0, red: 0 };
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

    visible(b) { return b.d >= 0 && b.d <= this.path.length; }

    update(dt) {
      if (this.slowT > 0) this.slowT -= dt;
      if (this.fastT > 0) this.fastT -= dt;
      if (this.hold > 0) this.hold -= dt;
      let mul = this.speedMul;
      if (this.slowT > 0) mul *= 0.3;
      if (this.fastT > 0) mul *= 2.3;
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
        this.path.at(b.d, tmp);
        b.x = tmp.x; b.y = tmp.y; b.a = tmp.a;
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
        if (b.d < 0 || b.d > this.path.length) continue;
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
    relabel(fn) {
      for (const b of this.balls) {
        if (b.kind !== 'num') continue;
        const vis = this.visible(b);
        const old = b.value, oldT = b.text;
        fn(b);
        if (vis && (b.value !== old || b.text !== oldT)) { b.nv = b.value; b.nt = b.text; b.value = old; b.text = oldT; b.flipT = 0.36; }
      }
    }

    draw(ctx, t, px) {
      const r = this.r, bs = this.balls, len = this.path.length;
      const aura = this.slowT > 0 ? 'rgba(120,210,255,0.55)' : (this.fastT > 0 ? 'rgba(255,150,50,0.55)' : null);
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i];
        if (b.d < -r || b.d > len + r * 2) continue;
        let x = b.x, y = b.y, rr = r;
        if (b.d > len - r * 0.2) rr = Math.max(0.2, r * (1 - (b.d - (len - r * 0.2)) / (r * 2))); // jatuh ke lubang
        if (b.wob > 0) x += Math.sin(t * 70) * 4 * (b.wob / 0.5);
        if (aura) { ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, y, rr + 5, 0, 6.283); ctx.fill(); }
        if (b.kind === 'num') {
          let sx = 1;
          if (b.flipT > 0) sx = Math.max(0.05, Math.abs(Math.cos(Math.PI * (1 - b.flipT / 0.36))));
          drawBall(ctx, x, y, rr, b.ci, b.text, px, sx);
          if (b.red > 0) { ctx.fillStyle = 'rgba(255,40,60,' + (0.55 * b.red / 0.5).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill(); }
        } else {
          drawSpecial(ctx, b.kind, x, y, rr, t);
        }
      }
    }
  }

  function defaultLabeler(b) {
    b.kind = 'num';
    b.value = 1 + Math.floor(Math.random() * 20);
    b.text = String(b.value);
  }

  GA.Chain = { Chain: Chain, drawBall: drawBall, drawSpecial: drawSpecial, drawLabel: drawLabel, heartPath: heartPath };
})(window.GA = window.GA || {});
