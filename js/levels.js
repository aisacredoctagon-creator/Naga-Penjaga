/* levels.js — tiga step petualangan + tabel kesulitan. Semua angka ada di sini sebagai DATA.
 *
 * Cara menambah/mengubah:
 *  - Step baru: tambahkan objek ke STEPS (scene = id latar di theme.js, pathId = preset jalur di path.js).
 *  - Kesulitan baru: tambahkan kunci ke DIFFS dan ke Questions.TABLE (questions.js).
 *  - Rintangan: isi `obst(d)` — d = tingkat kerapatan 0..1 dari kesulitan. Jenisnya dibaca obstacles.js:
 *      rocks    akar berduri (statis, melukai jika terkena)
 *      crystals kristal pemantul (peluru memantul sekali)
 *      movers   lava (sapuan) & petir (orbit)
 *      fog      kabut sihir yang menyembunyikan angka bola
 *      bats     kelelawar penyihir yang menukar dua bola
 */
(function (GA) {
  'use strict';

  const DIFFS = ['mudah', 'sedang', 'sulit'];
  const DIFF_NAMES = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };
  const DIFF_NOTES = {
    mudah: 'Angka kecil, rantai lambat, sedikit pengecoh.',
    sedang: 'Angka lebih besar, rantai lebih cepat, rintangan lebih banyak.',
    sulit: 'Soal rumit, rantai cepat, banyak pengecoh dan rintangan.'
  };

  /** Tiga nilai per kesulitan: [step1, step2, step3]. */
  const TUNE = {
    mudah: { speed: [17, 19, 17], goal: [5, 6, 0], maxBalls: [14, 16, 16], retreat: 175, pCorrect: 0.15, density: 0.3, hits: [2, 2, 3], qTime: 20 },
    sedang: { speed: [22, 25, 23], goal: [7, 8, 0], maxBalls: [16, 18, 18], retreat: 160, pCorrect: 0.13, density: 0.6, hits: [3, 3, 3], qTime: 16 },
    sulit: { speed: [28, 31, 28], goal: [9, 10, 0], maxBalls: [18, 20, 20], retreat: 145, pCorrect: 0.11, density: 1.0, hits: [3, 4, 4], qTime: 12 }
  };

  const ANG = [-135, 45, -45, 135, 90, -90];

  const STEPS = [
    {
      id: 's1', name: 'Hutan Berbisik', place: 'Hutan Berbisik', scene: 'forest', pathId: 'hook', tag: 'Step 1',
      story: 'Penyihir Jahat menyelinap lewat hutan. Akar berduri dan kabut sihir melindungi bola-bolanya.',
      obst: function (d) {
        const n = d < 0.4 ? 1 : d < 0.8 ? 2 : 3, rocks = [];
        for (let i = 0; i < n; i++) rocks.push({ a: ANG[i], dist: 100, r: 19 });
        return {
          rocks: rocks, movers: [], crystals: [],
          fog: { every: Math.round(16 - 7 * d), dur: 4 + 3 * d, count: 1 + Math.round(2 * d) },
          bats: null, freezeOnWrong: 0,
          specials: { curse: 0.03 + 0.05 * d, frost: 0, egg: 0.012 }
        };
      },
      notes: ['Akar berduri: peluru yang menyentuhnya membuat satu telur hilang.', 'Kabut sihir menyembunyikan angka sebagian bola untuk sementara.', 'Bola kutukan (hitam): jangan ditembak!']
    },
    {
      id: 's2', name: 'Gua Lava', place: 'Gua Lava Membara', scene: 'volcano', pathId: 'zigzag', tag: 'Step 2',
      story: 'Jejak sang penyihir berlanjut ke gua lava. Kristal, lahar, dan kelelawar sihir mengganggu bidikanmu.',
      obst: function (d) {
        const crystals = [{ a: -140, dist: 104, r: 17, tilt: 0.7 }];
        if (d > 0.4) crystals.push({ a: 40, dist: 104, r: 17, tilt: -0.7 });
        const movers = [{ type: 'sweep', offset: -105, range: 160, speed: 1.0 + 0.4 * d, r: 16, kind: 'lava' }];
        if (d > 0.4) movers.push({ type: 'orbit', radius: 88, speed: 1.4 + 0.5 * d, count: 1, r: 14, kind: 'bolt' });
        return {
          rocks: [], movers: movers, crystals: crystals, fog: null,
          bats: d < 0.4 ? null : { every: Math.round(20 - 9 * d) },
          freezeOnWrong: d < 0.4 ? 0 : 0.8 + 1.2 * d,
          specials: { curse: 0.03 + 0.04 * d, frost: 0.03 + 0.02 * d, egg: 0.012 }
        };
      },
      notes: ['Kristal memantulkan peluru api satu kali.', 'Lahar dan petir bergerak: tunggu celahnya.', 'Bola beku memperlambat rantai. Kelelawar menukar dua bola. Setelah salah tembak, naga beku sebentar.']
    },
    {
      id: 's3', name: 'Menara Penyihir', place: 'Menara Penyihir Jahat', scene: 'tower', pathId: 'bossU', tag: 'Step 3 · Boss', boss: true,
      story: 'Di puncak menara, Penyihir Jahat menjaga telur-telur curian. Ini pertarungan terakhir!',
      obst: function (d) {
        return {
          rocks: [], movers: [], crystals: [], fog: null, bats: null, freezeOnWrong: 0,
          specials: { curse: 0.03, frost: 0.03, egg: 0.015 }
        };
      },
      notes: ['Penyihir punya 3 fase. Jawaban benar melukainya, jawaban salah membuatnya menyerang.', 'Fase 3 mencampur semua kategori yang kamu pilih dan ada batas waktu.']
    }
  ];

  const MAX_EGGS = 6, START_EGGS = 5;

  /** Pecah pilihan menu jadi tiga kategori. sel = { slots, same, random, diff } */
  function resolveCats(sel) {
    const ids = GA.Questions.CATEGORIES.map(function (c) { return c.id; });
    const out = [];
    for (let i = 0; i < 3; i++) {
      let c = sel.same ? sel.slots[0] : sel.slots[i];
      if (sel.random) c = ids[Math.floor(Math.random() * ids.length)];
      out.push(c || 'add');
    }
    if (sel.random && sel.same) { const c0 = out[0]; out[1] = c0; out[2] = c0; }
    return out;
  }

  function ballScaleFor(cat) { return cat === 'frac' || cat === 'dec' ? 1.12 : (cat === 'mix' ? 1.08 : 1); }

  /** Konfigurasi satu step. cats = kategori ketiga slot (hasil resolveCats). */
  function build(step, sel, cats) {
    const S = STEPS[step], T = TUNE[sel.diff] || TUNE.sedang, cat = cats[step];
    const o = S.obst(T.density);
    const cfg = {
      step: step, id: S.id, name: S.name, place: S.place, scene: S.scene, pathId: S.pathId, tag: S.tag, isBoss: !!S.boss, story: S.story, notes: S.notes,
      diff: sel.diff, cat: cat, cats: cats,
      topics: GA.Questions.topicsFor(cat, sel.diff), maxChoices: GA.Questions.maxChoices(sel.diff),
      goal: T.goal[step] || 0, speed: T.speed[step], maxBalls: T.maxBalls[step], startBalls: Math.min(T.maxBalls[step], 14),
      retreat: T.retreat, pCorrect: T.pCorrect,
      ballScale: ballScaleFor(cat), questionTime: null,
      rocks: o.rocks, movers: o.movers, crystals: o.crystals, fog: o.fog, bats: o.bats, freezeOnWrong: o.freezeOnWrong, specials: o.specials
    };
    if (S.boss) {
      // fase 3 mencampur kategori dari ketiga slot; fase 1-2 memakai kategori slot 3
      const mixed = GA.Questions.topicsFor(cats.filter(function (c, i, a) { return a.indexOf(c) === i; }), sel.diff);
      cfg.boss = { id: 'penyihir', hits: T.hits, topics: GA.Questions.topicsFor(cat, sel.diff), mixedTopics: mixed, phase3Time: T.qTime };
      // rintangan bergerak baru aktif di fase 2 (main.js menyalakannya)
      cfg.rocks = []; cfg.crystals = [];
      cfg.movers = [
        { type: 'sweep', offset: -105, range: 190, speed: 1.1 + 0.4 * T.density, r: 16, kind: 'lava' },
        { type: 'orbit', radius: 84, speed: 1.5 + 0.5 * T.density, count: 1 + (sel.diff === 'sulit' ? 1 : 0), r: 14, kind: 'bolt' }
      ];
      cfg.bats = { every: 14 };
      cfg.ballScale = Math.max(ballScaleFor(cat), cats.some(function (c) { return c === 'frac' || c === 'dec'; }) ? 1.1 : 1);
    }
    return cfg;
  }

  /** Ringkasan untuk layar pembuka step. */
  function describe(cfg) {
    const d = GA.Questions.describe(cfg.topics);
    return { example: d.example, exampleText: d.exampleText, rangeText: d.rangeText };
  }

  const Levels = {
    DIFFS: DIFFS, DIFF_NAMES: DIFF_NAMES, DIFF_NOTES: DIFF_NOTES, STEPS: STEPS, TUNE: TUNE,
    MAX_EGGS: MAX_EGGS, START_EGGS: START_EGGS,
    count: STEPS.length,
    resolveCats: resolveCats, build: build, describe: describe,
    catName: function (id) { return GA.Questions.categoryById(id).name; }
  };

  GA.Levels = Levels;
})(window.GA = window.GA || {});
