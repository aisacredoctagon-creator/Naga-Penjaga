/* theme.js — satu-satunya tempat untuk mengganti tampilan (warna, ukuran bola, naga, latar tiap step).
 * Semua gambar saat ini digambar lewat kode (placeholder). Untuk memakai aset sendiri,
 * isi `sprites` dengan URL gambar (mis. 'assets/rock.png'); kode gambar otomatis memakainya. */
(function (GA) {
  'use strict';

  const Theme = {
    fonts: {
      ui: '"Baloo 2","Fredoka","Trebuchet MS","Comic Sans MS",system-ui,sans-serif',
      title: '"Cinzel Decorative","Cinzel","Palatino Linotype","Book Antiqua",Georgia,serif'   // judul fantasi; angka tetap memakai ui
    },

    /* ---- token desain UI (satu sumber untuk HUD canvas dan CSS variables; lihat js/ui/skin.js) ----
     * Material: kayu tua, batu berukir, perkamen, emas bertrim, api. Semua panel memakai bevel + inner shadow + butiran halus. */
    ui: {
      wood: ['#8a5a2a', '#5a3418', '#2a160a'], gold: ['#fff0b0', '#e8b84a', '#9a6a14'], parchment: ['#fdf3d6', '#ecd9a6', '#c9ac6a'],
      stone: ['#9a94c0', '#605a84', '#2a2648'], ink: '#2a1a3a', rune: '#b890ff', fire: ['#fff3a0', '#ff9a3c', '#d9361a'],
      ok: '#3fbf6a', bad: '#e0405a', radius: { s: 10, m: 16, l: 24 }
    },

    colors: {
      hudBg: 'rgba(20,24,60,0.82)', hudText: '#ffffff', hudAccent: '#ffd23f',
      panel: '#ffffff', panelText: '#1b2a49',
      good: '#2fbf71', bad: '#ff4d5e', warn: '#ffb02e',
      ink: '#1b2a49',
      fire: ['#fff3a0', '#ff9a1f', '#d9361a'],   // bola api (terang, dasar, gelap)
      magic: '#b69cff'                            // cahaya sihir penyihir
    },

    // Orb sihir di rantai (terang, dasar, gelap): ungu / biru / hijau-kehijauan. Warna acak, TIDAK berkaitan dengan benar/salah.
    ballColors: [
      ['#e4d4ff', '#8b5cf6', '#3b1d8a'],   // ungu
      ['#d2c2ff', '#6d5ae6', '#2a1f7a'],   // indigo
      ['#c4dcff', '#3b82f6', '#16408f'],   // biru
      ['#bfe6ff', '#2aa0e8', '#0c4f86'],   // biru langit
      ['#b8f5e6', '#14b8a6', '#0a5f58'],   // hijau kebiruan
      ['#c8f7c4', '#22c08a', '#0b6a46'],   // hijau zamrud
      ['#efc8ff', '#b45ae6', '#5a1f86'],   // magenta-ungu
      ['#bde8ff', '#4f8df0', '#1d3f9a']    // biru kobalt
    ],

    /* ---- ukuran bola: SATU tempat untuk mengubahnya ----
     * Radius bola = BALL_RADIUS_RATIO × sisi pendek canvas logis (540), tetapi dinaikkan otomatis
     * supaya diameter bola di layar >= minScreenDiameter px (HP), dengan batas maxRadius. */
    BALL_RADIUS_RATIO: 0.06,

    /* Semua bola yang berperan sama memakai radius yang SAMA PERSIS (BALL_RADIUS): bola sihir di rantai, bola api
     * siap tembak di mulut naga, dan bola api yang melesat. Tidak ada pengali tambahan dan tidak ada perubahan
     * ukuran saat ditembak.
     *   SHOOTER_BALL_SCALE  harus 1.0 (bola siap tembak = bola rantai)
     *   NEXT_BALL_SCALE     bola berikutnya (preview), sedikit lebih kecil agar hierarkinya jelas */
    SHOOTER_BALL_SCALE: 1.0,
    NEXT_BALL_SCALE: 0.9,

    ball: {
      minScreenDiameter: 46,  // diameter bola (rantai & naga) di layar (px) minimal; radius dinaikkan otomatis di HP kecil
      maxRadius: 36,          // batas radius bola (layar lebar tidak membuatnya raksasa)
      bulletHitRatio: 1.0,    // radius tabrakan peluru dengan rantai = ratio × radius bola (1.0 = sama dengan yang terlihat)
      obstacleHitRatio: 0.4,  // radius tabrakan peluru dengan rintangan
      trackMargin: 12         // alur lebih lebar dari bola sejauh ini di tiap sisi
    },
    /** Hitung radius bola untuk canvas logis (W×H) dan skala layar (px CSS per unit logis). */
    ballRadiusFor: function (W, H, scale) {
      const short = Math.min(W, H), b = this.ball;
      const r = Math.max(this.BALL_RADIUS_RATIO * short, (b.minScreenDiameter / 2) / Math.max(scale, 0.01));
      return Math.round(Math.min(r, b.maxRadius));
    },
    /** Radius bola siap tembak (di mulut) = radius bola × SHOOTER_BALL_SCALE (1.0). */
    shooterBallRadius: function (R) { return this.SHOOTER_BALL_SCALE * R; },
    /** Radius bola preview: sedikit lebih kecil dari bola siap tembak. */
    nextBallRadius: function (R) { return this.NEXT_BALL_SCALE * R; },

    /* ---- naga penjaga (js/dragon.js) ---- */
    dragon: {
      wingSpan: 0.72,         // lebar sayap (skala; setengah bentang ≈ 1,85 × radius badan) — dibatasi agar tidak menutupi jalur, soket, atau soal
      radiusRatio: 1.45,      // radius badan = radiusRatio × radius bola
      headDist: 0.7,          // pusat kepala dari pusat badan (× radius badan)
      mouthDist: 1.95,        // pusat bola api (tepat di depan ujung moncong) dari pusat badan (× radius badan)
      body: ['#a6f0b4', '#33b56e', '#14633f'],   // zamrud: terang, dasar, gelap
      belly: ['#fff1b8', '#f2c75c'],             // perut emas hangat
      wing: ['#ffb45a', '#e8742a'],              // selaput sayap oranye
      spike: '#ff9a3c', horn: '#fff0c4', outline: 'rgba(8,60,36,0.7)',
      eye: '#ffe27a', pupil: '#1b1030', tooth: '#fffbe8', mouthIn: '#8a1d12', glow: 'rgba(255,150,40,0.6)',
      hurt: ['#ffd9d9', '#ff9a9a', '#b84848'],
      nest: ['#c99b4c', '#8d6420'],              // jerami sarang
      blinkEvery: [2.0, 5.0],
      breath: 0.025
    },

    /* ---- latar tiap step (dipakai scenery.js dan path.js) ----
     * sky: gradien langit; ground: gradien tanah; track: [tepi, isi, dalam]; ambient: partikel; far/near: siluet parallax */
    scenes: {
      menu:   { sky: ['#1b1650', '#5a3a9a'], ground: ['#2d6a4a', '#1d4a36'], track: ['#6a4a2e', '#b99a6a', '#a07f50'], glow: '#ffd27a', ambient: 'firefly', far: '#2a2272', near: '#173a2c' },
      forest: { sky: ['#2d7d6a', '#a8e0b0'], ground: ['#4aa860', '#2f7d48'], track: ['#7a5a34', '#d9b98a', '#c6a070'], glow: '#ffe08a', ambient: 'firefly', far: '#1f6a52', near: '#18503a' },
      volcano:{ sky: ['#3a1230', '#d4562a'], ground: ['#5a3a3a', '#35242a'], track: ['#2a1a1e', '#8a6a6a', '#6e5258'], glow: '#ff9a4a', ambient: 'ember', far: '#2a0f26', near: '#1f1218' },
      tower:  { sky: ['#0e0a2e', '#3a1f7a'], ground: ['#3a3366', '#241f4a'], track: ['#161038', '#6a5fb0', '#554a98'], glow: '#c9a8ff', ambient: 'spark', far: '#150f3d', near: '#0f0b2c' }
    },
    scene: 'forest',
    setScene: function (id) { this.scene = this.scenes[id] ? id : 'forest'; },
    sceneColors: function () { return this.scenes[this.scene]; },

    // Ganti null dengan URL gambar untuk menimpa gambar placeholder.
    // ball: gambar bola kosong (angka tetap digambar di atasnya)
    sprites: {
      ball: null, boss: null, rock: null, mover: null, portal: null, nest: null
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

  // varian peta memakai warna dasar adegan induknya (jalur, sarang, penanda)
  // varian peta memakai warna latar zona induknya (js/maps/variants.js)
  { const A = { forest: ['grove', 'swamp', 'swampDusk', 'coast', 'bloom'], volcano: ['crystal', 'ashfield', 'magma', 'iceCave', 'amethyst'], tower: ['tower2', 'library'] }; Object.keys(A).forEach(function (z) { A[z].forEach(function (id) { Theme.scenes[id] = Theme.scenes[z]; }); }); }

  GA.Theme = Theme;
})(window.GA = window.GA || {});
