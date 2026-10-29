/* icons.js — ikon SVG inline (viewBox 24, garis 2,3 bulat) dengan gaya konsisten; tanpa pustaka ikon eksternal.
 * Icons.html('play', 'kelas') → string <svg>. Warna mengikuti `currentColor`, ukuran lewat CSS (.ic). */
(function (GA) {
  'use strict';
  const S = 'fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"';
  const F = 'fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"';

  const P = {
    play: '<path d="M7 4.5v15l12-7.5z" ' + F + '/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1.2" ' + F + '/><rect x="14" y="4.5" width="4" height="15" rx="1.2" ' + F + '/>',
    back: '<path d="M15 5l-7 7 7 7" ' + S + '/>',
    home: '<path d="M4 11.5L12 4l8 7.5V20h-5.5v-6h-5v6H4z" ' + S + '/>',
    restart: '<path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" ' + S + '/><path d="M19.8 4v4.8h-4.8" ' + S + '/>',
    sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" ' + F + '/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" ' + S + '/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" ' + F + '/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5" ' + S + '/>',
    music: '<path d="M9 17.5V6l10-2v11.5" ' + S + '/><circle cx="6.5" cy="17.5" r="2.5" ' + F + '/><circle cx="16.5" cy="15.5" r="2.5" ' + F + '/>',
    book: '<path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5zM12 6.5v13" ' + S + '/>',
    gear: '<circle cx="12" cy="12" r="3.2" ' + S + '/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" ' + S + '/>',
    help: '<circle cx="12" cy="12" r="9" ' + S + '/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.9.5-1.2 1.1-1.2 1.9" ' + S + '/><circle cx="12" cy="16.8" r="0.9" ' + F + '/>',
    star: '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.2 6.1-.8z" ' + F + '/>',
    egg: '<path d="M12 3c3.6 0 6.5 6.2 6.5 10.2A6.5 6.5 0 0 1 12 20a6.5 6.5 0 0 1-6.5-6.8C5.5 9.2 8.4 3 12 3z" ' + F + '/>',
    flame: '<path d="M12 3c.8 3.2 5.2 5.4 5.2 10.2a5.2 5.2 0 0 1-10.4 0c0-2.2 1-3.6 2.2-4.6.1 2 .9 3 2 3.4C10.2 8.2 10.4 5.6 12 3z" ' + F + '/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.5" ' + S + '/><circle cx="8.8" cy="8.8" r="1.2" ' + F + '/><circle cx="15.2" cy="8.8" r="1.2" ' + F + '/><circle cx="12" cy="12" r="1.2" ' + F + '/><circle cx="8.8" cy="15.2" r="1.2" ' + F + '/><circle cx="15.2" cy="15.2" r="1.2" ' + F + '/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.4" ' + S + '/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ' + S + '/>',
    plus: '<path d="M12 5v14M5 12h14" ' + S + '/>',
    minus: '<path d="M5 12h14" ' + S + '/>',
    times: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ' + S + '/>',
    divide: '<path d="M5 12h14" ' + S + '/><circle cx="12" cy="6.2" r="1.5" ' + F + '/><circle cx="12" cy="17.8" r="1.5" ' + F + '/>',
    pm: '<path d="M12 4.5v8M8 8.5h8M7 18h10" ' + S + '/>',
    frac: '<path d="M6 12h12" ' + S + '/><path d="M10.6 5.2l1.8-1.4v6" ' + S + '/><path d="M9.6 15.6c.2-1.2 1.2-1.9 2.4-1.9s2.2.8 2.2 1.9c0 1.5-2.5 2.2-4.6 4.4h4.8" ' + S + '/>',
    decimal: '<ellipse cx="7" cy="12" rx="3" ry="5" ' + S + '/><circle cx="13" cy="17.6" r="1.3" ' + F + '/><path d="M20.5 7H17v4.6h2.2a2.3 2.3 0 0 1 0 4.6H17" ' + S + '/>',
    mix: '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" ' + F + '/>',
    target: '<circle cx="12" cy="12" r="7.5" ' + S + '/><circle cx="12" cy="12" r="2.2" ' + F + '/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" ' + S + '/>',
    wizard: '<path d="M12 3l5.500 12.500H6.500z" ' + F + '/><path d="M4.500 16.500h15M8 20.500h8" ' + S + '/>',
    list: '<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20" ' + S + '/><circle cx="4.5" cy="6.5" r="1.1" ' + F + '/><circle cx="4.5" cy="12" r="1.1" ' + F + '/><circle cx="4.5" cy="17.5" r="1.1" ' + F + '/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" ' + S + '/>',
    checkdot: '<path d="M4.5 12.5l4 4L16 8" ' + S + '/><circle cx="19" cy="17.5" r="2.2" ' + F + '/>',
    dash: '<path d="M6 12h12" ' + S + '/>',
    cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ' + S + '/>',
    swap: '<path d="M4 8.5h14M14.5 5l3.5 3.5-3.5 3.5M20 15.5H6M9.5 12L6 15.5 9.5 19" ' + S + '/>',
    dragon: '<path d="M4 16c2 0 3-1.5 4-3 1-2 2-3 4-3.5L10 6l3.5 2c3 0 6 2 6 5.5 0 2-1 3.5-3 4l-2 2.5-1.5-2.2c-3 .5-5.5 0-7-.7z" ' + F + '/>'
  };

  const Icons = {
    names: Object.keys(P),
    html: function (name, cls) { return '<svg class="ic ic-' + name + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[name] || '') + '</svg>'; },
    /** Ikon kategori soal (id dari Questions.CATEGORIES). */
    cat: { add: 'plus', sub: 'minus', mul: 'times', div: 'divide', int: 'pm', frac: 'frac', dec: 'decimal', mix: 'mix' }
  };
  GA.Icons = Icons;
})(window.GA = window.GA || {});
