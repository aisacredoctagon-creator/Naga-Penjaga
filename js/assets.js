/* assets.js — memuat aset gambar OPSIONAL dari assets/manifest.json. Bila manifest kosong/tidak ada, game memakai gambar prosedural bawaan.
 *   sprites: { ball, boss, rock, mover, portal, nest }   → Theme.sprites (menimpa gambar kode untuk elemen itu)
 *   maps:    { <idPeta>: { landscape, portrait } }       → GA.Maps[id].art (lapisan dasar peta; jalur, efek, dan portal tetap digambar kode)
 *   ui:      { wood, stone, parchment }                  → tekstur material UI
 * Semua path relatif terhadap assets/ (aman untuk GitHub Pages /Zuma/). Catatan: fetch manifest tidak jalan lewat file:// (diabaikan diam-diam);
 * gunakan server lokal atau Pages. */
(function (GA) {
  'use strict';
  const Assets = {
    ready: false, manifest: null, onReady: null,
    load: function () {
      if (!window.fetch) return;
      fetch('assets/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
        if (!m) return;
        Assets.manifest = m; let changed = false;
        Object.keys(m.sprites || {}).forEach(function (k) { if (m.sprites[k]) { GA.Theme.sprites[k] = 'assets/' + m.sprites[k]; changed = true; } });
        if (changed) GA.Theme.loadSprites();
        Object.keys(m.maps || {}).forEach(function (id) {
          const a = m.maps[id]; if (!a || !GA.Maps[id]) return;
          GA.Maps[id].art = { landscape: a.landscape ? 'assets/' + a.landscape : null, portrait: a.portrait ? 'assets/' + a.portrait : null }; changed = true;
        });
        Object.keys(m.ui || {}).forEach(function (k) { if (m.ui[k] && GA.Skin) GA.Skin.override(k, 'assets/' + m.ui[k]); });
        Assets.ready = true;
        if (changed && Assets.onReady) Assets.onReady();
      }).catch(function () { /* tanpa manifest: pakai bawaan */ });
    }
  };
  GA.Assets = Assets;
})(window.GA = window.GA || {});
