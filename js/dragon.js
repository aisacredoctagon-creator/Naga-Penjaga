/* dragon.js — Naga Penjaga: ilustrasi berbasis bagian (kepala + rahang, leher bersegmen, badan, dua sayap bertulang, ekor bersegmen,
 * kaki bercakar, tanduk, duri punggung) dengan animasi skeletal 2D di Canvas. Leher dan ekor memakai simulasi pegas sehingga mengalir.
 * Sisik bertekstur (js/render/textures.js), cahaya tepi dari api, bayangan jatuh ke altar. Warna & parameter di Theme.dragon.
 *   dragon.setAim(angle)          kepala & leher menoleh dengan inersia (badan & sayap tetap menjaga sarang)
 *   dragon.shoot()                rahang membuka, kepala menghentak ke belakang (recoil) lalu menyembur
 *   dragon.react(kind)            'happy' (mengaum kecil) | 'hurt' (kaget) | 'sad' | 'cheer' (sayap membentang, api ke atas) | 'idle'
 *   dragon.freeze(sec)            naga membeku (tidak bisa menembak) selama sec detik
 *   dragon.update(dt, ballReady)  idle: bernapas, sayap mengepak pelan, ekor bergoyang, berkedip acak
 *   dragon.draw(ctx, x, y, R, ballCb)   ballCb opsional (null = tanpa bola api di mulut, seperti permainan sejak revisi 10)
 * Dragon.drawSleeping(ctx, w, h, t) menggambar naga tidur (untuk popup Jeda). */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;
  const PI2 = Math.PI * 2;
  const LX = 0.55, LY = 0.8;           // arah jatuh bayangan (sama dengan peta)

  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= PI2; while (d < -Math.PI) d += PI2; return d; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // jerami sarang: pola tetap
  const STRAW = []; (function () { let s = 11; for (let i = 0; i < 46; i++) { s = (s * 9301 + 49297) % 233280; const a = s / 233280 * PI2; s = (s * 9301 + 49297) % 233280; STRAW.push([a, 0.72 + s / 233280 * 0.58, ((i * 37) % 100) / 100]); } })();

  // pola sisik per konteks & ukuran (CanvasPattern ringan)
  const patCache = new WeakMap();
  function scalePattern(ctx, pal, R) {
    let m = patCache.get(ctx); if (!m) { m = Object.create(null); patCache.set(ctx, m); }
    const key = pal[1] + ':' + Math.round(R);
    if (!m[key]) { const p = ctx.createPattern(GA.Textures.scales(pal, 64), 'repeat'); try { p.setTransform(new DOMMatrix().scale(R / 56)); } catch (e) { /* abaikan */ } m[key] = p; }
    return m[key];
  }

  /** Titik pada kurva Bezier kubik (koordinat dalam satuan R). */
  function bez(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  }
  const TAIL_N = 9, NECK_N = 5;
  const TAIL_REST = (function () { const a = []; for (let i = 0; i < TAIL_N; i++) a.push(bez([0, 0.5], [-0.1, 1.15], [-0.85, 1.25], [-1.15, 0.62], i / (TAIL_N - 1))); return a; })();

  class Dragon {
    constructor() {
      this.angle = -Math.PI / 2; this.aim = this.angle; this.prevAngle = this.angle; this.angVel = 0;
      this.expr = 'idle'; this.exprT = 0;
      this.t = Math.random() * 10; this.blink = 0; this.blinkT = rand(1, 3);
      this.kick = 0; this.kickv = 0;      // pegas kepala saat menembak
      this.mouth = 0.55; this.frozen = 0; this.flap = 0; this.fph = Math.random() * PI2; this.flapFlag = false; this.boost = 0; this.roar = 0; this.hurtT = 0;
      this.tail = TAIL_REST.map(function (p) { return [p[0], p[1]]; });
      this.neck = []; for (let i = 0; i < NECK_N; i++) this.neck.push([0, 0]);
      this._neckInit = false;
    }

    setAim(a) { this.aim = a; }
    reset() { this.expr = 'idle'; this.exprT = 0; this.kick = 0; this.kickv = 0; this.frozen = 0; this.roar = 0; }
    freeze(sec) { this.frozen = Math.max(this.frozen, sec); }

    react(kind) {
      if (kind === 'happy') { if (this.expr === 'idle' || this.expr === 'happy' || this.expr === 'hurt') { this.expr = 'happy'; this.exprT = 1.0; this.roar = 1; } }
      else if (kind === 'hurt') { if (this.expr === 'sad' || this.expr === 'cheer') return; this.expr = 'hurt'; this.exprT = 0.9; this.kick = -0.5; this.kickv = 0; this.hurtT = 0.9; }
      else if (kind === 'sad') { this.expr = 'sad'; this.exprT = Infinity; }
      else if (kind === 'cheer') { this.expr = 'cheer'; this.exprT = Infinity; }
      else { this.expr = 'idle'; this.exprT = 0; }
    }

    shoot() {
      this.angle = this.aim;
      this.boost = 1; this.kick = 1; this.kickv = 0;   // kepala tersentak ke belakang, lalu menyembur ke depan
      this.mouth = 1;
    }

    update(dt, ready) {
      const C = Theme.dragon;
      this.t += dt; if (Dragon.pulse > 0) Dragon.pulse = Math.max(0, Dragon.pulse - dt * 3);
      const target = this.expr === 'cheer' ? -Math.PI / 2 : this.aim;
      this.angle += angDiff(target, this.angle) * Math.min(1, dt * 14);
      this.angVel += (angDiff(this.angle, this.prevAngle) / Math.max(dt, 0.001) - this.angVel) * Math.min(1, dt * 12); this.prevAngle = this.angle;
      this.kickv += (-300 * this.kick - 16 * this.kickv) * dt; this.kick += this.kickv * dt;
      if (this.exprT !== Infinity && this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = 'idle'; }
      if (this.frozen > 0) this.frozen -= dt;
      if (this.roar > 0) this.roar -= dt * 1.6;
      if (this.hurtT > 0) this.hurtT -= dt;
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blink = 0.14; this.blinkT = rand(C.blinkEvery[0], C.blinkEvery[1]); }
      if (this.blink > 0) this.blink -= dt;
      const tm = this.expr === 'sad' ? 0.05 : (this.expr === 'cheer' ? 1 : (this.expr === 'happy' ? 0.8 : (ready ? 0.6 : 0.2)));
      this.mouth += (tm - this.mouth) * Math.min(1, dt * 12);
      const tf = this.expr === 'cheer' ? 1 : (this.expr === 'sad' ? -0.5 : 0);
      this.flap += (tf - this.flap) * Math.min(1, dt * 6);
      this.simulate(dt);
      if (this.boost > 0) this.boost -= dt * 2;
      if (this.frozen <= 0) {      // kepakan berirama: pelan saat melayang, cepat saat menembak/bersorak, lesu saat sedih
        const rate = this.expr === 'cheer' ? 10 : (this.expr === 'sad' ? 1.3 : 3.6 + this.boost * 3), prev = this.fph % PI2;
        this.fph += dt * rate; const cur = this.fph % PI2;
        if ((prev < Math.PI / 2 && cur >= Math.PI / 2) || (prev > cur && cur >= 0 && Math.PI / 2 <= cur + 0.0001)) { this.flapFlag = true; Dragon.pulse = 1; if (Dragon.onFlap) Dragon.onFlap(this); }   // awal ayunan turun
      }
    }

    flapAmp() { return this.expr === 'cheer' ? 1.0 : (this.expr === 'sad' ? 0.15 : 0.42 + this.boost * 0.35); }

    /** Pegas leher (mengikuti kepala dengan jeda) dan ekor (mengalir). Semua dalam satuan R. */
    simulate(dt) {
      const a = this.angle, dx = Math.cos(a), dy = Math.sin(a), t = this.t, sad = this.expr === 'sad';
      const hd = (sad ? 0.5 : Theme.dragon.headDist) - this.kick * 0.3, sx = dx * 0.12, sy = dy * 0.12, hx = dx * hd, hy = dy * hd;
      for (let i = 0; i < NECK_N; i++) {
        const u = i / (NECK_N - 1), sw = Math.sin(t * 1.3 + i * 0.9) * 0.018 * Math.sin(u * Math.PI);
        const tx = sx + (hx - sx) * u - dy * sw, ty = sy + (hy - sy) * u + dx * sw;
        if (!this._neckInit) { this.neck[i][0] = tx; this.neck[i][1] = ty; continue; }
        const k = Math.min(1, dt * (i === 0 ? 40 : 22 - i * 3.5));
        this.neck[i][0] += (tx - this.neck[i][0]) * k; this.neck[i][1] += (ty - this.neck[i][1]) * k;
      }
      this._neckInit = true;
      const cheer = this.expr === 'cheer', swish = cheer ? 3.2 : 1.5, tk = -this.kick * 0.2;
      for (let i = 1; i < TAIL_N; i++) {
        const r = TAIL_REST[i], sway = Math.sin(t * swish + i * 0.55) * 0.045 * i + tk * (i / TAIL_N), lift = sad ? 0.06 * i : 0;
        const tx = r[0] + sway * 0.6 + (cheer ? 0.18 * (i / TAIL_N) : 0), ty = r[1] + sway * 0.8 + lift;
        const k = Math.min(1, dt * (13 - i * 1.1));
        this.tail[i][0] += (tx - this.tail[i][0]) * k; this.tail[i][1] += (ty - this.tail[i][1]) * k;
      }
    }

    /** Posisi dunia pusat bola api di mulut. */
    mouthPos(x, y, R, out) {
      const d = R * Theme.dragon.mouthDist - this.kick * R * 0.3;
      out.x = x + Math.cos(this.angle) * d; out.y = y + Math.sin(this.angle) * d;
      return out;
    }

    /* ---------- bagian-bagian gambar ---------- */
    strokeChain(ctx, pts, R, w0, w1, style, outline, outW) {
      const n = pts.length;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (outline) for (let i = 0; i < n - 1; i++) {
        const u = i / (n - 2 || 1); ctx.strokeStyle = outline; ctx.lineWidth = (w0 + (w1 - w0) * u) * R + outW;
        ctx.beginPath(); ctx.moveTo(pts[i][0] * R, pts[i][1] * R); ctx.lineTo(pts[i + 1][0] * R, pts[i + 1][1] * R); ctx.stroke();
      }
      for (let i = 0; i < n - 1; i++) {
        const u = i / (n - 2 || 1); ctx.strokeStyle = style; ctx.lineWidth = (w0 + (w1 - w0) * u) * R;
        ctx.beginPath(); ctx.moveTo(pts[i][0] * R, pts[i][1] * R); ctx.lineTo(pts[i + 1][0] * R, pts[i + 1][1] * R); ctx.stroke();
      }
    }

    /* ---------- sayap (tampak ATAS): lengan, pergelangan, empat jari bertulang, selaput bergerigi tembus cahaya ---------- */
    wingPts(f, sp) {
      const lift = f * 0.2, S = [0.36, -0.12], E = [0.36 + 0.6 * sp, -0.52 - lift], Wr = [E[0] + 0.55 * sp, E[1] + 0.02 - lift * 0.5];
      const FA = [-0.3, 0.5, 1.2, 1.9], FL = [0.62, 0.98, 0.98, 0.8], F = FA.map(function (a, i) { const aa = a + f * 0.1 * (i - 1); return [Wr[0] + Math.cos(aa) * FL[i] * sp, Wr[1] + Math.sin(aa) * FL[i] * (0.9 + 0.1 * sp)]; });
      return { S: S, E: E, Wr: Wr, F: F, B: [0.4, 0.66] };
    }

    wing(ctx, s, R, f, C, pal, pat) {
      const sad = this.expr === 'sad', sp = (1 - 0.2 * Math.max(0, f) + 0.08 * Math.max(0, -f)) * C.wingSpan, P = this.wingPts(sad ? -0.5 : f, sp);
      const S = P.S, E = P.E, Wr = P.Wr, F = P.F, B = P.B, k = function (p) { return [p[0] * R, p[1] * R]; };
      const sS = k(S), sE = k(E), sW = k(Wr), sF = F.map(k), sB = k(B);
      const mid = function (p, q) { return [(p[0] + q[0]) / 2 + (sW[0] - (p[0] + q[0]) / 2) * 0.3, (p[1] + q[1]) / 2 + (sW[1] - (p[1] + q[1]) / 2) * 0.3]; };
      const path = function () {
        ctx.beginPath(); ctx.moveTo(sS[0], sS[1]); ctx.lineTo(sE[0], sE[1]); ctx.lineTo(sW[0], sW[1]); ctx.lineTo(sF[0][0], sF[0][1]);
        for (let i = 0; i < 3; i++) { const m = mid(sF[i], sF[i + 1]); ctx.quadraticCurveTo(m[0], m[1], sF[i + 1][0], sF[i + 1][1]); }
        const m = mid(sF[3], sB); ctx.quadraticCurveTo(m[0], m[1], sB[0], sB[1]); ctx.closePath();
      };
      ctx.save(); ctx.scale(s, 1);
      const wg = ctx.createLinearGradient(sW[0], sW[1], sB[0], sB[1]); wg.addColorStop(0, C.wing[0]); wg.addColorStop(1, C.wing[1]);
      ctx.globalAlpha = 0.93; path(); ctx.fillStyle = wg; ctx.fill(); ctx.globalAlpha = 1;
      ctx.save(); ctx.clip(); ctx.globalAlpha = 0.22; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = pat; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4); ctx.restore();   // tekstur kulit
      // tembus cahaya: selaput lebih terang mendekati tepi bergerigi
      ctx.save(); path(); ctx.clip(); const lg = ctx.createRadialGradient(sW[0], sW[1], R * 0.2, sW[0], sW[1], R * 1.3); lg.addColorStop(0, 'rgba(255,235,170,0)'); lg.addColorStop(1, 'rgba(255,235,170,0.3)'); ctx.fillStyle = lg; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4); ctx.restore();
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.8, R * 0.045); ctx.strokeStyle = C.outline; path(); ctx.stroke();
      // urat selaput (primer dari pergelangan, sekunder di antara jari)
      ctx.strokeStyle = 'rgba(120,50,10,0.42)'; ctx.lineWidth = Math.max(0.8, R * 0.018); ctx.beginPath();
      for (let i = 0; i < 3; i++) { const m = mid(sF[i], sF[i + 1]); ctx.moveTo(sW[0], sW[1]); ctx.lineTo((sF[i][0] + sF[i + 1][0]) / 2, (sF[i][1] + sF[i + 1][1]) / 2); ctx.moveTo((sW[0] + m[0]) / 2, (sW[1] + m[1]) / 2); ctx.lineTo(m[0], m[1]); }
      ctx.moveTo(sS[0], sS[1] + R * 0.1); ctx.lineTo(sF[3][0] * 0.7 + sB[0] * 0.3, sF[3][1] * 0.7 + sB[1] * 0.3); ctx.stroke();
      // tulang: lengan tebal, jari meruncing
      ctx.strokeStyle = '#5a2c10'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, R * 0.07); ctx.beginPath(); ctx.moveTo(sS[0], sS[1]); ctx.lineTo(sE[0], sE[1]); ctx.lineTo(sW[0], sW[1]); ctx.stroke();
      ctx.lineWidth = Math.max(1.4, R * 0.04); ctx.beginPath(); sF.forEach(function (p) { ctx.moveTo(sW[0], sW[1]); ctx.lineTo(p[0], p[1]); }); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,160,0.45)'; ctx.lineWidth = Math.max(1, R * 0.02); ctx.beginPath(); ctx.moveTo(sS[0], sS[1] - 1); ctx.lineTo(sE[0], sE[1] - 1); ctx.lineTo(sW[0], sW[1] - 1); ctx.stroke();   // cahaya tepi
      ctx.fillStyle = C.horn; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1, R * 0.025);    // cakar sayap di pergelangan
      ctx.beginPath(); ctx.moveTo(sW[0] - R * 0.03, sW[1] - R * 0.03); ctx.quadraticCurveTo(sW[0] + R * 0.08, sW[1] - R * 0.2, sW[0] + R * 0.2, sW[1] - R * 0.14); ctx.quadraticCurveTo(sW[0] + R * 0.08, sW[1] - R * 0.06, sW[0] + R * 0.03, sW[1] + R * 0.03); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    /** Bayangan di tanah (naga TERBANG): siluet badan + sayap + kepala dengan offset menurut ketinggian, tiga lapis membesar-memudar agar lembut. */
    shadow(ctx, x, y, R, f, hx, hy, alt) {
      const C = Theme.dragon, sp = (1 - 0.2 * Math.max(0, f) + 0.08 * Math.max(0, -f)) * C.wingSpan, P = this.wingPts(f, sp), ox = R * 0.42 * alt, oy = R * 0.66 * alt;
      for (let pass = 0; pass < 3; pass++) {
        const sc = 1 + pass * 0.1, a = 0.1 + (2 - pass) * 0.015;
        ctx.save(); ctx.translate(x + ox, y + oy); ctx.scale(sc, sc); ctx.fillStyle = 'rgba(6,14,10,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.ellipse(0, R * 0.1, R * 0.55, R * 0.9, 0, 0, PI2); ctx.fill();
        for (let s = -1; s <= 1; s += 2) {
          ctx.beginPath(); ctx.moveTo(s * P.S[0] * R, P.S[1] * R); ctx.lineTo(s * P.E[0] * R, P.E[1] * R); ctx.lineTo(s * P.Wr[0] * R, P.Wr[1] * R);
          P.F.forEach(function (p) { ctx.lineTo(s * p[0] * R, p[1] * R); }); ctx.lineTo(s * P.B[0] * R, P.B[1] * R); ctx.closePath(); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(hx * 0.9, hy * 0.9, R * 0.3, 0, PI2); ctx.fill();
        this.strokeChain(ctx, this.tail, R, 0.22, 0.04, 'rgba(6,14,10,' + a.toFixed(3) + ')');
        ctx.restore();
      }
    }

    /** Kepala TAMPAK ATAS (menghadap +x di sistem lokal): moncong memanjang dengan lubang hidung di ujung, dua mata di sisi atas, tanduk & jumbai di belakang.
     *  Saat menyembur: rongga mulut terbuka terlihat gelap dengan gigi di tepi, lidah dan tenggorokan menyala jingga. */
    head(ctx, R, op, m, pal, pat, C, a) {
      const E = this.expr, hurt = E === 'hurt', happy = E === 'happy', sad = E === 'sad', cheer = E === 'cheer';
      const lx = -0.6 * Math.cos(a) - 0.8 * Math.sin(a), ly = 0.6 * Math.sin(a) - 0.8 * Math.cos(a);   // arah cahaya (kiri-atas dunia) dalam sistem kepala
      const prof = [[-0.3, 0], [-0.29, 0.13], [-0.2, 0.235], [-0.05, 0.27], [0.1, 0.215], [0.27, 0.15], [0.43, 0.11], [0.56, 0.085], [0.63, 0.035], [0.645, 0]];
      const outline = function (grow) {
        ctx.beginPath(); ctx.moveTo(prof[0][0] * R, 0);
        for (let i = 1; i < prof.length; i++) { const p = prof[i], q = prof[i - 1]; ctx.quadraticCurveTo(q[0] * R, (q[1] + grow) * R, (p[0] + q[0]) / 2 * R, ((p[1] + q[1]) / 2 + grow * 0.5) * R); }
        ctx.lineTo(prof[prof.length - 1][0] * R, 0);
        for (let i = prof.length - 2; i >= 0; i--) { const p = prof[i], q = prof[i + 1]; ctx.quadraticCurveTo(q[0] * R, -(q[1] + grow) * R, (p[0] + q[0]) / 2 * R, -((p[1] + q[1]) / 2 + grow * 0.5) * R); }
        ctx.closePath();
      };
      // jumbai pipi + tanduk menyapu ke belakang (di belakang tengkorak)
      ctx.fillStyle = C.wing[1]; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1.2, R * 0.03);
      for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 3; k++) {
        const bx = -0.02 - k * 0.1, by = s * 0.23, tx = bx - 0.18 - k * 0.03, ty = s * (0.42 + k * 0.06 + (cheer ? 0.06 : 0));
        ctx.beginPath(); ctx.moveTo(bx * R, by * R); ctx.lineTo(tx * R, ty * R); ctx.lineTo((bx - 0.06) * R, (by + s * 0.03) * R); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = C.horn;
      for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.moveTo(-0.14 * R, s * 0.14 * R); ctx.quadraticCurveTo(-0.4 * R, s * 0.2 * R, -0.72 * R, s * (0.46 + (sad ? 0.08 : 0)) * R); ctx.quadraticCurveTo(-0.42 * R, s * 0.3 * R, -0.2 * R, s * 0.27 * R); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // rahang bawah (lebih gelap, sedikit melebar saat mulut terbuka)
      ctx.fillStyle = pal[2]; outline(0.02 + op * 0.7); ctx.fill(); ctx.stroke();
      // tengkorak + rahang atas
      const jg = ctx.createLinearGradient(lx * R * 0.4, ly * R * 0.4, -lx * R * 0.4, -ly * R * 0.4); jg.addColorStop(0, pal[0]); jg.addColorStop(0.55, pal[1]); jg.addColorStop(1, pal[2]);
      ctx.fillStyle = jg; outline(0); ctx.fill(); ctx.stroke();
      ctx.save(); outline(0); ctx.clip(); ctx.globalAlpha = 0.4; ctx.fillStyle = pat; ctx.fillRect(-R, -R, R * 2, R * 2); ctx.globalAlpha = 1;
      // rongga mulut terbuka (di dalam moncong): gelap, tenggorokan menyala, lidah, gigi di tepi
      if (op > 0.035 || m > 0.45) {
        const ry = R * (0.02 + op * 0.55);
        ctx.fillStyle = C.mouthIn; ctx.beginPath(); ctx.ellipse(0.46 * R, 0, R * 0.2, ry, 0, 0, PI2); ctx.fill();
        const tg = ctx.createRadialGradient(0.3 * R, 0, 0, 0.3 * R, 0, R * 0.3); tg.addColorStop(0, 'rgba(255,170,60,' + (0.85 * Math.min(1, m + 0.2)).toFixed(2) + ')'); tg.addColorStop(1, 'rgba(255,110,20,0)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(0.3 * R, 0, R * 0.3, 0, PI2); ctx.fill();
        ctx.fillStyle = '#e8607a'; ctx.beginPath(); ctx.ellipse(0.44 * R, 0, R * 0.12, ry * 0.45, 0, 0, PI2); ctx.fill();
        ctx.fillStyle = C.tooth; ctx.strokeStyle = 'rgba(40,20,10,0.5)'; ctx.lineWidth = 0.8;
        for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 4; k++) { const gx = (0.33 + k * 0.075) * R, w = R * 0.026; ctx.beginPath(); ctx.moveTo(gx - w, s * ry); ctx.lineTo(gx, s * (ry - R * 0.05)); ctx.lineTo(gx + w, s * ry); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      } else { ctx.strokeStyle = 'rgba(8,40,24,0.7)'; ctx.lineWidth = Math.max(1, R * 0.025); ctx.beginPath(); ctx.moveTo(0.34 * R, 0); ctx.lineTo(0.62 * R, 0); ctx.stroke(); }   // garis mulut tertutup
      ctx.restore();
      // punggung moncong: pelat tengah + kilau sisi yang terkena cahaya
      ctx.fillStyle = 'rgba(255,255,220,0.2)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse((0.02 + k * 0.1) * R, 0, R * 0.04, R * (0.07 - k * 0.01), 0, 0, PI2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(255,255,220,0.42)'; ctx.lineWidth = Math.max(1, R * 0.03); const ls = ly < 0 ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(-0.2 * R, ls * 0.22 * R); ctx.quadraticCurveTo(0.2 * R, ls * 0.16 * R, 0.55 * R, ls * 0.07 * R); ctx.stroke();
      // lubang hidung di ujung moncong
      ctx.fillStyle = 'rgba(10,50,30,0.9)'; for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.ellipse(0.575 * R, s * 0.035 * R, R * 0.016, R * 0.011, 0.3 * s, 0, PI2); ctx.fill(); }
      // alis & mata (dua mata di sisi atas kepala)
      ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(2, R * 0.05); ctx.lineCap = 'round';
      for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.moveTo(-0.04 * R, s * 0.28 * R); ctx.lineTo(0.13 * R, s * (sad ? 0.2 : 0.16) * R); ctx.stroke(); }
      for (let s = -1; s <= 1; s += 2) {
        const ex = 0.04 * R, ey = s * 0.2 * R, er = R * 0.075, closed = this.blink > 0 || happy || sad || cheer;
        ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.35, er * 1.3, 0, 0, PI2); ctx.fill();   // rongga mata menonjol
        if (closed) { ctx.strokeStyle = C.pupil; ctx.lineWidth = Math.max(2, R * 0.04); ctx.beginPath(); if (sad) ctx.arc(ex, ey, er, Math.PI * 0.1, Math.PI * 0.9, s < 0); else ctx.arc(ex - er * 0.2, ey, er * 0.9, -1.2, 1.2); ctx.stroke(); }
        else {
          const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 2); eg.addColorStop(0, 'rgba(255,230,120,0.5)'); eg.addColorStop(1, 'rgba(255,200,60,0)'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, er * 2, 0, PI2); ctx.fill();
          ctx.fillStyle = hurt ? '#fff' : C.eye; ctx.beginPath(); ctx.arc(ex, ey, er * (hurt ? 1.3 : 1), 0, PI2); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.outline; ctx.stroke();
          const lag = Math.max(-1, Math.min(1, this.angVel * 0.05)) * er * 0.4;
          ctx.fillStyle = C.pupil; ctx.beginPath(); ctx.ellipse(ex + er * 0.15, ey + lag, er * (hurt ? 0.35 : 0.28), er * (hurt ? 0.9 : 0.78), 0, 0, PI2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - er * 0.1, ey - er * 0.3, er * 0.2, 0, PI2); ctx.fill();
        }
      }
      // cahaya api di moncong (aditif)
      if (m > 0.3 && !hurt) { ctx.globalCompositeOperation = 'lighter'; const fg = ctx.createRadialGradient(R * 0.45, 0, 0, R * 0.45, 0, R * 0.5); fg.addColorStop(0, 'rgba(255,150,50,' + (0.35 * m).toFixed(3) + ')'); fg.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(R * 0.45, 0, R * 0.5, 0, PI2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    }

    /** Hembusan kepakan: debu, daun, dan percikan terlempar dari ujung sayap. */
    gust(x, y, R, f) {
      const FX = GA.FX; if (!FX || FX.reduce || (GA.Quality && GA.Quality.level === 'rendah')) return;
      const sp = this.expr === 'cheer' ? 1.3 : 1, n = this.expr === 'cheer' ? 6 : 3, pal = ['#d8cfae', '#a9c27a', '#c79a52', '#8fb35a'];
      for (let i = 0; i < n; i++) {
        const s = i % 2 ? 1 : -1, ang = (s > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9, v = (70 + Math.random() * 110) * sp * FX.unit, wx = x + s * R * 1.3, wy = y - R * 0.15;
        FX.spawn(wx, wy, Math.cos(ang) * v, Math.sin(ang) * v - 12, 0.5 + Math.random() * 0.5, R * (0.05 + Math.random() * 0.05), pal[i % pal.length], i % 3 === 0 ? 2 : 0, 20);
      }
    }

    draw(ctx, x, y, R, ballCb) {
      const C = Theme.dragon, E = this.expr, t = this.t;
      const hurt = E === 'hurt', happy = E === 'happy', sad = E === 'sad', cheer = E === 'cheer';
      const pal = hurt ? C.hurt : C.body, pat = scalePattern(ctx, pal, R);
      const breathe = 1 + C.breath * Math.sin(t * 2.2), alt = 1 + 0.06 * Math.sin(t * 1.9 + 1);     // melayang: naik-turun lembut
      const f = this.frozen > 0 ? 0 : Math.cos(this.fph) * this.flapAmp() + (sad ? -0.3 : 0);
      const shiver = this.frozen > 0 ? Math.sin(t * 60) * 1.2 : (this.hurtT > 0 ? Math.sin(t * 55) * R * 0.03 * this.hurtT : 0);
      const a = this.angle, dir = { x: Math.cos(a), y: Math.sin(a) }, recoil = -this.kick * R * 0.07;
      const nk = this.neck, hx = nk[NECK_N - 1][0] * R, hy = nk[NECK_N - 1][1] * R;
      if (this.flapFlag) { this.flapFlag = false; this.gust(x, y, R, f); }

      this.shadow(ctx, x + shiver, y, R * breathe, f, hx + dir.x * recoil, hy + dir.y * recoil, alt);   // bayangan terbang di tanah

      ctx.save(); ctx.translate(x + shiver, y);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.translate(dir.x * recoil, dir.y * recoil);
      ctx.scale(breathe, breathe);

      // ---- ekor bersegmen (runcing, berduri, ujung seperti bilah) ----
      const tp = this.tail;
      this.strokeChain(ctx, tp, R, 0.3, 0.05, pat, C.outline, Math.max(2, R * 0.06));
      this.strokeChain(ctx, tp.map(function (p) { return [p[0] - 0.01, p[1] - 0.018]; }), R, 0.1, 0.02, 'rgba(255,255,230,0.16)');
      ctx.fillStyle = C.spike; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1, R * 0.025);
      for (let i = 1; i < TAIL_N - 1; i++) { const p = tp[i], q = tp[i + 1], an = Math.atan2(q[1] - p[1], q[0] - p[0]), w = (0.3 + (0.05 - 0.3) * i / TAIL_N) * R * 0.55; ctx.save(); ctx.translate(p[0] * R, p[1] * R); ctx.rotate(an - Math.PI / 2); ctx.beginPath(); ctx.moveTo(-w * 0.5, 0); ctx.lineTo(0, -w * 1.25); ctx.lineTo(w * 0.5, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      { const p = tp[TAIL_N - 1], q = tp[TAIL_N - 2], an = Math.atan2(p[1] - q[1], p[0] - q[0]); ctx.save(); ctx.translate(p[0] * R, p[1] * R); ctx.rotate(an); ctx.fillStyle = C.spike; ctx.beginPath(); ctx.moveTo(-R * 0.03, 0); ctx.quadraticCurveTo(R * 0.04, -R * 0.2, R * 0.28, 0); ctx.quadraticCurveTo(R * 0.04, R * 0.2, -R * 0.03, 0); ctx.fill(); ctx.stroke(); ctx.restore(); }

      // ---- kaki belakang mencengkeram (tampak atas: pangkal paha + cakar mencuat) ----
      for (let s = -1; s <= 1; s += 2) {
        const fx = s * R * 0.5, fy = R * 0.66;
        ctx.fillStyle = pat; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1.4, R * 0.04); ctx.beginPath(); ctx.ellipse(fx, fy, R * 0.2, R * 0.27, s * 0.35, 0, PI2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.horn; for (let c = -1; c <= 1; c++) { ctx.beginPath(); ctx.moveTo(fx + s * R * 0.1 + c * R * 0.07, fy + R * 0.2); ctx.lineTo(fx + s * R * 0.12 + c * R * 0.08, fy + R * 0.34); ctx.lineTo(fx + s * R * 0.04 + c * R * 0.07, fy + R * 0.22); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      }

      // ---- badan bersisik (tampak atas: punggung berpelat) ----
      ctx.beginPath(); ctx.ellipse(0, R * 0.1, R * 0.52, R * 0.88, 0, 0, PI2);
      ctx.fillStyle = pat; ctx.fill();
      const sh = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, R * 0.05, R * 1.0); sh.addColorStop(0, 'rgba(255,255,230,0.2)'); sh.addColorStop(0.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,20,10,0.5)');
      ctx.fillStyle = sh; ctx.fill();
      ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(2, R * 0.055); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, R * 0.1, R * 0.52, R * 0.88, 0, 0, PI2); ctx.clip();
      ctx.fillStyle = 'rgba(8,60,36,0.22)'; ctx.fillRect(-R * 0.14, -R, R * 0.28, R * 2);      // alur tulang punggung
      ctx.strokeStyle = 'rgba(255,240,180,0.16)'; ctx.lineWidth = Math.max(1, R * 0.03); for (let k = 0; k < 7; k++) { const yy = -R * 0.5 + k * R * 0.19; ctx.beginPath(); ctx.moveTo(-R * 0.5, yy); ctx.quadraticCurveTo(0, yy - R * 0.1, R * 0.5, yy); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,220,0.4)'; ctx.lineWidth = Math.max(1.5, R * 0.035); ctx.beginPath(); ctx.ellipse(-R * 0.01, R * 0.1, R * 0.5, R * 0.86, 0, Math.PI * 1.02, Math.PI * 1.62); ctx.stroke();   // cahaya tepi kiri-atas
      // pelat punggung di garis tengah
      ctx.fillStyle = C.spike; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1, R * 0.025);
      for (let k = 0; k < 8; k++) { const yy = -R * 0.45 + k * R * 0.15, w = R * (0.085 - k * 0.006); ctx.beginPath(); ctx.moveTo(0, yy - w * 1.1); ctx.lineTo(w, yy); ctx.lineTo(0, yy + w * 0.9); ctx.lineTo(-w, yy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // cahaya api hangat di badan ketika bola siap
      if (this.mouth > 0.3 && !hurt) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const wg = ctx.createRadialGradient(dir.x * R * 0.7, dir.y * R * 0.7, 0, dir.x * R * 0.7, dir.y * R * 0.7, R * 1.0);
        wg.addColorStop(0, 'rgba(255,150,50,' + (0.28 * this.mouth * (0.85 + 0.15 * Math.sin(t * 9))).toFixed(3) + ')'); wg.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(dir.x * R * 0.7, dir.y * R * 0.7, R * 1.0, 0, PI2); ctx.fill(); ctx.restore();
      }

      // ---- leher bersegmen (mengikuti kepala dengan inersia) ----
      this.strokeChain(ctx, nk, R, 0.32, 0.23, pat, C.outline, Math.max(2, R * 0.06));
      this.strokeChain(ctx, nk.map(function (p) { return [p[0] - 0.012, p[1] - 0.02]; }), R, 0.1, 0.07, 'rgba(255,255,230,0.2)');
      ctx.fillStyle = C.spike; ctx.strokeStyle = C.outline; ctx.lineWidth = Math.max(1, R * 0.02);
      for (let i = 1; i < NECK_N - 1; i++) { const p = nk[i], an = Math.atan2(nk[i + 1][1] - nk[i - 1][1], nk[i + 1][0] - nk[i - 1][0]); ctx.save(); ctx.translate(p[0] * R, p[1] * R); ctx.rotate(an); ctx.beginPath(); ctx.moveTo(-R * 0.05, -R * 0.045); ctx.lineTo(R * 0.04, 0); ctx.lineTo(-R * 0.05, R * 0.045); ctx.closePath(); ctx.fill(); ctx.restore(); }

      // ---- sayap di atas badan (tampak atas, terbentang ke kiri-kanan) ----
      this.wing(ctx, -1, R, f, C, pal, pat); this.wing(ctx, 1, R, f, C, pal, pat);
      ctx.restore();

      // ---- kepala ----
      const rp = (1 + C.breath * Math.sin(t * 2.2)), hs = 1.4 * (1 + this.roar * 0.14);
      ctx.save(); ctx.translate(x + shiver + (hx + dir.x * recoil) * rp, y + (hy + dir.y * recoil) * rp); ctx.rotate(a); ctx.scale(hs, hs); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      this.head(ctx, R, this.mouth * 0.14 + this.roar * 0.05, this.mouth, pal, pat, C, a);
      ctx.restore();

      // ---- bola api di ujung moncong: hanya bila ballCb diberikan (permainan tidak memakainya; bola api muncul hanya saat melesat) ----
      if (ballCb) { const p = this.mouthPos(x + shiver, y, R, { x: 0, y: 0 }); ballCb(p.x, p.y, this.mouth); }

      // ---- efek: asap saat senang, es saat membeku, kilatan merah saat kaget ----
      if (happy) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let k = 0; k < 3; k++) { const ph = (t * 1.6 + k * 0.33) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(x + hx + dir.x * R * 0.5 + Math.sin(ph * 6 + k) * 4, y + hy + dir.y * R * 0.5 - ph * R * 0.8, R * (0.07 + ph * 0.1), 0, PI2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      if (this.hurtT > 0) { ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.min(0.4, this.hurtT * 0.5); ctx.fillStyle = '#ff3a3a'; ctx.beginPath(); ctx.ellipse(0, R * 0.1, R * 0.6, R * 0.95, 0, 0, PI2); ctx.fill(); ctx.restore(); }
      if (this.frozen > 0) {
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = 'rgba(150,215,255,0.38)'; ctx.beginPath(); ctx.ellipse(0, R * 0.05, R * 1.25, R * 1.0, 0, 0, PI2); ctx.fill();
        ctx.strokeStyle = 'rgba(230,248,255,0.9)'; ctx.lineWidth = Math.max(2, R * 0.05);
        for (let k = 0; k < 8; k++) { const aa = k * PI2 / 8 + 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(aa) * R * 0.9, Math.sin(aa) * R * 0.9); ctx.lineTo(Math.cos(aa) * R * 1.2, Math.sin(aa) * R * 1.2); ctx.stroke(); }
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

  Dragon.pulse = 0; Dragon.onFlap = null;      // pulse: denyut kepakan 0..1 (dipakai sarang agar telur bergetar); onFlap: kait untuk bunyi kepakan
  GA.Dragon = { Dragon: Dragon, drawSleeping: Dragon.drawSleeping };
})(window.GA = window.GA || {});
