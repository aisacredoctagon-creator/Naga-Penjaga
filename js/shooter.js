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
  function drawAmmo(ctx, x, y, r, ammo, px, t, dir) { GA.Fire.drawBall(ctx, x, y, r, ammo, px, t, dir); }

  class Shooter {
    constructor() {
      this.x = 0; this.y = 0; this.angle = -Math.PI / 2;
      this.r = 46; this.ammoR = 32; this.nextR = 26;
      this.cur = makeAmmo(); this.nxt = makeAmmo();
      this.reload = 0; this.swapT = 0;
      this.guideLen = 400;
      this.off = 0; this.slip = false; this.goal = this.angle;   // getaran bidik (Hawa Panas) & bidikan licin (Es Licin)
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
      const a = Math.atan2(py - this.y, px - this.x);
      if (this.slip) { this.goal = a; return; }       // nerf Es Licin: sudut menyusul pelan (berinersia)
      this.goal = a; this.angle = a;
      this.dragon.setAim(this.aim);
    }
    setAngle(a) { this.angle = a; this.goal = a; this.dragon.setAim(this.aim); }
    /** Sudut tembak sebenarnya = sudut bidik + getaran (nerf Hawa Panas). */
    get aim() { return this.angle + this.off; }
    canFire() { return this.reload <= 0 && this.dragon.frozen <= 0; }
    /** Titik peluru keluar: pusat bola api di mulut naga. */
    muzzle(out) {
      const d = this.r * Theme.dragon.mouthDist - this.dragon.kick * this.r * 0.3, a = this.aim;
      out.x = this.x + Math.cos(a) * d; out.y = this.y + Math.sin(a) * d;
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
    /** Soket rune bola berikutnya: di sisi naga (di luar sayap, dalam jangkauan jempol), selalu di atas gambar naga. Tidak ikut berputar mengikuti bidikan. */
    bubble() {
      const V = GA.view || { W: 960, H: 540 }, side = this.x > V.W * 0.55 ? -1 : 1, rr = this.nextR + 8;
      const x = Math.max(rr + 6, Math.min(V.W - rr - 6, this.x + side * this.r * 2.7)), y = Math.min(V.H - rr - 6, this.y + this.r * 0.55);
      return { x: x, y: y };
    }

    update(dt) {
      if (this.reload > 0) this.reload -= dt;
      if (this.swapT > 0) this.swapT -= dt;
      if (this.slip && this.goal !== undefined) {
        let df = this.goal - this.angle; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI;
        this.angle += df * Math.min(1, dt * 3.2);
      }
      this.dragon.setAim(this.aim);
      this.dragon.update(dt, this.reload <= 0);
      const FX = GA.FX, ex = this.dragon.expr;
      if (!this.quiet) {
        const m = this.muzzle(this._m || (this._m = { x: 0, y: 0 }));
        if (this.reload > 0 && Math.random() < dt * 40) {            // api berkumpul di mulut saat bola dimuat
          const a = Math.random() * 6.283, d = this.ammoR * (1.1 + Math.random() * 0.9);
          FX.spawn(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, -Math.cos(a) * d * 3.2, -Math.sin(a) * d * 3.2, 0.22 + Math.random() * 0.12, this.ammoR * 0.2, '#ffb02e', 5, 0);
        }
        if (ex === 'cheer' && Math.random() < dt * 60) FX.spawn(m.x + (Math.random() - 0.5) * this.ammoR, m.y, (Math.random() - 0.5) * 90, -260 - Math.random() * 160, 0.5 + Math.random() * 0.4, this.ammoR * (0.3 + Math.random() * 0.3), Math.random() < 0.5 ? '#ffd27a' : '#ff7a2a', 5, -60);
        if (ex === 'happy' && this.dragon.exprT > 0.85) FX.embers(m.x, m.y, Math.cos(this.angle) * 140, Math.sin(this.angle) * 140, 3, this.ammoR * 0.5);
      }
    }

    draw(ctx, t, px) {
      const self = this;
      this.dragon.draw(ctx, this.x, this.y, this.r, function (wx, wy) {
        // bola api baru terbentuk di mulut setelah mengisi ulang (0,6 → 1,0 selama isi ulang; siap tembak = bola rantai)
        const grow = self.reload > 0 ? Math.max(0.05, 1 - self.reload / 0.26) : 1;
        drawAmmo(ctx, wx, wy, self.ammoR * (0.6 + 0.4 * grow), self.cur, px, t, null);
      });

      // bola berikutnya di soket rune (ketuk soket atau naga untuk menukar)
      const b = this.bubble(), br = this.nextR + 7, pop = this.swapT > 0 ? 1 + this.swapT * 0.9 : 1;
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(pop, pop);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, br * 0.3, br * 1.08, br * 0.95, 0, 0, 6.283); ctx.fill();                                        // bayangan
      const rg = ctx.createLinearGradient(-br, -br, br, br); rg.addColorStop(0, '#8a5a2a'); rg.addColorStop(0.5, '#5a3418'); rg.addColorStop(1, '#2a160a');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, br + 5, 0, 6.283); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1c0e05'; ctx.stroke();                          // bingkai kayu
      const gg = ctx.createLinearGradient(0, -br, 0, br); gg.addColorStop(0, '#fff0b0'); gg.addColorStop(0.5, '#e8b84a'); gg.addColorStop(1, '#9a6a14');
      ctx.strokeStyle = gg; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, br + 1, 0, 6.283); ctx.stroke();                                                         // trim emas
      const dg = ctx.createRadialGradient(0, -br * 0.2, br * 0.1, 0, 0, br); dg.addColorStop(0, '#2a1a3a'); dg.addColorStop(1, '#0c0614');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(0, 0, br - 2, 0, 6.283); ctx.fill();                                                                                      // lubang soket
      ctx.strokeStyle = 'rgba(184,144,255,' + (0.55 + 0.25 * Math.sin(t * 2.4)).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round';                                      // rune bercahaya mengelilingi
      for (let i = 0; i < 8; i++) { const a = i * 0.7854 + t * 0.4; ctx.beginPath(); ctx.arc(0, 0, br - 5, a, a + 0.42); ctx.stroke(); }
      ctx.restore();
      drawAmmo(ctx, b.x, b.y, this.nextR * pop, this.nxt, px, t, null);
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
          if ((b.trail = (b.trail || 0) + sd) > 0.012) { b.trail = 0; GA.FX.embers(b.x - b.vx * 0.012, b.y - b.vy * 0.012, -b.vx * 0.1, -b.vy * 0.1, 1, this.chainR * 0.55); }
          if (onStep(b, sd)) { b.on = false; break; }
          if (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) { b.on = false; break; }
        }
      }
    },
    draw: function (ctx, px, t) {
      for (let i = 0; i < this.list.length; i++) {
        const b = this.list[i]; if (!b.on) continue;
        const rad = this.chainR, a = Math.atan2(b.vy, b.vx);
        GA.Fire.drawTrail(ctx, b.x, b.y, rad, a, t + i, 1);
        drawAmmo(ctx, b.x, b.y, rad, b.ammo, px, t, a);
      }
    }
  };

  GA.Shooter = { Shooter: Shooter, Bullets: Bullets, drawAmmo: drawAmmo };
})(window.GA = window.GA || {});
