/* quality.js — satu saklar "Efek: Hidup / Mati" (revisi 11; menggantikan Tinggi/Sedang/Rendah + Otomatis).
 *
 * Hidup: partikel pendek (≤ 80 di pool FX), animasi sprite non-esensial (kepak sayap, kedip, melayang, denyut), resolusi kanvas sampai DPR 2.
 * Mati : nol partikel, tanpa animasi sprite non-esensial, DPR kanvas ≤ 1. Pergerakan inti (bola, tembakan, indikator tukar, peringatan rintangan) TETAP berjalan.
 * prefers-reduced-motion diperlakukan sama dengan Mati (main.js memasang FX.reduce + GA.FlatMap.reduceMotion). Pilihan disimpan di Storage.fx.
 * API: Quality.init(on, onChange) · Quality.setFx(on, silent) · Quality.on · Quality.dprCap · Quality.sample(rawDt, playing) (hanya mengukur FPS untuk ?debug). */
(function (GA) {
  'use strict';
  const Q = {
    on: true, dprCap: 2, fps: 60, onChange: null, _acc: 0, _frames: 0,

    init: function (on, onChange) { this.onChange = onChange || null; this.setFx(on !== false && on !== 'rendah', true); },

    setFx: function (on, silent) {
      this.on = !!on; this.dprCap = this.on ? 2 : 1;
      if (GA.FX) GA.FX.density = this.on ? 1 : 0;
      if (!silent && this.onChange) this.onChange(this.on);
    },
    /** Kompatibel dengan pemanggil lama: 'rendah' = Mati, lainnya = Hidup. */
    setMode: function (mode, silent) { this.setFx(mode !== 'rendah' && mode !== false, silent); },

    label: function () { return this.on ? 'Hidup' : 'Mati'; },
    /** true bila animasi sprite non-esensial harus diam (Efek Mati atau prefers-reduced-motion). */
    calm: function () { return !this.on || !!(GA.FX && GA.FX.reduce); },

    /** Panggil tiap frame nyata dengan dt mentah (detik): rata-rata FPS per ~2 dtk (untuk overlay ?debug), tanpa menurunkan apa pun. */
    sample: function (rawDt, playing) {
      if (!playing || rawDt > 0.25 || rawDt <= 0) { this._acc = 0; this._frames = 0; return; }
      this._acc += rawDt; this._frames++;
      if (this._acc >= 2) { this.fps = this._frames / this._acc; this._acc = 0; this._frames = 0; }
    }
  };
  Object.defineProperty(Q, 'level', { get: function () { return this.on ? 'tinggi' : 'rendah'; } });
  Object.defineProperty(Q, 'mode', { get: function () { return this.on ? 'tinggi' : 'rendah'; } });

  GA.Quality = Q;
})(window.GA = window.GA || {});
