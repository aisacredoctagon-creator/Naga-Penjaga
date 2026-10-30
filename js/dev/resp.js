/* dev/resp.js — pemeriksa responsif (dimuat dengan ?resp=1). Panggil `await GA.Resp.check()` pada tiap ukuran viewport:
 * membuka tiap layar (halaman awal, atur, cara main, pembuka stage, jeda, hasil) dan melaporkan elemen yang keluar layar secara horizontal,
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
    const sel = { cat: 'add', diff: 'sedang' };
    // halaman awal: papan muat, kartu/tombol terlihat penuh, target sentuh >= 44 px, area kartu hanya digulir bila konten lebih tinggi dari layar
    const S = GA.Start; S.show(); await wait(400); document.getAnimations().forEach(function (a) { try { a.finish(); } catch (e) { /* abaikan */ } }); scan('start');      // animasi masuk papan diselesaikan agar ukuran terukur penuh
    { const st = document.getElementById('s-start'), bad = [], small = [];
      st.querySelectorAll('button').forEach(function (b) { const r = b.getBoundingClientRect(); if (r.width < 1) return; if (r.height < 43.5 || r.width < 43.5) small.push((b.id || b.dataset.act || b.className) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); if (r.bottom > vh + 1 || r.top < -1) bad.push('luar layar:' + (b.id || b.dataset.id)); });
      const cats = document.getElementById('st-cats'), pn = st.querySelector('.k-panel').getBoundingClientRect(), land = vw > vh;
      { const cx = document.createElement('canvas').getContext('2d'), broken = []; st.querySelectorAll('.k-cname').forEach(function (n) { const cs = getComputedStyle(n); cx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; if ('letterSpacing' in cx) cx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing; const w = Math.max.apply(null, n.textContent.split(' ').map(function (t) { return cx.measureText(t).width; })); if (w > n.clientWidth + 0.5) broken.push(n.textContent + ' ' + Math.round(w) + '>' + n.clientWidth); }); if (broken.length) issues.push('start: kata nama kategori terpotong: ' + broken.slice(0, 3).join(', ')); }
      if (small.length) issues.push('start: target sentuh < 44px: ' + small.slice(0, 4).join(', '));
      if (bad.length) issues.push('start: ' + bad.slice(0, 4).join(', '));
      if (land && vh <= 520 && cats.scrollHeight > cats.clientHeight + 2) issues.push('start: kartu perlu gulir di lanskap pendek (' + cats.scrollHeight + '>' + cats.clientHeight + ')');
      if (pn.bottom > vh + 1 || pn.top < 0) issues.push('start: papan keluar layar y[' + Math.round(pn.top) + ',' + Math.round(pn.bottom) + ']'); }
    document.getElementById('st-settings').click(); await wait(250); scan('settings'); document.querySelector('#s-settings [data-act="st-back"]').click(); await wait(100);
    document.getElementById('st-howto').click(); await wait(250); scan('howto'); document.querySelector('#s-howto [data-act="st-back"]').click(); await wait(100);
    G.startAdventure(sel, true, 1); await wait(500); scan('intro');
    G.handlers.introGo(); for (let i = 0; i < 60 && G.state !== 'playing'; i++) await wait(100);
    for (let i = 0; i < 100; i++) G.tick(1 / 30, true);
    G.handlers.pause(); await wait(400); scan('pause');
    const boxes = [].slice.call(document.querySelectorAll('#s-pause *')).map(function (e) { return e.getBoundingClientRect(); }).filter(function (r) { return r.width > 100 && r.height > 100; });
    const maxB = Math.max.apply(null, [0].concat(boxes.map(function (r) { return r.bottom; }))), minT = Math.min.apply(null, [999].concat(boxes.map(function (r) { return r.top; })));
    if (maxB > vh + 2 || minT < -2) issues.push('pause: panel keluar layar y[' + Math.round(minT) + ',' + Math.round(maxB) + '] vh ' + vh);
    G.handlers.quit(); await wait(200);
    S.hide();
    U.showResult({ win: true, steps: [0, 1, 2].map(function (i) { return { name: (i + 1) + ' · Tempat dengan nama yang panjang sekali', stars: 3, i: i }; }), score: 123456, newBest: true, high: 123456, eggs: 5, maxEggs: 5, correct: 100, wrong: 3, combo: 12 });
    await wait(300); scan('result');
    G.handlers.quit(); await wait(200);
    return { vw: vw, vh: vh, layout: G.layout.W + 'x' + G.layout.H + ' dpr' + G.layout.dpr + ' sc' + G.layout.scale.toFixed(2), ok: ok.join(','), issues: issues };
  }
  GA.Resp = { check: check };
})(window.GA = window.GA || {});
