/* dev/splashgen.js — pembuat aset splash art (dimuat dengan ?debug=splash). Bukan bagian game untuk pemain.
 *   await GA.SplashGen.run()      render 1920×1080 dan 1080×1920 (js/splash-art.js) → WebP, dikirim PUT ke /__save/gen-splash-*.png (server dev menyimpannya di docs/screenshots);
 *                                 lalu pindahkan/ganti nama ke assets/splash/splash-landscape.webp dan splash-portrait.webp (lihat docs/ASSET_GUIDE.md).
 *   GA.SplashGen.show(w, h)       pratinjau di atas halaman (klik untuk menutup). */
(function (GA) {
  'use strict';
  const SplashGen = {
    quality: 0.78,
    run: async function () {
      const out = [];
      for (const s of [['splash-landscape', 1920, 1080], ['splash-portrait', 1080, 1920]]) {
        const b = await GA.SplashArt.toBlob(s[1], s[2], 'image/webp', SplashGen.quality), r = await fetch('/__save/gen-' + s[0] + '.png', { method: 'PUT', body: b });
        out.push(s[0] + ': ' + Math.round(b.size / 1024) + ' KB, ' + b.type + ', simpan ' + (r.ok ? 'ok' : 'GAGAL'));
      }
      return out;
    },
    show: function (w, h) {
      const c = GA.SplashArt.render(w || 1280, h || 720); c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;z-index:99;background:#000';
      c.onclick = function () { c.remove(); }; document.body.appendChild(c); return c;
    }
  };
  GA.SplashGen = SplashGen;
})(window.GA = window.GA || {});
