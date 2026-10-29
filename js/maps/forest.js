/* maps/forest.js — data peta Stage 1: Lembah Hutan Naga. Satu palet, satu arah cahaya (kiri-atas).
 * Peta lain didaftarkan dengan cara yang sama di GA.Maps. Isi `pal` untuk mengganti warna; `mix` mengatur komposisi dekorasi.
 * Variasi `menu` memakai dekorasi yang sama dengan palet malam. Untuk gambar ilustrasi sendiri, isi `art` dengan path relatif
 * (mis. 'assets/maps/step1-landscape.webp'): jika berkas ada, dipakai sebagai lapisan dasar (jalur & efek tetap digambar kode). */
(function (GA) {
  'use strict';
  GA.Maps = GA.Maps || {};

  const forest = {
    id: 'forest', seed: 21, art: { landscape: null, portrait: null },
    pal: {
      ground: ['#58a24c', '#2c6b38'],
      blotch: ['#86c85c', '#3f8a44', '#64912e', '#2a5f3a', '#a08c4a', '#33703f'],
      soil: ['#7a5a32', '#5a3f22'],
      bed: ['#2e1c0c', '#5e4326', '#8f6e3f', '#b08c58'],
      lip: ['#24160a', '#ffe9b0'],
      leaf: [['#a6e670', '#52b04a', '#1f6a3a'], ['#bdea82', '#6cc055', '#2c7a3e'], ['#86d47a', '#32a054', '#17603a']],
      leafFront: ['#4aa83f', '#237232', '#0d3f20'],
      stone: ['#d3cdb8', '#a09983', '#605a4b'],
      shore: '#5e4c2c', water: ['#97e4d8', '#2f9aa2', '#14586a'],
      cap: [['#ff8272', '#c4332a'], ['#ffd6f2', '#d062b4']], flowers: ['#fff6c8', '#ffd6ea', '#d8ccff', '#ffb86a'],
      grassA: '#7ec956', grassB: '#3f8f3a',
      shaft: 'rgba(255,238,170,0.10)', vignette: 'rgba(3,22,12,0.66)', warm: 'rgba(255,244,190,0.18)', cool: 'rgba(0,18,12,0.30)', tint: null,
      fly: '255,240,140'
    },
    mix: { grass: 0.34, flower: 0.12, mush: 0.05, rock: 0.13, fern: 0.15, leaf: 0.15 },
    density: 1, statues: 2, fireflies: 30, shafts: 3, mist: true, birds: true
  };
  GA.Maps.forest = forest;

  // Menu utama: hutan yang sama di malam hari (palet biru-ungu, kunang-kunang lebih banyak).
  GA.Maps.menu = Object.assign({}, forest, {
    id: 'menu', seed: 33,
    pal: Object.assign({}, forest.pal, {
      ground: ['#2f6a66', '#173a46'], blotch: ['#3f8a7a', '#285c6a', '#34607a', '#1d4a5a', '#5a6a8a', '#2a6a60'],
      water: ['#9fc8ff', '#3a6ab0', '#162a64'], shaft: 'rgba(170,190,255,0.07)', vignette: 'rgba(2,4,28,0.74)',
      warm: 'rgba(170,190,255,0.14)', cool: 'rgba(0,4,30,0.36)', tint: 'rgba(40,50,150,0.30)', fly: '190,230,255'
    }),
    fireflies: 44, shafts: 2
  });

  // Varian Stage 1: hutan senja (daun musim gugur, cahaya keemasan, lebih banyak jamur dan batu)
  GA.Maps.grove = Object.assign({}, forest, {
    id: 'grove', seed: 27,
    pal: Object.assign({}, forest.pal, {
      ground: ['#8fa24a', '#3d6a2c'], blotch: ['#d0a040', '#a07a2a', '#6a9a34', '#7a4a22', '#b85a2a', '#4f8a38'],
      leaf: [['#ffd878', '#e8a030', '#8a4a18'], ['#ffb060', '#d06a2c', '#6a2a10'], ['#d8e87a', '#8ab83a', '#3a6a20']], leafFront: ['#e8902c', '#a04c18', '#4a2008'],
      water: ['#a8dcea', '#3a98a8', '#145868'], grassA: '#b4c850', grassB: '#6a8a2c',
      shaft: 'rgba(255,214,120,0.14)', warm: 'rgba(255,224,150,0.24)', vignette: 'rgba(30,14,2,0.64)', fly: '255,200,90'
    }),
    mix: { grass: 0.25, flower: 0.1, mush: 0.12, rock: 0.16, fern: 0.12, leaf: 0.2 }, statues: 3, fireflies: 36
  });
})(window.GA = window.GA || {});
