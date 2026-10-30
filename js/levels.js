/* levels.js — tiga STAGE petualangan dan tabel kesulitan. Semua angka ada di sini sebagai DATA.
 *
 * Aturan inti: tiap stage punya TEPAT `TOTAL_Q` (20) soal; tiap soal berpasangan dengan satu bola sihir target. Stage selesai setelah
 * semua soal dijawab benar. Bola keluar dari portal sebagai SATU aliran kontinu; kecepatan, kerapatan, dan fase masuk ada di js/config/gameplay.js
 * (telur, bintang, boss, penukaran bola juga di sana).
 *
 * Stage 1 Lembah Hutan Naga (soal "hitung hasil"), Stage 2 Gunung Api / Gua Kristal ("cari angka hilang"), Stage 3 Menara Penyihir
 * = FINAL BOSS (soal gabungan). Kurva kesulitan dipetakan dari 5 step lama: Stage 1 = step 1, Stage 2 = step 3, Stage 3 = step 5.
 *
 * Cara menambah/mengubah:
 *  - Stage: ubah objek di STAGES (pool.maps = id peta di GA.Maps, pool.paths = arketipe di maps/paths.js, format soal = 'result' | 'missing' | 'mixed').
 *  - Kesulitan baru: tambahkan kunci ke DIFFS, TUNE, dan Questions.TABLE (questions.js).
 *  - Rintangan zona (js/hazards.js): `tiers` = jenis yang bertambah KUMULATIF tiap stage; jumlah serentak maksimum: Gameplay.HAZ_MAX. */
(function (GA) {
  'use strict';

  const TOTAL_Q = 20;
  const DIFFS = GA.Categories.DIFFS;
  const DIFF_NAMES = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };
  const DIFF_NOTES = {
    mudah: 'Angka kecil, rantai lambat.',
    sedang: 'Angka lebih besar, rantai lebih cepat.',
    sulit: 'Soal rumit, rantai cepat.'
  };

  /** Pengaturan per kesulitan: kerapatan rintangan, batas waktu soal fase akhir boss, bola kutukan tidak ada lagi. */
  const TUNE = {
    mudah:  { density: 0.3, qTime: 24 },
    sedang: { density: 0.6, qTime: 20 },
    sulit:  { density: 1.0, qTime: 16 }
  };

  /* Rintangan zona (js/hazards.js): jenis bertambah KUMULATIF tiap stage — Stage 1 = 2 jenis, Stage 2 = 4, Stage 3 = semua yang tersisa + serangan boss. */
  const HAZ_TIERS = [['thorn', 'lily'], ['geyser', 'hotrock'], ['wave', 'crystal', 'stalactite', 'rune', 'hands', 'spore']];
  const HAZ_BASE = { thorn: 15, lily: 20, crystal: 22, geyser: 9, hotrock: 12, wave: 18, stalactite: 12, rune: 13, hands: 18, spore: 15 };   // jeda muncul dasar (dtk)
  function hazFor(stage, d) {
    const out = [], k = 1.7 - 0.9 * d;      // makin sulit → makin sering
    for (let i = 0; i <= stage; i++) HAZ_TIERS[i].forEach(function (kind) { out.push({ kind: kind, every: HAZ_BASE[kind] * k }); });
    return out;
  }

  /** Peta → zona (menentukan musik, gaya sarang, dan rintangan). */
  const ZONE = { forest: 'forest', grove: 'forest', bloom: 'forest', volcano: 'volcano', ashfield: 'volcano', magma: 'volcano', crystal: 'crystal', iceCave: 'crystal', amethyst: 'crystal', tower: 'tower', tower2: 'tower', library: 'tower', menu: 'forest' };

  /** `specials` = bola khusus yang TIDAK dihitung dalam 20 (frost = rantai melambat, egg = +1 telur, maks. 3). */
  const STAGES = [
    {
      id: 's1', place: 'Lembah Hutan Naga', tag: 'Stage 1', icon: 'dragon', format: 'result', story: 'story.s1', specials: { frost: 0, egg: 0 },
      pool: { paths: ['siput1', 'siput2', 'siput3'], maps: ['forest', 'grove', 'bloom'] }
    },
    {
      id: 's2', place: 'Gunung & Gua Kristal', tag: 'Stage 2', icon: 'flame', format: 'missing', story: 'story.s2', specials: { frost: 1, egg: 1 },
      pool: { paths: ['lobus1', 'lobus2', 'lobus3'], maps: ['volcano', 'ashfield', 'magma', 'crystal', 'iceCave', 'amethyst'] }
    },
    {
      id: 's3', place: 'Menara Penyihir', tag: 'Stage 3', icon: 'wizard', format: 'mixed', story: 'story.s3', boss: true, specials: { frost: 2, egg: 1 },
      pool: { paths: ['poligon1', 'poligon2', 'poligon3'], maps: ['tower', 'tower2', 'library'] }
    }
  ];

  // pilihan acak jalur (id arketipe di maps/paths.js) & peta (id di GA.Maps) per stage
  function pick(stage) { const p = STAGES[stage].pool; return { path: p.paths[Math.floor(Math.random() * p.paths.length)], map: p.maps[Math.floor(Math.random() * p.maps.length)] }; }

  /** Kategori tiap stage (panjang = jumlah stage): pilihan halaman awal { cat, diff } berlaku untuk ketiga stage ("Campuran" = mix, semua kategori). */
  function resolveCats(sel) {
    const c = GA.Categories.has(sel && sel.cat) ? sel.cat : GA.Categories.DEFAULT_CAT, out = [];
    for (let i = 0; i < STAGES.length; i++) out.push(c);
    return out;
  }

  function ballScaleFor(cat) { return cat === 'frac' || cat === 'dec' ? 1.12 : (cat === 'mix' ? 1.08 : 1); }

  /** Konfigurasi satu stage. sel = { cat, diff }; cats = kategori tiap stage (hasil resolveCats; bawaan: dari sel). */
  function build(stage, sel, cats) {
    cats = cats || resolveCats(sel);
    const S = STAGES[stage], T = TUNE[sel.diff] || TUNE.sedang, cat = cats[stage];
    const uniq = cats.filter(function (c, i, a) { return a.indexOf(c) === i; });
    const topicCats = S.boss ? uniq : cat;   // Stage 3 mencampur kategori yang dipilih
    const cfg = {
      step: stage, id: S.id, place: S.place, tag: S.tag, icon: S.icon, isBoss: !!S.boss, story: S.story, format: S.format,
      diff: sel.diff, cat: cat, cats: cats, total: TOTAL_Q,
      topics: GA.Questions.topicsFor(topicCats, sel.diff), maxChoices: GA.Questions.maxChoices(sel.diff),
      specialsN: Object.assign({}, S.specials),
      ballScale: Math.max(ballScaleFor(cat), S.boss && uniq.some(function (c) { return c === 'frac' || c === 'dec'; }) ? 1.1 : 1), questionTime: null,
      haz: hazFor(stage, T.density), hazMax: GA.Gameplay.HAZ_MAX[stage]
    };
    if (S.boss) cfg.boss = { id: 'penyihir', phaseTime: T.qTime };
    return cfg;
  }

  /** Ringkasan untuk layar pembuka stage: contoh soal sesuai format stage (Stage 3 = dua contoh). */
  function describe(cfg) { return { examples: GA.Questions.examples(cfg.topics, cfg.format) }; }

  const Levels = {
    DIFFS: DIFFS, DIFF_NAMES: DIFF_NAMES, DIFF_NOTES: DIFF_NOTES, STAGES: STAGES, TUNE: TUNE, TOTAL_Q: TOTAL_Q,
    count: STAGES.length, ZONE: ZONE, zoneOf: function (id) { return ZONE[id] || 'forest'; }, HAZ_TIERS: HAZ_TIERS, hazFor: hazFor,
    resolveCats: resolveCats, build: build, describe: describe, pick: pick,
    catName: function (id) { return GA.Questions.categoryById(id).name; }
  };

  GA.Levels = Levels;
})(window.GA = window.GA || {});
