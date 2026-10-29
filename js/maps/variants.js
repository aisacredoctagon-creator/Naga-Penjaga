/* maps/variants.js — varian peta (tahap f): peta berbeda untuk tiap stage.
 *   Stage 1 Lembah Hutan Naga : forest (siang), grove (senja musim gugur), bloom (padang bunga fajar)
 *   Stage 2 Gunung Api          : volcano (basal & lahar), ashfield (dataran abu), magma (lahar membara)
 *   Stage 2 Gua Kristal     : crystal (biru-ungu), iceCave (es putih-biru), amethyst (kristal ungu)
 *   Stage 3 Menara Penyihir   : tower (rune ungu), tower2 (observatorium), library (perpustakaan hangat)
 * Data murni (palet, komposisi dekorasi `mix`, seed, opsi efek). Satu arah cahaya per peta (kiri-atas). Zona tiap peta: lihat `Levels.zoneOf`. */
(function (GA) {
  'use strict';
  const M = GA.Maps, forest = M.forest, volcano = M.volcano, crystal = M.crystal, tower = M.tower;
  const ex = Object.assign;

  /* ---------- Stage 1 ---------- */
  M.bloom = ex({}, forest, {
    id: 'bloom', seed: 91,
    pal: ex({}, forest.pal, {
      ground: ['#6cb45a', '#3a8048'], blotch: ['#9ad26a', '#58a850', '#d8c860', '#4a9a58', '#e8a0b8', '#6cbc5a'],
      flowers: ['#ffd6ea', '#fff6c8', '#ffc0d8', '#d8ccff'], leaf: [['#bde882', '#6cc055', '#2c7a3e'], ['#d8f09a', '#88d060', '#3a8a46'], ['#9ee0a0', '#44b060', '#1c6a40']],
      shaft: 'rgba(255,226,230,0.14)', warm: 'rgba(255,214,226,0.24)', vignette: 'rgba(30,6,20,0.56)', fly: '255,226,240'
    }),
    mix: { grass: 0.26, flower: 0.34, mush: 0.04, rock: 0.08, fern: 0.1, leaf: 0.1 }, statues: 2, fireflies: 38
  });

  /* ---------- Stage 2 (gunung api) ---------- */
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

  /* ---------- Stage 2 (gua kristal) ---------- */
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

  /* ---------- Stage 3 ---------- */
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
