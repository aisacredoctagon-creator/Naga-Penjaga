/* storage.js — pilihan terakhir (kategori & kesulitan), bintang per step, skor tertinggi, dan pengaturan, disimpan di localStorage.
 * Semua akses dibungkus try/catch (mode privat / penyimpanan diblokir tidak merusak game). */
(function (GA) {
  'use strict';
  const KEY = 'gasing.nagapenjaga.v2';

  const DEFAULT_SEL = { slots: ['add', 'add', 'add'], same: true, random: false, diff: 'mudah' };

  const Storage = {
    data: { sel: null, runs: {}, highScore: 0, introSeen: false, settings: { sound: true, music: true, quality: 'auto' } },
    unlockAll: /[?&]unlock(=1|&|$)/.test(location.search),

    load: function () {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          this.data.sel = d.sel || null;
          this.data.runs = d.runs || {};
          this.data.highScore = d.highScore || 0;
          this.data.introSeen = !!d.introSeen;
          this.data.settings = Object.assign({ sound: true, music: true, quality: 'auto' }, d.settings || {});
        }
      } catch (e) { /* abaikan */ }
      return this;
    },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* abaikan */ }
    },

    /** Pilihan menu terakhir: { slots:[k1,k2,k3], same, random, diff }. */
    get sel() { return Object.assign({}, DEFAULT_SEL, this.data.sel || {}, { slots: ((this.data.sel && this.data.sel.slots) || DEFAULT_SEL.slots).slice(0, 3) }); },
    set sel(v) { this.data.sel = { slots: v.slots.slice(0, 3), same: !!v.same, random: !!v.random, diff: v.diff }; this.save(); },

    /** Kunci progres per kombinasi pilihan, mis. "add|add|mul|sedang". */
    runKey: function (slots, diff) { return slots.join('|') + '|' + diff; },
    run: function (key) { return this.data.runs[key] || { stars: [0, 0, 0], best: 0, done: false }; },
    totalStars: function () { let n = 0; for (const k in this.data.runs) n += (this.data.runs[k].stars || []).reduce(function (a, b) { return a + b; }, 0); return n; },

    /** Catat bintang satu step (indeks 0..2). */
    recordStep: function (key, step, stars) {
      const r = this.run(key);
      r.stars = (r.stars || [0, 0, 0]).slice(); r.stars[step] = Math.max(r.stars[step] || 0, stars);
      this.data.runs[key] = r; this.save();
    },

    /** Catat hasil akhir petualangan. Mengembalikan { newBest, newHigh }. */
    recordRun: function (key, score, won) {
      const r = this.run(key);
      const res = { newBest: score > (r.best || 0), newHigh: score > this.data.highScore };
      r.best = Math.max(score, r.best || 0); if (won) r.done = true;
      this.data.runs[key] = r;
      if (res.newHigh) this.data.highScore = score;
      this.save();
      return res;
    },
    noteScore: function (score) { if (score > this.data.highScore) { this.data.highScore = score; this.save(); } },

    get introSeen() { return !!this.data.introSeen; },
    set introSeen(v) { this.data.introSeen = !!v; this.save(); },

    get sound() { return this.data.settings.sound !== false; },
    set sound(v) { this.data.settings.sound = !!v; this.save(); },
    get quality() { return this.data.settings.quality || 'auto'; },
    set quality(v) { this.data.settings.quality = v; this.save(); },
    get music() { return this.data.settings.music !== false; },
    set music(v) { this.data.settings.music = !!v; this.save(); },

    reset: function () {
      this.data.runs = {}; this.data.highScore = 0; this.data.introSeen = false; this.save();
    }
  };

  GA.Storage = Storage.load();
})(window.GA = window.GA || {});
