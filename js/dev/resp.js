/* dev/resp.js — pemeriksa responsif (dimuat dengan ?resp=1). Panggil `await GA.Resp.check()` pada tiap ukuran viewport:
 * membuka tiap layar (judul, atur, cara main, menu, pembuka step, jeda, hasil) dan melaporkan elemen yang keluar layar secara horizontal,
 * teks terpotong, scroll horizontal halaman, dan popup jeda yang keluar layar. */
(function (GA) {
  'use strict';
  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  async function check() {
    const G = GA.game, U = GA.UI, vw = innerWidth, vh = innerHeight, issues = [], ok = [];
    const scan = function (name) {
      const root = document.getElementById('s-' + name); if (!root) { issues.push(name + ': tidak ada'); return; }
      const bad = [];
      root.querySelectorAll('*').forEach(function (e) {
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
        const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
        if (r.left < -2 || r.right > vw + 2) bad.push(String(e.id || (e.className && e.className.baseVal === undefined ? e.className : e.tagName)).slice(0, 30) + ' x[' + Math.round(r.left) + ',' + Math.round(r.right) + ']');
        if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 10 && e.children.length === 0 && e.textContent.trim()) bad.push('terpotong:' + e.textContent.trim().slice(0, 18));
      });
      if (document.documentElement.scrollWidth > vw + 1) bad.push('scroll horizontal halaman');
      if (bad.length) issues.push(name + ': ' + bad.slice(0, 4).join('; ')); else ok.push(name);
    };
    const sel = { slots: ['add', 'sub', 'mul', 'div', 'int'], same: false, random: false, diff: 'sedang' };
    U.show('title'); await wait(200); scan('title');
    U.show('settings'); await wait(200); scan('settings'); U.show('howto'); await wait(200); scan('howto');
    GA.Menu.open(); await wait(300); scan('menu');
    G.startAdventure(sel, true, 3); await wait(500); scan('intro');
    G.handlers.introGo(); for (let i = 0; i < 60 && G.state !== 'playing'; i++) await wait(100);
    for (let i = 0; i < 100; i++) G.tick(1 / 30, true);
    G.handlers.pause(); await wait(400); scan('pause');
    const boxes = [].slice.call(document.querySelectorAll('#s-pause *')).map(function (e) { return e.getBoundingClientRect(); }).filter(function (r) { return r.width > 100 && r.height > 100; });
    const maxB = Math.max.apply(null, [0].concat(boxes.map(function (r) { return r.bottom; }))), minT = Math.min.apply(null, [999].concat(boxes.map(function (r) { return r.top; })));
    if (maxB > vh + 2 || minT < -2) issues.push('pause: panel keluar layar y[' + Math.round(minT) + ',' + Math.round(maxB) + '] vh ' + vh);
    G.handlers.quit(); await wait(200);
    U.showResult({ win: true, steps: [0, 1, 2, 3, 4].map(function (i) { return { name: (i + 1) + ' · Tempat dengan nama yang panjang sekali', stars: 3, i: i }; }), score: 123456, newBest: true, high: 123456, eggs: 5, maxEggs: 5, correct: 100, wrong: 3, combo: 12 });
    await wait(300); scan('result');
    G.handlers.quit(); await wait(200);
    return { vw: vw, vh: vh, layout: G.layout.W + 'x' + G.layout.H + ' dpr' + G.layout.dpr + ' sc' + G.layout.scale.toFixed(2), ok: ok.join(','), issues: issues };
  }
  GA.Resp = { check: check };
})(window.GA = window.GA || {});
