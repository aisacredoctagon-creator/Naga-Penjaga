/* boss.js — boss sebagai konfigurasi + modul terpisah.
 *
 * Untuk MENGGANTI boss: panggil GA.Bosses.register({...}) dengan id baru lalu isi `boss.id` di levels.js.
 * Definisi boss berisi:
 *   id, name, title        identitas
 *   phases[]               { name, speedMul, movers, mixed, questionTime, spells[], spellEvery, say }
 *                          (jumlah pukulan per fase diambil dari cfg.hits di levels.js)
 *   lines                  kalimat boss (hit, attack, defeat, spell)
 *   draw(ctx, b, t)        gambar boss (placeholder lewat kode; boleh diganti sprite via Theme)
 * Instance boss (`b`) punya: x, y, R, hp, maxHp, phase, hurt, attackT, castT, defeatT, dan metode hit()/attack()/tick().
 * Mantra ('fog' | 'frost' | 'swap') diumumkan lewat tick(); efeknya dijalankan main.js.
 */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;
  const PI2 = Math.PI * 2;

  const registry = {};

  /** Gambar sosok penyihir pada (x,y) dengan radius R (rig kode di render/wizard.js). mood: idle | hurt | attack | cast | laugh. */
  function drawFigure(ctx, x, y, R, t, mood) { if (GA.Wizard) GA.Wizard.drawFigure(ctx, x, y, R, t, mood); }

  /* ---------- Penyihir Jahat (boss bawaan) ---------- */
  const Penyihir = {
    id: 'penyihir',
    name: 'Penyihir Jahat',
    title: 'Pencuri Telur Naga',
    phases: [
      { name: 'Fase 1 – Sihir Lambat', speedMul: 0.7, movers: false, mixed: false, questionTime: null, spells: [], spellEvery: 0,
        say: 'Hahaha! Telur-telur ini milikku sekarang! Jawab soalku kalau kau berani, naga kecil!' },
      { name: 'Fase 2 – Mantra Gelap', speedMul: 1.0, movers: true, mixed: false, questionTime: null, spells: ['fog', 'frost', 'swap'], spellEvery: 10,
        say: 'Lumayan! Rasakan mantra kabut, es, dan tukar angkaku!' },
      { name: 'Fase 3 – Sihir Campuran', speedMul: 1.1, movers: true, mixed: true, questionTime: 15, spells: ['fog', 'frost', 'swap'], spellEvery: 7.5,
        say: 'Ini sihir terkuatku! Soal campuran, dan waktumu terbatas!' }
    ],
    lines: {
      hit: ['Aduh! Panas!', 'Auw! Itu benar!', 'Ukh... pintar juga!'],
      attack: ['Rasakan sihirku!', 'Salah! Hehehe!', 'Telur ini jadi milikku!'],
      spell: { fog: 'Kabut gelap!', frost: 'Beku!', swap: 'Tukar-tukar angka!' },
      defeat: 'Tidak... sihirku... lenyap! Ambil telur-telurmu...'
    },

    draw: function (ctx, b, t) {
      const spr = Theme.sprite('boss');
      if (spr) { ctx.drawImage(spr, b.x - b.R * 1.3, b.y - b.R * 1.3, b.R * 2.6, b.R * 2.6); return; }
      GA.Wizard.draw(ctx, b, t);      // sosok berating (jubah verlet, lengan IK, hancur jadi abu saat kalah)
    }
  };
  registry[Penyihir.id] = Penyihir;

  /* ---------- instance boss ---------- */
  class Boss {
    constructor(def, cfg, pos, R) {
      this.def = def; this.cfg = cfg;
      this.x = pos.x; this.y = pos.y; this.R = R;
      const hits = cfg.hits || [3, 3, 3];
      this.phases = def.phases.map(function (p, i) {
        const q = Object.assign({}, p, { hits: hits[i] || 3 });
        if (q.mixed && cfg.phase3Time) q.questionTime = cfg.phase3Time;
        return q;
      });
      this.maxHp = this.phases.reduce(function (s, p) { return s + p.hits; }, 0);
      this.hp = this.maxHp;
      this.phaseIdx = 0; this.inPhase = 0;
      this.hurt = 0; this.attackT = 0; this.castT = 0; this.laughT = 0; this.wrathT = 0; this.defeated = false; this.defeatT = 0;
      this.spellT = 0; this.spellQueue = [];
      this.speech = ''; this.speechT = 0;
      this.say(this.phases[0].say, 3.2);
    }
    get phase() { return this.phases[this.phaseIdx]; }
    get topics() { return this.phase.mixed ? this.cfg.mixedTopics : this.cfg.topics; }
    get name() { return this.def.name; }
    say(text, dur) { this.speech = text; this.speechT = dur || 2.2; }
    resetSpellTimer() { const p = this.phase; this.spellT = p.spellEvery ? p.spellEvery * 0.7 : 0; }

    /** Jawaban benar: boss terluka. Hasil: 'hit' | 'phase' | 'defeat' */
    hit() {
      this.hp--; this.inPhase++; this.hurt = 0.5;      // perisai berkedip
      if (this.hp <= 0) { this.defeated = true; this.defeatT = 0; this.say(this.def.lines.defeat, 3.4); return 'defeat'; }
      if (this.inPhase >= this.phase.hits) {
        this.phaseIdx++; this.inPhase = 0; this.wrathT = 1.8; this.hurt = 0.6; this.attackT = 0; this.castT = 0;   // amarah (aura merah) saat pindah fase
        this.say(this.phase.say, 3.4); this.resetSpellTimer();
        return 'phase';
      }
      const l = this.def.lines.hit; this.say(l[Math.floor(Math.random() * l.length)], 1.4);
      return 'hit';
    }
    /** Jawaban salah / waktu habis: boss menyerang. */
    attack() {
      this.attackT = 0.7; this.laughT = 1.2;      // menyerang sambil tertawa jahat
      const l = this.def.lines.attack; this.say(l[Math.floor(Math.random() * l.length)], 1.5);
    }
    /** Hitung mundur mantra. Mengembalikan nama mantra ('fog'|'frost'|'swap') saat waktunya, atau null. */
    tick(dt) {
      const p = this.phase;
      if (this.defeated || !p.spells.length) return null;
      this.spellT -= dt;
      if (this.spellT > 0) return null;
      this.spellT = p.spellEvery;
      if (!this.spellQueue.length) this.spellQueue = p.spells.slice().sort(function () { return Math.random() - 0.5; });
      const s = this.spellQueue.pop();
      this.castT = 0.9; this.say(this.def.lines.spell[s], 1.6);
      return s;
    }
    update(dt) {
      if (this.hurt > 0) this.hurt -= dt;
      if (this.attackT > 0) this.attackT -= dt;
      if (this.castT > 0) this.castT -= dt;
      if (this.laughT > 0) this.laughT -= dt;
      if (this.wrathT > 0) this.wrathT -= dt;
      if (this.speechT > 0) this.speechT -= dt;
      if (this.defeated) this.defeatT += dt;
    }
    draw(ctx, t) {
      this.def.draw(ctx, this, t);
      if (this.speechT > 0 && !(this.defeated && this.defeatT > 2.8)) this.drawSpeech(ctx);
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
      const by = Math.max(4, wide ? this.y - R * 1.3 - h * 0.35 : this.y - R * 1.95 - h);
      const x = Math.min(Math.max(wide ? this.x + R * 1.0 : this.x - w / 2, 6), VW - w - 6);
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
    drawHP(ctx, cx, cy, w, compact) {
      const h = compact ? 12 : 22, gap = compact ? 4 : 5, n = this.phases.length;
      const sw = (w - gap * (n - 1)) / n;
      let x = cx - w / 2;
      if (!compact) {
        ctx.font = '800 15px ' + Theme.fonts.ui; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,30,70,0.9)';
        const label = this.def.name + ' — ' + (this.defeated ? 'Kalah!' : this.phase.name);
        ctx.strokeText(label, x, cy - 3); ctx.fillStyle = '#fff'; ctx.fillText(label, x, cy - 3);
      }
      for (let i = 0; i < n; i++) {
        const p = this.phases[i];
        const left = i < this.phaseIdx ? 0 : (i === this.phaseIdx ? p.hits - this.inPhase : p.hits);
        const f = this.defeated ? 0 : left / p.hits;
        ctx.fillStyle = 'rgba(20,30,70,0.85)'; GA.Path.roundRect(ctx, x, cy, sw, h, h / 2.4); ctx.fill();
        if (f > 0) {
          const g = ctx.createLinearGradient(0, cy, 0, cy + h); g.addColorStop(0, '#d9a8ff'); g.addColorStop(1, '#7c3aed');
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
    drawFigure: drawFigure,
    create: function (cfg, pos, R) {
      const def = registry[cfg.id] || registry.penyihir;
      return new Boss(def, cfg, pos, R);
    }
  };
})(window.GA = window.GA || {});
