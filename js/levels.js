/* levels.js — konfigurasi 5 level × (3 stage + 1 boss).
 *
 * Cara menambah stage/level: tambahkan objek ke `LEVELS` (lihat contoh di bawah).
 * Nilai yang tidak diisi diisi otomatis oleh `build()` sesuai kurva kesulitan (rintangan naik seiring level).
 *
 * Bidang stage:
 *   name, label      nama stage & nama materi (untuk layar pembuka)
 *   topics           daftar spesifikasi soal untuk questions.js, mis. [{ type:'add', min:1, max:10 }]
 *   goal             jumlah jawaban benar untuk menamatkan stage
 *   speed            kecepatan rantai (px/detik logis)
 *   maxBalls         jumlah maksimum bola di rantai
 *   pathId           preset jalur di path.js: arc | wave | ring | hook | bossU
 *   retreat          jarak rantai mundur tiap jawaban benar
 *   rocks / movers   rintangan (lihat obstacles.js); kosongkan untuk otomatis
 *   specials         peluang bola khusus { bomb, ice, bolt, life }
 *   ballScale        pembesar bola (mis. 1.12 untuk angka desimal yang panjang)
 *   questionTime     batas waktu per soal (detik) atau null
 */
(function (GA) {
  'use strict';

  const ADD = function (min, max) { return { type: 'add', min: min, max: max }; };
  const SUB = function (min, max) { return { type: 'sub', min: min, max: max }; };
  const MUL = function (a0, a1, b0, b1) { return { type: 'mul', aMin: a0, aMax: a1, bMin: b0, bMax: b1 }; };
  const DIV = function (b0, b1, q0, q1) { return { type: 'div', bMin: b0, bMax: b1, qMin: q0, qMax: q1 }; };
  const INT = function (op, min, max) { return { type: 'int', op: op, min: min, max: max }; };
  const DEC = function (op, places, min, max, round) { return { type: 'dec', op: op, places: places, min: min, max: max, round: round || 0 }; };

  // Ruang kosong (px) di dalam jalur, supaya rintangan tidak menimpa alur.
  const FREE = { arc: 135, wave: 105, ring: 125, hook: 100, bossU: 150 };

  const LEVELS = [
    {
      name: 'Pulau Penjumlahan', subtitle: 'Tambah & kurang bilangan kecil', color: '#3b82f6',
      stages: [
        { name: 'Pemanasan', label: 'Penjumlahan', topics: [ADD(1, 10)], goal: 5, speed: 20, maxBalls: 14, pathId: 'arc' },
        { name: 'Kurang-Kurang', label: 'Pengurangan', topics: [SUB(1, 20)], goal: 6, speed: 23, maxBalls: 16, pathId: 'wave' },
        { name: 'Campur Aduk', label: 'Tambah & Kurang', topics: [ADD(5, 30), SUB(5, 30)], goal: 7, speed: 26, maxBalls: 18, pathId: 'ring' }
      ],
      boss: { speed: 22, maxBalls: 16, topics: [ADD(10, 40), SUB(10, 40)] }
    },
    {
      name: 'Gunung Perkalian', subtitle: 'Kali & bagi dasar', color: '#f97316',
      stages: [
        { name: 'Tabel Kecil', label: 'Perkalian', topics: [MUL(2, 5, 2, 9)], goal: 6, speed: 25, maxBalls: 16, pathId: 'arc' },
        { name: 'Bagi Rata', label: 'Pembagian', topics: [DIV(2, 5, 2, 9)], goal: 7, speed: 27, maxBalls: 18, pathId: 'wave' },
        { name: 'Kali & Bagi', label: 'Perkalian & Pembagian', topics: [MUL(2, 9, 2, 9), DIV(2, 9, 2, 9)], goal: 8, speed: 29, maxBalls: 20, pathId: 'ring' }
      ],
      boss: { speed: 27, maxBalls: 18, topics: [MUL(3, 12, 3, 9), DIV(3, 9, 3, 12)] }
    },
    {
      name: 'Lembah Bilangan Bulat', subtitle: 'Ada angka negatifnya!', color: '#8b5cf6',
      stages: [
        { name: 'Naik Turun', label: 'Tambah & Kurang Bulat', topics: [INT('+', 1, 10), INT('-', 1, 10)], goal: 7, speed: 27, maxBalls: 18, pathId: 'wave' },
        { name: 'Tanda Kali', label: 'Kali & Bagi Bulat', topics: [INT('*', 1, 9), INT('/', 1, 9)], goal: 8, speed: 29, maxBalls: 20, pathId: 'ring' },
        { name: 'Empat Operasi', label: 'Semua Operasi Bulat', topics: [INT('any', 1, 12)], goal: 8, speed: 31, maxBalls: 22, pathId: 'hook' }
      ],
      boss: { speed: 30, maxBalls: 20, topics: [INT('any', 2, 12)] }
    },
    {
      name: 'Hutan Desimal', subtitle: 'Koma dan pembulatan', color: '#10b981',
      stages: [
        { name: 'Koma Satu', label: 'Tambah & Kurang Desimal', topics: [DEC('+', 1, 1, 20), DEC('-', 1, 1, 20)], goal: 7, speed: 29, maxBalls: 18, pathId: 'arc', ballScale: 1.12 },
        { name: 'Kali & Bagi Koma', label: 'Kali & Bagi Desimal', topics: [DEC('*', 1, 1, 9), DEC('/', 1, 1, 9)], goal: 8, speed: 31, maxBalls: 20, pathId: 'wave', ballScale: 1.12 },
        { name: 'Bulatkan!', label: 'Desimal & Pembulatan', topics: [DEC('+', 2, 1, 10), DEC('-', 2, 1, 10), DEC('*', 1, 1, 9, 1), DEC('/', 1, 2, 40, 1)], goal: 8, speed: 33, maxBalls: 20, pathId: 'ring', ballScale: 1.15 }
      ],
      boss: { speed: 32, maxBalls: 20, ballScale: 1.12, topics: [DEC('+', 2, 1, 10), DEC('*', 1, 1, 9), DEC('/', 1, 1, 9), DEC('*', 1, 1, 9, 1)] }
    },
    {
      name: 'Menara Campuran', subtitle: 'Semua materi, lebih cepat!', color: '#ec4899',
      stages: [
        { name: 'Lantai Satu', label: 'Campuran', topics: 'ALL', goal: 8, speed: 34, maxBalls: 22, pathId: 'wave', ballScale: 1.1 },
        { name: 'Lantai Dua', label: 'Campuran', topics: 'ALL', goal: 9, speed: 37, maxBalls: 24, pathId: 'hook', ballScale: 1.1 },
        { name: 'Lantai Tiga', label: 'Campuran Super', topics: 'ALL', goal: 10, speed: 40, maxBalls: 24, pathId: 'ring', ballScale: 1.1 }
      ],
      boss: { speed: 36, maxBalls: 22, ballScale: 1.1, topics: 'ALL' }
    }
  ];

  /** Semua topik dari level 1 sampai `upTo` (indeks level, inklusif) — dipakai level campuran & fase 3 boss. */
  function topicsUpTo(upTo) {
    const out = [];
    for (let i = 0; i <= upTo; i++) {
      LEVELS[i].stages.forEach(function (s) { if (Array.isArray(s.topics)) s.topics.forEach(function (t) { out.push(t); }); });
    }
    return out;
  }

  /** Kurva kesulitan rintangan: d = (level-1)*3 + stage (0..14) */
  function obstaclesFor(L, S, pathId) {
    const d = L * 3 + S, free = FREE[pathId] || 110;
    const rocksN = d < 2 ? 0 : d < 5 ? 1 : d < 8 ? 2 : 3;
    const angles = [-135, 45, -45, 135, 90, -90];
    const dist = Math.min(100, free - 20);
    const rocks = [];
    for (let i = 0; i < rocksN; i++) rocks.push({ a: angles[i], dist: dist, r: 19 });
    const movers = [];
    const orbit = Math.min(92, free - 22), off = Math.max(60, free - 30);
    if (d >= 4) movers.push({ type: 'sweep', offset: -off, range: 150, speed: 1.1 + d * 0.05, r: 16 });
    if (d >= 8) movers.push({ type: 'orbit', radius: orbit, speed: 1.5 + d * 0.04, count: 1, r: 14 });
    if (d >= 12) movers.push({ type: 'sweep', offset: off, range: 150, speed: 1.4 + d * 0.04, phase: 2, r: 16 });
    const specials = {
      bomb: d < 2 ? 0 : Math.min(0.1, 0.03 + 0.006 * d),
      ice: d < 1 ? 0 : 0.03,
      bolt: d < 4 ? 0 : Math.min(0.05, 0.015 + 0.003 * d),
      life: 0.012
    };
    return { rocks: rocks, movers: movers, specials: specials };
  }

  const DEFAULT_BOSS = { id: 'raja-angka' };

  function build(L, S) {
    const lv = LEVELS[L], isBoss = S >= lv.stages.length;
    const src = isBoss ? lv.boss : lv.stages[S];
    const topics = src.topics === 'ALL' ? topicsUpTo(4) : src.topics;
    const pathId = isBoss ? 'bossU' : src.pathId;
    const auto = obstaclesFor(L, isBoss ? 2 : S, pathId);
    const cfg = {
      id: (L + 1) + '-' + (isBoss ? 'B' : (S + 1)),
      level: L, index: S, isBoss: isBoss,
      name: isBoss ? 'BOSS: ' + 'Raja Angka' : src.name,
      label: isBoss ? 'Boss Final – ' + lv.name : src.label,
      topics: topics,
      goal: src.goal || 9,
      speed: src.speed, maxBalls: src.maxBalls, startBalls: Math.min(src.maxBalls, 14),
      pathId: pathId, retreat: 150 + L * 18,
      rocks: src.rocks || auto.rocks, movers: src.movers || auto.movers, specials: src.specials || auto.specials,
      ballScale: src.ballScale || 1, questionTime: src.questionTime || null, pCorrect: 0.13
    };
    if (isBoss) {
      cfg.rocks = src.rocks || (L >= 2 ? [{ a: -150, dist: 95, r: 19 }, { a: -30, dist: 95, r: 19 }] : []);
      cfg.movers = src.movers || [
        { type: 'sweep', offset: -105, range: 190, speed: 1.2 + L * 0.1, r: 16 },
        { type: 'orbit', radius: 82, speed: 1.6 + L * 0.1, count: 1 + (L >= 3 ? 1 : 0), r: 14 }
      ];
      cfg.boss = Object.assign({}, DEFAULT_BOSS, src.bossCfg || {}, {
        levelTopics: topics,
        mixedTopics: topicsUpTo(Math.min(4, L)),
        levelName: lv.name, levelIndex: L
      });
    }
    return cfg;
  }

  const Levels = {
    list: LEVELS,
    count: LEVELS.length,
    /** jumlah tombol stage dalam satu level (3 stage + boss) */
    stageCount: function (L) { return LEVELS[L].stages.length + 1; },
    get: function (L, S) { return build(L, S); },
    id: function (L, S) { return (L + 1) + '-' + (S >= LEVELS[L].stages.length ? 'B' : (S + 1)); },
    /** stage berikutnya setelah (L,S), atau null jika tamat */
    next: function (L, S) {
      if (S + 1 < this.stageCount(L)) return { l: L, s: S + 1 };
      if (L + 1 < LEVELS.length) return { l: L + 1, s: 0 };
      return null;
    },
    prev: function (L, S) {
      if (S > 0) return { l: L, s: S - 1 };
      if (L > 0) return { l: L - 1, s: this.stageCount(L - 1) - 1 };
      return null;
    },
    isUnlocked: function (L, S) {
      if (GA.Storage.unlockAll) return true;
      const p = this.prev(L, S);
      return !p || GA.Storage.isDone(this.id(p.l, p.s));
    },
    /** stage pertama yang belum selesai (untuk tombol "Main") */
    firstOpen: function () {
      for (let l = 0; l < LEVELS.length; l++) for (let s = 0; s < this.stageCount(l); s++) {
        if (!GA.Storage.isDone(this.id(l, s))) return { l: l, s: s };
      }
      return { l: 0, s: 0 };
    }
  };

  GA.Levels = Levels;
})(window.GA = window.GA || {});
