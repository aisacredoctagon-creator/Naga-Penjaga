/* dragon.js — Naga Penjaga: gambar (Canvas) + animasi + ekspresi. Warna & parameter ada di Theme.dragon.
 * Pengganti frog.js dengan API yang sama:
 *   dragon.setAim(angle)          kepala & leher menoleh halus ke arah bidikan (badan & sayap tetap menjaga sarang)
 *   dragon.shoot()                kepala menghentak ke belakang lalu menyembur
 *   dragon.react(kind)            'happy' | 'hurt' | 'sad' | 'cheer' | 'idle'
 *   dragon.freeze(sec)            naga membeku (tidak bisa menembak) selama sec detik
 *   dragon.update(dt, ballReady)  idle: bernapas, sayap bergerak pelan, berkedip acak
 *   dragon.draw(ctx, x, y, R, ballCb)   ballCb(wx, wy, open) menggambar bola api di mulut (tegak, tidak ikut berputar)
 * Dragon.drawSleeping(ctx, w, h, t) menggambar naga tidur (untuk popup Jeda). */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;
  const PI2 = Math.PI * 2;

  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= PI2; while (d < -Math.PI) d += PI2; return d; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // jerami sarang: pola tetap
  const STRAW = []; (function () { let s = 11; for (let i = 0; i < 46; i++) { s = (s * 9301 + 49297) % 233280; const a = s / 233280 * PI2; s = (s * 9301 + 49297) % 233280; STRAW.push([a, 0.72 + s / 233280 * 0.58, ((i * 37) % 100) / 100]); } })();

  class Dragon {
    constructor() {
      this.angle = -Math.PI / 2; this.aim = this.angle;
      this.expr = 'idle'; this.exprT = 0;
      this.t = Math.random() * 10; this.blink = 0; this.blinkT = rand(1, 3);
      this.kick = 0; this.kickv = 0;      // pegas kepala saat menembak
      this.mouth = 0.55; this.frozen = 0; this.flap = 0;
    }

    setAim(a) { this.aim = a; }
    reset() { this.expr = 'idle'; this.exprT = 0; this.kick = 0; this.kickv = 0; this.frozen = 0; }
    freeze(sec) { this.frozen = Math.max(this.frozen, sec); }

    react(kind) {
      if (kind === 'happy') { if (this.expr === 'idle' || this.expr === 'happy' || this.expr === 'hurt') { this.expr = 'happy'; this.exprT = 1.0; } }
      else if (kind === 'hurt') { if (this.expr === 'sad' || this.expr === 'cheer') return; this.expr = 'hurt'; this.exprT = 0.9; this.kick = -0.5; this.kickv = 0; }
      else if (kind === 'sad') { this.expr = 'sad'; this.exprT = Infinity; }
      else if (kind === 'cheer') { this.expr = 'cheer'; this.exprT = Infinity; }
      else { this.expr = 'idle'; this.exprT = 0; }
    }

    shoot() {
      this.angle = this.aim;
      this.kick = 1; this.kickv = 0;   // kepala tersentak ke belakang, lalu menyembur ke depan
      this.mouth = 1;
    }

    update(dt, ready) {
      const C = Theme.dragon;
      this.t += dt;
      const target = this.expr === 'cheer' ? -Math.PI / 2 : this.aim;
      this.angle += angDiff(target, this.angle) * Math.min(1, dt * 14);
      this.kickv += (-300 * this.kick - 16 * this.kickv) * dt; this.kick += this.kickv * dt;
      if (this.exprT !== Infinity && this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = 'idle'; }
      if (this.frozen > 0) this.frozen -= dt;
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blink = 0.14; this.blinkT = rand(C.blinkEvery[0], C.blinkEvery[1]); }
      if (this.blink > 0) this.blink -= dt;
      const tm = this.expr === 'sad' ? 0.05 : (this.expr === 'cheer' ? 1 : (this.expr === 'happy' ? 0.8 : (ready ? 0.6 : 0.2)));
      this.mouth += (tm - this.mouth) * Math.min(1, dt * 12);
      const tf = this.expr === 'cheer' ? 1 : (this.expr === 'sad' ? -0.5 : 0);
      this.flap += (tf - this.flap) * Math.min(1, dt * 6);
    }

    /** Posisi dunia pusat bola api di mulut. */
    mouthPos(x, y, R, out) {
      const d = R * Theme.dragon.mouthDist - this.kick * R * 0.3;
      out.x = x + Math.cos(this.angle) * d; out.y = y + Math.sin(this.angle) * d;
      return out;
    }

    draw(ctx, x, y, R, ballCb) {
      const C = Theme.dragon, E = this.expr, t = this.t;
      const hurt = E === 'hurt', happy = E === 'happy', sad = E === 'sad', cheer = E === 'cheer';
      const pal = hurt ? C.hurt : C.body;
      const breathe = 1 + C.breath * Math.sin(t * 2.2);
      const wingA = Math.sin(t * 1.7) * 0.07 + this.flap * (cheer ? 0.45 + Math.sin(t * 11) * 0.18 : 0.2);
      const shiver = this.frozen > 0 ? Math.sin(t * 60) * 1.2 : 0;

      ctx.save(); ctx.translate(x + shiver, y);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';

      // ---- sarang jerami di bawah naga ----
      const ng = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 1.42);
      ng.addColorStop(0, C.nest[1]); ng.addColorStop(0.75, C.nest[0]); ng.addColorStop(1, C.nest[1]);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, R * 0.12, R * 1.38, R * 1.28, 0, 0, PI2); ctx.fill();
      ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(0, 0, R * 1.32, 0, PI2); ctx.fill();
      ctx.strokeStyle = 'rgba(90,55,10,0.55)'; ctx.lineWidth = Math.max(1.5, R * 0.035);
      for (let i = 0; i < STRAW.length; i++) {
        const s = STRAW[i], a = s[0], r0 = R * s[1], len = R * (0.18 + s[2] * 0.22);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a + 0.5) * (r0 + len * 0.3), Math.sin(a + 0.5) * (r0 + len * 0.3)); ctx.stroke();
      }

      ctx.scale(breathe, breathe);
      ctx.lineWidth = Math.max(2, R * 0.055); ctx.strokeStyle = C.outline;

      // ---- ekor melingkar ----
      const tail = ctx.createLinearGradient(0, R * 0.5, -R, R * 1.2); tail.addColorStop(0, pal[1]); tail.addColorStop(1, pal[2]);
      ctx.strokeStyle = C.outline; ctx.lineWidth = R * 0.4; ctx.beginPath(); ctx.moveTo(0, R * 0.55); ctx.bezierCurveTo(-R * 0.1, R * 1.15, -R * 0.8, R * 1.2, -R * 1.0, R * 0.7); ctx.stroke();
      ctx.strokeStyle = pal[1]; ctx.lineWidth = R * 0.32; ctx.beginPath(); ctx.moveTo(0, R * 0.55); ctx.bezierCurveTo(-R * 0.1, R * 1.15, -R * 0.8, R * 1.2, -R * 1.0, R * 0.7); ctx.stroke();
      ctx.fillStyle = C.spike; ctx.beginPath(); ctx.moveTo(-R * 1.0, R * 0.52); ctx.lineTo(-R * 1.22, R * 0.62); ctx.lineTo(-R * 1.02, R * 0.88); ctx.closePath(); ctx.fill();

      // ---- sayap (menjaga sarang) ----
      for (let s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.translate(s * R * 0.5, -R * 0.05); ctx.rotate(s * (0.18 + wingA));
        const wg = ctx.createLinearGradient(0, 0, s * R * 1.1, -R * 0.4); wg.addColorStop(0, C.wing[1]); wg.addColorStop(1, C.wing[0]);
        ctx.fillStyle = wg; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(2, R * 0.045);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * R * 0.7, -R * 0.75, s * R * 1.3, -R * 0.55);
        ctx.quadraticCurveTo(s * R * 1.05, -R * 0.2, s * R * 1.18, R * 0.12); ctx.quadraticCurveTo(s * R * 0.8, R * 0.0, s * R * 0.75, R * 0.42);
        ctx.quadraticCurveTo(s * R * 0.4, R * 0.18, 0, R * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(120,50,10,0.55)'; ctx.lineWidth = Math.max(1.5, R * 0.035);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * R * 1.28, -R * 0.55); ctx.moveTo(0, R * 0.05); ctx.lineTo(s * R * 1.16, R * 0.1); ctx.moveTo(0, R * 0.1); ctx.lineTo(s * R * 0.76, R * 0.4); ctx.stroke();
        ctx.restore();
      }

      // ---- kaki bercakar ----
      ctx.fillStyle = pal[2];
      for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath(); ctx.ellipse(s * R * 0.55, R * 0.62, R * 0.22, R * 0.16, s * 0.4, 0, PI2); ctx.fill();
        ctx.fillStyle = C.horn; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(s * R * (0.62 + k * 0.1), R * 0.78, R * 0.045, 0, PI2); ctx.fill(); }
        ctx.fillStyle = pal[2];
      }

      // ---- badan ----
      const bg = ctx.createRadialGradient(-R * 0.25, -R * 0.2, R * 0.1, 0, 0, R * 1.0);
      bg.addColorStop(0, pal[0]); bg.addColorStop(0.55, pal[1]); bg.addColorStop(1, pal[2]);
      ctx.fillStyle = bg; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(2, R * 0.055);
      ctx.beginPath(); ctx.ellipse(0, R * 0.05, R * 0.72, R * 0.88, 0, 0, PI2); ctx.fill(); ctx.stroke();
      const bl = ctx.createLinearGradient(0, -R * 0.5, 0, R * 0.8); bl.addColorStop(0, C.belly[0]); bl.addColorStop(1, C.belly[1]);
      ctx.fillStyle = bl; ctx.beginPath(); ctx.ellipse(0, R * 0.12, R * 0.38, R * 0.7, 0, 0, PI2); ctx.fill();
      ctx.strokeStyle = 'rgba(150,100,20,0.45)'; ctx.lineWidth = Math.max(1.2, R * 0.03);
      for (let k = 0; k < 5; k++) { const yy = -R * 0.28 + k * R * 0.2; ctx.beginPath(); ctx.moveTo(-R * 0.3, yy); ctx.quadraticCurveTo(0, yy + R * 0.07, R * 0.3, yy); ctx.stroke(); }
      ctx.fillStyle = C.spike;   // duri punggung
      for (let k = 0; k < 4; k++) { const yy = R * 0.42 + k * R * 0.12; ctx.beginPath(); ctx.moveTo(0, yy - R * 0.07); ctx.lineTo(R * 0.06, yy + R * 0.04); ctx.lineTo(-R * 0.06, yy + R * 0.04); ctx.closePath(); ctx.fill(); }

      // ---- leher ke kepala ----
      const a = this.angle, dir = { x: Math.cos(a), y: Math.sin(a) };
      const hd = (sad ? 0.5 : C.headDist) * R - this.kick * R * 0.3;
      const hx = dir.x * hd, hy = dir.y * hd;
      ctx.strokeStyle = C.outline; ctx.lineWidth = R * 0.3; ctx.beginPath(); ctx.moveTo(dir.x * R * 0.1, dir.y * R * 0.1); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = pal[1]; ctx.lineWidth = R * 0.23; ctx.beginPath(); ctx.moveTo(dir.x * R * 0.1, dir.y * R * 0.1); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = C.belly[1]; ctx.lineWidth = R * 0.09; ctx.beginPath(); ctx.moveTo(dir.x * R * 0.1, dir.y * R * 0.1); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.restore();

      // ---- bola api di mulut (tegak) ----
      if (ballCb) { const p = this.mouthPos(x + shiver, y, R, { x: 0, y: 0 }); ballCb(p.x, p.y, this.mouth); }

      // ---- kepala (di atas bola: rahang memegang bola) ----
      ctx.save(); ctx.translate(x + shiver + hx * breathe, y + hy * breathe); ctx.rotate(a); ctx.scale(1.4, 1.4); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const m = this.mouth, op = m * 0.14;
      // tanduk
      ctx.fillStyle = C.horn; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1.5, R * 0.04);
      for (let s = -1; s <= 1; s += 2) {
        ctx.beginPath(); ctx.moveTo(-R * 0.08, s * R * 0.2); ctx.quadraticCurveTo(-R * 0.35, s * R * 0.3, -R * 0.5, s * R * 0.5); ctx.quadraticCurveTo(-R * 0.3, s * R * 0.16, -R * 0.02, s * R * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // rahang bawah
      const jg = ctx.createLinearGradient(0, -R * 0.3, 0, R * 0.3); jg.addColorStop(0, pal[0]); jg.addColorStop(1, pal[2]);
      ctx.fillStyle = C.mouthIn; ctx.beginPath(); ctx.ellipse(R * 0.28, 0, R * 0.26, R * (0.04 + op), 0, 0, PI2); ctx.fill();
      if (m > 0.3) { ctx.fillStyle = C.glow; ctx.beginPath(); ctx.ellipse(R * 0.3, 0, R * 0.2, R * (0.03 + op * 0.8), 0, 0, PI2); ctx.fill(); }
      ctx.fillStyle = jg; ctx.beginPath(); ctx.moveTo(R * 0.02, R * (0.05 + op)); ctx.quadraticCurveTo(R * 0.3, R * (0.1 + op * 1.6), R * 0.5, R * (0.04 + op * 1.2)); ctx.lineTo(R * 0.46, R * (0.13 + op * 1.1)); ctx.quadraticCurveTo(R * 0.2, R * (0.24 + op), R * 0.0, R * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      // tengkorak + rahang atas
      ctx.beginPath(); ctx.moveTo(-R * 0.3, 0); ctx.quadraticCurveTo(-R * 0.3, -R * 0.3, R * 0.08, -R * 0.27);
      ctx.quadraticCurveTo(R * 0.4, -R * (0.2 + op * 0.8), R * 0.55, -R * (0.07 + op * 1.2)); ctx.lineTo(R * 0.5, -R * (0.01 + op * 0.6)); ctx.quadraticCurveTo(R * 0.28, -R * (0.04 + op * 0.4), R * 0.02, -R * 0.03);
      ctx.quadraticCurveTo(-R * 0.3, R * 0.02, -R * 0.3, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-R * 0.3, 0); ctx.quadraticCurveTo(-R * 0.3, R * 0.3, R * 0.08, R * 0.27); ctx.quadraticCurveTo(R * 0.0, R * 0.05, -R * 0.3, 0); ctx.fill();
      // gigi
      ctx.fillStyle = C.tooth;
      for (let k = 0; k < 3; k++) { const gx = R * (0.22 + k * 0.1); ctx.beginPath(); ctx.moveTo(gx, -R * (0.05 + op * 0.55)); ctx.lineTo(gx + R * 0.035, -R * (0.01 + op * 0.55) + R * 0.07); ctx.lineTo(gx + R * 0.07, -R * (0.05 + op * 0.55)); ctx.fill(); }
      // lubang hidung + asap kecil saat senang
      ctx.fillStyle = 'rgba(10,50,30,0.8)'; for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.arc(R * 0.44, s * R * 0.03 - R * 0.05 * (s < 0 ? 1 : 0) + R * 0.05 * (s > 0 ? 0 : 0) , R * 0.018, 0, PI2); ctx.fill(); }
      // mata
      for (let s = -1; s <= 1; s += 2) {
        const ex = R * 0.06, ey = s * R * 0.18, er = R * 0.085;
        const closed = this.blink > 0 || happy || sad || cheer;
        if (closed) {
          ctx.strokeStyle = C.pupil; ctx.lineWidth = Math.max(2, R * 0.045);
          ctx.beginPath();
          if (sad) { ctx.arc(ex - R * 0.02, ey, er, -0.4, 0.4 + Math.PI, true); } else { ctx.arc(ex - R * 0.04, ey, er * 0.9, -1.1, 1.1); }
          ctx.stroke();
        } else {
          ctx.fillStyle = hurt ? '#fff' : C.eye; ctx.beginPath(); ctx.arc(ex, ey, er * (hurt ? 1.3 : 1), 0, PI2); ctx.fill();
          ctx.lineWidth = 1.5; ctx.strokeStyle = C.outline; ctx.stroke();
          ctx.fillStyle = C.pupil; ctx.beginPath(); ctx.ellipse(ex + R * 0.02, ey, er * (hurt ? 0.35 : 0.3), er * (hurt ? 0.9 : 0.8), 0, 0, PI2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + R * 0.0, ey - er * 0.3, er * 0.2, 0, PI2); ctx.fill();
        }
        // alis
        ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(2, R * 0.04);
        ctx.beginPath(); ctx.moveTo(ex - R * 0.06, ey - s * R * (sad ? 0.02 : 0.1)); ctx.lineTo(ex + R * 0.1, ey - s * R * (sad ? 0.12 : 0.07)); ctx.stroke();
      }
      ctx.restore();

      // ---- efek: asap saat senang, es saat membeku ----
      if (happy) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let k = 0; k < 3; k++) { const ph = (t * 1.6 + k * 0.33) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(x + hx + dir.x * R * 0.5 + Math.sin(ph * 6 + k) * 4, y + hy + dir.y * R * 0.5 - ph * R * 0.8, R * (0.07 + ph * 0.1), 0, PI2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      if (this.frozen > 0) {
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = 'rgba(150,215,255,0.38)'; ctx.beginPath(); ctx.ellipse(0, R * 0.05, R * 1.0, R * 1.0, 0, 0, PI2); ctx.fill();
        ctx.strokeStyle = 'rgba(230,248,255,0.9)'; ctx.lineWidth = Math.max(2, R * 0.05);
        for (let k = 0; k < 8; k++) { const aa = k * PI2 / 8 + 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(aa) * R * 0.9, Math.sin(aa) * R * 0.9); ctx.lineTo(Math.cos(aa) * R * 1.15, Math.sin(aa) * R * 1.15); ctx.stroke(); }
        ctx.restore();
      }
    }

    /** Naga tidur melingkar di sarang bersama telur (maskot popup Jeda). */
    static drawSleeping(ctx, w, h, t) {
      const C = Theme.dragon, u = Math.min(w, h) / 136;
      ctx.save(); ctx.scale(u, u);
      const sky = ctx.createLinearGradient(0, 0, 0, 136); sky.addColorStop(0, '#1a1550'); sky.addColorStop(1, '#4a3a96');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 136, 136);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; [[18, 22, 1.4], [44, 12, 1], [96, 20, 1.2], [118, 40, 1], [26, 52, 0.9], [78, 8, 0.9]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, PI2); ctx.fill(); });
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(104, 28, 14, 0, PI2); ctx.fill(); ctx.fillStyle = '#4a3a96'; ctx.beginPath(); ctx.arc(110, 24, 12, 0, PI2); ctx.fill();
      ctx.fillStyle = '#2d6a4a'; ctx.beginPath(); ctx.ellipse(68, 140, 100, 34, 0, 0, PI2); ctx.fill();
      const ng = ctx.createRadialGradient(68, 104, 6, 68, 104, 56); ng.addColorStop(0, C.nest[0]); ng.addColorStop(1, C.nest[1]);
      ctx.fillStyle = ng; ctx.beginPath(); ctx.ellipse(68, 104, 56, 22, 0, 0, PI2); ctx.fill();
      ctx.strokeStyle = 'rgba(90,55,10,0.6)'; ctx.lineWidth = 1.6; for (let i = 0; i < 18; i++) { const a = i * 0.35; ctx.beginPath(); ctx.moveTo(68 + Math.cos(a) * 46, 104 + Math.sin(a) * 15); ctx.lineTo(68 + Math.cos(a + 0.4) * 54, 104 + Math.sin(a + 0.4) * 19); ctx.stroke(); }
      // telur
      [[26, 98, '#ffe9a8'], [44, 106, '#ffd2e8'], [104, 100, '#c9f0ff']].forEach(function (e, i) {
        const g = ctx.createRadialGradient(e[0] - 3, e[1] - 5, 1, e[0], e[1], 12); g.addColorStop(0, '#fff'); g.addColorStop(1, e[2]);
        ctx.fillStyle = g; ctx.strokeStyle = 'rgba(70,40,10,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(e[0], e[1], 8.5, 11, 0, 0, PI2); ctx.fill(); ctx.stroke();
      });
      // tubuh melingkar
      const bg = ctx.createRadialGradient(60, 80, 6, 68, 92, 44); bg.addColorStop(0, C.body[0]); bg.addColorStop(0.6, C.body[1]); bg.addColorStop(1, C.body[2]);
      const br = 1 + 0.02 * Math.sin((t || 0) * 2);
      ctx.save(); ctx.translate(68, 92); ctx.scale(br, br); ctx.translate(-68, -92);
      ctx.fillStyle = bg; ctx.strokeStyle = C.outline; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(68, 90, 40, 26, 0, 0, PI2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.body[1]; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(104, 96); ctx.bezierCurveTo(124, 100, 126, 80, 112, 76); ctx.stroke();
      ctx.fillStyle = C.spike; ctx.beginPath(); ctx.moveTo(110, 70); ctx.lineTo(118, 72); ctx.lineTo(112, 80); ctx.fill();
      const wg = ctx.createLinearGradient(40, 60, 80, 90); wg.addColorStop(0, C.wing[0]); wg.addColorStop(1, C.wing[1]);
      ctx.fillStyle = wg; ctx.strokeStyle = C.outline; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(52, 78); ctx.quadraticCurveTo(54, 54, 80, 58); ctx.quadraticCurveTo(76, 70, 84, 82); ctx.quadraticCurveTo(66, 78, 52, 78); ctx.closePath(); ctx.fill(); ctx.stroke();
      // kepala bertumpu di kaki
      ctx.fillStyle = bg; ctx.strokeStyle = C.outline; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.ellipse(40, 90, 20, 15, -0.15, 0, PI2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.horn; ctx.beginPath(); ctx.moveTo(44, 78); ctx.quadraticCurveTo(52, 66, 60, 68); ctx.quadraticCurveTo(54, 76, 50, 82); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.pupil; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(36, 87, 5, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,120,140,0.5)'; ctx.beginPath(); ctx.ellipse(28, 94, 4, 2.6, 0, 0, PI2); ctx.fill();
      ctx.restore();
      // Zzz
      ctx.fillStyle = '#fff'; ctx.font = '800 14px ' + Theme.fonts.ui; ctx.textAlign = 'center';
      [[20, 66, 12], [30, 50, 16], [44, 32, 20]].forEach(function (z, i) { ctx.globalAlpha = 0.9 - i * 0.15; ctx.font = '800 ' + z[2] + 'px ' + Theme.fonts.ui; ctx.fillText('z', z[0], z[1] + Math.sin((t || 0) * 2 + i) * 1.5); });
      ctx.restore();
    }
  }

  GA.Dragon = { Dragon: Dragon, drawSleeping: Dragon.drawSleeping };
})(window.GA = window.GA || {});
