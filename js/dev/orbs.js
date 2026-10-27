/* dev/orbs.js — halaman uji keterbacaan angka: buka index.html?debug=orbs
 * Menampilkan SEMUA kombinasi warna bola (8) × jenis angka (bulat, negatif, pecahan bersusun, desimal, panjang) pada ukuran bola rantai dan
 * ukuran kecil, plus bola api ×1/×2/×3 (ukuran siap tembak dan preview). Di bawah tiap baris tertera rasio kontras terburuk (WCAG, target ≥ 4,5).
 * GA.Dev.contrast() dipakai juga oleh tes otomatis (?test=1). */
(function (GA) {
  'use strict';
  const SAMPLES = ['7', '−12', '3/4', '12,5', '100', '1/2', '−0,75', '248'];

  function lum(r, g, b) {
    const f = function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function hexLum(h) { h = h.replace('#', ''); return lum(parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)); }

  /** Rasio kontras terburuk antara warna isi angka dan latar di area angka (titik paling terang yang mungkin tertimpa goresan angka). */
  function worst(ctx, cx, cy, R, rad) {
    const textL = hexLum(GA.Chain.LABEL_FILL); let maxL = 0;
    for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, d = R * rad * (ring ? 0.85 : 0.45), p = ctx.getImageData(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 1, 1).data;
      maxL = Math.max(maxL, lum(p[0], p[1], p[2]));
    }
    return (textL + 0.05) / (maxL + 0.05);
  }

  const Dev = {
    SAMPLES: SAMPLES,
    /** { orb: [rasio per warna], fire: [rasio per kerangka waktu], min } */
    contrast: function () {
      const R = 60, c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d', { willReadFrequently: true });
      const orb = [], fire = [];
      for (let ci = 0; ci < 8; ci++) {
        g.clearRect(0, 0, 200, 200); g.fillStyle = '#6a8a4a'; g.fillRect(0, 0, 200, 200);          // latar peta sembarang
        GA.Balls.drawOrb(g, 100, 100, R, ci, 0, 1, true, 0, 0); orb.push(worst(g, 100, 100, R, 0.55));
      }
      for (let f = 0; f < 8; f++) for (let m = 1; m <= 3; m++) {
        g.clearRect(0, 0, 200, 200); g.fillStyle = '#6a8a4a'; g.fillRect(0, 0, 200, 200);
        GA.Fire.drawBall(g, 100, 100, R, { mult: m, ci: -1 }, 1, f / 14, null, true); fire.push(worst(g, 100, 100, R, 0.55));
      }
      return { orb: orb, fire: fire, min: Math.min.apply(null, orb.concat(fire)) };
    },

    show: function () {
      const cv = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.id = 'debug-orbs'; cv.style.cssText = 'position:fixed;inset:0;z-index:99998;background:#2a3a2a;width:100%;height:100%;overflow:auto';
      const rows = 8, cw = 78, W = Math.max(window.innerWidth, SAMPLES.length * cw + 120), H = rows * 92 + 230;
      const wrap = document.createElement('div'); wrap.style.cssText = 'position:fixed;inset:0;z-index:99998;overflow:auto;background:#2a3a2a';
      cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = 'display:block;width:' + W + 'px;height:' + H + 'px'; wrap.appendChild(cv); document.body.appendChild(wrap);
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const C = Dev.contrast(); let t = 0;
      const draw = function () {
        t += 1 / 30; g.clearRect(0, 0, W, H); g.fillStyle = '#4a6a3a'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#fff'; g.font = '700 14px sans-serif'; g.fillText('?debug=orbs — warna × jenis angka (besar = ukuran rantai ×1,3; kecil = preview). Kontras terburuk (WCAG, target ≥ 4,5): ' + C.min.toFixed(1), 12, 22);
        for (let ci = 0; ci < rows; ci++) {
          for (let k = 0; k < SAMPLES.length; k++) {
            const x = 70 + k * cw, y = 70 + ci * 92;
            GA.Chain.drawBall(g, x, y, 34, ci, SAMPLES[k], dpr, 1, t * 0.6 + k, t, 0);
            GA.Chain.drawBall(g, x + 36, y + 30, 17, ci, SAMPLES[k], dpr, 1, t * 0.6, t, 0);
          }
          g.fillStyle = '#fff'; g.font = '700 12px sans-serif'; g.fillText('warna ' + (ci + 1) + '  ' + C.orb[ci].toFixed(1) + ':1', 70 + SAMPLES.length * cw, 74 + ci * 92);
        }
        const fy = rows * 92 + 110;
        for (let m = 1; m <= 3; m++) { GA.Fire.drawBall(g, 70 + (m - 1) * 120, fy, 34, { mult: m, ci: -1 }, dpr, t, null); GA.Fire.drawBall(g, 70 + (m - 1) * 120 + 56, fy + 14, 30, { mult: m, ci: -1 }, dpr, t, null); }
        g.fillStyle = '#fff'; g.fillText('bola api ×1 ×2 ×3: siap tembak (34) dan preview (30 = 0,9 ×)  —  kontras api terburuk ' + Math.min.apply(null, C.fire).toFixed(1) + ':1', 12, fy + 62);
        if (document.getElementById('debug-orbs') || wrap.parentNode) requestAnimationFrame(draw);
      };
      draw();
    }
  };
  GA.Dev = Dev;
  if (/[?&]debug=orbs/.test(location.search)) setTimeout(Dev.show, 400);
})(window.GA = window.GA || {});
