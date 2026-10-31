/* boot.js — jembatan halaman awal → mesin game, dan pemuat malas (lazy loader).
 * Halaman awal hanya memuat HTML, CSS inti, UI kit, strings, theme token, storage, dan ui/start.js. Seluruh mesin game (render, entitas, peta, tekstur prosedural,
 * audio sintesis, soal, HUD, popup Jeda) ada di ENGINE di bawah dan baru diunduh + dijalankan saat "Mulai Main" (GA.Boot.play) — atau lebih awal secara senyap
 * (prefetch) bila pemain sudah berinteraksi dan koneksi/pengaturan memungkinkan. Urutan ENGINE = urutan eksekusi (sama dengan urutan <script> lama).
 *
 *   GA.Boot.play({ cat, diff })   unduh → jalankan skrip → GA.Game.boot() (dipecah per bagian) → GA.Game.start(): Stage 1. Bar pemuatan lewat GA.Start.loading(p).
 *   GA.Boot.ready(onProgress)     sama tanpa memulai permainan (alat dev ?test / ?debug memakainya).
 *   GA.Boot.prefetch()            pra-muat senyap saat idle (dilewati bila Save-Data, koneksi lambat, atau prefers-reduced-motion).
 * Mengunduh dengan fetch lalu menjalankan berurutan: bila ada berkas gagal, tidak ada yang dijalankan sehingga "Coba lagi" aman. file:// memakai <script> biasa. */
(function (GA) {
  'use strict';
  const ENGINE = [
    'js/config/gameplay.js', 'js/render/noise.js', 'js/render/textures.js', 'js/audio.js', 'js/assets.js', 'js/fx.js',
    'js/render/eggs.js', 'js/render/birds.js', 'js/render/decor.js', 'js/render/decor2.js',
    'js/maps/forest.js', 'js/maps/volcano.js', 'js/maps/tower.js', 'js/maps/variants.js',
    'js/render/effects.js', 'js/render/background.js', 'js/scenery.js', 'js/path.js', 'js/maps/paths.js', 'js/render/balls.js',
    'js/chain.js', 'js/render/fire.js', 'js/dragon.js', 'js/shooter.js', 'js/questions.js', 'js/qmanager.js', 'js/hazards.js', 'js/levels.js',
    'js/render/wizard.js', 'js/boss.js', 'js/swap.js', 'js/story.js', 'js/ui/hud.js', 'js/ui.js', 'js/main.js'
  ];
  const CSS = ['css/pause.css'];
  const slice = function () { return new Promise(function (r) { setTimeout(r, 0); }); };
  const conn = function () { return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null; };

  /** Pengguna meminta hemat data / koneksi lambat / gerak dikurangi → tanpa pra-muat tambahan. */
  function frugal() {
    const c = conn();
    return !!((c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  }

  function addCss() {
    return Promise.all(CSS.map(function (href) {
      if (document.querySelector('link[href="' + href + '"][rel="stylesheet"]')) return null;
      return new Promise(function (res) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = l.onerror = res; document.head.appendChild(l); });
    }));
  }

  function runCode(code, url) { (0, eval)(code + '\n//# sourceURL=' + url); }      // eval tidak langsung: lingkup global; galat dilempar ke pemanggil

  const Boot = {
    ENGINE: ENGINE, loaded: false, _load: null, _booting: null, _pf: false,

    /** Unduh semua skrip mesin (paralel), lalu jalankan berurutan dengan jeda antar-berkas. onProgress(0..1). */
    load: function (onProgress) {
      if (Boot.loaded) return Promise.resolve();
      onProgress = onProgress || function () {};
      if (Boot._load) { Boot._onP = onProgress; return Boot._load; }
      Boot._onP = onProgress; const P = function (p) { if (Boot._onP) Boot._onP(p); };
      const n = ENGINE.length;
      if (location.protocol === 'file:') {      // fetch tidak jalan di file://: <script> berurutan
        Boot._load = addCss().then(function () {
          return ENGINE.reduce(function (pr, src, i) { return pr.then(function () { return new Promise(function (res, rej) { const s = document.createElement('script'); s.src = src; s.onload = function () { P((i + 1) / n); res(); }; s.onerror = function () { rej(new Error('gagal memuat ' + src)); }; document.body.appendChild(s); }); }); }, Promise.resolve());
        }).then(function () { Boot.loaded = true; });
      } else {
        let got = 0;
        Boot._load = Promise.all([addCss()].concat(ENGINE.map(function (u) {
          return fetch(u).then(function (r) { if (!r.ok) throw new Error('gagal memuat ' + u + ' (' + r.status + ')'); return r.text(); }).then(function (t) { got++; P(0.55 * got / n); return t; });
        }))).then(function (all) {
          const texts = all.slice(1);
          return texts.reduce(function (pr, code, i) {
            return pr.then(function () { runCode(code, ENGINE[i]); P(0.55 + 0.45 * (i + 1) / n); return i % 4 === 3 ? slice() : null; });      // jalankan berurutan; bar sempat digambar
          }, Promise.resolve());
        }).then(function () { Boot.loaded = true; });
      }
      Boot._load = Boot._load.catch(function (e) { Boot._load = null; throw e; });
      return Boot._load;
    },

    /** Unduh + jalankan skrip + boot mesin (canvas, listener, UI permainan, loop). progress 0..1: 0–0,75 unduh/jalankan, 0,75–1 inisialisasi. */
    ready: function (onProgress) {
      onProgress = onProgress || function () {};
      return Boot.load(function (p) { onProgress(0.75 * p); }).then(function () {
        if (GA.Game.booted) { onProgress(1); return null; }
        if (!Boot._booting) Boot._booting = GA.Game.boot(function (p) { onProgress(0.75 + 0.25 * p); }).then(function () { Boot._booting = null; }, function (e) { Boot._booting = null; throw e; });
        return Boot._booting;
      });
    },

    /** AudioContext dibuat pada ketukan "Mulai Main" (aturan autoplay: harus di dalam gestur pengguna); audio.js memakainya. Musik baru mulai saat permainan dimulai. */
    unlockAudio: function () {
      try {
        const S = GA.Storage; if (!(S.sound || S.music) || GA.preCtx) return;
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        GA.preCtx = new AC(); if (GA.preCtx.state === 'suspended') GA.preCtx.resume();
      } catch (e) { GA.preCtx = null; }
    },

    play: function (sel) {
      Boot.unlockAudio();
      GA.Start.loading(0);
      return Boot.ready(function (p) { GA.Start.loading(p); }).then(function () { GA.Game.start(sel); }).catch(function (err) {
        if (window.console) console.error(err);
        GA.Start.loadFail();
      });
    },

    /** Pra-muat senyap (rel=prefetch, prioritas rendah) setelah interaksi pertama + saat idle. Tidak menjalankan apa pun. */
    prefetch: function () {
      if (Boot._pf || Boot.loaded || frugal() || location.protocol === 'file:') return;
      Boot._pf = true;
      const go = function () {
        ENGINE.concat(CSS).forEach(function (href) { const l = document.createElement('link'); l.rel = 'prefetch'; l.as = href.slice(-4) === '.css' ? 'style' : 'script'; l.href = href; document.head.appendChild(l); });
      };
      if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 5000 }); else setTimeout(go, 2500);
    }
  };
  GA.Boot = Boot;

  // pra-muat setelah interaksi pertama (bukan saat halaman dibuka)
  const EVS = ['pointerdown', 'keydown', 'touchstart'];
  function onFirst() { EVS.forEach(function (ev) { window.removeEventListener(ev, onFirst); }); Boot.prefetch(); }
  EVS.forEach(function (ev) { window.addEventListener(ev, onFirst, { passive: true }); });
})(window.GA = window.GA || {});
