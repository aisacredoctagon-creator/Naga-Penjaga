/* config/categories.js — daftar kategori soal, kesulitan, dan pilihan awal halaman awal. Dimuat di halaman awal (kecil), jadi TIDAK boleh bergantung pada mesin game.
 * Tabel soal per kategori+kesulitan ada di questions.js (dimuat bersama mesin). Untuk menambah kategori: tambahkan ke LIST di sini
 * (id, nama, warna, contoh soal kecil untuk kartu), isi TABLE di questions.js, dan beri ikon di Icons.cat (ui/icons.js). */
(function (GA) {
  'use strict';
  const LIST = [
    { id: 'add', name: 'Penjumlahan', icon: '+', color: '#ff9a3c', ex: '7 + 5' },
    { id: 'sub', name: 'Pengurangan', icon: '−', color: '#ff6b8a', ex: '15 − 8' },
    { id: 'mul', name: 'Perkalian', icon: '×', color: '#8b5cf6', ex: '6 × 7' },
    { id: 'div', name: 'Pembagian', icon: '÷', color: '#3b82f6', ex: '48 ÷ 6' },
    { id: 'int', name: 'Bilangan Bulat', icon: '±', color: '#14b8a6', ex: '(−4) + 9' },
    { id: 'frac', name: 'Pecahan', icon: '½', color: '#ec4899', ex: '1/2 + 1/4' },
    { id: 'dec', name: 'Desimal', icon: '0,5', color: '#22c55e', ex: '0,5 + 1,2' },
    { id: 'mix', name: 'Campuran', icon: '✦', color: '#eab308', ex: '✦' }
  ];
  const DIFFS = ['mudah', 'sedang', 'sulit'];

  const Categories = {
    LIST: LIST, DIFFS: DIFFS,
    DEFAULT_CAT: 'add', DEFAULT_DIFF: 'sedang',      // pilihan pertama kali (tidak ada simpanan)
    has: function (id) { return LIST.some(function (c) { return c.id === id; }); },
    byId: function (id) { for (const c of LIST) if (c.id === id) return c; return LIST[0]; }
  };
  GA.Categories = Categories;
})(window.GA = window.GA || {});
