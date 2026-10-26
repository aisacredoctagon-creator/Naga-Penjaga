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

  /** Gambar sosok penyihir pada (x,y) dengan radius R. mood: idle | hurt | attack | cast | laugh | defeat. */
  function drawFigure(ctx, x, y, R, t, mood) {
    const hurt = mood === 'hurt', atk = mood === 'attack', cast = mood === 'cast', laugh = mood === 'laugh';
    ctx.save(); ctx.translate(x, y + Math.sin(t * 2) * R * 0.04);
    // bayangan
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, R * 1.05, R * 0.95, R * 0.2, 0, 0, PI2); ctx.fill();
    // aura sihir
    const au = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, R * 1.7); au.addColorStop(0, 'rgba(170,110,255,' + (cast ? 0.55 : 0.28) + ')'); au.addColorStop(1, 'rgba(170,110,255,0)');
    ctx.fillStyle = au; ctx.beginPath(); ctx.arc(0, 0, R * 1.7, 0, PI2); ctx.fill();
    // jubah
    let g = ctx.createLinearGradient(0, -R * 0.2, 0, R * 1.05); g.addColorStop(0, '#5b2bb0'); g.addColorStop(1, '#1e0f4a');
    ctx.fillStyle = g; ctx.strokeStyle = '#12082e'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-R * 0.55, -R * 0.1); ctx.quadraticCurveTo(-R * 1.0, R * 0.6, -R * 0.9, R * 1.02); ctx.quadraticCurveTo(0, R * 1.15, R * 0.9, R * 1.02); ctx.quadraticCurveTo(R * 1.0, R * 0.6, R * 0.55, -R * 0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    // bintang di jubah
    ctx.fillStyle = '#ffd23f'; [[-0.4, 0.55, 0.07], [0.35, 0.7, 0.06], [0.05, 0.4, 0.05], [-0.1, 0.85, 0.05]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0] * R, s[1] * R, s[2] * R, 0, PI2); ctx.fill(); });
    // tongkat + bola sihir
    const sx = R * 0.85, sw = atk ? -0.5 : (cast ? -0.25 + Math.sin(t * 9) * 0.06 : Math.sin(t * 1.6) * 0.05);
    ctx.save(); ctx.translate(sx, R * 0.3); ctx.rotate(sw);
    ctx.strokeStyle = '#6a4120'; ctx.lineWidth = R * 0.09; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, R * 0.8); ctx.lineTo(0, -R * 0.95); ctx.stroke();
    const og = ctx.createRadialGradient(-R * 0.04, -R * 1.05, 1, 0, -R * 1.0, R * 0.26); og.addColorStop(0, '#fff'); og.addColorStop(0.4, cast ? '#ff8aff' : '#b69cff'); og.addColorStop(1, '#5b2bd0');
    ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, -R * 1.0, R * (cast ? 0.3 : 0.22), 0, PI2); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#2a1060'; ctx.stroke();
    ctx.restore();
    // lengan
    ctx.fillStyle = '#4b2399'; ctx.beginPath(); ctx.ellipse(R * 0.62, R * 0.22, R * 0.26, R * 0.14, -0.5, 0, PI2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d9d2c4'; ctx.beginPath(); ctx.arc(R * 0.82, R * 0.3, R * 0.12, 0, PI2); ctx.fill();
    ctx.fillStyle = '#4b2399'; ctx.beginPath(); ctx.ellipse(-R * 0.6, R * 0.25, R * 0.26, R * 0.14, 0.5, 0, PI2); ctx.fill(); ctx.stroke();
    // kepala
    const hg = ctx.createRadialGradient(-R * 0.1, -R * 0.5, R * 0.05, 0, -R * 0.4, R * 0.5); hg.addColorStop(0, '#e8e0d2'); hg.addColorStop(1, hurt ? '#e6a8a8' : '#b9b1a4');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, -R * 0.4, R * 0.4, 0, PI2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#4a4438'; ctx.stroke();
    // jenggot
    ctx.fillStyle = '#ece9f6'; ctx.beginPath(); ctx.moveTo(-R * 0.36, -R * 0.3); ctx.quadraticCurveTo(-R * 0.34, R * 0.34, 0, R * 0.5); ctx.quadraticCurveTo(R * 0.34, R * 0.34, R * 0.36, -R * 0.3); ctx.quadraticCurveTo(0, -R * 0.1, -R * 0.36, -R * 0.3); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#a9a4c4'; ctx.stroke();
    // mulut
    ctx.fillStyle = '#4a0f20'; ctx.beginPath(); ctx.ellipse(0, -R * 0.14, R * 0.1, laugh || atk || hurt ? R * 0.09 : R * 0.035, 0, 0, PI2); ctx.fill();
    // mata menyala
    for (let s = -1; s <= 1; s += 2) {
      const ex = s * R * 0.16, ey = -R * 0.43;
      if (hurt) { ctx.strokeStyle = '#2a1a40'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - R * 0.07, ey - R * 0.06); ctx.lineTo(ex + R * 0.07, ey + R * 0.06); ctx.moveTo(ex + R * 0.07, ey - R * 0.06); ctx.lineTo(ex - R * 0.07, ey + R * 0.06); ctx.stroke(); }
      else { ctx.fillStyle = atk || cast ? '#ff3a6a' : '#ff9a3a'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = R * 0.15; ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.09, R * 0.06, s * 0.3, 0, PI2); ctx.fill(); ctx.shadowBlur = 0; }
      ctx.strokeStyle = '#2a2236'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - s * R * 0.12, ey - R * 0.12 - (atk ? 0 : R * 0.02)); ctx.lineTo(ex + s * R * 0.1, ey - R * (atk ? 0.04 : 0.1)); ctx.stroke();
    }
    // topi runcing
    const tg = ctx.createLinearGradient(0, -R * 1.5, 0, -R * 0.5); tg.addColorStop(0, '#6a38d0'); tg.addColorStop(1, '#2a1260');
    ctx.fillStyle = tg; ctx.strokeStyle = '#12082e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-R * 0.62, -R * 0.56); ctx.quadraticCurveTo(-R * 0.1, -R * 0.82, R * 0.1, -R * 1.5); ctx.quadraticCurveTo(R * 0.3, -R * 0.8, R * 0.62, -R * 0.56); ctx.quadraticCurveTo(0, -R * 0.68, -R * 0.62, -R * 0.56); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(R * 0.02, -R * 0.9, R * 0.07, 0, PI2); ctx.fill();
    ctx.fillStyle = '#ff4d8d'; ctx.fillRect(-R * 0.5, -R * 0.62, R * 1.0, R * 0.06);
    ctx.restore();
  }

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
      const mood = b.defeated ? 'defeat' : b.hurt > 0 ? 'hurt' : b.attackT > 0 ? 'attack' : b.castT > 0 ? 'cast' : 'idle';
      if (spr) { ctx.drawImage(spr, b.x - b.R * 1.3, b.y - b.R * 1.3, b.R * 2.6, b.R * 2.6); return; }
      ctx.save();
      if (b.defeated) {
        const k = Math.min(1, Math.max(0, (b.defeatT - 0.6) / 1.6));
        ctx.globalAlpha = 1 - k;
        ctx.translate(b.x, b.y); ctx.scale(1 - 0.25 * k, 1 + 0.35 * k); ctx.translate(-b.x, -b.y - k * b.R * 0.4);
      } else if (b.hurt > 0) ctx.translate(Math.sin(b.hurt * 60) * 4, 0);
      else if (b.attackT > 0) ctx.translate(Math.sin(t * 60) * 3, 0);
      drawFigure(ctx, b.x, b.y, b.R, t, mood);
      ctx.restore();
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
      this.hurt = 0; this.attackT = 0; this.castT = 0; this.defeated = false; this.defeatT = 0;
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
      this.hp--; this.inPhase++; this.hurt = 0.5;
      if (this.hp <= 0) { this.defeated = true; this.defeatT = 0; this.say(this.def.lines.defeat, 3.4); return 'defeat'; }
      if (this.inPhase >= this.phase.hits) {
        this.phaseIdx++; this.inPhase = 0;
        this.say(this.phase.say, 3.4); this.resetSpellTimer();
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
