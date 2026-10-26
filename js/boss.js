/* boss.js — boss sebagai konfigurasi + modul terpisah.
 *
 * Untuk MENGGANTI boss: panggil GA.Bosses.register({...}) dengan id baru lalu isi `bossCfg: { id:'id-baru' }`
 * pada level di levels.js (atau ubah DEFAULT_BOSS). Definisi boss berisi:
 *   id, name, title        identitas
 *   phases[]               { name, hits, speedMul, movers, mixed, questionTime, say }
 *   lines                  kalimat boss (hit, attack, defeat)
 *   draw(ctx, b, t)        gambar boss (placeholder lewat kode; boleh diganti sprite via Theme)
 * Instance boss (`b`) punya: x, y, R, hp, maxHp, phase, hurt, attackT, defeatT, dan metode hit()/attack().
 */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;

  const registry = {};

  /* ---------- Raja Angka (boss bawaan) ---------- */
  const RajaAngka = {
    id: 'raja-angka',
    name: 'Raja Angka',
    title: 'Penguasa Seribu Bilangan',
    phases: [
      { name: 'Fase 1 – Rantai Lambat', hits: 3, speedMul: 0.7, movers: false, mixed: false, questionTime: null,
        say: 'Hahaha! Aku Raja Angka! Sanggupkah kamu menjawab soalku?' },
      { name: 'Fase 2 – Rintangan Bergerak', hits: 3, speedMul: 1.0, movers: true, mixed: false, questionTime: null,
        say: 'Lumayan! Sekarang atur waktu tembakanmu!' },
      { name: 'Fase 3 – Soal Campuran', hits: 3, speedMul: 1.0, movers: true, mixed: true, questionTime: 15,
        say: 'Ini yang terakhir! Soal campuran dan waktunya terbatas!' }
    ],
    lines: {
      hit: ['Aduh!', 'Auw! Itu benar!', 'Ukh... pintar juga!'],
      attack: ['Rasakan seranganku!', 'Salah! Hehehe!', 'Hiyaaa!'],
      defeat: 'Aku... kalah... Kamu hebat!'
    },

    draw: function (ctx, b, t) {
      const R = b.R, hurt = b.hurt > 0, atk = b.attackT > 0;
      const spr = Theme.sprite('boss');
      ctx.save();
      ctx.translate(b.x, b.y + Math.sin(t * 2) * 4);
      if (b.defeated) { ctx.rotate(Math.min(b.defeatT, 1.2) * 0.35); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, b.defeatT - 1.0) / 0.8); }
      const sq = hurt ? 1 + Math.sin(b.hurt * 30) * 0.06 : 1;
      ctx.scale(sq, 1 / sq);
      if (atk) ctx.translate(Math.sin(t * 60) * 3, 0);

      if (spr) { ctx.drawImage(spr, -R * 1.3, -R * 1.3, R * 2.6, R * 2.6); ctx.restore(); return; }

      // bayangan
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, R * 1.05, R * 0.95, R * 0.2, 0, 0, 6.283); ctx.fill();
      // jubah belakang
      let g = ctx.createLinearGradient(0, -R * 0.3, 0, R);
      g.addColorStop(0, '#7c3aed'); g.addColorStop(1, '#3b1a8a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, R * 0.3, R * 1.02, R * 0.78, 0, 0, 6.283); ctx.fill();
      // badan
      g = ctx.createRadialGradient(-R * 0.2, R * 0.1, R * 0.1, 0, R * 0.35, R * 0.9);
      g.addColorStop(0, '#d8b4fe'); g.addColorStop(0.5, '#a855f7'); g.addColorStop(1, '#6d28d9');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, R * 0.38, R * 0.72, R * 0.66, 0, 0, 6.283); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#3b1a8a'; ctx.stroke();
      // lambang di perut
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, R * 0.45, R * 0.24, 0, 6.283); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#b8860b'; ctx.stroke();
      ctx.fillStyle = '#6d28d9'; ctx.font = '800 ' + (R * 0.3) + 'px ' + Theme.fonts.ui; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('×÷', 0, R * 0.47);
      // lengan
      const wave = atk ? -0.55 : Math.sin(t * 2.4) * 0.12;
      for (let s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.translate(s * R * 0.68, R * 0.2); ctx.rotate(s * (0.5 + wave) * (atk ? -1.4 : 1));
        ctx.fillStyle = '#8b3fe0'; ctx.beginPath(); ctx.ellipse(s * R * 0.2, R * 0.12, R * 0.34, R * 0.17, s * 0.4, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#ffd9a8'; ctx.beginPath(); ctx.arc(s * R * 0.48, R * 0.22, R * 0.15, 0, 6.283); ctx.fill();
        ctx.restore();
      }
      // kepala
      g = ctx.createRadialGradient(-R * 0.15, -R * 0.65, R * 0.05, 0, -R * 0.45, R * 0.6);
      g.addColorStop(0, '#fff0d6'); g.addColorStop(1, hurt ? '#ffb4b4' : '#f2b97a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -R * 0.42, R * 0.5, 0, 6.283); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#a8662c'; ctx.stroke();
      // jenggot
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.moveTo(-R * 0.46, -R * 0.3); ctx.quadraticCurveTo(-R * 0.4, R * 0.28, 0, R * 0.3); ctx.quadraticCurveTo(R * 0.4, R * 0.28, R * 0.46, -R * 0.3);
      ctx.quadraticCurveTo(0, -R * 0.12, -R * 0.46, -R * 0.3); ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#c9c9d8'; ctx.stroke();
      // kumis
      ctx.fillStyle = '#f4f4fa'; ctx.beginPath(); ctx.ellipse(-R * 0.14, -R * 0.26, R * 0.16, R * 0.07, 0.25, 0, 6.283); ctx.ellipse(R * 0.14, -R * 0.26, R * 0.16, R * 0.07, -0.25, 0, 6.283); ctx.fill();
      // mulut
      ctx.fillStyle = '#7a1f2e';
      ctx.beginPath(); ctx.ellipse(0, -R * 0.13, R * 0.12, (atk || hurt) ? R * 0.1 : R * 0.04, 0, 0, 6.283); ctx.fill();
      // mata
      for (let s = -1; s <= 1; s += 2) {
        const ex = s * R * 0.2, ey = -R * 0.5;
        if (hurt) {
          ctx.strokeStyle = '#2a1a40'; ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(ex - R * 0.08, ey - R * 0.07); ctx.lineTo(ex + R * 0.08, ey + R * 0.07); ctx.moveTo(ex + R * 0.08, ey - R * 0.07); ctx.lineTo(ex - R * 0.08, ey + R * 0.07); ctx.stroke();
        } else {
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, R * 0.12, 0, 6.283); ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = '#6b4a2a'; ctx.stroke();
          ctx.fillStyle = atk ? '#e11d48' : '#2a1a40'; ctx.beginPath(); ctx.arc(ex + Math.sin(t * 1.3) * R * 0.03, ey + R * 0.01, R * 0.06, 0, 6.283); ctx.fill();
        }
        ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; // alis
        ctx.beginPath(); ctx.moveTo(ex - s * R * 0.14, ey - R * 0.2 + (atk ? 0 : -R * 0.03)); ctx.lineTo(ex + s * R * 0.12, ey - R * (atk ? 0.1 : 0.17)); ctx.stroke();
      }
      // mahkota
      ctx.fillStyle = '#ffd23f'; ctx.beginPath();
      ctx.moveTo(-R * 0.42, -R * 0.78); ctx.lineTo(-R * 0.48, -R * 1.15); ctx.lineTo(-R * 0.2, -R * 0.98); ctx.lineTo(0, -R * 1.25);
      ctx.lineTo(R * 0.2, -R * 0.98); ctx.lineTo(R * 0.48, -R * 1.15); ctx.lineTo(R * 0.42, -R * 0.78); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#b8860b'; ctx.lineJoin = 'round'; ctx.stroke();
      const gems = ['#ef4444', '#3b82f6', '#22c55e'];
      for (let i = 0; i < 3; i++) { ctx.fillStyle = gems[i]; ctx.beginPath(); ctx.arc((i - 1) * R * 0.25, -R * 0.84, R * 0.06, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
  };
  registry[RajaAngka.id] = RajaAngka;

  /* ---------- instance boss ---------- */
  class Boss {
    constructor(def, cfg, pos, R) {
      this.def = def; this.cfg = cfg;
      this.x = pos.x; this.y = pos.y; this.R = R;
      const extra = cfg.levelIndex >= 3 ? 1 : 0;
      this.phases = def.phases.map(function (p, i) { return Object.assign({}, p, { hits: p.hits + (i === 2 ? extra : 0) }); });
      this.maxHp = this.phases.reduce(function (s, p) { return s + p.hits; }, 0);
      this.hp = this.maxHp;
      this.phaseIdx = 0; this.inPhase = 0;
      this.hurt = 0; this.attackT = 0; this.defeated = false; this.defeatT = 0;
      this.speech = ''; this.speechT = 0;
      this.say(this.phases[0].say, 3.2);
    }
    get phase() { return this.phases[this.phaseIdx]; }
    get topics() { return this.phase.mixed ? this.cfg.mixedTopics : this.cfg.levelTopics; }
    get name() { return this.def.name; }
    say(text, dur) { this.speech = text; this.speechT = dur || 2.2; }

    /** Jawaban benar: boss terluka. Hasil: 'hit' | 'phase' | 'defeat' */
    hit() {
      this.hp--; this.inPhase++; this.hurt = 0.5;
      if (this.hp <= 0) { this.defeated = true; this.defeatT = 0; this.say(this.def.lines.defeat, 3); return 'defeat'; }
      if (this.inPhase >= this.phase.hits) {
        this.phaseIdx++; this.inPhase = 0;
        this.say(this.phase.say, 3.4);
        return 'phase';
      }
      const l = this.def.lines.hit; this.say(l[Math.floor(Math.random() * l.length)], 1.4);
      return 'hit';
    }
    /** Jawaban salah / waktu habis: boss menyerang. */
    attack() {
      this.attackT = 0.7;
      const l = this.def.lines.attack; this.say(l[Math.floor(Math.random() * l.length)], 1.5);
    }
    update(dt) {
      if (this.hurt > 0) this.hurt -= dt;
      if (this.attackT > 0) this.attackT -= dt;
      if (this.speechT > 0) this.speechT -= dt;
      if (this.defeated) this.defeatT += dt;
    }
    draw(ctx, t) {
      this.def.draw(ctx, this, t);
      if (this.speechT > 0 && !(this.defeated && this.defeatT > 2.4)) this.drawSpeech(ctx);
    }
    drawSpeech(ctx) {
      const R = this.R, text = this.speech;
      ctx.font = '700 ' + Math.round(R * 0.2) + 'px ' + Theme.fonts.ui;
      const maxW = R * 2.7;
      // bungkus teks
      const words = text.split(' '), lines = []; let cur = '';
      words.forEach(function (w) { const tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; });
      lines.push(cur);
      const lh = R * 0.24, w = Math.min(maxW, Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }))) + 24, h = lines.length * lh + 18;
      const VW = GA.view ? GA.view.W : 4000, wide = GA.view && GA.view.W > GA.view.H;
      // landscape: gelembung di sisi kanan kepala; portrait: di atas kepala
      const by = wide ? this.y - R * 0.95 - h * 0.35 : this.y - R * 1.3 - h;
      const x = Math.min(Math.max(wide ? this.x + R * 0.95 : this.x - w / 2, 6), VW - w - 6);
      const tx = wide ? x + 22 : Math.min(Math.max(this.x - 10, x + 14), x + w - 54);
      ctx.globalAlpha = Math.min(1, this.speechT * 3);
      ctx.fillStyle = '#fff'; GA.Path.roundRect(ctx, x, by, w, h, 14); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#1b2a49'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + 8, by + h - 1); ctx.lineTo(wide ? tx - 14 : tx + 20, by + h + 16); ctx.lineTo(tx + 34, by + h - 1); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = '#1b2a49'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach(function (l, i) { ctx.fillText(l, x + w / 2, by + 9 + lh * (i + 0.5)); });
      ctx.globalAlpha = 1;
    }
    /** Bar HP bersegmen per fase. cx,cy = tengah atas bar. */
    drawHP(ctx, cx, cy, w) {
      const h = 22, gap = 5, n = this.phases.length;
      const sw = (w - gap * (n - 1)) / n;
      let x = cx - w / 2;
      ctx.font = '800 15px ' + Theme.fonts.ui; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,30,70,0.9)';
      const label = this.def.name + ' — ' + (this.defeated ? 'Kalah!' : this.phase.name);
      ctx.strokeText(label, x, cy - 3); ctx.fillStyle = '#fff'; ctx.fillText(label, x, cy - 3);
      for (let i = 0; i < n; i++) {
        const p = this.phases[i];
        const left = i < this.phaseIdx ? 0 : (i === this.phaseIdx ? p.hits - this.inPhase : p.hits);
        const f = this.defeated ? 0 : left / p.hits;
        ctx.fillStyle = 'rgba(20,30,70,0.85)'; GA.Path.roundRect(ctx, x, cy, sw, h, 9); ctx.fill();
        if (f > 0) {
          const g = ctx.createLinearGradient(0, cy, 0, cy + h); g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, '#e11d48');
          ctx.fillStyle = g; GA.Path.roundRect(ctx, x + 3, cy + 3, Math.max(10, (sw - 6) * f), h - 6, 7); ctx.fill();
        }
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; GA.Path.roundRect(ctx, x, cy, sw, h, 9); ctx.stroke();
        x += sw + gap;
      }
    }
  }

  GA.Bosses = {
    register: function (def) { registry[def.id] = def; },
    get: function (id) { return registry[id]; },
    create: function (cfg, pos, R) {
      const def = registry[cfg.id] || registry['raja-angka'];
      return new Boss(def, cfg, pos, R);
    }
  };
})(window.GA = window.GA || {});
