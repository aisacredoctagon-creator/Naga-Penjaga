/* maps/variants.js — varian peta (tahap f): TIGA peta berbeda untuk tiap step, dan peta RAWA sungguhan (kolam teratai, alang-alang, kayu apung).
 *   Step 1 Lembah Hutan Naga : forest (siang), grove (senja musim gugur), bloom (padang bunga fajar)
 *   Step 2 Rawa Berkabut     : swamp (hijau berlumut), swampDusk (senja ungu), coast (pantai berpasir, laguna toska)
 *   Step 3 Gunung Api        : volcano (basal & lahar), ashfield (dataran abu), magma (lahar membara)
 *   Step 4 Gua Kristal Beku  : crystal (biru-ungu), iceCave (es putih-biru), amethyst (kristal ungu)
 *   Step 5 Menara Penyihir   : tower (rune ungu), tower2 (observatorium), library (perpustakaan hangat)
 * Data murni (palet, komposisi dekorasi `mix`, seed, opsi efek). Satu arah cahaya per peta (kiri-atas). Zona tiap peta: lihat `Levels.zoneOf`. */
(function (GA) {
  'use strict';
  const M = GA.Maps, forest = M.forest, volcano = M.volcano, crystal = M.crystal, tower = M.tower;
  const ex = Object.assign;

  /* ---------- Step 1 ---------- */
  M.bloom = ex({}, forest, {
    id: 'bloom', seed: 91,
    pal: ex({}, forest.pal, {
      ground: ['#6cb45a', '#3a8048'], blotch: ['#9ad26a', '#58a850', '#d8c860', '#4a9a58', '#e8a0b8', '#6cbc5a'],
      flowers: ['#ffd6ea', '#fff6c8', '#ffc0d8', '#d8ccff'], leaf: [['#bde882', '#6cc055', '#2c7a3e'], ['#d8f09a', '#88d060', '#3a8a46'], ['#9ee0a0', '#44b060', '#1c6a40']],
      shaft: 'rgba(255,226,230,0.14)', warm: 'rgba(255,214,226,0.24)', vignette: 'rgba(30,6,20,0.56)', fly: '255,226,240'
    }),
    mix: { grass: 0.26, flower: 0.34, mush: 0.04, rock: 0.08, fern: 0.1, leaf: 0.1 }, statues: 2, fireflies: 38
  });

  /* ---------- Step 2: rawa ---------- */
  const swampMix = { lily: 0.2, reed: 0.18, log: 0.05, mush: 0.08, fern: 0.12, leaf: 0.14, grass: 0.1, rock: 0.06 };
  M.swamp = ex({}, forest, {
    id: 'swamp', seed: 63,
    pal: ex({}, forest.pal, {
      ground: ['#4a7a58', '#233f34'], blotch: ['#5e8e62', '#3a6a54', '#6e8a4a', '#2a5448', '#7a8a52', '#2f6a5c'], soil: ['#3a3a22', '#26261a'],
      leaf: [['#9ad8a0', '#4aa078', '#1c5a48'], ['#b0e0a0', '#5ab088', '#2a6a52'], ['#7acab0', '#2e9a82', '#145a4c']], leafFront: ['#3c9a70', '#1f6a50', '#0b3a2c'],
      water: ['#b8f0e0', '#3fa09c', '#154a58'], flowers: ['#ffd6ea', '#fff6c8', '#e8c8ff'], grassA: '#7ac49a', grassB: '#2f7a5a', cap: [['#e0d8a0', '#a89a50'], ['#ffd6f2', '#d062b4']],
      shaft: 'rgba(210,255,230,0.1)', warm: 'rgba(220,255,230,0.16)', cool: 'rgba(0,26,20,0.34)', vignette: 'rgba(2,22,18,0.7)', fly: '200,255,200'
    }),
    mix: swampMix, statues: 1, fireflies: 34, mist: true, birds: true, shafts: 2
  });
  M.swampDusk = ex({}, M.swamp, {
    id: 'swampDusk', seed: 67,
    pal: ex({}, M.swamp.pal, {
      ground: ['#4a5a78', '#232a46'], blotch: ['#5a6e8e', '#3a4a6e', '#6a6a90', '#2a3558', '#7a6a98', '#35507a'],
      water: ['#cfc0ff', '#6a6ad0', '#22226a'], leaf: [['#a8c8e8', '#5a8ac0', '#264a7a'], ['#c0b8f0', '#7a70c8', '#34307a'], ['#90d0d8', '#3a9ab0', '#185a70']], leafFront: ['#4a70b0', '#2a4a88', '#10224a'],
      grassA: '#8aa0d8', grassB: '#3a4a98', shaft: 'rgba(200,190,255,0.12)', warm: 'rgba(210,200,255,0.18)', cool: 'rgba(4,4,36,0.4)', vignette: 'rgba(4,4,32,0.74)', tint: 'rgba(60,40,140,0.2)', fly: '200,190,255'
    }),
    mix: { lily: 0.2, reed: 0.16, log: 0.06, mush: 0.12, fern: 0.1, leaf: 0.12, grass: 0.08, rock: 0.06 }, fireflies: 46
  });
  M.coast = ex({}, M.swamp, {
    id: 'coast', seed: 71,
    pal: ex({}, M.swamp.pal, {
      ground: ['#d8c88a', '#9a8a54'], blotch: ['#e8d89a', '#c0ae6c', '#a89a5a', '#7aa070', '#d0b878', '#8aa868'], soil: ['#8a7a4a', '#5a4e2c'],
      water: ['#c8fff0', '#38c4c0', '#0e6a84'], leaf: [['#bde882', '#6cc055', '#2c7a3e'], ['#d8f09a', '#88d060', '#3a8a46'], ['#9ee0a0', '#44b060', '#1c6a40']], leafFront: ['#4aa83f', '#237232', '#0d3f20'],
      grassA: '#a8c860', grassB: '#6a9a3a', shaft: 'rgba(255,248,210,0.16)', warm: 'rgba(255,244,200,0.26)', cool: 'rgba(0,30,40,0.26)', vignette: 'rgba(10,30,30,0.5)', fly: '255,250,210'
    }),
    mix: { lily: 0.14, reed: 0.2, log: 0.1, mush: 0.04, fern: 0.08, leaf: 0.1, grass: 0.2, rock: 0.14 }, mist: false, fireflies: 22
  });

  /* ---------- Step 3 ---------- */
  M.ashfield = ex({}, volcano, {
    id: 'ashfield', seed: 103,
    pal: ex({}, volcano.pal, {
      ground: ['#6a6460', '#34302e'], blotch: ['#7a746e', '#4a4440', '#5a5450', '#2e2a28', '#6a625c'], soil: ['#3a3430', '#24201e'],
      bed: ['#0c0a0a', '#322c2a', '#5e5650', '#847a70'], stone: ['#b8b0a8', '#7a726c', '#34302c'], water: ['#fff2c8', '#ffb050', '#a03a10'],
      shaft: 'rgba(255,190,130,0.06)', vignette: 'rgba(14,8,6,0.72)', warm: 'rgba(255,190,130,0.16)', cool: 'rgba(6,4,4,0.44)', fly: '255,170,90'
    }),
    mix: { rock: 0.22, rubble: 0.28, vent: 0.06, stalag: 0.1, bones: 0.1, brazier: 0.04, crystal: 0.02 }, fireflies: 56, rise: 20
  });
  M.magma = ex({}, volcano, {
    id: 'magma', seed: 107,
    pal: ex({}, volcano.pal, {
      ground: ['#4a1a1a', '#220a0c'], blotch: ['#7a2a1e', '#3a1214', '#8a3a22', '#2a0e10', '#6a1c1a'], soil: ['#2a0e0c', '#180606'],
      water: ['#fffacc', '#ffc040', '#c03010'], shaft: 'rgba(255,120,60,0.1)', vignette: 'rgba(24,2,0,0.76)', warm: 'rgba(255,130,70,0.24)', cool: 'rgba(14,0,0,0.5)', fly: '255,130,40', poolGlow: '255,100,20'
    }),
    mix: { rock: 0.12, rubble: 0.14, vent: 0.22, stalag: 0.1, bones: 0.04, brazier: 0.1, crystal: 0.06 }, fireflies: 60, rise: 32, glow: { base: 0.7, amp: 0.35, speed: 1.4 }
  });

  /* ---------- Step 4 ---------- */
  M.iceCave = ex({}, crystal, {
    id: 'iceCave', seed: 121,
    pal: ex({}, crystal.pal, {
      ground: ['#6a88b0', '#2a4268'], blotch: ['#8aa8d0', '#4a6a98', '#a8c4e0', '#34507c', '#7a98c0'], soil: ['#2a3e60', '#1a2a46'],
      bed: ['#0a1428', '#2e4a78', '#6a8ec0', '#a8c8ee'], stone: ['#e0eefc', '#a0bcdc', '#4a6890'], water: ['#e8fbff', '#8ad0f0', '#2a6aa8'],
      crystal: [['#ffffff', '#b8e4ff', '#4a90d0'], ['#f0fcff', '#8ad0f8', '#2a70b8']], shaft: 'rgba(220,245,255,0.12)', warm: 'rgba(220,240,255,0.2)', cool: 'rgba(0,10,34,0.34)', vignette: 'rgba(2,10,30,0.66)', fly: '220,245,255'
    }),
    mix: { crystal: 0.26, stalag: 0.2, rock: 0.12, glowshroom: 0.08, rubble: 0.14, grass: 0.06 }, shafts: 4
  });
  M.amethyst = ex({}, crystal, {
    id: 'amethyst', seed: 127,
    pal: ex({}, crystal.pal, {
      ground: ['#4a2a6a', '#1c0e3a'], blotch: ['#6a3a90', '#341a58', '#7a4aa0', '#28104a', '#5a2a80'], soil: ['#2a1450', '#160a34'],
      bed: ['#0c0620', '#3a2470', '#6a4ab0', '#9a78d8'], stone: ['#c8b0ec', '#8a6ab8', '#3a2468'], water: ['#e8d0ff', '#9a60e8', '#3a1a8a'],
      crystal: [['#f0d8ff', '#c07aff', '#5a2aa0'], ['#ffe0f8', '#e07ae0', '#8a2a90'], ['#e0d0ff', '#8a7aff', '#3a2aa0']], shaft: 'rgba(210,170,255,0.1)', warm: 'rgba(210,170,255,0.18)', cool: 'rgba(10,0,30,0.42)', vignette: 'rgba(8,0,24,0.74)', fly: '220,180,255'
    }),
    mix: { crystal: 0.3, stalag: 0.12, rock: 0.1, glowshroom: 0.16, rubble: 0.1, grass: 0.04 }
  });

  /* ---------- Step 5 ---------- */
  M.library = ex({}, tower, {
    id: 'library', seed: 139,
    pal: ex({}, tower.pal, {
      ground: ['#4a3426', '#241810'], blotch: ['#5e4636', '#34241a', '#6e5238', '#28190f', '#523a2a'], bed: ['#0e0804', '#3a2616', '#6a4a2c', '#9a7448'],
      lip: ['#080402', '#ffe0a0'], stone: ['#d0b890', '#8a7250', '#3a2c1a'], water: ['#ffe8b0', '#d09030', '#6a3a08'], banners: [['#a02a30', '#781a22', '#480c12'], ['#2a6a5a', '#1a4a40', '#0e2a26']], trim: '#f0cc70',
      shaft: 'rgba(255,214,150,0.1)', vignette: 'rgba(14,6,2,0.74)', warm: 'rgba(255,214,150,0.2)', cool: 'rgba(8,2,0,0.44)', fly: '255,214,150', ripple: '255,230,190', poolGlow: '255,170,60', runeCol: 'rgba(255,190,90,0.9)'
    }),
    mix: { pillar: 0.12, torch: 0.2, brazier: 0.12, rubble: 0.1, rock: 0.04, bones: 0.06, crystal: 0.02 }, birdCol: 'rgba(30,14,6,0.85)'
  });
})(window.GA = window.GA || {});
