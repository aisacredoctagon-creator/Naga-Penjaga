/* maps/tower.js — peta Step 3: Menara Penyihir (lantai ubin batu gelap, lingkaran rune ungu menyala, obor, anglo, pilar, spanduk, kabut sihir)
 * dan variasinya Observatorium (palet biru-teal dengan rune biru, lebih banyak obor). Data murni; elemen depan 'hall' = spanduk & pilar. */
(function (GA) {
  'use strict';
  GA.Maps = GA.Maps || {};

  const tower = {
    id: 'tower', seed: 73, base: 'flags', front: 'hall', moss: false,
    pal: {
      ground: ['#302a54', '#16132f'], blotch: ['#403972', '#241f48', '#4a3a82', '#1a1638', '#36306c'], soil: ['#18123a', '#100c2a'],
      bed: ['#080520', '#241e4a', '#463e84', '#6a62aa'], lip: ['#05030f', '#d9c8ff'], stone: ['#a49ecc', '#6c6696', '#2a2648'],
      shore: '#18123a', water: ['#c9b0ff', '#6a3ae0', '#1c0a58'], cap: [['#c0a0ff', '#6a3ac8']], flowers: ['#d8c0ff'], grassA: '#8a6ad8', grassB: '#4a2a98',
      crystal: [['#e0d0ff', '#9a6aff', '#3a1a9a']], banners: [['#6a2ab0', '#4a1a88', '#2a0e55'], ['#a02a60', '#781a48', '#480c2c']], trim: '#e0b860',
      shaft: 'rgba(190,160,255,0.07)', vignette: 'rgba(4,2,20,0.78)', warm: 'rgba(200,170,255,0.14)', cool: 'rgba(2,0,20,0.44)', tint: null,
      fly: '200,170,255', ripple: '210,190,255', poolGlow: '150,100,255', runeCol: 'rgba(170,110,255,0.9)'
    },
    mix: { pillar: 0.08, torch: 0.12, brazier: 0.08, rubble: 0.2, rock: 0.08, bones: 0.05, crystal: 0.04 },
    density: 0.8, statues: 2, fireflies: 34, rise: 10, shafts: 2, mist: true, birds: true, birdCol: 'rgba(20,10,40,0.85)',
    glow: { base: 0.6, amp: 0.3, speed: 1.4 }
  };
  GA.Maps.tower = tower;

  GA.Maps.tower2 = Object.assign({}, tower, {
    id: 'tower2', seed: 89,
    pal: Object.assign({}, tower.pal, {
      ground: ['#1f3342', '#0e1824'], blotch: ['#2a4a60', '#18303f', '#2a5a70', '#122230', '#244a5a'], bed: ['#04101c', '#183040', '#2e5a74', '#4a86a4'],
      lip: ['#02080f', '#ffe3a8'], stone: ['#a8c4d0', '#6a8ea0', '#26404c'], shore: '#0e2230', water: ['#b0f0ff', '#2a9ad8', '#0a3a68'],
      banners: [['#0e7a8a', '#0a5a6a', '#06323e'], ['#9a7a20', '#76581a', '#463410']], trim: '#f0d890',
      shaft: 'rgba(160,230,255,0.07)', vignette: 'rgba(0,6,16,0.78)', warm: 'rgba(170,230,255,0.14)', cool: 'rgba(0,6,18,0.44)', fly: '170,240,255', ripple: '190,240,255',
      poolGlow: '80,200,255', runeCol: 'rgba(110,220,255,0.9)'
    }),
    mix: { pillar: 0.1, torch: 0.18, brazier: 0.1, rubble: 0.16, rock: 0.06, bones: 0.03, crystal: 0.06 }
  });
})(window.GA = window.GA || {});
