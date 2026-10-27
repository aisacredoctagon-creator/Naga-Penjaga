/* storage.js — pilihan terakhir (kategori & kesulitan), bintang per step, skor tertinggi, dan pengaturan, disimpan di localStorage.
 * Semua akses dibungkus try/catch (mode privat / penyimpanan diblokir tidak merusak game). */
(function (GA) {
  'use strict';
  const KEY = 'gasing.nagapenjaga.v2';

  const STEPS = 5;
  const DEFAULT_SEL = { slots: ['add', 'add', 'add', 'add', 'add'], same: true, random: false, diff: 'mudah' };

  const Storage = {
    data: { sel: null, prog: {}, highScore: 0, introSeen: false, coachSeen: false, settings: { sound: true, music: true, quality: 'auto' } },
    unlockAll: /[?&]unlock(=1|&|$)/.test(location.search),

    load: function () {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          this.data.sel = d.sel || null;
          this.data.prog = d.prog || {};
          this.data.highScore = d.highScore || 0;
          this.data.introSeen = !!d.introSeen; this.data.coachSeen = !!d.coachSeen;
          this.data.settings = Object.assign({ sound: true, music: true, quality: 'auto' }, d.settings || {});
        }
      } catch (e) { /* abaikan */ }
      return this;
    },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* abaikan */ }
    },

    /** Pilihan menu terakhir: { slots:[k1..k5], same, random, diff }. */
    get sel() {
      const sl = ((this.data.sel && this.data.sel.slots) || DEFAULT_SEL.slots).slice(0, STEPS);
      while (sl.length < STEPS) sl.push(sl[0] || 'add');
      return Object.assign({}, DEFAULT_SEL, this.data.sel || {}, { slots: sl });
    },
    set sel(v) { this.data.sel = { slots: v.slots.slice(0, STEPS), same: !!v.same, random: !!v.random, diff: v.diff }; this.save(); },

    /** Progres per kesulitan: bintang & skor terbaik tiap step. Step terbuka berurutan (step n+1 terbuka setelah step n selesai). */
    prog: function (diff) {
      const p = (this.data.prog || {})[diff] || {};
      const fix = function (a) { const o = (a || []).slice(0, STEPS); while (o.length < STEPS) o.push(0); return o; };
      return { stars: fix(p.stars), best: fix(p.best) };
    },
    /** Banyaknya step yang bisa dimainkan (1..STEPS). ?unlock=1 membuka semuanya (untuk uji coba). */
    unlocked: function (diff) {
      if (this.unlockAll) return STEPS;
      const p = this.prog(diff); let n = 1;
      while (n < STEPS && p.stars[n - 1] > 0) n++;
      return n;
    },
    totalStars: function () {
      let n = 0; const pr = this.data.prog || {};
      for (const k in pr) n += (pr[k].stars || []).reduce(function (a, b) { return a + b; }, 0);
      return n;
    },

    /** Catat hasil satu step (indeks 0..STEPS-1): bintang & skor terbaik (skor = skor kumulatif petualangan saat step selesai). */
    recordStep: function (diff, step, stars, score) {
      const p = this.prog(diff);
      p.stars[step] = Math.max(p.stars[step] || 0, stars); p.best[step] = Math.max(p.best[step] || 0, score || 0);
      this.data.prog = this.data.prog || {}; this.data.prog[diff] = p; this.save();
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

    get sound() { return this.data.settings.sound !== false; },
    set sound(v) { this.data.settings.sound = !!v; this.save(); },
    get quality() { return this.data.settings.quality || 'auto'; },
    set quality(v) { this.data.settings.quality = v; this.save(); },
    get music() { return this.data.settings.music !== false; },
    set music(v) { this.data.settings.music = !!v; this.save(); },

    reset: function () {
      this.data.prog = {}; this.data.highScore = 0; this.data.introSeen = false; this.save();
    }
  };

  GA.Storage = Storage.load();
})(window.GA = window.GA || {});
