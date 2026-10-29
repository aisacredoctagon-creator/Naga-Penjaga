/* storage.js — pilihan terakhir (kategori & kesulitan), bintang & hasil per stage, skor tertinggi, dan pengaturan, disimpan di localStorage.
 * Skema BERVERSI (`v`): v1 = lima step (lama), v2 = tiga stage + hasil terakhir per stage. Data lama dimigrasikan dengan aman: dipotong ke 3 stage,
 * kunci yang hilang / rusak diganti nilai bawaan, dan tidak pernah melempar galat. Semua akses dibungkus try/catch (mode privat / penyimpanan diblokir). */
(function (GA) {
  'use strict';
  const KEY = 'gasing.nagapenjaga.v2', SCHEMA = 2;

  const STAGES = 3;
  const DIFFS = ['mudah', 'sedang', 'sulit'];
  const DEFAULT_SEL = { slots: ['add', 'add', 'add'], same: true, random: false, diff: 'mudah' };

  const num = function (v, d) { return typeof v === 'number' && isFinite(v) ? v : d; };
  const fixArr = function (a, fill) { const o = Array.isArray(a) ? a.slice(0, STAGES).map(function (x) { return num(x, 0); }) : []; while (o.length < STAGES) o.push(fill); return o; };

  /** Bersihkan data mentah dari versi mana pun menjadi skema sekarang (tidak pernah melempar). */
  function migrate(d) {
    const out = { v: SCHEMA, sel: null, prog: {}, last: {}, highScore: 0, introSeen: false, coachSeen: false, swapSeen: false, settings: { sound: true, music: true, quality: 'auto' } };
    if (!d || typeof d !== 'object') return out;
    if (d.sel && typeof d.sel === 'object') {
      const sl = Array.isArray(d.sel.slots) ? d.sel.slots.filter(function (s) { return typeof s === 'string'; }).slice(0, STAGES) : [];
      while (sl.length < STAGES) sl.push(sl[0] || 'add');
      out.sel = { slots: sl, same: d.sel.same !== false, random: !!d.sel.random, diff: DIFFS.indexOf(d.sel.diff) >= 0 ? d.sel.diff : 'mudah' };
    }
    if (d.prog && typeof d.prog === 'object') DIFFS.forEach(function (k) { const p = d.prog[k]; if (p && typeof p === 'object') out.prog[k] = { stars: fixArr(p.stars, 0), best: fixArr(p.best, 0) }; });
    if (d.last && typeof d.last === 'object' && d.v >= 2) DIFFS.forEach(function (k) { if (Array.isArray(d.last[k])) out.last[k] = d.last[k].slice(0, STAGES); });
    out.highScore = num(d.highScore, 0); out.introSeen = !!d.introSeen; out.coachSeen = !!d.coachSeen; out.swapSeen = !!d.swapSeen;
    if (d.settings && typeof d.settings === 'object') Object.assign(out.settings, d.settings);
    return out;
  }

  const Storage = {
    data: migrate(null),
    unlockAll: /[?&]unlock(=1|&|$)/.test(location.search),
    migrate: migrate,

    load: function () {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.data = migrate(JSON.parse(raw));
      } catch (e) { this.data = migrate(null); }
      return this;
    },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* abaikan */ }
    },

    /** Pilihan menu terakhir: { slots:[k1..k3], same, random, diff }. */
    get sel() {
      const sl = ((this.data.sel && this.data.sel.slots) || DEFAULT_SEL.slots).slice(0, STAGES);
      while (sl.length < STAGES) sl.push(sl[0] || 'add');
      return Object.assign({}, DEFAULT_SEL, this.data.sel || {}, { slots: sl });
    },
    set sel(v) { this.data.sel = { slots: v.slots.slice(0, STAGES), same: !!v.same, random: !!v.random, diff: v.diff }; this.save(); },

    /** Progres per kesulitan: bintang & skor terbaik tiap stage. Stage terbuka berurutan (stage n+1 terbuka setelah stage n selesai). */
    prog: function (diff) {
      const p = (this.data.prog || {})[diff] || {};
      const fix = function (a) { const o = (a || []).slice(0, STAGES); while (o.length < STAGES) o.push(0); return o; };
      return { stars: fix(p.stars), best: fix(p.best) };
    },
    /** Banyaknya stage yang bisa dimainkan (1..STAGES). ?unlock=1 membuka semuanya (untuk uji coba). */
    unlocked: function (diff) {
      if (this.unlockAll) return STAGES;
      const p = this.prog(diff); let n = 1;
      while (n < STAGES && p.stars[n - 1] > 0) n++;
      return n;
    },
    totalStars: function () {
      let n = 0; const pr = this.data.prog || {};
      for (const k in pr) n += (pr[k].stars || []).reduce(function (a, b) { return a + b; }, 0);
      return n;
    },

    /** Catat hasil satu stage (indeks 0..STAGES-1): bintang & skor terbaik, dan RINGKASAN hasil terakhir (untuk overview dari layar Pilih Stage).
     * res = hasil stageResult() dari main.js (items per soal: teks, jawaban, jumlah salah, nilai salah). */
    recordStep: function (diff, step, stars, score, res) {
      const p = this.prog(diff);
      p.stars[step] = Math.max(p.stars[step] || 0, stars); p.best[step] = Math.max(p.best[step] || 0, score || 0);
      this.data.prog = this.data.prog || {}; this.data.prog[diff] = p;
      if (res) this.saveLast(diff, step, res);
      this.save();
    },
    /** Simpan hasil terakhir stage (menang maupun Game Over) dalam bentuk ringkas. */
    saveLast: function (diff, step, res) {
      const arr = (this.data.last[diff] = (this.data.last[diff] || []).slice(0, STAGES));
      while (arr.length < STAGES) arr.push(null);
      arr[step] = { win: !!res.win, eggs: res.eggs, pct: res.pct, stars: res.stars, score: res.score, place: res.place, tag: res.tag,
        items: res.items.map(function (i) { return { t: i.text, a: i.answerText, w: i.wrong, v: i.wrongVals.slice(0, 4), s: i.solved ? 1 : 0 }; }) };
    },
    /** Hasil terakhir stage dalam bentuk yang sama dengan stageResult() (atau null bila belum pernah dimainkan). */
    lastResult: function (diff, step) {
      const r = ((this.data.last || {})[diff] || [])[step]; if (!r || !Array.isArray(r.items)) return null;
      return { win: r.win, stage: step, diff: diff, eggs: r.eggs, maxEggs: 3, pct: r.pct, stars: r.stars, score: r.score, place: r.place, tag: r.tag,
        items: r.items.map(function (i, k) { return { id: k, text: i.t, answerText: i.a, wrong: i.w, wrongVals: i.v || [], solved: !!i.s, first: !!i.s && i.w === 0 }; }) };
    },

    /** Catat skor akhir petualangan. Mengembalikan { newHigh }. */
    recordRun: function (score) {
      const res = { newHigh: score > this.data.highScore };
      if (res.newHigh) { this.data.highScore = score; this.save(); }
      return res;
    },
    noteScore: function (score) { if (score > this.data.highScore) { this.data.highScore = score; this.save(); } },

    get coachSeen() { return !!this.data.coachSeen; },
    set coachSeen(v) { this.data.coachSeen = !!v; this.save(); },

    get introSeen() { return !!this.data.introSeen; },
    set introSeen(v) { this.data.introSeen = !!v; this.save(); },

    get swapSeen() { return !!this.data.swapSeen; },
    set swapSeen(v) { this.data.swapSeen = !!v; this.save(); },

    get sound() { return this.data.settings.sound !== false; },
    set sound(v) { this.data.settings.sound = !!v; this.save(); },
    get quality() { return this.data.settings.quality || 'auto'; },
    set quality(v) { this.data.settings.quality = v; this.save(); },
    get music() { return this.data.settings.music !== false; },
    set music(v) { this.data.settings.music = !!v; this.save(); },

    reset: function () {
      this.data.prog = {}; this.data.last = {}; this.data.highScore = 0; this.data.introSeen = false; this.data.swapSeen = false; this.save();
    }
  };

  GA.Storage = Storage.load();
})(window.GA = window.GA || {});
