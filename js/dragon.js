/* dragon.js — Naga Penjaga (revisi 11): SPRITE BERLAPIS prarender, tampak ATAS (badan+ekor+kaki, dua sayap, kepala terpisah dengan moncong, lubang hidung, dua mata di atas, tanduk, rahang yang terbuka saat
 * menyembur). Per frame hanya drawImage + transform: kepala dan leher berputar mengikuti bidikan, napas = skala kecil, kedip, recoil singkat saat menembak, sayap mengepak 2–3 kali singkat saat menembak
 * dan terus saat menang, sprite ekspresi (idle/senang/kaget/sedih). Tanpa simulasi pegas/IK, sisik pola, atau bayangan dinamis (bayangan datar di bawah naga). Warna: Theme.dragon.
 *   dragon.setAim(a) · shoot() · react(kind: happy|hurt|sad|cheer|idle) · freeze(sec) · update(dt, ready) · draw(ctx, x, y, R) · mouthPos(x, y, R, out) · Dragon.drawSleeping(ctx, w, h, t) (maskot Jeda). */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, PI2 = Math.PI * 2;
/** Pengganti gradien untuk gambar tidur statis (revisi 11): satu warna datar = stop kedua (nada tengah) bila ada. */  const FG = function () { let first = null, mid = null, n = 0; return { addColorStop: function (o, c) { if (n++ === 1) mid = c; if (first === null) first = c; }, toString: function () { return mid || first; } }; };
  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= PI2; while (d < -Math.PI) d += PI2; return d; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h || w)); return c; }

  const store = { px: 0, n: 0, map: Object.create(null) };
  const OUT = '#0d3a2a';
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }

  /** Badan + ekor + kaki belakang (satuan R; pusat badan di (0,0); kepala ke atas). */
  function bodySprite(qr, px) {
    const C = Theme.dragon, W = 3.2, H = 3.6, c = mk(W * qr * px, H * qr * px), g = c.getContext('2d'); g.scale(px * qr, px * qr); g.translate(W / 2, 1.5); g.lineJoin = 'round'; g.lineCap = 'round';
    const lw = Math.max(0.03, 1.6 / qr);
    const tail = [[0, 0.6], [-0.15, 1.1], [-0.55, 1.45], [-1.0, 1.35], [-1.25, 1.0]];      // ekor: pita meruncing melengkung ke kiri-bawah
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < tail.length - 1; i++) { const w0 = 0.34 - i * 0.075; g.strokeStyle = pass ? C.body[1] : OUT; g.lineWidth = pass ? w0 : w0 + lw * 2; g.beginPath(); g.moveTo(tail[i][0], tail[i][1]); g.lineTo(tail[i + 1][0], tail[i + 1][1]); g.stroke(); }
    g.fillStyle = C.spike; for (let i = 1; i < tail.length - 1; i++) { poly(g, [tail[i][0] - 0.07, tail[i][1] - 0.04, tail[i][0] + 0.02, tail[i][1] - 0.2, tail[i][0] + 0.1, tail[i][1] - 0.02]); g.fill(); }
    for (let s = -1; s <= 1; s += 2) {      // kaki belakang + cakar
      g.fillStyle = C.body[1]; g.strokeStyle = OUT; g.lineWidth = lw; g.beginPath(); g.ellipse(s * 0.5, 0.62, 0.19, 0.27, s * 0.35, 0, PI2); g.fill(); g.stroke();
      g.fillStyle = C.horn; for (let k = -1; k <= 1; k++) { poly(g, [s * 0.52 + k * 0.07 - 0.03, 0.84, s * 0.54 + k * 0.08, 1.02, s * 0.52 + k * 0.07 + 0.03, 0.84]); g.fill(); }
    }
    g.fillStyle = C.body[2]; g.strokeStyle = OUT; g.lineWidth = lw * 1.4; g.beginPath(); g.ellipse(0, 0.12, 0.56, 0.78, 0, 0, PI2); g.fill(); g.stroke();      // badan
    g.fillStyle = C.body[1]; g.beginPath(); g.ellipse(-0.06, 0.06, 0.46, 0.68, 0, 0, PI2); g.fill();
    g.fillStyle = C.body[0]; g.globalAlpha = 0.75; g.beginPath(); g.ellipse(-0.18, -0.12, 0.16, 0.34, 0.15, 0, PI2); g.fill(); g.globalAlpha = 1;
    g.fillStyle = C.belly[1]; g.beginPath(); g.ellipse(0, 0.26, 0.2, 0.46, 0, 0, PI2); g.fill();
    g.fillStyle = C.spike; for (let i = 0; i < 5; i++) { const y = -0.25 + i * 0.22; poly(g, [-0.07, y + 0.07, 0, y - 0.11, 0.07, y + 0.07]); g.fill(); }      // duri punggung
    return c;
  }

  /** Sayap kiri (kanan = cermin): lengan bertulang dari bahu ke luar, selaput bergerigi. Satuan R; bahu di (W-0.1, 1.2). */
  function wingSprite(qr, px) {
    const C = Theme.dragon, W = 2.1, H = 2.2, c = mk(W * qr * px, H * qr * px), g = c.getContext('2d'); g.scale(px * qr, px * qr); g.translate(W - 0.1, 1.2); g.lineJoin = 'round'; g.lineCap = 'round';
    const lw = Math.max(0.03, 1.6 / qr), sh = [0, 0], wr = [-1.05, -0.75], t1 = [-1.9, -0.2], t2 = [-1.75, 0.45], t3 = [-1.2, 0.7];
    g.fillStyle = C.wing[1]; g.strokeStyle = OUT; g.lineWidth = lw * 1.4;
    g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(wr[0], wr[1]); g.lineTo(t1[0], t1[1]); g.quadraticCurveTo(-1.75, 0.0, t2[0], t2[1]); g.quadraticCurveTo(-1.5, 0.45, t3[0], t3[1]); g.quadraticCurveTo(-0.5, 0.55, 0, 0.3); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.wing[0]; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(wr[0], wr[1]); g.lineTo(t1[0], t1[1]); g.lineTo(-1.2, -0.1); g.closePath(); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = OUT; g.lineWidth = lw * 1.8; [t1, t2, t3].forEach(function (t) { g.beginPath(); g.moveTo(wr[0], wr[1]); g.lineTo(t[0], t[1]); g.stroke(); }); g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(wr[0], wr[1]); g.stroke();
    return c;
  }

  /** Kepala (menghadap atas). mouth: 0 tertutup | 1 terbuka (rahang bawah terlihat). eyes: open | blink | happy | hurt | sad. Pusat tengkorak di (W/2, 1.3). */
  function headSprite(qr, px, mouth, eyes) {
    const C = Theme.dragon, W = 1.5, H = 2.1, c = mk(W * qr * px, H * qr * px), g = c.getContext('2d'); g.scale(px * qr, px * qr); g.translate(W / 2, 1.3); g.lineJoin = 'round'; g.lineCap = 'round';
    const lw = Math.max(0.03, 1.6 / qr);
    g.fillStyle = C.horn; g.strokeStyle = OUT; g.lineWidth = lw; for (let s = -1; s <= 1; s += 2) { poly(g, [s * 0.2, 0.1, s * 0.5, 0.42, s * 0.3, -0.02]); g.fill(); g.stroke(); }      // tanduk melengkung ke belakang
    if (mouth) {      // rahang bawah terbuka: rongga gelap + gigi
      g.fillStyle = '#3a0c10'; g.strokeStyle = OUT; poly(g, [-0.17, -0.28, 0.17, -0.28, 0.23, -0.78, -0.23, -0.78]); g.fill();
      g.fillStyle = C.body[2]; poly(g, [-0.19, -0.2, 0.19, -0.2, 0.3, -0.5, -0.3, -0.5]); g.fill(); g.stroke();
      g.fillStyle = '#fffbe8'; for (let k = -1; k <= 1; k += 2) { poly(g, [k * 0.17, -0.55, k * 0.22, -0.7, k * 0.12, -0.6]); g.fill(); }
    }
    g.fillStyle = C.body[1]; g.strokeStyle = OUT; g.lineWidth = lw * 1.3;
    g.beginPath(); g.ellipse(0, 0.08, 0.36, 0.34, 0, 0, PI2); g.fill(); g.stroke();      // tengkorak
    poly(g, [-0.3, -0.12, -0.17, mouth ? -0.62 : -0.76, 0.17, mouth ? -0.62 : -0.76, 0.3, -0.12]); g.fill(); g.stroke();      // moncong
    g.fillStyle = C.body[0]; g.globalAlpha = 0.7; g.beginPath(); g.ellipse(-0.1, -0.1, 0.1, 0.2, 0.2, 0, PI2); g.fill(); g.globalAlpha = 1;
    g.fillStyle = OUT; for (let s = -1; s <= 1; s += 2) { g.beginPath(); g.ellipse(s * 0.07, mouth ? -0.57 : -0.7, 0.032, 0.045, 0, 0, PI2); g.fill(); }      // lubang hidung
    g.fillStyle = C.spike; poly(g, [-0.05, 0.28, 0, 0.1, 0.05, 0.28]); g.fill();
    for (let s = -1; s <= 1; s += 2) {      // dua mata di atas kepala
      const ex = s * 0.2, ey = -0.04;
      if (eyes === 'blink') { g.strokeStyle = OUT; g.lineWidth = lw * 1.6; g.beginPath(); g.moveTo(ex - 0.08, ey); g.lineTo(ex + 0.08, ey); g.stroke(); continue; }
      if (eyes === 'happy') { g.strokeStyle = C.pupil; g.lineWidth = lw * 1.8; g.beginPath(); g.arc(ex, ey + 0.04, 0.08, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
      g.fillStyle = eyes === 'hurt' ? '#fff' : C.eye; g.strokeStyle = OUT; g.lineWidth = lw; g.beginPath(); g.ellipse(ex, ey, 0.1, eyes === 'sad' ? 0.06 : 0.115, 0, 0, PI2); g.fill(); g.stroke();
      g.fillStyle = C.pupil; g.beginPath(); g.ellipse(ex, ey + (eyes === 'sad' ? 0.015 : 0), eyes === 'hurt' ? 0.016 : 0.028, eyes === 'sad' ? 0.04 : 0.09, 0, 0, PI2); g.fill();
    }
    return c;
  }

  function sprites(R, px) {
    const qr = Math.max(8, Math.round(R / 2) * 2);
    if (store.px !== px || store.n > 12) { store.px = px; store.map = Object.create(null); store.n = 0; }
    let s = store.map[qr];
    if (!s) { s = store.map[qr] = { qr: qr, body: bodySprite(qr, px), wing: wingSprite(qr, px), heads: {} }; store.n++; }
    return s;
  }
  function head(s, px, mouth, eyes) { const k = mouth + eyes; return s.heads[k] || (s.heads[k] = headSprite(s.qr, px, mouth === 'o' ? 1 : 0, eyes)); }

  class Dragon {
    constructor() {
      this.angle = -Math.PI / 2; this.aim = this.angle;
      this.expr = 'idle'; this.exprT = 0;
      this.t = Math.random() * 10; this.blink = 0; this.blinkT = rand(1, 3);
      this.kick = 0; this.kickv = 0;      // recoil kepala saat menembak
      this.mouth = 0.5; this.frozen = 0; this.flapT = 0; this.fph = 0; this.hurtT = 0; this.roar = 0;
    }
    setAim(a) { this.aim = a; }
    reset() { this.expr = 'idle'; this.exprT = 0; this.kick = 0; this.kickv = 0; this.frozen = 0; this.flapT = 0; this.roar = 0; }
    freeze(sec) { this.frozen = Math.max(this.frozen, sec); }

    react(kind) {
      if (kind === 'happy') { if (this.expr === 'idle' || this.expr === 'happy' || this.expr === 'hurt') { this.expr = 'happy'; this.exprT = 1.0; this.roar = 1; } }
      else if (kind === 'hurt') { if (this.expr === 'sad' || this.expr === 'cheer') return; this.expr = 'hurt'; this.exprT = 0.9; this.kick = -0.5; this.kickv = 0; this.hurtT = 0.9; }
      else if (kind === 'sad') { this.expr = 'sad'; this.exprT = Infinity; }
      else if (kind === 'cheer') { this.expr = 'cheer'; this.exprT = Infinity; }
      else { this.expr = 'idle'; this.exprT = 0; }
    }
    shoot() { this.angle = this.aim; this.kick = 1; this.kickv = 0; this.mouth = 1; if (this.frozen <= 0) this.flapT = 0.3; }      // kepakan singkat (2–3 frame)

    update(dt, ready) {
      this.t += dt;
      const target = this.expr === 'cheer' ? -Math.PI / 2 : this.aim;
      this.angle += angDiff(target, this.angle) * Math.min(1, dt * 14);
      this.kickv += (-300 * this.kick - 16 * this.kickv) * dt; this.kick += this.kickv * dt;
      if (this.exprT !== Infinity && this.exprT > 0) { this.exprT -= dt; if (this.exprT <= 0) this.expr = 'idle'; }
      if (this.frozen > 0) this.frozen -= dt;
      if (this.hurtT > 0) this.hurtT -= dt;
      if (this.roar > 0) this.roar -= dt * 1.6;
      this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = 0.14; this.blinkT = rand(Theme.dragon.blinkEvery[0], Theme.dragon.blinkEvery[1]); } if (this.blink > 0) this.blink -= dt;
      const tm = this.expr === 'sad' ? 0.05 : (this.expr === 'cheer' ? 1 : (this.expr === 'happy' ? 0.8 : (ready ? 0.3 : 0.1)));
      this.mouth += (tm - this.mouth) * Math.min(1, dt * 12);
      if (this.frozen <= 0 && (this.flapT > 0 || this.expr === 'cheer')) {      // sayap: hanya mengepak sebentar (flapT) atau saat menang (cheer)
        const prev = this.fph % PI2; this.fph += dt * (this.expr === 'cheer' ? 10 : 18); const cur = this.fph % PI2;
        if ((prev < Math.PI / 2 && cur >= Math.PI / 2) || prev > cur) { if (Dragon.onFlap) Dragon.onFlap(this); }
        if (this.flapT > 0) this.flapT -= dt;
      } else this.fph = 0;
    }

    /** Posisi dunia pusat bola api di mulut. */
    mouthPos(x, y, R, out) { const d = R * Theme.dragon.mouthDist - this.kick * R * 0.3; out.x = x + Math.cos(this.angle) * d; out.y = y + Math.sin(this.angle) * d; return out; }

    draw(ctx, x, y, R) {
      const tpx = (ctx.getTransform ? ctx.getTransform().a : 1) || 1, p = Math.max(0.5, Math.round(tpx * 4) / 4), S = sprites(R, p);
      const E = this.expr, sad = E === 'sad', hurt = E === 'hurt', mouthO = this.mouth > 0.45 ? 'o' : 'c';
      const eyes = (this.blink > 0 && !(GA.Quality && GA.Quality.calm())) || this.frozen > 0 ? 'blink' : (E === 'happy' || E === 'cheer' ? 'happy' : (hurt ? 'hurt' : (sad ? 'sad' : 'open')));
      const calm = GA.Quality && GA.Quality.calm(), breathe = calm ? 1 : 1 + Theme.dragon.breath * Math.sin(this.t * 2.2), shiver = this.hurtT > 0 ? Math.sin(this.t * 55) * R * 0.03 * this.hurtT : 0;
      ctx.save(); ctx.translate(x + shiver, y);
      ctx.fillStyle = 'rgba(2,3,10,0.30)'; ctx.beginPath(); ctx.ellipse(R * 0.18, R * 0.3, R * 1.0, R * 0.9, 0, 0, PI2); ctx.fill();      // bayangan datar di bawah naga
      ctx.scale(breathe, breathe);
      const f = this.frozen > 0 || calm ? 0 : Math.cos(this.fph) * (E === 'cheer' ? 0.7 : 0.55) + (sad ? 0.25 : 0), rest = sad ? 0.5 : 0.12;
      ctx.drawImage(S.body, -1.6 * R, -1.5 * R, 3.2 * R, 3.6 * R);      // tubuh + ekor + kaki
      for (let s = -1; s <= 1; s += 2) {      // sayap kiri / kanan: putar di bahu
        ctx.save(); ctx.translate(s * R * 0.42, -R * 0.1); ctx.scale(s, 1); ctx.rotate(-(rest + f * 0.5)); ctx.scale(1 - Math.abs(f) * 0.12, 1);
        ctx.drawImage(S.wing, -2.0 * R, -1.2 * R, 2.1 * R, 2.2 * R); ctx.restore();
      }
      const a = this.angle, hd = ((sad ? 0.5 : Theme.dragon.headDist) - this.kick * 0.3 + 0.1) * R;      // leher + kepala menghadap bidikan (recoil ke belakang saat menembak)
      ctx.save(); ctx.translate(Math.cos(a) * hd, Math.sin(a) * hd); ctx.rotate(a + Math.PI / 2);
      ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = R * 0.5 + 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hd * 0.9); ctx.stroke();
      ctx.strokeStyle = Theme.dragon.body[1]; ctx.lineWidth = R * 0.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, hd * 0.9); ctx.stroke();
      ctx.drawImage(head(S, p, mouthO, eyes), -0.75 * R, -1.3 * R, 1.5 * R, 2.1 * R); ctx.restore();
      if (this.frozen > 0) { ctx.fillStyle = 'rgba(140,210,255,0.4)'; ctx.beginPath(); ctx.arc(0, 0, R * 1.1, 0, PI2); ctx.fill(); }      // beku: cakram biru datar
      ctx.restore();
    }

    /** Naga tidur melingkar di sarang bersama telur (maskot popup Jeda). */
    static drawSleeping(ctx, w, h, t) {
      const C = Theme.dragon, u = Math.min(w, h) / 136;
      ctx.save(); ctx.scale(u, u);
      const sky = FG(0, 0, 0, 136); sky.addColorStop(0, '#1a1550'); sky.addColorStop(1, '#4a3a96');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 136, 136);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; [[18, 22, 1.4], [44, 12, 1], [96, 20, 1.2], [118, 40, 1], [26, 52, 0.9], [78, 8, 0.9]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, PI2); ctx.fill(); });
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(104, 28, 14, 0, PI2); ctx.fill(); ctx.fillStyle = '#4a3a96'; ctx.beginPath(); ctx.arc(110, 24, 12, 0, PI2); ctx.fill();
      ctx.fillStyle = '#2d6a4a'; ctx.beginPath(); ctx.ellipse(68, 140, 100, 34, 0, 0, PI2); ctx.fill();
      const ng = FG(68, 104, 6, 68, 104, 56); ng.addColorStop(0, C.nest[0]); ng.addColorStop(1, C.nest[1]);
      ctx.fillStyle = ng; ctx.beginPath(); ctx.ellipse(68, 104, 56, 22, 0, 0, PI2); ctx.fill();
      ctx.strokeStyle = 'rgba(90,55,10,0.6)'; ctx.lineWidth = 1.6; for (let i = 0; i < 18; i++) { const a = i * 0.35; ctx.beginPath(); ctx.moveTo(68 + Math.cos(a) * 46, 104 + Math.sin(a) * 15); ctx.lineTo(68 + Math.cos(a + 0.4) * 54, 104 + Math.sin(a + 0.4) * 19); ctx.stroke(); }
      // telur
      [[26, 98, '#ffe9a8'], [44, 106, '#ffd2e8'], [104, 100, '#c9f0ff']].forEach(function (e, i) {
        const g = FG(e[0] - 3, e[1] - 5, 1, e[0], e[1], 12); g.addColorStop(0, '#fff'); g.addColorStop(1, e[2]);
        ctx.fillStyle = g; ctx.strokeStyle = 'rgba(70,40,10,0.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(e[0], e[1], 8.5, 11, 0, 0, PI2); ctx.fill(); ctx.stroke();
      });
      // tubuh melingkar
      const bg = FG(60, 80, 6, 68, 92, 44); bg.addColorStop(0, C.body[0]); bg.addColorStop(0.6, C.body[1]); bg.addColorStop(1, C.body[2]);
      const br = 1 + 0.02 * Math.sin((t || 0) * 2);
      ctx.save(); ctx.translate(68, 92); ctx.scale(br, br); ctx.translate(-68, -92);
      ctx.fillStyle = bg; ctx.strokeStyle = C.outline; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(68, 90, 40, 26, 0, 0, PI2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.body[1]; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(104, 96); ctx.bezierCurveTo(124, 100, 126, 80, 112, 76); ctx.stroke();
      ctx.fillStyle = C.spike; ctx.beginPath(); ctx.moveTo(110, 70); ctx.lineTo(118, 72); ctx.lineTo(112, 80); ctx.fill();
      const wg = FG(40, 60, 80, 90); wg.addColorStop(0, C.wing[0]); wg.addColorStop(1, C.wing[1]);
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

  Dragon.pulse = 0; Dragon.onFlap = null;      // pulse: tak dipakai lagi; onFlap: kait untuk bunyi kepakan
  GA.Dragon = { Dragon: Dragon, drawSleeping: Dragon.drawSleeping };
})(window.GA = window.GA || {});
