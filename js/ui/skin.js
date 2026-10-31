/* skin.js — menerjemahkan token desain (Theme.ui, SATU sumber) menjadi CSS variables, ditambah SATU tile noise kecil (128×128, opasitas rendah dipasang oleh CSS) untuk
 * tekstur batu. Tanpa tekstur prosedural besar. Dipanggil sekali oleh Start.init(). Semua layar DOM memakai variabel ini (css/kit.css), jadi mengubah Theme.ui langsung mengubah UI. */
(function (GA) {
  'use strict';
  const T = GA.Theme;

  /** Tile noise 128×128 abu-abu transparan (deterministik, ±16 ribu piksel: murni dan murah). */
  function noiseTile() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), im = g.createImageData(128, 128), d = im.data; let s = 1234567;
    for (let i = 0; i < d.length; i += 4) { s = (s * 1664525 + 1013904223) >>> 0; const v = 90 + ((s >>> 24) % 120); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(im, 0, 0); return 'url("' + c.toDataURL('image/png') + '")';
  }

  const Skin = {
    apply: function () {
      const root = document.documentElement.style, U = T.ui, set = function (k, v) { root.setProperty(k, v); };
      ['slate', 'plaque', 'frame', 'gold', 'green', 'amber', 'red', 'blue', 'fire'].forEach(function (n) { U[n].forEach(function (c, i) { set('--' + n + '-' + (i + 1), c); }); });
      set('--edge', U.edge); set('--cream', U.cream); set('--cream-dim', U.creamDim); set('--rune', U.rune); set('--ok', U.ok); set('--bad', U.bad);
      set('--r-s', U.radius.s + 'px'); set('--r-m', U.radius.m + 'px'); set('--r-l', U.radius.l + 'px'); set('--font-title', T.fonts.title); set('--font-ui', T.fonts.ui);
      try { set('--tex-noise', noiseTile()); } catch (e) { /* tanpa tekstur: warna datar */ }
    },

    /** Timpa tekstur batu dengan gambar sendiri (assets/manifest.json → ui.stone). */
    override: function (n, src) {
      if (n !== 'stone') return;
      const im = new Image(); im.onload = function () { document.documentElement.style.setProperty('--tex-noise', 'url("' + src + '")'); }; im.src = src;
    }
  };
  GA.Skin = Skin;
})(window.GA = window.GA || {});
