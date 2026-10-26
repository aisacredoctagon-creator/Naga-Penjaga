/* shooter.js — penembak (kodok, lihat frog.js), bola tembak (membawa pengali skor), dan peluru.
 * Ukuran semua bola pemain diturunkan dari radius bola rantai lewat Theme.ball (satu konstanta pusat). */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;

  const MULT_COLOR = { 1: 5, 2: 3, 3: 0 }; // indeks warna bola untuk ×1, ×2, ×3

  function makeAmmo() {
    const r = Math.random();
    const m = r < 0.55 ? 1 : (r < 0.85 ? 2 : 3);
    return { mult: m, ci: MULT_COLOR[m] };
  }

  function drawAmmo(ctx, x, y, r, ammo, px, t) {
    GA.Chain.drawBall(ctx, x, y, r, ammo.ci, null, px);
    ctx.lineWidth = Math.max(2.5, r * 0.14); ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x, y, r - ctx.lineWidth * 0.5, 0, 6.283); ctx.stroke();
    GA.Chain.drawLabel(ctx, '×' + ammo.mult, x, y, r * 0.95);
  }

  class Shooter {
    constructor() {
      this.x = 0; this.y = 0; this.angle = -Math.PI / 2;
      this.r = 40; this.ammoR = 23;
      this.cur = makeAmmo(); this.nxt = makeAmmo();
      this.reload = 0; this.swapT = 0;
      this.guideLen = 400;
      this.frog = new GA.Frog.Frog();
    }
    /** ballR = radius bola rantai. */
    setSize(ballR) {
      this.r = Theme.frog.radiusRatio * ballR;
      this.ammoR = Theme.ball.playerRatio * ballR;
    }
    setPos(x, y) { this.x = x; this.y = y; }
    reset() { this.cur = makeAmmo(); this.nxt = makeAmmo(); this.reload = 0; this.swapT = 0; this.frog.reset(); }
    react(kind) { this.frog.react(kind); }
    aimAt(px, py) {
      if (Math.hypot(px - this.x, py - this.y) < 20) return;
      this.angle = Math.atan2(py - this.y, px - this.x);
      this.frog.setAim(this.angle);
    }
    setAngle(a) { this.angle = a; this.frog.setAim(a); }
    canFire() { return this.reload <= 0; }
    /** Titik peluru keluar: pusat mulut kodok. */
    muzzle(out) {
      const d = this.r * 1.0 - this.frog.recoil;
      out.x = this.x + Math.cos(this.angle) * d; out.y = this.y + Math.sin(this.angle) * d;
      return out;
    }
    /** Ambil bola siap tembak dan isi ulang. */
    takeShot() {
      const a = this.cur;
      this.cur = this.nxt; this.nxt = makeAmmo();
      this.reload = 0.26; this.swapT = 0.2;
      this.frog.shoot();
      return a;
    }
    swap() {
      const t = this.cur; this.cur = this.nxt; this.nxt = t; this.swapT = 0.2;
    }
    /** Zona ketuk-untuk-tukar: badan kodok ATAU gelembung bola berikutnya. */
    hitsSwap(px, py, minR) {
      const rr = Math.max(this.r + 22, minR || 0);
      if (Math.hypot(px - this.x, py - this.y) < rr) return true;
      const b = this.bubble();
      return Math.hypot(px - b.x, py - b.y) < Math.max(this.ammoR + 14, (minR || 0) * 0.7);
    }
    /** Gelembung bola berikutnya: di punggung kodok (ikut berputar, tidak pernah menimpa bola di mulut). */
    bubble() {
      const a = this.frog.angle, d = this.r * 0.6;
      return { x: this.x - Math.cos(a) * d, y: this.y - Math.sin(a) * d };
    }

    update(dt) {
      if (this.reload > 0) this.reload -= dt;
      if (this.swapT > 0) this.swapT -= dt;
      this.frog.setAim(this.angle);
      this.frog.update(dt, this.reload <= 0);
    }

    draw(ctx, t, px) {
      const self = this;
      this.frog.draw(ctx, this.x, this.y, this.r, function (wx, wy, mouth) {
        // bola muncul di mulut setelah mengisi ulang (tumbuh dari kecil)
        const grow = self.reload > 0 ? Math.max(0.05, 1 - self.reload / 0.26) : 1;
        const sc = (self.swapT > 0 ? 1 + self.swapT * 1.2 : 1) * (0.25 + 0.75 * grow);
        drawAmmo(ctx, wx, wy, self.ammoR * sc, self.cur, px, t);
      });

      // bola berikutnya di punggung kodok (ketuk kodok untuk menukar)
      const b = this.bubble(), br = this.ammoR * 0.72 + 5, pulse = this.swapT > 0 ? 1 + this.swapT * 1.2 : 1;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.arc(b.x, b.y, br * pulse, 0, 6.283); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(27,42,73,0.6)'; ctx.stroke();
      drawAmmo(ctx, b.x, b.y, this.ammoR * 0.72 * pulse, this.nxt, px, t);
      // panah tukar melingkar di sekeliling gelembung
      ctx.strokeStyle = '#1b2a49'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      const ra = br + 5, sp = t * 1.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, ra, sp + 0.3, sp + 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x, b.y, ra, sp + 3.44, sp + 5.04); ctx.stroke();
    }
  }

  /* ---------- peluru ---------- */
  const Bullets = {
    list: [],
    speed: 880,
    r: 16,      // radius tabrakan
    visR: 23,   // radius gambar
    setSize: function (ballR) {
      this.visR = Theme.ball.playerRatio * ballR;
      this.r = this.visR * Theme.ball.bulletHitRatio;
    },
    fire: function (x, y, angle, ammo) {
      let b = null;
      for (let i = 0; i < this.list.length; i++) if (!this.list[i].on) { b = this.list[i]; break; }
      if (!b) { b = { on: false }; this.list.push(b); }
      b.on = true; b.x = x; b.y = y; b.vx = Math.cos(angle) * this.speed; b.vy = Math.sin(angle) * this.speed;
      b.ammo = ammo; b.age = 0; b.px = x; b.py = y;
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
        const a = Math.atan2(b.vy, b.vx), tl = this.visR * 2.6;
        const g = ctx.createLinearGradient(b.x, b.y, b.x - Math.cos(a) * tl, b.y - Math.sin(a) * tl);
        g.addColorStop(0, 'rgba(255,255,255,0.65)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = this.visR * 1.1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(a) * tl, b.y - Math.sin(a) * tl); ctx.stroke();
        drawAmmo(ctx, b.x, b.y, this.visR, b.ammo, px, t);
      }
    }
  };

  GA.Shooter = { Shooter: Shooter, Bullets: Bullets, drawAmmo: drawAmmo };
})(window.GA = window.GA || {});
