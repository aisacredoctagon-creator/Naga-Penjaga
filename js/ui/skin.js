/* skin.js — menerjemahkan token desain (Theme.ui) menjadi CSS variables dan tekstur material (kayu, batu, perkamen) yang dibangkitkan
 * secara prosedural lalu dipasang sebagai CSS background (data URL kecil). Dipanggil sekali oleh UI.init().
 * Semua layar DOM memakai variabel ini (css/ui.css), jadi mengubah Theme.ui langsung mengubah seluruh UI.
 * Opsi aset: jika berkas assets/ui/wood.webp | stone.webp | parchment.webp ada, pakai itu sebagai pengganti tekstur prosedural. */
(function (GA) {
  'use strict';
  const T = GA.Theme, N = GA.Noise, TX = GA.Textures;

  function url(c, q) { return 'url("' + c.toDataURL('image/jpeg', q || 0.86) + '")'; }

  function woodTex() { return TX.wood(256, 128, 7, [T.ui.wood[0], T.ui.wood[1]]); }
  function darkWoodTex() { return TX.wood(256, 128, 11, [T.ui.wood[1], T.ui.wood[2]]); }

  function stoneTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, T.ui.stone[0]); gr.addColorStop(0.55, T.ui.stone[1]); gr.addColorStop(1, T.ui.stone[2]); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.32; g.drawImage(TX.voronoi(31, 128, 12), 0, 0, 256, 256);
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.9; g.drawImage(TX.fbm(5, 256, 4), 0, 0);
    return c;
  }

  function parchTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = N.rng(3);
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, T.ui.parchment[0]); gr.addColorStop(1, T.ui.parchment[1]); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.7; g.drawImage(TX.fbm(8, 256, 4), 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(120,80,30,' + (0.03 + r() * 0.05).toFixed(3) + ')'; g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2); }
    return c;
  }

  const Skin = {
    apply: function () {
      const root = document.documentElement.style, U = T.ui;
      const set = function (k, v) { root.setProperty(k, v); };
      U.wood.forEach(function (c, i) { set('--wood-' + (i + 1), c); });
      U.gold.forEach(function (c, i) { set('--gold-' + (i + 1), c); });
      U.parchment.forEach(function (c, i) { set('--parch-' + (i + 1), c); });
      U.stone.forEach(function (c, i) { set('--stone-' + (i + 1), c); });
      set('--ink', U.ink); set('--rune', U.rune); set('--ok', U.ok); set('--bad', U.bad);
      set('--fire-1', U.fire[0]); set('--fire-2', U.fire[1]); set('--fire-3', U.fire[2]);
      set('--r-s', U.radius.s + 'px'); set('--r-m', U.radius.m + 'px'); set('--r-l', U.radius.l + 'px');
      set('--font-title', T.fonts.title); set('--font-ui', T.fonts.ui);
      try {
        set('--tex-wood', url(woodTex())); set('--tex-wood-dark', url(darkWoodTex())); set('--tex-stone', url(stoneTex())); set('--tex-parch', url(parchTex()));
      } catch (e) { /* tekstur gagal: warna datar dari variabel di atas tetap dipakai */ }
    },

    /** Timpa tekstur dengan gambar (dari assets/manifest.json). n: wood | stone | parchment. */
    override: function (n, src) {
      const im = new Image(); im.onload = function () { document.documentElement.style.setProperty(n === 'parchment' ? '--tex-parch' : '--tex-' + n, 'url("' + src + '")'); }; im.src = src;
    }
  };
  GA.Skin = Skin;
})(window.GA = window.GA || {});
