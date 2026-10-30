/* config/gameplay.js — SEMUA angka gameplay rantai bola di satu tempat.
 *
 * Satuan: kecepatan & jarak dinyatakan dalam "diameter bola" (d) dan detik, BUKAN piksel, supaya terasa sama di portrait,
 * landscape, dan desktop. Diameter = 2 x BALL_RADIUS (radius bola step yang berjalan). Chain mengalikan dengan `unit` = 2r.
 *
 * Tiga lapis nilai (yang belakangan menang):
 *   DEFAULTS            nilai dasar semua kesulitan & step
 *   PER_DIFF[diff]      nilai khusus kesulitan (mudah / sedang / sulit)
 *   STAGE_SPEED_MULT[n] pengali CHAIN_BASE_SPEED per stage (Stage 3 = jalur boss pendek, lebih pelan)
 *   overrides           dari panel ?debug=tune (hanya aktif dengan parameter itu; tidak pernah tampil ke pemain biasa)
 *
 * resolve(diff, step) -> objek datar { CHAIN_BASE_SPEED, ... } yang dipegang `run.gp`; Chain membacanya tiap frame,
 * jadi menggeser slider di panel berlaku langsung. Menambah parameter: isi DEFAULTS (+ PER_DIFF bila perlu) dan META (untuk slider).
 */
(function (GA) {
  'use strict';

  const DEFAULTS = {
    /* --- kecepatan rantai (diameter/detik) --- */
    CHAIN_BASE_SPEED: 0.2,          // kecepatan normal bola terdepan (diisi ulang dari PER_DIFF x STAGE_SPEED_MULT)
    CHAIN_ENTRY_SPEED_MULT: 3.0,    // fase masuk: paling tidak sekian kali CHAIN_BASE_SPEED...
    SPAWN_FILL_TIME: 6,             // ...dan cukup cepat agar bola fase masuk habis keluar dalam sekian detik (yang lebih cepat menang)
    ENTRY_HEAD_FRAC: 0.25,          // fase masuk berhenti saat kepala rantai mencapai sekian bagian jalur terlihat (portal -> sarang)
    ENTRY_MAX_DPS: 8,               // batas atas kecepatan fase masuk
    ENTRY_EASE_TIME: 1.0,           // detik transisi halus fase masuk -> kecepatan normal
    EMERGE_ANIM_TIME: 0.2,          // animasi bola keluar dari portal (tidak memperlambat arus)
    FF_MULT: 4,                     // tidak ada bola target terlihat: percepat sampai ada
    FROST_SLOW_MULT: 0.3,           // pengali kecepatan saat rantai beku (bola beku / buff Waktu Beku)
    FAST_MULT: 2.3,                 // pengali saat `fastT` (cadangan)
    FROST_BALL_TIME: 6,             // lama melambat setelah bola beku ditembak (dtk)

    /* --- tekanan bertahap & segmen sarang --- */
    CHAIN_PRESSURE_RAMP: 0.15,      // tambahan kecepatan maksimum (+15%) di ujung rampa
    PRESSURE_RAMP_TIME: 240,        // detik untuk mencapai tambahan penuh
    PRESSURE_DROP: 0.12,            // tiap jawaban benar beruntun (kombo >= 2) menurunkan tekanan sebesar ini (0..1)
    NEST_SLOW_DIAMS: 7,             // jarak (d) dari sarang tempat rantai mulai melambat
    NEST_SLOW_MULT: 0.7,            // pengali paling pelan tepat di sarang (tidak pernah berhenti)

    /* --- kerapatan --- */
    BALL_SPACING_FACTOR: 0.98,      // jarak pusat bola bersebelahan = 2 x BALL_RADIUS x ini (0,96-1,0: saling menyentuh)
    GAP_CLOSE_SPEED: 7.5,           // bagian belakang celah menyusul sekian d/dtk (celah 1 bola menutup ±0,13 dtk)
    INSERT_TIME: 0.12,              // bola menyisip: tetangga bergeser halus selama ini
    MAX_DT: 0.05,                   // batas langkah waktu (dtk): tab di-resume / FPS jatuh tidak membuat bola melompat

    /* --- reaksi rantai terhadap pemain --- */
    RETREAT_SEC: 6,                 // jawaban benar: rantai mundur sejauh kecepatan dasar x sekian detik...
    COMBO_RETREAT_DIAMS: 0.3,       // ...ditambah sekian d per kombo (maks. 5)
    RETREAT_SPEED: 12,              // d/dtk gerak mundur
    NEST_RETREAT_DIAMS: 10,         // bola target lolos ke sarang: rantai mundur sejauh ini...
    NEST_RETREAT_SPEED: 14,         // ...dengan kecepatan ini (d/dtk)...
    NEST_HOLD: 0.5,                 // ...lalu diam sebentar (dtk)

    /* --- telur (nyawa), bintang, boss, penukaran bola (bukan slider) --- */
    EGGS_MAX: 3,                    // telur = nyawa, selalu 3/3 di awal tiap stage (termasuk saat Ulangi)
    WRONG_ANSWERS_PER_EGG: 2,       // sekian jawaban salah = 1 telur hilang (revisi 7 tahap c: 2; bot akurasi 90% hanya bisa menang ~68% bila 1)
    STAR_3_PCT: 0.9,                // bintang 3: benar-pertama-kali >= 90%
    STAR_2_PCT: 0.7,                // bintang 2: >= 70%; bintang 1: stage selesai
    BOSS_HP_BARS: 2,                // 1 atau 2 bar darah boss (2: bar 1 habis di soal ke-10 = fase 2)
    SWAP_TELEGRAPH_MS: 2500,        // dari peringatan sampai MULAI menukar (ms): peringatan ±0,8 dtk + sorot ±1,7 dtk; batas bawah 2000 (SWAP_TELEGRAPH_MIN_MS). Dipakai sebagai detik di run.gp.SWAP_TELEGRAPH
    SWAP_WARN_MS: 800,              // fase peringatan (ikon ⇄ di zona informasi + SFX + pelaku mulai beraksi); sisanya fase sorot (cincin, ikon di atas bola, busur, hitung mundur)
    SWAP_ANIM: 0.5,                 // detik gerak tukar (melengkung)
    SWAP_AFTER: 1.0,                // detik setelah menukar cincin memudar di posisi BARU
    SWAP_MIN_START: 4,              // tidak ada penukaran dalam sekian detik pertama stage
    SWAP_AFTER_QUESTION: 3,         // ...dan dalam sekian detik setelah soal aktif berganti

    /* --- tembakan LONTAR + target-lock (revisi 8): satuan R = radius bola --- */
    LOCK_RADIUS: 1.0,               // target = bola terdekat dalam sekian × R dari titik bidik (mouse)
    LOCK_RADIUS_TOUCH: 1.25,        // toleransi sentuh (jari kurang presisi)
    TOUCH_OFFSET_PX: 56,            // titik bidik sentuh digeser ke atas sekian px layar dari ujung jari agar jari tidak menutupi bola target
    LOB_TIME: 0.4,                  // detik terbang lontaran: tetap berapa pun jaraknya
    LOB_PEAK: 0.9,                  // tinggi puncak lontaran (× R) di atas tanah
    LOB_GROW: 0.25,                 // pembesaran bola api di puncak (1,0 → 1,25 → 1,0)
    LOCK_BUMP: 0.06,                // bola yang terkunci sedikit menonjol (+6% ukuran)
    SWAP_END_GUARD: 0.1,            // bola di 10% terakhir jalur menuju sarang tidak boleh ditukar
    SWAP_PAIRS_PHASE2: 2,           // Stage 3, fase 2 boss: jumlah pasangan yang bertukar sekaligus

    /* --- posisi bola jawaban di rantai (QM.arrange): undian Fisher-Yates ber-seed ke seluruh rantai, tiap soal ke sepertiga rantai (depan/tengah/ekor) secara seimbang --- */
    SHUFFLE_FIRST: 1,               // jawaban soal pertama ada di sekian bola pertama (1 = bola pertama: terlihat begitu hitung mundur selesai)
    SHUFFLE_CONS: 0.5,              // bagian soal yang jawabannya hanya diundi di bola yang pasti sudah keluar (sisanya boleh di bola terbaru yang mungkin baru muncul)
    SHUFFLE_MAXRUN: 2,              // paling banyak sekian jawaban berurutan (urutan soal) yang bertetangga di rantai
    SHUFFLE_LEAD: 4,                // model nominal (batas bawah konservatif): saat soal ke-k aktif (k >= 4) sudah keluar k + LEAD bola; jawaban hanya diundi di antara bola yang sudah keluar
    ACTIVE_END_GUARD: 0.12,         // bola jawaban soal yang baru aktif tidak boleh di 12% terakhir jalur; bila terjadi, rantai melambat...
    ACTIVE_SLOW_SEC: 3              // ...selama sekitar 3 dtk (tanpa menandai bola mana pun)
  };

  /** Jeda antar-penukaran bola [min, maks] detik per stage (acak di dalam rentang); null = tanpa penukaran. Stage 3 fase 2 boss: dua pasangan sekaligus. */
  const SWAP_EVERY = [null, [20, 30], [12, 20]];
  /** Rintangan zona: jumlah serentak maksimum per stage. */
  const HAZ_MAX = [2, 3, 4];

  /** Nilai per kesulitan: Mudah < Sedang < Sulit. CHAIN_BASE_SPEED ±+35% dari rata-rata lama (0,12 / 0,15 / 0,18 d/dtk). */
  const PER_DIFF = {
    mudah:  { CHAIN_BASE_SPEED: 0.16, RETREAT_SEC: 6.5 },
    sedang: { CHAIN_BASE_SPEED: 0.20, RETREAT_SEC: 6 },
    sulit:  { CHAIN_BASE_SPEED: 0.25, RETREAT_SEC: 5.5 }
  };

  /** Pengali CHAIN_BASE_SPEED tiap stage (indeks 0..2). Stage 1 = nilai step lama 1, Stage 2 = step lama 3, Stage 3 (boss) = step lama 5: jalur boss pendek (±22 d), jadi lebih pelan. */
  const SWAP_TELEGRAPH_MIN_MS = 2000;
  const STAGE_SPEED_MULT = [1, 1, 0.5];

  /** Model nominal bola yang sudah keluar saat soal ke-k aktif (QM.arrange), diukur dengan bot ?debug=pace: SHUFFLE_EMIT/LEAD = batas bawah konservatif (jawaban hanya di bola yang pasti sudah keluar), SHUFFLE_TEMIT/TLEAD = rata-rata terukur (untuk menyeimbangkan sepertiga rantai); nilai k awal lalu k + lead. Stage 3 (rantai 0,5x) keluar lebih lambat. */
  const STAGE_SHUFFLE = [
    { emit: [1, 5, 6, 8, 9], lead: 5, tEmit: [1, 5, 6, 8, 9], tLead: 5 },
    { emit: [1, 5, 7, 7, 8], lead: 4, tEmit: [1, 5, 7, 7, 8], tLead: 4 },
    { emit: [1, 4, 5, 6, 7], lead: 3, tEmit: [1, 4, 5, 6, 7], tLead: 3 }
  ];

  /** Metadata slider panel ?debug=tune: [min, max, langkah, satuan]. */
  const META = {
    CHAIN_BASE_SPEED: [0.05, 0.6, 0.005, 'd/dtk'],
    SWAP_TELEGRAPH_MS: [2000, 4000, 100, 'ms'],
    CHAIN_ENTRY_SPEED_MULT: [1, 8, 0.1, 'x'],
    SPAWN_FILL_TIME: [1, 20, 0.5, 'dtk'],
    ENTRY_HEAD_FRAC: [0.05, 0.95, 0.01, 'jalur'],
    ENTRY_MAX_DPS: [1, 14, 0.5, 'd/dtk'],
    ENTRY_EASE_TIME: [0.2, 4, 0.1, 'dtk'],
    EMERGE_ANIM_TIME: [0.05, 0.6, 0.01, 'dtk'],
    FF_MULT: [1, 8, 0.5, 'x'],
    CHAIN_PRESSURE_RAMP: [0, 0.6, 0.01, 'x'],
    PRESSURE_RAMP_TIME: [30, 600, 10, 'dtk'],
    PRESSURE_DROP: [0, 0.5, 0.01, ''],
    NEST_SLOW_DIAMS: [0, 16, 0.5, 'd'],
    NEST_SLOW_MULT: [0.2, 1, 0.01, 'x'],
    BALL_SPACING_FACTOR: [0.9, 1.1, 0.005, 'x'],
    GAP_CLOSE_SPEED: [2, 16, 0.5, 'd/dtk'],
    INSERT_TIME: [0.05, 0.4, 0.01, 'dtk'],
    RETREAT_SEC: [0, 14, 0.5, 'dtk'],
    COMBO_RETREAT_DIAMS: [0, 1, 0.05, 'd'],
    RETREAT_SPEED: [2, 24, 0.5, 'd/dtk'],
    NEST_RETREAT_DIAMS: [0, 20, 0.5, 'd'],
    NEST_HOLD: [0, 3, 0.1, 'dtk']
  };

  /** Parameter yang muncul sebagai slider (urutan = urutan di panel). */
  const TUNABLE = Object.keys(META);

  /* ---------- flag debug: ?debug=tune,chain,sim,obstacles,aim (boleh digabung dengan koma) ---------- */
  const debug = { tune: false, chain: false, sim: false, obstacles: false, aim: false };
  (function () {
    const m = /[?&]debug=([^&#]*)/.exec(location.search);
    if (m) decodeURIComponent(m[1]).split(',').forEach(function (k) { if (k in debug) debug[k] = true; });
  })();

  /* ---------- overrides (hanya dari panel tune) ---------- */
  const OVR_KEY = 'gasing.nagapenjaga.tune';
  const overrides = {};
  if (debug.tune) { try { Object.assign(overrides, JSON.parse(localStorage.getItem(OVR_KEY) || '{}')); } catch (e) { /* abaikan */ } }
  function saveOverrides() { if (debug.tune) { try { localStorage.setItem(OVR_KEY, JSON.stringify(overrides)); } catch (e) { /* abaikan */ } } }

  /** Isi `out` (objek yang dipegang run) dengan nilai terselesaikan untuk kesulitan & step. */
  function fill(out, diff, step) {
    Object.assign(out, DEFAULTS, PER_DIFF[diff] || PER_DIFF.sedang);
    const si = Math.max(0, Math.min(STAGE_SPEED_MULT.length - 1, step | 0));
    out.CHAIN_BASE_SPEED *= STAGE_SPEED_MULT[si]; out.SHUFFLE_EMIT = STAGE_SHUFFLE[si].emit; out.SHUFFLE_LEAD = STAGE_SHUFFLE[si].lead; out.SHUFFLE_TEMIT = STAGE_SHUFFLE[si].tEmit; out.SHUFFLE_TLEAD = STAGE_SHUFFLE[si].tLead;
    for (const k in overrides) if (k in DEFAULTS) out[k] = overrides[k];
    out.SWAP_TELEGRAPH_MS = Math.max(SWAP_TELEGRAPH_MIN_MS, out.SWAP_TELEGRAPH_MS);      // penukaran tidak boleh mendadak: peringatan → penukaran >= 2 dtk
    out.SWAP_TELEGRAPH = out.SWAP_TELEGRAPH_MS / 1000; out.SWAP_WARN = Math.min(out.SWAP_WARN_MS, out.SWAP_TELEGRAPH_MS * 0.5) / 1000;
    return out;
  }
  function resolve(diff, step) { return fill({}, diff, step); }

  /* objek hidup yang perlu disegarkan saat slider digeser: { gp, diff, step } */
  let tracked = null;
  function track(gp, diff, step) { tracked = { gp: gp, diff: diff, step: step }; }
  function refresh() { if (tracked) fill(tracked.gp, tracked.diff, tracked.step); }

  const Gameplay = {
    DEFAULTS: DEFAULTS, PER_DIFF: PER_DIFF, STAGE_SPEED_MULT: STAGE_SPEED_MULT, STAGE_SHUFFLE: STAGE_SHUFFLE, SWAP_TELEGRAPH_MIN_MS: SWAP_TELEGRAPH_MIN_MS, SWAP_EVERY: SWAP_EVERY, HAZ_MAX: HAZ_MAX, META: META, TUNABLE: TUNABLE,
    debug: debug, overrides: overrides,
    resolve: resolve, fill: fill, track: track,
    /** Panel: atur satu nilai (berlaku langsung). */
    set: function (key, v) { if (!(key in DEFAULTS)) return; overrides[key] = v; saveOverrides(); refresh(); },
    reset: function () { for (const k in overrides) delete overrides[k]; saveOverrides(); refresh(); },
    /** Nilai efektif sekarang + daftar override (untuk tombol "salin nilai"). */
    snapshot: function () { return tracked ? Object.assign({}, tracked.gp) : resolve('sedang', 0); },
    current: function () { return tracked ? tracked.gp : null; }
  };

  GA.Gameplay = Gameplay;
})(window.GA = window.GA || {});
