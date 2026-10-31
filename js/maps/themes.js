/* maps/themes.js — DATA peta (revisi 11): palet terbatas per tema, 3 varian per stage. Dipakai js/render/flatmap.js untuk menggambar ilustrasi statis yang BERSIH (bentuk besar tegas,
 * shading datar 2–3 nada, siluet jelas, tanpa tekstur foto) SEKALI per stage/varian/layout. Tidak ada animasi.
 *   Stage 1 hutan malam      : forest, grove, bloom        (hijau-teal gelap, jalur coklat-abu hangat)
 *   Stage 2 gunung api / gua : volcano, magma, crystal     (arang, lava merah-oranye, kristal ungu/biru)
 *   Stage 3 menara penyihir  : tower, tower2, library      (indigo-hitam, rune ungu, abu batu)
 * Isi: theme (jenis dekorasi), seed, density (jumlah dekorasi), pal { ground[3] = tanah (dasar, noda terang, noda gelap), speck (bintik tile), track { fill, bed, rim, edge },
 * deco (warna dekorasi per jenis), rune, vignette }. Gambar sendiri: daftarkan di assets/manifest.json → maps.<id>.{landscape,portrait} (lihat docs/ASSET_GUIDE.md); alur, platform naga,
 * dan sarang tetap digambar di atasnya. */
(function (GA) {
  'use strict';
  const M = GA.Maps = GA.Maps || {};
  const track = function (fill, bed, rim, edge) { return { fill: fill, bed: bed, rim: rim, edge: edge, shadow: 'rgba(3,4,12,0.42)' }; };
  const def = function (id, o) { o.id = id; o.art = { landscape: null, portrait: null }; M[id] = o; };

  /* ---------- Stage 1: hutan malam ---------- */
  def('forest', { theme: 'forest', seed: 21, density: 0.75, pal: {
    ground: ['#17372f', '#1f4a41', '#112b26'], speck: 'rgba(130,210,180,0.10)', track: track('#74685a', '#5c5247', '#a09aac', '#15111d'),
    deco: { leaf: ['#1f5c4b', '#2e7d64', '#103c31'], cap: ['#8a5ad8', '#bd96ff'], stone: ['#566074', '#7d8aa2'], grass: '#2f8268' }, rune: '#b890ff', vignette: 'rgba(2,6,12,0.58)' } });
  def('grove', { theme: 'forest', seed: 37, density: 0.8, pal: {
    ground: ['#142f3c', '#1b4050', '#0e2430'], speck: 'rgba(130,200,230,0.10)', track: track('#6d675f', '#575149', '#9a9ab0', '#12121c'),
    deco: { leaf: ['#1c5864', '#2b7f88', '#0e3944'], cap: ['#e0a040', '#ffd88a'], stone: ['#4e6076', '#7a90aa'], grass: '#2a8088' }, rune: '#8ac8ff', vignette: 'rgba(2,6,14,0.6)' } });
  def('bloom', { theme: 'forest', seed: 91, density: 0.85, pal: {
    ground: ['#1a3a2a', '#244c36', '#112819'], speck: 'rgba(150,230,170,0.10)', track: track('#76695a', '#5e5246', '#a29a9e', '#16111a'),
    deco: { leaf: ['#235f3b', '#34834e', '#113a23'], cap: ['#d05aa8', '#ff9ad8'], stone: ['#5a6070', '#80889c'], grass: '#349254' }, rune: '#ff9ad8', vignette: 'rgba(2,8,6,0.58)' } });
  M.menu = M.forest;      // latar cerita pembuka

  /* ---------- Stage 2: gunung api / gua ---------- */
  def('volcano', { theme: 'volcano', seed: 41, density: 0.7, pal: {
    ground: ['#2b2125', '#382b30', '#1d1619'], speck: 'rgba(255,170,120,0.07)', track: track('#6e5e5c', '#554644', '#928280', '#130b0b'),
    deco: { rock: ['#3f3337', '#5c4b50'], lava: ['#ff7a24', '#ffd27a'], crystal: ['#8a5ad8', '#caaaff'], ember: ['#ff9a3c', '#ffe0a0'] }, rune: '#ff9a3c', vignette: 'rgba(14,3,0,0.62)' } });
  def('magma', { theme: 'volcano', seed: 53, density: 0.75, lavaMore: true, pal: {
    ground: ['#2d1517', '#3d1c1d', '#1c0b0d'], speck: 'rgba(255,140,100,0.08)', track: track('#6a5856', '#524040', '#8e7a78', '#120808'),
    deco: { rock: ['#40282a', '#60403f'], lava: ['#ff5a1e', '#ffc470'], crystal: ['#d05aa8', '#ffb0e0'], ember: ['#ff7a24', '#ffd890'] }, rune: '#ff6a2a', vignette: 'rgba(16,2,0,0.66)' } });
  def('crystal', { theme: 'volcano', seed: 67, density: 0.75, cave: true, pal: {
    ground: ['#1e2139', '#282c4c', '#141729'], speck: 'rgba(150,190,255,0.08)', track: track('#5e607c', '#484a64', '#8e92b4', '#0f1020'),
    deco: { rock: ['#363a5c', '#4d537e'], lava: ['#4aa6ee', '#c8eaff'], crystal: ['#4aa0e8', '#b4e0ff'], ember: ['#8a7aff', '#d8d0ff'] }, rune: '#8ac8ff', vignette: 'rgba(2,3,14,0.64)' } });

  /* ---------- Stage 3: menara penyihir ---------- */
  def('tower', { theme: 'tower', seed: 73, density: 0.6, pal: {
    ground: ['#201b3a', '#2a2450', '#161230'], speck: 'rgba(190,170,255,0.07)', track: track('#5d5780', '#473f66', '#9a94c4', '#0e0b1e'),
    deco: { stone: ['#3b3562', '#5a548a'], banner: ['#6a2ab0', '#a02a60'], flame: ['#ffb040', '#fff0a0'], wood: '#4a3a52' }, rune: '#b080ff', vignette: 'rgba(3,2,14,0.66)' } });
  def('tower2', { theme: 'tower', seed: 79, density: 0.6, pal: {
    ground: ['#172142', '#1f2c56', '#0f1733'], speck: 'rgba(150,200,255,0.07)', track: track('#566184', '#414b69', '#90a0c8', '#0b1022'),
    deco: { stone: ['#324069', '#506496'], banner: ['#2a5ab0', '#2aa0a0'], flame: ['#7ad8ff', '#e0f8ff'], wood: '#3a4458' }, rune: '#5ac8ff', vignette: 'rgba(2,4,16,0.66)' } });
  def('library', { theme: 'tower', seed: 83, density: 0.65, pal: {
    ground: ['#261b36', '#32244a', '#1a1126'], speck: 'rgba(255,200,150,0.06)', track: track('#6a5a6c', '#524458', '#a49aae', '#120c18'),
    deco: { stone: ['#43345a', '#675684'], banner: ['#a02a60', '#c0762a'], flame: ['#ffa040', '#ffe0a0'], wood: '#5a3e46' }, rune: '#e0a860', vignette: 'rgba(5,2,10,0.66)' } });
})(window.GA = window.GA || {});
