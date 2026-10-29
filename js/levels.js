/* levels.js — lima step petualangan, buff/nerf, dan tabel kesulitan. Semua angka ada di sini sebagai DATA.
 *
 * Aturan inti: tiap step punya TEPAT `TOTAL_Q` (20) soal; tiap soal berpasangan dengan satu bola sihir target. Step selesai setelah
 * semua soal dijawab benar. Bola keluar dari portal sebagai SATU aliran kontinu; kecepatan, kerapatan, dan fase masuk ada di js/config/gameplay.js.
 *
 * Cara menambah/mengubah:
 *  - Step baru: tambahkan objek ke STEPS (scene = id peta di GA.Maps, pathId = arketipe di maps/paths.js, buff/nerf = kunci BUFFS/NERFS)
 *    dan satu entri di POOL (jalur & peta yang dipilih acak).
 *  - Buff/nerf baru: tambahkan ke BUFFS/NERFS (id, nama 1-2 kata, ikon) lalu tangani `run.fx.<id>` di main.js.
 *  - Kesulitan baru: tambahkan kunci ke DIFFS, TUNE, dan Questions.TABLE (questions.js).
 *  - Rintangan: isi `obst(d)` — d = tingkat kerapatan 0..1 dari kesulitan. Jenis dibaca obstacles.js:
 *      rocks    akar berduri (statis, melukai jika terkena)
 *      crystals kristal pemantul (peluru memantul sekali)
 *      movers   lava (sapuan) & petir (orbit)
 *      fog      kabut sihir yang menyembunyikan angka bola
 *      bats     kelelawar penyihir yang menukar dua bola
 */
(function (GA) {
  'use strict';

  const TOTAL_Q = 20;
  const DIFFS = ['mudah', 'sedang', 'sulit'];
  const DIFF_NAMES = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };
  const DIFF_NOTES = {
    mudah: 'Angka kecil, rantai lambat.',
    sedang: 'Angka lebih besar, rantai lebih cepat.',
    sulit: 'Soal rumit, rantai cepat.'
  };

  /** Buff & nerf. name = 1-2 kata untuk label ikon. */
  const BUFFS = {
    aim:    { id: 'aim',    name: 'Bidik Panjang', icon: 'target', desc: 'Garis bidik panjang' },
    twin:   { id: 'twin',   name: 'Api Ganda',     icon: 'twin',   desc: 'Tembakan bonus berkala' },
    shield: { id: 'shield', name: 'Perisai Telur', icon: 'shield', desc: 'Satu salah dimaafkan' },
    freeze: { id: 'freeze', name: 'Waktu Beku',    icon: 'snow',   desc: 'Rantai melambat sekali' },
    gold:   { id: 'gold',   name: 'Telur Emas',    icon: 'egg',    desc: '+1 telur di awal' }
  };
  const NERFS = {
    fog:     { id: 'fog',     name: 'Kabut Pagi',  icon: 'cloud', desc: 'Angka samar sesaat' },
    current: { id: 'current', name: 'Arus Deras',  icon: 'wave',  desc: 'Rantai ngebut di segmen' },
    heat:    { id: 'heat',    name: 'Hawa Panas',  icon: 'sun',   desc: 'Bidikan bergetar' },
    ice:     { id: 'ice',     name: 'Es Licin',    icon: 'snow',  desc: 'Putaran bidik licin' },
    nests:   { id: 'nests',   name: 'Serangan Boss', icon: 'wizard', desc: 'Boss menyerang' }
  };

  /** Pengaturan per kesulitan (soal, boss, bola khusus, kerapatan rintangan). Kecepatan & kerapatan RANTAI ada di js/config/gameplay.js. */
  const TUNE = {
    mudah:  { density: 0.3, hits: [7, 7, 6], qTime: 24, curse: 0 },
    sedang: { density: 0.6, hits: [7, 7, 6], qTime: 20, curse: 1 },
    sulit:  { density: 1.0, hits: [7, 7, 6], qTime: 16, curse: 2 }
  };

  /* Rintangan zona (js/hazards.js): jenis bertambah KUMULATIF tiap step — Step 1 ≈ 2 jenis, Step 2 ≈ 4, Step 3 ≈ 6, Step 4 ≈ 8, Step 5 semua (11) + kelelawar + serangan boss. */
  const HAZ_TIERS = [['thorn', 'root'], ['wave', 'lily'], ['geyser', 'hotrock'], ['stalactite', 'crystal'], ['rune', 'hands', 'spore']];
  const HAZ_BASE = { thorn: 15, root: 11, wave: 18, lily: 20, crystal: 22, geyser: 9, hotrock: 12, stalactite: 12, rune: 13, hands: 18, spore: 15 };   // jeda muncul dasar (dtk)
  function hazFor(step, d) {
    const out = [], k = 1.7 - 0.9 * d;      // makin sulit → makin sering
    for (let i = 0; i <= step; i++) HAZ_TIERS[i].forEach(function (kind) { out.push({ kind: kind, every: HAZ_BASE[kind] * k }); });
    return out;
  }
  const none = { rocks: [], movers: [], crystals: [], fog: null, bats: null, freezeOnWrong: 0 };
  const fogCfg = function (d, k) { return { every: Math.round((16 - 7 * d) * (k || 1)), dur: 4 + 3 * d, count: 1 + Math.round(2 * d) }; };

  /** Peta → zona (menentukan musik, gaya sarang, dan rintangan); 3 peta berbeda per step. */
  const ZONE = { forest: 'forest', grove: 'forest', bloom: 'forest', swamp: 'swamp', swampDusk: 'swamp', coast: 'swamp', volcano: 'volcano', ashfield: 'volcano', magma: 'volcano', crystal: 'crystal', iceCave: 'crystal', amethyst: 'crystal', tower: 'tower', tower2: 'tower', library: 'tower', menu: 'forest' };

  const STEPS = [
    {
      id: 's1', name: 'Lembah Hutan Naga', place: 'Lembah Hutan Naga', scene: 'forest', pathId: 'hook', tag: 'Step 1', buff: 'aim', nerf: 'fog',
      story: 'story.s1',
      obst: function (d) { return Object.assign({}, none, { fog: fogCfg(d) }); },
      notes: ['Semak berduri memperlambat api.', 'Akar menyapu: tunggu peringatan.']
    },
    {
      id: 's2', name: 'Rawa Berkabut', place: 'Rawa Berkabut', scene: 'swamp', pathId: 'zigzag', tag: 'Step 2', buff: 'twin', nerf: 'current',
      story: 'story.s2',
      obst: function (d) { return Object.assign({}, none); },
      notes: ['Ombak membelokkan api.', 'Teratai memantulkan api.']
    },
    {
      id: 's3', name: 'Gunung Api', place: 'Gunung Api', scene: 'volcano', pathId: 'serp4', tag: 'Step 3', buff: 'shield', nerf: 'heat',
      story: 'story.s3',
      obst: function (d) { return Object.assign({}, none); },
      notes: ['Lahar menyembur: lihat tandanya.', 'Batu panas jatuh di zona bertanda.']
    },
    {
      id: 's4', name: 'Gua Kristal Beku', place: 'Gua Kristal Beku', scene: 'crystal', pathId: 'horseshoe', tag: 'Step 4', buff: 'freeze', nerf: 'ice',
      story: 'story.s4',
      obst: function (d) { return Object.assign({}, none, { bats: d < 0.4 ? null : { every: Math.round(22 - 8 * d) } }); },
      notes: ['Stalaktit jatuh di zona bertanda.', 'Kristal memantulkan api.']
    },
    {
      id: 's5', name: 'Menara Penyihir', place: 'Menara Penyihir', scene: 'tower', pathId: 'dualU', tag: 'Step 5 · Boss', boss: true, buff: 'gold', nerf: 'nests',
      story: 'story.s5',
      obst: function (d) { return Object.assign({}, none, { bats: { every: 14 } }); },
      notes: ['Petir rune menyambar lajur.', 'Tangan bayangan menutup bidikan.']
    }
  ];

  const MAX_EGGS = 6, START_EGGS = 5;

  // pilihan acak jalur (id arketipe di maps/paths.js) & peta (id di GA.Maps) per step: 3-4 jalur dan 3 peta berbeda tiap step
  const POOL = [
    { paths: ['hook', 'serp3', 's2', 'serp4'], maps: ['forest', 'grove', 'bloom'] },
    { paths: ['zigzag', 'figure8', 'horseshoe', 'serp4w'], maps: ['swamp', 'swampDusk', 'coast'] },
    { paths: ['serp4', 'figure8', 'zigzag', 'serp3w'], maps: ['volcano', 'ashfield', 'magma'] },
    { paths: ['horseshoe', 'serp4w', 's2', 'serp3w'], maps: ['crystal', 'iceCave', 'amethyst'] },
    { paths: ['dualU', 'dualW', 'dualC'], maps: ['tower', 'tower2', 'library'] }
  ];
  function pick(step) { const p = POOL[step]; return { path: p.paths[Math.floor(Math.random() * p.paths.length)], map: p.maps[Math.floor(Math.random() * p.maps.length)] }; }

  /** Pecah pilihan menu jadi kategori tiap step (panjang = jumlah step). sel = { slots, same, random, diff } */
  function resolveCats(sel) {
    const ids = GA.Questions.CATEGORIES.map(function (c) { return c.id; });
    const n = STEPS.length, out = [];
    for (let i = 0; i < n; i++) {
      let c = sel.same ? sel.slots[0] : (sel.slots[i] || sel.slots[0]);
      if (sel.random) c = ids[Math.floor(Math.random() * ids.length)];
      out.push(c || 'add');
    }
    if (sel.random && sel.same) { for (let i = 1; i < n; i++) out[i] = out[0]; }
    return out;
  }

  function ballScaleFor(cat) { return cat === 'frac' || cat === 'dec' ? 1.12 : (cat === 'mix' ? 1.08 : 1); }

  /** Konfigurasi satu step. cats = kategori tiap step (hasil resolveCats). */
  function build(step, sel, cats) {
    const S = STEPS[step], T = TUNE[sel.diff] || TUNE.sedang, cat = cats[step];
    const o = S.obst(T.density);
    const uniq = cats.filter(function (c, i, a) { return a.indexOf(c) === i; });
    const topicCats = S.boss ? uniq : cat;   // Step 5 mencampur kategori yang dipilih
    // bola khusus (tidak dihitung dalam 20): jumlah per step
    const specialsN = { curse: step === 0 ? 1 : 1 + (T.curse > 0 ? 1 : 0) + (T.curse > 1 ? 1 : 0), frost: step >= 1 ? (step >= 3 ? 2 : 1) : 0, egg: step >= 1 ? 1 : 0 };
    const cfg = {
      step: step, id: S.id, name: S.name, place: S.place, scene: S.scene, pathId: S.pathId, tag: S.tag, isBoss: !!S.boss, story: S.story, notes: S.notes,
      diff: sel.diff, cat: cat, cats: cats, buff: S.buff, nerf: S.nerf, total: TOTAL_Q,
      topics: GA.Questions.topicsFor(topicCats, sel.diff), maxChoices: GA.Questions.maxChoices(sel.diff),
      specialsN: specialsN,
      ballScale: Math.max(ballScaleFor(cat), S.boss && uniq.some(function (c) { return c === 'frac' || c === 'dec'; }) ? 1.1 : 1), questionTime: null,
      haz: hazFor(step, T.density), rocks: o.rocks, movers: o.movers, crystals: o.crystals, fog: o.fog, bats: o.bats, freezeOnWrong: o.freezeOnWrong || 0
    };
    if (S.boss) {
      cfg.boss = { id: 'penyihir', hits: T.hits, phase3Time: T.qTime };
      cfg.bats = { every: 14 };      // rintangan zona & kelelawar aktif mulai fase 2 (diatur main.js)
    }
    return cfg;
  }

  /** Ringkasan untuk layar pembuka step. */
  function describe(cfg) {
    const d = GA.Questions.describe(cfg.topics);
    return { example: d.example, exampleText: d.exampleText, rangeText: d.rangeText };
  }

  const Levels = {
    DIFFS: DIFFS, DIFF_NAMES: DIFF_NAMES, DIFF_NOTES: DIFF_NOTES, STEPS: STEPS, TUNE: TUNE, BUFFS: BUFFS, NERFS: NERFS, TOTAL_Q: TOTAL_Q,
    MAX_EGGS: MAX_EGGS, START_EGGS: START_EGGS,
    count: STEPS.length, ZONE: ZONE, zoneOf: function (id) { return ZONE[id] || 'forest'; }, HAZ_TIERS: HAZ_TIERS, hazFor: hazFor,
    resolveCats: resolveCats, build: build, describe: describe, pick: pick, POOL: POOL,
    catName: function (id) { return GA.Questions.categoryById(id).name; }
  };

  GA.Levels = Levels;
})(window.GA = window.GA || {});
