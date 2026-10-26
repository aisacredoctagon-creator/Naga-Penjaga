/* frog.js — kodok penembak: gambar (Canvas) + animasi + ekspresi. Warna & parameter ada di Theme.frog.
 *
 * API:
 *   frog.setAim(angle)            arah bidikan (badan & mata menoleh halus)
 *   frog.shoot()                  animasi menembak (mulut buka, squash & stretch, lidah)
 *   frog.react(kind)              'happy' | 'hurt' | 'sad' | 'cheer' | 'idle'
 *   frog.update(dt, ballReady)    idle: napas + kedip acak
 *   frog.draw(ctx, x, y, R, ballCb)   ballCb(wx, wy, mouthOpen) menggambar bola di mulut (tegak, tidak ikut berputar)
 * Untuk memakai sprite sendiri: isi Theme.sprites.shooter (gambar menghadap ke kanan).
 */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;
  const PI2 = Math.PI * 2;

  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= PI2; while (d < -Math.PI) d += PI2; return d; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  class Frog {
    constructor() {
      this.angle = -Math.PI / 2; this.aim = this.angle;
      this.expr = 'idle'; this.exprT = 0;
      this.t = Math.random() * 10; this.blink = 0; this.blinkT = rand(1, 3);
      this.sq = 0; this.sqv = 0;       // pegas squash & stretch
      this.mouth = 0.8; this.tongue = 0; this.recoil = 0;
    }

    setAim(a) { this.aim = a; }
    reset() { this.expr = 'idle'; this.exprT = 0; this.sq = 0; this.sqv = 0; this.tongue = 0; this.recoil = 0; }

    react(kind) {
      if (kind === 'happy') { if (this.expr === 'idle' || this.expr === 'happy' || this.expr === 'hurt') { this.expr = 'happy'; this.exprT = 1.1; } }
      else if (kind === 'hurt') { if (this.expr === 'sad' || this.expr === 'cheer') return; this.expr = 'hurt'; this.exprT = 0.9; this.sq = 0.16; this.sqv = 0; }
      else if (kind === 'sad') { this.expr = 'sad'; this.exprT = Infinity; }
      else if (kind === 'cheer') { this.expr = 'cheer'; this.exprT = Infinity; }
      else { this.expr = 'idle'; this.exprT = 0; }
    }

    shoot() {
      this.angle = this.aim;          // sudah menghadap sasaran saat menembak
      this.sq = 0.24; this.sqv = 0;   // mengerut, lalu memantul (stretch)
      this.mouth = 1; this.tongue = 0.16; this.recoil = 10;
    }

    update(dt, ready) {
      const C = Theme.frog;
      this.t += dt;
      this.angle += angDiff(this.aim, this.angle) * Math.min(1, dt * 20);
      this.sqv += (-380 * this.sq - 15 * this.sqv) * dt; this.sq += this.sqv * dt;
      if (this.exprT !== Infinity && this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = 'idle'; }
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blink = 0.13; this.blinkT = rand(C.blinkEvery[0], C.blinkEvery[1]); }
      if (this.blink > 0) this.blink -= dt;
      const target = this.expr === 'sad' ? 0.05 : (this.expr === 'cheer' ? 0.9 : (ready ? 0.8 : 0.18));
      this.mouth += (target - this.mouth) * Math.min(1, dt * 14);
      if (this.tongue > 0) this.tongue -= dt;
      if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 70);
    }

    /** Posisi dunia pusat mulut. */
    mouthPos(x, y, R, out) {
      const d = R * 1.0 - this.recoil;
      out.x = x + Math.cos(this.angle) * d; out.y = y + Math.sin(this.angle) * d;
      return out;
    }

    _xf(ctx, x, y, R) {
      const C = Theme.frog, cheer = this.expr === 'cheer', sad = this.expr === 'sad';
      const jump = cheer ? Math.abs(Math.sin(this.t * 7)) * 0.16 : 0;
      const breathe = 1 + C.breath * (sad ? 0.5 : 1) * Math.sin(this.t * 2.2);
      const s = (1 + jump) * (sad ? 0.95 : 1) * breathe;
      ctx.translate(x, y); ctx.rotate(this.angle + (cheer ? Math.sin(this.t * 9) * 0.12 : 0));
      ctx.translate(-this.recoil, 0);
      ctx.scale((1 - this.sq) * s, (1 + 0.7 * this.sq) * s);
      return jump;
    }

    draw(ctx, x, y, R, ballCb) {
      const C = Theme.frog, E = this.expr;
      const hurt = E === 'hurt', happy = E === 'happy' || E === 'cheer', sad = E === 'sad', cheer = E === 'cheer';
      const pal = hurt ? C.hurt : C.body, t = this.t;

      const spr = Theme.sprite('shooter');
      if (spr) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(this.angle); ctx.drawImage(spr, -R * 1.3, -R * 1.3, R * 2.6, R * 2.6); ctx.restore();
        const p = this.mouthPos(x, y, R, { x: 0, y: 0 }); if (ballCb) ballCb(p.x, p.y, this.mouth);
        return;
      }

      // ---- daun teratai + bayangan (tidak ikut berputar) ----
      ctx.save(); ctx.translate(x, y);
      const pr = R * 1.4, pg = ctx.createRadialGradient(0, -pr * 0.2, pr * 0.1, 0, 0, pr);
      pg.addColorStop(0, C.pad[0]); pg.addColorStop(1, C.pad[1]);
      ctx.fillStyle = pg; ctx.strokeStyle = 'rgba(15,80,35,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, pr, 2.5 + 0.2, 2.5 + PI2 - 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { const a = i * 1.0 + 0.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * pr * 0.9, Math.sin(a) * pr * 0.9); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      const jumpK = cheer ? Math.abs(Math.sin(t * 7)) : 0;
      ctx.beginPath(); ctx.ellipse(0, R * 0.12, R * (1.05 - jumpK * 0.18), R * (0.9 - jumpK * 0.15), 0, 0, PI2); ctx.fill();
      ctx.restore();

      // ---- tubuh (berputar mengikuti bidikan) ----
      ctx.save(); this._xf(ctx, x, y, R);
      ctx.lineJoin = 'round'; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(2.5, R * 0.07);
      const limb = ctx.createLinearGradient(0, -R, 0, R); limb.addColorStop(0, pal[1]); limb.addColorStop(1, pal[2]);
      const wig = cheer ? Math.sin(t * 12) * 0.45 : 0;
      for (let s = -1; s <= 1; s += 2) {
        // kaki belakang: paha + telapak + jari
        ctx.fillStyle = limb;
        ctx.beginPath(); ctx.ellipse(-0.6 * R, s * 0.84 * R, 0.56 * R, 0.3 * R, -s * 0.54, 0, PI2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(-1.02 * R, s * 1.1 * R, 0.34 * R, 0.17 * R, s * 0.25, 0, PI2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = pal[1];
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(-1.3 * R, s * (1.1 + k * 0.1) * R + 0, 0.07 * R, 0, PI2); ctx.fill(); }
        // kaki depan
        ctx.fillStyle = limb;
        ctx.beginPath(); ctx.ellipse(0.42 * R, s * 1.0 * R, 0.3 * R, 0.16 * R, s * (0.46 + wig), 0, PI2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = pal[1];
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(0.72 * R, s * (1.1 + k * 0.09) * R, 0.065 * R, 0, PI2); ctx.fill(); }
      }
      // badan
      const bg = ctx.createRadialGradient(-0.25 * R, -0.35 * R, 0.1 * R, 0, 0, 1.15 * R);
      bg.addColorStop(0, pal[0]); bg.addColorStop(0.55, pal[1]); bg.addColorStop(1, pal[2]);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, 1.02 * R, 0.92 * R, 0, 0, PI2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.spots;
      ctx.beginPath(); ctx.arc(-0.45 * R, -0.28 * R, 0.17 * R, 0, PI2); ctx.arc(-0.38 * R, 0.32 * R, 0.13 * R, 0, PI2); ctx.arc(-0.72 * R, 0.02 * R, 0.11 * R, 0, PI2); ctx.arc(-0.12 * R, 0.1 * R, 0.08 * R, 0, PI2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(-0.2 * R, -0.5 * R, 0.3 * R, 0.12 * R, -0.5, 0, PI2); ctx.fill();

      // mulut lebar di depan
      const m = this.mouth, mx = 1.0 * R, rx = R * (0.08 + 0.2 * m), ry = R * (0.2 + 0.4 * m);
      ctx.lineCap = 'round';
      ctx.strokeStyle = C.lip; ctx.lineWidth = R * 0.09;
      ctx.beginPath(); ctx.moveTo(0.78 * R, -0.62 * R); ctx.quadraticCurveTo(sad ? 0.7 * R : 1.22 * R, 0, 0.78 * R, 0.62 * R); ctx.stroke();
      if (m > 0.25) {
        ctx.fillStyle = C.mouth; ctx.beginPath(); ctx.ellipse(mx, 0, rx, ry, 0, 0, PI2); ctx.fill();
        ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.ellipse(mx - rx * 0.35, 0, rx * 0.45, ry * 0.45, 0, 0, PI2); ctx.fill();
      }
      if (this.tongue > 0) { // lidah menjulur
        const p = 1 - this.tongue / 0.16, len = Math.sin(p * Math.PI) * 1.05 * R;
        ctx.strokeStyle = C.tongue; ctx.lineWidth = R * 0.15;
        ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx + len, 0); ctx.stroke();
        ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.arc(mx + len, 0, R * 0.12, 0, PI2); ctx.fill();
      }
      ctx.restore();

      // ---- bola di mulut (tegak) ----
      if (ballCb) { const p = this.mouthPos(x, y, R, { x: 0, y: 0 }); ballCb(p.x, p.y, m); }

      // ---- bibir atas, mata, pipi, ekspresi ----
      ctx.save(); this._xf(ctx, x, y, R);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // pipi
      ctx.fillStyle = C.cheek;
      for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.ellipse(0.7 * R, s * 0.5 * R, R * (happy ? 0.17 : 0.12), R * (happy ? 0.11 : 0.08), 0, 0, PI2); ctx.fill(); }
      // mata besar menonjol
      const lead = Math.max(-1, Math.min(1, angDiff(this.aim, this.angle))), blink = this.blink > 0;
      for (let s = -1; s <= 1; s += 2) {
        const ex = 0.2 * R, ey = s * 0.7 * R, er = 0.36 * R;
        ctx.fillStyle = pal[1]; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(2.5, R * 0.07); // tonjolan mata
        ctx.beginPath(); ctx.arc(ex - 0.05 * R, ey, er * 1.18, 0, PI2); ctx.fill(); ctx.stroke();
        if (happy || blink) { // mata tertutup ∩
          ctx.strokeStyle = C.pupil; ctx.lineWidth = R * 0.11;
          ctx.beginPath(); ctx.arc(ex - 0.1 * R, ey, er * 0.62, -1.15, 1.15); ctx.stroke();
        } else if (hurt) { // mata menyipit >
          ctx.strokeStyle = C.pupil; ctx.lineWidth = R * 0.11;
          ctx.beginPath(); ctx.moveTo(ex - 0.12 * R, ey - 0.2 * R); ctx.lineTo(ex + 0.14 * R, ey); ctx.lineTo(ex - 0.12 * R, ey + 0.2 * R); ctx.stroke();
        } else {
          ctx.fillStyle = C.eyeWhite; ctx.beginPath(); ctx.arc(ex, ey, er, 0, PI2); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
          const px = ex + 0.1 * R + Math.cos(lead) * 0.06 * R, py = ey + Math.sin(lead) * 0.12 * R + (sad ? 0.1 * R * s * 0 : 0);
          ctx.fillStyle = C.pupil; ctx.beginPath(); ctx.arc(px, py, er * (sad ? 0.42 : 0.52), 0, PI2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px + er * 0.18, py - er * 0.2, er * 0.17, 0, PI2); ctx.fill();
          if (sad) { // kelopak turun + alis sedih
            ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.arc(ex, ey, er * 1.02, -1.45, 1.45); ctx.lineTo(ex + er * 0.15, ey + 0); ctx.closePath(); ctx.fill();
            const ty = ((t * 0.9) % 1); // air mata menetes
            ctx.fillStyle = C.tear; ctx.beginPath(); ctx.ellipse(ex + er * 0.2, ey + s * (er * 0.9 + ty * er * 1.2), er * 0.14, er * 0.2, 0, 0, PI2); ctx.fill();
          }
        }
      }
      if (hurt) { ctx.fillStyle = C.tear; ctx.beginPath(); ctx.ellipse(0.1 * R, -1.0 * R, R * 0.09, R * 0.14, 0.3, 0, PI2); ctx.fill(); }
      ctx.restore();
    }
  }

  GA.Frog = { Frog: Frog };
})(window.GA = window.GA || {});
