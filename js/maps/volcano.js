/* maps/volcano.js — peta Step 2: Gunung Api (batu basal, retakan lava menyala, lubang uap, bara beterbangan) dan variasinya Gua Kristal
 * (batu biru-ungu, kristal berpendar, genangan air cermin, lumut menyala). Data murni: palet, komposisi dekorasi, dan opsi efek. */
(function (GA) {
  'use strict';
  GA.Maps = GA.Maps || {};

  GA.Maps.volcano = {
    id: 'volcano', seed: 41, base: 'basalt', front: 'stone', moss: false,
    pal: {
      ground: ['#3c2326', '#1a0f12'], blotch: ['#5e2c24', '#2a1a1e', '#6e3c2a', '#1e1418', '#4e2222'], soil: ['#2a1814', '#1a0e0c'],
      bed: ['#100606', '#34201c', '#604438', '#84644e'], lip: ['#0a0404', '#ffb878'], stone: ['#a09088', '#685855', '#2e2626'],
      shore: '#1a0c08', water: ['#fff2a8', '#ff9a24', '#8a2008'], cap: [['#ff9a5a', '#c43a1a']], flowers: ['#ffb070'], grassA: '#8a5a3a', grassB: '#4a2a1a',
      crystal: [['#ffd8b0', '#ff8a3a', '#8a2a10'], ['#ffe8c0', '#ffb040', '#9a4a10']],
      shaft: 'rgba(255,150,80,0.07)', vignette: 'rgba(18,3,0,0.74)', warm: 'rgba(255,160,90,0.2)', cool: 'rgba(8,0,0,0.44)', tint: null,
      fly: '255,150,50', ripple: '255,210,140', poolGlow: '255,120,30'
    },
    mix: { rock: 0.2, rubble: 0.22, vent: 0.1, stalag: 0.14, bones: 0.05, brazier: 0.04, crystal: 0.05 },
    density: 0.9, statues: 2, fireflies: 46, rise: 26, shafts: 0, mist: false, birds: false,
    glow: { base: 0.55, amp: 0.3, speed: 1.1 }
  };

  GA.Maps.crystal = {
    id: 'crystal', seed: 57, base: 'cave', front: 'stone', moss: false,
    pal: {
      ground: ['#2c3466', '#141a40'], blotch: ['#3a4a8a', '#2a2a6a', '#4a3a8a', '#1c2a5a', '#2a5a7a'], soil: ['#1a2050', '#10163a'],
      bed: ['#080c28', '#242c62', '#444e9c', '#6874c6'], lip: ['#050718', '#cfe0ff'], stone: ['#b2bce8', '#6e78b4', '#2c3068'],
      shore: '#171c4a', water: ['#bfe8ff', '#4a8ad8', '#162a6a'], cap: [['#9ae8ff', '#2a8ac8'], ['#e0b8ff', '#8a3ac8']], flowers: ['#bfe8ff'], grassA: '#5ab0c8', grassB: '#2a6a98',
      crystal: [['#d8eaff', '#7aa6ff', '#2a3a9a'], ['#f0d8ff', '#b07aff', '#4a2a9a'], ['#c8fff0', '#5ad8c0', '#1a6a70']],
      shaft: 'rgba(150,200,255,0.08)', vignette: 'rgba(2,4,24,0.76)', warm: 'rgba(160,200,255,0.16)', cool: 'rgba(0,2,26,0.42)', tint: null,
      fly: '170,220,255', ripple: '200,235,255', poolGlow: '110,170,255'
    },
    mix: { crystal: 0.22, stalag: 0.16, rock: 0.12, glowshroom: 0.16, rubble: 0.14, grass: 0.1 },
    density: 1, statues: 1, fireflies: 40, shafts: 3, mist: true, birds: true, birdCol: 'rgba(30,20,60,0.85)',
    glow: { base: 0.6, amp: 0.25, speed: 1.6 }
  };
})(window.GA = window.GA || {});
