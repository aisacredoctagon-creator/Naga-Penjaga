/* dev/swapdbg.js — ?debug=swap: tombol "⇄ Tukar" (atau tombol X) memicu indikator penukaran SEKARANG pada rantai yang sedang berjalan (tanpa menunggu timer),
 * supaya tampilannya mudah diuji. Bekerja di semua stage (Stage 1 tidak punya penukaran terjadwal, tetapi pemicu manual tetap jalan). */
(function (GA) {
  'use strict';
  function fire() {
    const G = GA.game, r = G && G.run; if (!r || G.state !== 'playing') return false;
    if (!r.swap) r.swap = new GA.Swap.SwapManager({ chain: r.chain, rng: GA.QM.prng(1234), every: null, gp: r.gp, qm: r.qm, actor: 'bat', pairs: function () { return 1; }, hooks: {} });
    return r.swap.start();
  }
  const b = document.createElement('button'); b.textContent = '⇄ Tukar (debug)';
  b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99998;padding:10px 14px;font:700 14px sans-serif;border-radius:10px;border:2px solid #fff;background:#5a2fb0;color:#fff;min-width:44px;min-height:44px';
  b.addEventListener('click', function (e) { e.stopPropagation(); fire(); });
  document.body.appendChild(b);
  window.addEventListener('keydown', function (e) { if (e.key === 'x' || e.key === 'X') fire(); });
  GA.SwapDebug = { fire: fire };
})(window.GA = window.GA || {});
