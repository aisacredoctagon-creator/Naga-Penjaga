/* theme.js — satu-satunya tempat untuk mengganti tampilan.
 * Semua gambar saat ini digambar lewat kode (placeholder). Untuk memakai aset sendiri,
 * isi `sprites` dengan URL gambar (mis. 'assets/rock.png'); kode gambar otomatis memakainya. */
(function (GA) {
  'use strict';

  const Theme = {
    fonts: {
      ui: '"Baloo 2","Fredoka","Trebuchet MS","Comic Sans MS",system-ui,sans-serif'
    },

    colors: {
      skyTop: '#6fd3ff', skyBottom: '#d9f7ff',
      grassA: '#a6e86f', grassB: '#7dd35a',
      trackEdge: '#b98550', trackFill: '#e7c58f', trackInner: '#d9b27a',
      hudBg: 'rgba(20,40,90,0.78)', hudText: '#ffffff', hudAccent: '#ffd23f',
      panel: '#ffffff', panelText: '#1b2a49',
      good: '#2fbf71', bad: '#ff4d5e', warn: '#ffb02e',
      ink: '#1b2a49'
    },

    // warna bola (terang, dasar, gelap). Warna acak dan TIDAK berkaitan dengan benar/salah.
    ballColors: [
      ['#ff9a9a', '#ef4444', '#9b1c1c'],
      ['#ffc98a', '#f97316', '#9a3f06'],
      ['#fff08a', '#f2b705', '#8f6a00'],
      ['#a9f59a', '#22c55e', '#0f6b2f'],
      ['#8ff3e4', '#14b8a6', '#0b6b61'],
      ['#a6cdff', '#3b82f6', '#1d3f94'],
      ['#d9bcff', '#8b5cf6', '#4b2a9b'],
      ['#ffb8e0', '#ec4899', '#8f1f59']
    ],

    /* ---- ukuran bola: SATU tempat untuk mengubahnya ----
     * Radius bola rantai = radiusRatio × sisi pendek canvas logis (540), tetapi dinaikkan otomatis
     * supaya diameter bola di layar >= minScreenDiameter px (HP), dengan batas maxRadius. */
    BALL_RADIUS_RATIO: 0.06,
    ball: {
      minScreenDiameter: 44,
      maxRadius: 36,
      playerRatio: 0.72,      // bola di mulut kodok / preview / peluru = playerRatio × radius bola rantai
      bulletHitRatio: 0.55,   // radius tabrakan peluru relatif terhadap bola pemain
      trackMargin: 12         // alur lebih lebar dari bola sejauh ini di tiap sisi
    },
    /** Hitung radius bola rantai untuk canvas logis (W×H) dan skala layar (px CSS per unit logis). */
    ballRadiusFor: function (W, H, scale) {
      const short = Math.min(W, H), b = this.ball;
      const r = Math.max(this.BALL_RADIUS_RATIO * short, (b.minScreenDiameter / 2) / Math.max(scale, 0.01));
      return Math.round(Math.min(r, b.maxRadius));
    },

    /* ---- kodok (js/frog.js) ---- */
    frog: {
      radiusRatio: 1.4,       // radius badan = radiusRatio × radius bola rantai
      body: ['#d5f89a', '#79d654', '#2f9238'],   // terang, dasar, gelap
      hurt: ['#ffd9d9', '#ff9a9a', '#b84848'],   // saat meringis
      belly: '#f6ffd6', spots: 'rgba(28,110,40,0.32)', outline: 'rgba(20,70,25,0.55)',
      eyeWhite: '#ffffff', pupil: '#15213f', mouth: '#7a1f2e', lip: '#4aa83e', tongue: '#ff7a95',
      cheek: 'rgba(255,110,140,0.5)', tear: '#8fd3ff',
      pad: ['#58bf5e', '#2f8a3d'],               // daun teratai di bawah kodok
      blinkEvery: [2.0, 5.0],                    // detik, acak
      breath: 0.025                              // amplitudo napas
    },

    // Ganti null dengan URL gambar untuk menimpa gambar placeholder.
    // ball: gambar bola kosong (angka tetap digambar di atasnya)
    sprites: {
      ball: null, shooter: null, boss: null, rock: null, mover: null, hole: null, background: null
    },

    _imgs: {},
    loadSprites: function () {
      const self = this;
      Object.keys(this.sprites).forEach(function (k) {
        const src = self.sprites[k];
        if (!src) return;
        const img = new Image();
        img.src = src;
        self._imgs[k] = img;
      });
    },
    sprite: function (name) {
      const img = this._imgs[name];
      return img && img.complete && img.naturalWidth > 0 ? img : null;
    }
  };

  GA.Theme = Theme;
})(window.GA = window.GA || {});
