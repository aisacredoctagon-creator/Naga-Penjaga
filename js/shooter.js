/* shooter.js — penembak (Naga Penjaga, lihat dragon.js), bola api (membawa pengali skor ×1–×3), dan peluru.
 * Ukuran semua bola diturunkan dari radius bola (Theme.BALL_RADIUS): bola api di mulut = bola peluru = bola rantai. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;

  const MULT_FLAME = { 1: 0.8, 2: 1.0, 3: 1.25 };  // makin besar pengali, makin besar nyala api

  function makeAmmo() {
    const r = Math.random();
    const m = r < 0.55 ? 1 : (r < 0.85 ? 2 : 3);
    return { mult: m, ci: -1 };
  }

  /** Bola api: orb oranye-merah dengan nyala. dir = arah gerak (radian) agar nyala di belakang; null = nyala ke atas. */
  function drawAmmo(ctx, x, y, r, ammo, px, t, dir) {
    const back = dir == null ? -Math.PI / 2 : dir + Math.PI;     // nyala ke belakang arah gerak
    const k = MULT_FLAME[ammo.mult] || 1;
    for (let i = 0; i < 5; i++) {
      const a = back + (i - 2) * 0.42, len = r * (0.95 + 0.35 * Math.sin(t * 14 + i * 1.7)) * k * (i === 2 ? 1.25 : 0.9);
      const bx = x + Math.cos(a) * r * 0.7, by = y + Math.sin(a) * r * 0.7, tx = x + Math.cos(a) * (r + len), ty = y + Math.sin(a) * (r + len);
      const nx = -Math.sin(a) * r * 0.42, ny = Math.cos(a) * r * 0.42;
      const g = ctx.createLinearGradient(bx, by, tx, ty); g.addColorStop(0, 'rgba(255,170,40,0.95)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx + nx, by + ny);
      ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.6 + nx * 0.4, by + Math.sin(a) * len * 0.6 + ny * 0.4, tx, ty);
      ctx.quadraticCurveTo(bx + Math.cos(a) * len * 0.6 - nx * 0.4, by + Math.sin(a) * len * 0.6 - ny * 0.4, bx - nx, by - ny);
      ctx.closePath(); ctx.fill();
    }
    GA.Chain.drawBall(ctx, x, y, r, -1, null, px);
    GA.Chain.drawLabel(ctx, '×' + ammo.mult, x, y, r * 0.95);
  }

  class Shooter {
    constructor() {
      this.x = 0; this.y = 0; this.angle = -Math.PI / 2;
      this.r = 46; this.ammoR = 32; this.nextR = 26;
      this.cur = makeAmmo(); this.nxt = makeAmmo();
      this.reload = 0; this.swapT = 0;
      this.guideLen = 400;
      this.dragon = new GA.Dragon.Dragon();
    }
    /** ballR = radius bola. Semua ukuran turunan dari konstanta di Theme. */
    setSize(ballR) {
      this.r = Theme.dragon.radiusRatio * ballR;
      this.ammoR = Theme.shooterBallRadius(ballR);          // bola api siap tembak = bola rantai (SHOOTER_BALL_SCALE = 1.0)
      this.nextR = Theme.nextBallRadius(ballR);             // bola preview (NEXT_BALL_SCALE)
    }
    setPos(x, y) { this.x = x; this.y = y; }
    reset() { this.cur = makeAmmo(); this.nxt = makeAmmo(); this.reload = 0; this.swapT = 0; this.dragon.reset(); }
    react(kind) { this.dragon.react(kind); }
    freeze(sec) { this.dragon.freeze(sec); }
    get frozen() { return this.dragon.frozen > 0; }
    aimAt(px, py) {
      if (Math.hypot(px - this.x, py - this.y) < 20) return;
      this.angle = Math.atan2(py - this.y, px - this.x);
      this.dragon.setAim(this.angle);
    }
    setAngle(a) { this.angle = a; this.dragon.setAim(a); }
    canFire() { return this.reload <= 0 && this.dragon.frozen <= 0; }
    /** Titik peluru keluar: pusat bola api di mulut naga. */
    muzzle(out) {
      const d = this.r * Theme.dragon.mouthDist - this.dragon.kick * this.r * 0.3;
      out.x = this.x + Math.cos(this.angle) * d; out.y = this.y + Math.sin(this.angle) * d;
      return out;
    }
    /** Ambil bola siap tembak dan isi ulang. */
    takeShot() {
      const a = this.cur;
      this.cur = this.nxt; this.nxt = makeAmmo();
      this.reload = 0.26; this.swapT = 0.2;
      this.dragon.shoot();
      return a;
    }
    swap() {
      const t = this.cur; this.cur = this.nxt; this.nxt = t; this.swapT = 0.2;
    }
    /** Zona ketuk-untuk-tukar: badan naga, bola api di mulut, ATAU bola berikutnya. */
    hitsSwap(px, py, minR) {
      const rr = Math.max(this.r + 22, minR || 0);
      if (Math.hypot(px - this.x, py - this.y) < rr) return true;
      const m = this.muzzle({ x: 0, y: 0 });
      if (Math.hypot(px - m.x, py - m.y) < this.ammoR + 10) return true;
      const b = this.bubble();
      return Math.hypot(px - b.x, py - b.y) < Math.max(this.nextR + 14, (minR || 0) * 0.7);
    }
    /** Bola berikutnya: di dada/sayap naga (berlawanan arah kepala, tidak pernah menimpa bola di mulut). */
    bubble() {
      const a = this.dragon.angle, d = this.r * 0.72;
      return { x: this.x - Math.cos(a) * d, y: this.y - Math.sin(a) * d };
    }

    update(dt) {
      if (this.reload > 0) this.reload -= dt;
      if (this.swapT > 0) this.swapT -= dt;
      this.dragon.setAim(this.angle);
      this.dragon.update(dt, this.reload <= 0);
    }

    draw(ctx, t, px) {
      const self = this;
      this.dragon.draw(ctx, this.x, this.y, this.r, function (wx, wy) {
        // bola api baru terbentuk di mulut setelah mengisi ulang (0,6 → 1,0 selama isi ulang; siap tembak = bola rantai)
        const grow = self.reload > 0 ? Math.max(0.05, 1 - self.reload / 0.26) : 1;
        drawAmmo(ctx, wx, wy, self.ammoR * (0.6 + 0.4 * grow), self.cur, px, t, null);
      });

      // bola berikutnya di dekat dada naga (ketuk naga untuk menukar)
      const b = this.bubble(), br = this.nextR + 6;
      ctx.fillStyle = 'rgba(30,16,70,0.55)';
      ctx.beginPath(); ctx.arc(b.x, b.y, br, 0, 6.283); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,214,140,0.85)'; ctx.stroke();
      drawAmmo(ctx, b.x, b.y, this.nextR, this.nxt, px, t, null);
      ctx.strokeStyle = '#ffe9b8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      const ra = br + 5, sp = t * 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, ra, sp + 0.3, sp + 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x, b.y, ra, sp + 3.44, sp + 5.04); ctx.stroke();
    }
  }

  /* ---------- peluru ----------
   * Peluru memakai radius yang SAMA dengan bola di mulut naga dan bola di rantai (Theme.BALL_RADIUS),
   * jadi tidak ada perubahan ukuran saat ditembak maupun saat mengenai rantai. Tabrakan memakai ukuran yang terlihat. */
  const Bullets = {
    list: [],
    speed: 880,
    r: 32,        // radius tabrakan dengan rantai (= bulletHitRatio × radius bola)
    rObs: 13,     // radius tabrakan dengan rintangan
    chainR: 32,   // radius bola (gambar peluru = bola rantai = bola di mulut)
    setSize: function (ballR) {
      this.chainR = ballR;
      this.r = Theme.ball.bulletHitRatio * ballR;
      this.rObs = Theme.ball.obstacleHitRatio * ballR;
    },
    fire: function (x, y, angle, ammo) {
      let b = null;
      for (let i = 0; i < this.list.length; i++) if (!this.list[i].on) { b = this.list[i]; break; }
      if (!b) { b = { on: false }; this.list.push(b); }
      b.on = true; b.x = x; b.y = y; b.vx = Math.cos(angle) * this.speed; b.vy = Math.sin(angle) * this.speed;
      b.ammo = ammo; b.age = 0; b.px = x; b.py = y; b.bounces = 0;
      return b;
    },
    clear: function () { for (const b of this.list) b.on = false; },
    /** onStep(b) -> true jika peluru habis dipakai. */
    update: function (dt, W, H, onStep) {
      for (let i = 0; i < this.list.length; i++) {
        const b = this.list[i]; if (!b.on) continue;
        b.age += dt;
        const dist = this.speed * dt, steps = Math.max(1, Math.ceil(dist / 9)), sd = dt / steps;
        for (let s = 0; s < steps; s++) {
          b.px = b.x; b.py = b.y;
          b.x += b.vx * sd; b.y += b.vy * sd;
          if (onStep(b)) { b.on = false; break; }
          if (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) { b.on = false; break; }
        }
      }
    },
    draw: function (ctx, px, t) {
      for (let i = 0; i < this.list.length; i++) {
        const b = this.list[i]; if (!b.on) continue;
        const rad = this.chainR, a = Math.atan2(b.vy, b.vx), tl = rad * 3.0;
        const g = ctx.createLinearGradient(b.x, b.y, b.x - Math.cos(a) * tl, b.y - Math.sin(a) * tl);
        g.addColorStop(0, 'rgba(255,200,80,0.75)'); g.addColorStop(0.5, 'rgba(255,90,30,0.35)'); g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.strokeStyle = g; ctx.lineWidth = rad * 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(a) * tl, b.y - Math.sin(a) * tl); ctx.stroke();
        drawAmmo(ctx, b.x, b.y, rad, b.ammo, px, t, a);
      }
    }
  };

  GA.Shooter = { Shooter: Shooter, Bullets: Bullets, drawAmmo: drawAmmo };
})(window.GA = window.GA || {});
