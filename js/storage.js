/* storage.js — progres level, skor tertinggi, bintang (1-3), dan pengaturan, disimpan di localStorage.
 * Semua akses dibungkus try/catch (mode privat / penyimpanan diblokir tidak merusak game). */
(function (GA) {
  'use strict';
  const KEY = 'gasing.zumamatematika.v1';

  const Storage = {
    data: { stages: {}, highScore: 0, settings: { sound: true } },
    unlockAll: /[?&]unlock(=1|&|$)/.test(location.search), // ?unlock=1 membuka semua level (untuk uji coba)

    load: function () {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          this.data.stages = d.stages || {};
          this.data.highScore = d.highScore || 0;
          this.data.settings = Object.assign({ sound: true }, d.settings || {});
        }
      } catch (e) { /* abaikan */ }
      return this;
    },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* abaikan */ }
    },

    stage: function (id) { return this.data.stages[id] || { stars: 0, best: 0, done: false }; },
    isDone: function (id) { return !!(this.data.stages[id] && this.data.stages[id].done); },
    totalStars: function () {
      let n = 0; for (const k in this.data.stages) n += this.data.stages[k].stars || 0; return n;
    },

    /** Catat hasil stage. Mengembalikan { newBest, newHigh }. */
    record: function (id, stars, score) {
      const s = this.stage(id);
      const res = { newBest: score > (s.best || 0), newHigh: score > this.data.highScore };
      this.data.stages[id] = { done: true, stars: Math.max(stars, s.stars || 0), best: Math.max(score, s.best || 0) };
      if (res.newHigh) this.data.highScore = score;
      this.save();
      return res;
    },

    get sound() { return this.data.settings.sound !== false; },
    set sound(v) { this.data.settings.sound = !!v; this.save(); },

    reset: function () {
      this.data.stages = {}; this.data.highScore = 0; this.save();
    }
  };

  GA.Storage = Storage.load();
})(window.GA = window.GA || {});
