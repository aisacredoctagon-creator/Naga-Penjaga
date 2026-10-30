/* shooter.js — penembak (Naga Penjaga, lihat dragon.js), bola api, dan peluru.
 * Ukuran semua bola diturunkan dari radius bola (Theme.BALL_RADIUS): bola api yang melesat = bola rantai.
 * Revisi 10: tidak ada bola api yang diam di samping naga (bola siap-tembak di mulut dan soket "bola berikutnya" dihapus); sasaran ditentukan
 * target-lock pada bola jawaban, jadi bola api hanya muncul sebagai nyala singkat di mulut saat menembak dan bola yang melesat. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;

  /** Satu-satunya "amunisi": hanya menentukan tampilan bola api yang melesat (panas cahaya tetap). */
  const AMMO = { mult: 1, ci: -1 };

  /** Bola api: orb oranye-merah dengan nyala. dir = arah gerak (radian) agar nyala di belakang; null = nyala ke atas. */
  function drawAmmo(ctx, x, y, r, ammo, px, t, dir) { GA.Fire.drawBall(ctx, x, y, r, ammo, px, t, dir); }

  class Shooter {
    constructor() {
      this.x = 0; this.y = 0; this.angle = -Math.PI / 2;
      this.r = 46; this.ammoR = 32;
      this.reload = 0;
      this.guideLen = 400; this.aimPt = { x: 0, y: -100 }; this.aimDist = 220;      // titik bidik P (posisi pointer): target-lock memilih bola terdekat dari P
      this.dragon = new GA.Dragon.Dragon();
    }
    /** ballR = radius bola. Semua ukuran turunan dari konstanta di Theme. */
    setSize(ballR) {
      this.r = Theme.dragon.radiusRatio * ballR;
      this.ammoR = Theme.shooterBallRadius(ballR);          // bola api yang melesat = bola rantai (SHOOTER_BALL_SCALE = 1.0); juga ukuran nyala di mulut
    }
    setPos(x, y) { this.x = x; this.y = y; this.aimPt.x = x + Math.cos(this.angle) * this.aimDist; this.aimPt.y = y + Math.sin(this.angle) * this.aimDist; }
    reset() { this.reload = 0; this.dragon.reset(); }
    react(kind) { this.dragon.react(kind); }
    freeze(sec) { this.dragon.freeze(sec); }
    get frozen() { return this.dragon.frozen > 0; }
    aimAt(px, py) {
      const d = Math.hypot(px - this.x, py - this.y); if (d < 20) return;
      const a = Math.atan2(py - this.y, px - this.x);
      this.angle = a; this.aimPt.x = px; this.aimPt.y = py; this.aimDist = d;
      this.dragon.setAim(this.aim);
    }
    /** Putar bidikan tanpa pointer (papan ketik, uji): titik bidik tetap pada jarak aimDist dari naga. */
    setAngle(a) { this.angle = a; this.aimPt.x = this.x + Math.cos(a) * this.aimDist; this.aimPt.y = this.y + Math.sin(a) * this.aimDist; this.dragon.setAim(this.aim); }
    /** Sudut tembak sebenarnya = sudut bidik. */
    get aim() { return this.angle; }
    canFire() { return this.reload <= 0 && this.dragon.frozen <= 0; }
    /** Titik peluru keluar: pusat bola api di mulut naga. */
    muzzle(out) {
      const d = this.r * Theme.dragon.mouthDist - this.dragon.kick * this.r * 0.3, a = this.aim;
      out.x = this.x + Math.cos(a) * d; out.y = this.y + Math.sin(a) * d;
      return out;
    }
    /** Semburkan satu bola api (mulai jeda isi ulang, naga menyembur). Mengembalikan data tampilan bola yang melesat. */
    takeShot() {
      this.reload = 0.26;
      this.dragon.shoot();
      return AMMO;
    }

    update(dt) {
      if (this.reload > 0) this.reload -= dt;
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

    /** Hanya naga: tidak ada bola api yang diam di mulut maupun di sisi naga (nyala singkat di mulut dibuat efek FX saat menembak, js/main.js `fire`). */
    draw(ctx, t, px) {
      this.dragon.draw(ctx, this.x, this.y, this.r, null);
    }
  }

  /* ---------- peluru ----------
   * Peluru memakai radius yang SAMA dengan bola di rantai (Theme.BALL_RADIUS),
   * jadi tidak ada perubahan ukuran saat ditembak maupun saat mengenai rantai. Tabrakan memakai ukuran yang terlihat. */
  const Bullets = {
    list: [],
    speed: 880,
    r: 32,        // radius tabrakan dengan rantai (= bulletHitRatio × radius bola)
    rObs: 13,     // radius tabrakan dengan rintangan
    chainR: 32,   // radius bola (gambar peluru = bola rantai)
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
    /** LONTARAN (revisi 8): bola api terbang melengkung di atas rantai selama `dur` dtk (tetap, berapa pun jaraknya) dari (x,y) ke bola target `tgt` (mengikuti posisinya) atau ke titik (tx,ty) bila tidak ada target.
     *  Tidak bertabrakan dengan bola di sepanjang jalan; mendarat → onLand(b). Tinggi `peak` px (× ukuran), pembesaran `grow` di puncak. */
    lob: function (x, y, tgt, tx, ty, ammo, dur, peak, grow) {
      let b = null;
      for (let i = 0; i < this.list.length; i++) if (!this.list[i].on) { b = this.list[i]; break; }
      if (!b) { b = { on: false }; this.list.push(b); }
      b.on = true; b.lob = true; b.sx = x; b.sy = y; b.x = x; b.y = y; b.px = x; b.py = y; b.tgt = tgt || null; b.tx = tx; b.ty = ty; b.u = 0; b.dur = dur; b.peak = peak; b.grow = grow;
      b.ammo = ammo; b.age = 0; b.vx = b.vy = 0; b.bounces = 0; b.hgt = 0; b.scl = 1; b.hz = null;
      return b;
    },
    /** onStep(b) -> true jika peluru lurus habis; onLobStep(b, sd) -> true bila lontaran habis di jalan (rintangan tinggi); onLand(b) saat lontaran mendarat. */
    update: function (dt, W, H, onStep, onLobStep, onLand) {
      for (let i = 0; i < this.list.length; i++) {
        const b = this.list[i]; if (!b.on) continue;
        b.age += dt;
        if (b.lob) {
          const ex = b.tgt ? b.tgt.x : b.tx, ey = b.tgt ? b.tgt.y : b.ty, du = dt / b.dur, steps = Math.max(1, Math.ceil(Math.hypot(ex - b.sx, ey - b.sy) * du / 9)), sd = dt / steps;
          for (let s = 0; s < steps; s++) {
            b.px = b.x; b.py = b.y; b.u = Math.min(1, b.u + du / steps);
            const tx = b.tgt ? b.tgt.x : b.tx, ty = b.tgt ? b.tgt.y : b.ty;
            b.x = b.sx + (tx - b.sx) * b.u; b.y = b.sy + (ty - b.sy) * b.u;
            const k = Math.sin(Math.PI * b.u); b.hgt = b.peak * k; b.scl = 1 + b.grow * k;
            if ((b.trail = (b.trail || 0) + sd) > 0.012) { b.trail = 0; GA.FX.embers(b.x, b.y - b.hgt, (b.sx - b.x) * 0.1, (b.sy - b.y) * 0.1 - 20, 1, this.chainR * 0.5); }
            if (onLobStep && onLobStep(b, sd)) { b.on = false; break; }
            if (b.u >= 1) { if (onLand) onLand(b); b.on = false; break; }
          }
          continue;
        }
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
        if (b.lob) {      // bayangan di tanah (tertinggal) + bola api membesar dan terangkat di atas bola lain
          const rad = this.chainR, sh = Math.max(0.55, 1 - 0.35 * Math.sin(Math.PI * b.u)), a = Math.atan2((b.tgt ? b.tgt.y : b.ty) - b.sy, (b.tgt ? b.tgt.x : b.tx) - b.sx);
          ctx.save(); ctx.fillStyle = 'rgba(0,0,0,' + (0.38 * sh).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(b.x, b.y + rad * 0.15, rad * 0.95 * sh, rad * 0.55 * sh, 0, 0, 6.283); ctx.fill(); ctx.restore();
          GA.Fire.drawTrail(ctx, b.x, b.y - b.hgt, rad * b.scl, a, t + i, 1);
          drawAmmo(ctx, b.x, b.y - b.hgt, rad * b.scl, b.ammo, px, t, a);
          continue;
        }
        const rad = this.chainR, a = Math.atan2(b.vy, b.vx);
        GA.Fire.drawTrail(ctx, b.x, b.y, rad, a, t + i, 1);
        drawAmmo(ctx, b.x, b.y, rad, b.ammo, px, t, a);
      }
    }
  };

  GA.Shooter = { Shooter: Shooter, Bullets: Bullets, drawAmmo: drawAmmo };
})(window.GA = window.GA || {});
