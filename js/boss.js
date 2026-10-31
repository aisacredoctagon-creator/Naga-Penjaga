/* boss.js — boss sebagai konfigurasi + modul terpisah.
 *
 * Untuk MENGGANTI boss: panggil GA.Bosses.register({...}) dengan id baru lalu isi `boss.id` di levels.js.
 * Definisi boss berisi:
 *   id, name, title        identitas
 *   phases[]               pola serangan { name, speedMul, movers (rintangan zona aktif), mixed, questionTime, spells[], spellEvery, say } dari ringan ke berat
 *   lines                  kalimat boss (hit, attack, defeat, spell)
 *   draw(ctx, b, t)        gambar boss (placeholder lewat kode; boleh diganti sprite via Theme)
 * Darah boss PROPORSIONAL: 20 soal = 20 HP (tiap jawaban benar -1). Gameplay.BOSS_HP_BARS = 2: bar 1 habis di soal ke-10 dan memicu FASE 2
 * (sinematik singkat, pola paling berat = gabungan fase 2+3 lama). BOSS_HP_BARS = 1: satu bar, pola meningkat bertahap (tanpa sinematik).
 * Instance boss (`b`) punya: x, y, R, hp, maxHp, bars, tier, phase, hurt, attackT, castT, defeatT, dan metode hit()/attack()/tick().
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
      { name: 'Fase 2 – Mantra Gelap', speedMul: 1.0, movers: true, mixed: false, questionTime: null, spells: ['fog', 'frost'], spellEvery: 10,
        say: 'Lumayan! Rasakan mantra kabut, es, dan tukar angkaku!' },
      { name: 'Fase 3 – Sihir Campuran', speedMul: 1.1, movers: true, mixed: true, questionTime: 15, spells: ['fog', 'frost'], spellEvery: 7.5,
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
    /** total = jumlah soal (= HP), bars = 1 | 2 bar darah. */
    constructor(def, cfg, pos, R, total, bars) {
      this.def = def; this.cfg = cfg;
      this.x = pos.x; this.y = pos.y; this.R = R;
      this.total = total; this.maxHp = total; this.hp = total; this.answered = 0;
      this.bars = bars === 1 ? 1 : 2;
      const P = def.phases.map(function (p) { return Object.assign({}, p); }), tm = cfg.phaseTime || 0;
      if (this.bars === 2) {
        // fase 2 = gabungan pola fase 2 + fase 3 lama (spell lebih sering, soal berbatas waktu)
        const last = Object.assign({}, P[2], { name: 'Fase 2 – Sihir Terkuat', questionTime: tm || P[2].questionTime });
        this.tiers = [{ at: 0, p: P[0] }, { at: Math.round(total / 2), p: last }];
      } else {
        if (tm) P[2].questionTime = tm;
        this.tiers = [{ at: 0, p: P[0] }, { at: Math.round(total * 0.35), p: P[1] }, { at: Math.round(total * 0.7), p: P[2] }];
      }
      this.tier = 0;
      this.hurt = 0; this.attackT = 0; this.castT = 0; this.laughT = 0; this.wrathT = 0; this.defeated = false; this.defeatT = 0;
      this.spellT = 0; this.spellQueue = [];
      this.speech = ''; this.speechT = 0;
      this.say(this.phase.say, 3.2);
    }
    get phase() { return this.tiers[this.tier].p; }
    get phaseIdx() { return this.tier; }
    get name() { return this.def.name; }
    /** Bar darah ke-i (0..bars-1): sisa 0..1. */
    barFrac(i) { const per = this.total / this.bars, left = this.hp - (this.bars - 1 - i) * per; return this.defeated ? 0 : Math.max(0, Math.min(1, left / per)); }
    say(text, dur) { this.speech = text; this.speechT = dur || 2.2; }
    resetSpellTimer() { const p = this.phase; this.spellT = p.spellEvery ? p.spellEvery * 0.7 : 0; }

    /** Jawaban benar: boss terluka. Hasil: 'hit' | 'phase' (bar 1 habis: sinematik) | 'tier' (pola meningkat, tanpa sinematik) | 'defeat' */
    hit() {
      this.hp--; this.answered++; this.hurt = 0.5;      // perisai berkedip
      if (this.hp <= 0) { this.defeated = true; this.defeatT = 0; this.say(this.def.lines.defeat, 3.4); return 'defeat'; }
      let ti = this.tier; for (let i = 0; i < this.tiers.length; i++) if (this.answered >= this.tiers[i].at) ti = i;
      if (ti !== this.tier) {
        this.tier = ti; this.wrathT = 1.8; this.hurt = 0.6; this.attackT = 0; this.castT = 0;   // amarah (aura merah) saat pola berganti
        this.say(this.phase.say, 3.4); this.resetSpellTimer();
        return this.bars === 2 ? 'phase' : 'tier';
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
      ctx.fillStyle = '#f6ecd0'; GA.Path.roundRect(ctx, x, by, w, h, 14); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#12101f'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + 8, by + h - 1); ctx.lineTo(wide ? tx - 14 : tx + 20, by + h + 16); ctx.lineTo(tx + 34, by + h - 1); ctx.closePath(); ctx.fillStyle = '#f6ecd0'; ctx.fill();
      ctx.fillStyle = '#12101f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach(function (l, i) { ctx.fillText(l, x + w / 2, by + 9 + lh * (i + 0.5)); });
      ctx.globalAlpha = 1;
    }
    /** Bar darah datar (revisi 11): 1 atau 2 bar tebal (bar kedua = fase 2). Digambar ke kanvas kecil HANYA saat darah/fase berubah, lalu di-blit tiap frame.
     * cx,cy = tengah atas; compact = tipis (tanpa nama). */
    drawHP(ctx, cx, cy, w, compact) {
      const px = Math.round((ctx.getTransform().a || 1) * 2) / 2, n = this.bars, h = compact ? 14 : 22, gap = 6, sw = (w - gap * (n - 1)) / n, lab = compact ? 0 : 22, pad = 4;
      const key = [this.hp, this.tier, this.defeated ? 1 : 0, Math.round(w), compact ? 1 : 0, px].join('|'), c = this._hp || (this._hp = { key: '', cv: document.createElement('canvas') });
      if (c.key !== key) {
        c.key = key; const cv = c.cv; cv.width = Math.ceil((w + pad * 2) * px); cv.height = Math.ceil((h + lab + pad * 2) * px);
        const g = cv.getContext('2d'); g.setTransform(px, 0, 0, px, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.translate(pad, pad + lab);
        if (!compact) {
          g.font = '800 15px ' + Theme.fonts.ui; g.textAlign = 'left'; g.textBaseline = 'bottom';
          const label = this.def.name + (this.bars === 2 ? ' · ' + (this.defeated ? 'Kalah!' : (this.tier + 1) + '/2') : (this.defeated ? ' · Kalah!' : ''));
          g.lineWidth = 4; g.strokeStyle = '#12101f'; g.strokeText(label, 0, -3); g.fillStyle = '#f6ecd0'; g.fillText(label, 0, -3);
        }
        let x = 0;
        for (let i = 0; i < n; i++) {
          const f = this.barFrac(i), cur = !this.defeated && i === this.tier;
          g.fillStyle = '#1c1233'; GA.Path.roundRect(g, x, 0, sw, h, h / 2.4); g.fill();
          if (f > 0) { g.fillStyle = i ? '#e0568f' : '#a468ff'; GA.Path.roundRect(g, x + 3, 3, Math.max(8, (sw - 6) * f), h - 6, 7); g.fill(); }
          g.lineWidth = cur ? 3.5 : 2.5; g.strokeStyle = cur ? '#ffd23f' : '#6a6290'; GA.Path.roundRect(g, x, 0, sw, h, h / 2.4); g.stroke();
          x += sw + gap;
        }
      }
      ctx.drawImage(c.cv, cx - w / 2 - pad, cy - lab - pad, w + pad * 2, h + lab + pad * 2);
    }
  }

  GA.Bosses = {
    register: function (def) { registry[def.id] = def; },
    get: function (id) { return registry[id]; },
    drawFigure: drawFigure,
    create: function (cfg, pos, R, total, bars) {
      const def = registry[cfg.id] || registry.penyihir;
      return new Boss(def, cfg, pos, R, total, bars);
    }
  };
})(window.GA = window.GA || {});
