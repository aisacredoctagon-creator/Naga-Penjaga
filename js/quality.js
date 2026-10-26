/* quality.js — tingkat kualitas grafis: Tinggi / Sedang / Rendah, dengan mode Otomatis yang menurunkan tingkat bila FPS rata-rata di bawah ~50.
 *
 * Yang diatur tiap tingkat (PRESETS):
 *   fx    tingkat efek atmosfer (GA.Effects.setQuality): kabut, berkas cahaya, riak, cahaya obor/lava, burung, goyangan dedaunan, partikel portal
 *   dens  kepadatan partikel pendek (bara, asap) di FX
 *   dpr   batas devicePixelRatio kanvas (resolusi render)
 *   glow  lapisan menyala (retakan lava, rune) digambar atau tidak
 * Mode disimpan di localStorage (Storage.quality). Mode Otomatis hanya MENURUNKAN tingkat (tidak naik lagi) agar tidak berayun-ayun;
 * mengubah ke mode manual atau ke Otomatis lagi memulai dari Tinggi. Pengukuran hanya saat bermain (bukan jeda/menu/tab tersembunyi). */
(function (GA) {
  'use strict';
  const ORDER = ['rendah', 'sedang', 'tinggi'];
  const PRESETS = {
    tinggi: { fx: 2, dens: 1, dpr: 2, glow: true },
    sedang: { fx: 1, dens: 0.6, dpr: 1.5, glow: true },
    rendah: { fx: 0, dens: 0.3, dpr: 1, glow: false }
  };
  const NAMES = { auto: 'Otomatis', tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' };

  const Q = {
    PRESETS: PRESETS, NAMES: NAMES,
    mode: 'auto', level: 'tinggi', fps: 60, dprCap: 2, glow: true, onChange: null,
    _acc: 0, _frames: 0, _bad: 0, _cool: 4, _lowered: 0,

    init: function (mode, onChange) { this.onChange = onChange || null; this.setMode(mode || 'auto', true); },

    /** mode: 'auto' | 'tinggi' | 'sedang' | 'rendah'. */
    setMode: function (mode, silent) {
      this.mode = NAMES[mode] ? mode : 'auto';
      this.level = this.mode === 'auto' ? 'tinggi' : this.mode;
      this._acc = 0; this._frames = 0; this._bad = 0; this._cool = 4; this._lowered = 0;
      this.apply(silent);
    },

    cycle: function () { const m = ['auto', 'tinggi', 'sedang', 'rendah'], i = m.indexOf(this.mode); this.setMode(m[(i + 1) % m.length]); return this.mode; },

    apply: function (silent) {
      const p = PRESETS[this.level];
      if (GA.Effects) GA.Effects.setQuality(p.fx);
      if (GA.FX) GA.FX.density = p.dens;
      this.dprCap = p.dpr; this.glow = p.glow;
      if (!silent && this.onChange) this.onChange(this.level);
    },

    label: function () { return this.mode === 'auto' ? NAMES.auto + ' (' + NAMES[this.level] + ')' : NAMES[this.mode]; },

    /** Panggil tiap frame nyata dengan dt mentah (detik). playing = sedang bermain. */
    sample: function (rawDt, playing) {
      if (!playing || rawDt > 0.25 || rawDt <= 0) { this._acc = 0; this._frames = 0; return; }   // jeda / tab tersembunyi / lonjakan: abaikan jendela ini
      this._acc += rawDt; this._frames++;
      if (this._acc < 2) return;
      this.fps = this._frames / this._acc; this._acc = 0; this._frames = 0;
      if (this._cool > 0) { this._cool -= 2; return; }          // beri waktu setelah perubahan / awal step
      if (this.mode !== 'auto') return;
      if (this.fps < 50) this._bad++; else this._bad = 0;
      if (this._bad >= 2) {
        this._bad = 0; const i = ORDER.indexOf(this.level);
        if (i > 0) { this.level = ORDER[i - 1]; this._cool = 6; this._lowered++; this.apply(); }
      }
    }
  };

  GA.Quality = Q;
})(window.GA = window.GA || {});
