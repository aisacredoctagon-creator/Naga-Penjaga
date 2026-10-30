/* storage.js — pilihan terakhir (kategori & kesulitan), rekor skor, dan pengaturan, disimpan di localStorage. Dimuat di halaman awal (tanpa mesin game).
 * Skema BERVERSI (`v`): v1 = lima step, v2 = tiga stage + hasil per stage + pilihan per stage, v3 (revisi 9) = satu pilihan `pick` { cat, diff } untuk ketiga stage.
 * Data lama TIDAK dihapus: `sel`, `prog`, `last` dari v1/v2 dibawa apa adanya (diabaikan game; hanya tombol Hapus Data yang membersihkannya), `highScore` tetap dibaca.
 * Kunci yang hilang / rusak diganti nilai bawaan; tidak pernah melempar galat. Semua akses dibungkus try/catch (mode privat / penyimpanan diblokir). */
(function (GA) {
  'use strict';
  const KEY = 'gasing.nagapenjaga.v2', SCHEMA = 3;      // kunci tetap (simpanan lama ikut terbaca); nomor skema di dalam data yang naik
  const C = GA.Categories;

  const num = function (v, d) { return typeof v === 'number' && isFinite(v) && v >= 0 ? v : d; };
  const obj = function (v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : null; };
  const goodPick = function (p) { return { cat: p && C.has(p.cat) ? p.cat : C.DEFAULT_CAT, diff: p && C.DIFFS.indexOf(p.diff) >= 0 ? p.diff : C.DEFAULT_DIFF }; };

  /** Bersihkan data mentah dari versi mana pun menjadi skema sekarang (tidak pernah melempar). */
  function migrate(d) {
    const out = { v: SCHEMA, pick: null, sel: null, prog: {}, last: {}, highScore: 0, introSeen: false, coachSeen: false, swapSeen: false, settings: { sound: true, music: true, quality: 'auto' } };
    if (!obj(d)) return out;
    if (obj(d.pick)) out.pick = goodPick(d.pick);
    else if (obj(d.sel)) {      // v1/v2: ambil kategori stage 1 dan kesulitan terakhir sebagai pilihan awal
      const sl = Array.isArray(d.sel.slots) ? d.sel.slots : [];
      out.pick = goodPick({ cat: sl[0], diff: d.sel.diff });
    }
    if (obj(d.sel)) out.sel = d.sel; if (obj(d.prog)) out.prog = d.prog; if (obj(d.last)) out.last = d.last;      // data lama: dibawa, tidak dipakai
    out.highScore = num(d.highScore, 0); out.introSeen = !!d.introSeen; out.coachSeen = !!d.coachSeen; out.swapSeen = !!d.swapSeen;
    if (obj(d.settings)) Object.assign(out.settings, d.settings);
    return out;
  }

  const Storage = {
    data: migrate(null),
    migrate: migrate,
    SCHEMA: SCHEMA,

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

    /** Pilihan terakhir halaman awal: { cat, diff } (selalu valid; pertama kali = bawaan di config/categories.js). */
    get pick() { return goodPick(this.data.pick); },
    set pick(v) { this.data.pick = goodPick(v); this.save(); },

    /** Rekor skor satu petualangan (global). Mengembalikan true bila rekor naik. */
    noteScore: function (score) { if (score > this.data.highScore) { this.data.highScore = score; this.save(); return true; } return false; },
    get highScore() { return this.data.highScore; },

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

    /** Hapus Data (tombol di Atur): rekor, tanda cerita/petunjuk, dan data lama. Pengaturan suara/grafik dipertahankan. */
    reset: function () {
      this.data.prog = {}; this.data.last = {}; this.data.sel = null; this.data.highScore = 0; this.data.introSeen = false; this.data.swapSeen = false; this.save();
    }
  };

  GA.Storage = Storage.load();
})(window.GA = window.GA || {});
