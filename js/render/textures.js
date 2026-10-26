/* textures.js — pembangkit tekstur prosedural yang dipakai ulang oleh peta, bola, naga, dan UI.
 * Semua hasil berupa kanvas kecil yang dapat diulang (tileable), di-cache, lalu dipakai sebagai CanvasPattern atau overlay.
 *   fbm(seed)            noise berlapis (awan, lumut, kabut sihir)
 *   voronoi(seed)        sel batu + retakan (gelap di tepi sel)
 *   scales(pal)          sisik naga bertumpuk (terang kiri-atas, gelap di tepi)
 *   wood(w,h,seed,pal)   serat kayu tua                metal(w,h,pal)   logam gosok bertrim */
(function (GA) {
  'use strict';
  const N = GA.Noise, TAU = Math.PI * 2;
  const cache = Object.create(null);

  function memo(key, fn) { return cache[key] || (cache[key] = fn()); }

  function fbm(seed, size, oct) { return memo('fbm' + seed + ':' + size + ':' + oct, function () { return N.tile(size || 256, seed, oct || 4, 6); }); }

  /** Voronoi tileable: nilai tinggi di tengah sel, rendah di tepi (retakan). Sel diberi nada acak ringan seperti blok batu. */
  function voronoi(seed, size, n) {
    size = size || 128; n = n || 8;
    return memo('vor' + seed + ':' + size + ':' + n, function () {
      const r = N.rng(seed), pts = [], tone = [];
      for (let i = 0; i < n * n; i++) { pts.push([(i % n + 0.15 + r() * 0.7) / n, (Math.floor(i / n) + 0.15 + r() * 0.7) / n]); tone.push(r()); }
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size, cx = Math.floor(u * n), cy = Math.floor(v * n);
        let d1 = 9, d2 = 9, id = 0;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const gx = (cx + ox + n) % n, gy = (cy + oy + n) % n, p = pts[gy * n + gx];
          const px = p[0] + (cx + ox < 0 ? -1 : (cx + ox >= n ? 1 : 0)), py = p[1] + (cy + oy < 0 ? -1 : (cy + oy >= n ? 1 : 0));
          const dd = Math.hypot(px - u, py - v);
          if (dd < d1) { d2 = d1; d1 = dd; id = gy * n + gx; } else if (dd < d2) d2 = dd;
        }
        const edge = Math.min(1, (d2 - d1) * n * 3.2), val = edge * (0.72 + 0.28 * tone[id]) * 255, k = (y * size + x) * 4;
        d[k] = d[k + 1] = d[k + 2] = val; d[k + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      return c;
    });
  }

  /** Sisik bertumpuk. pal = [terang, dasar, gelap]. size px kotak. */
  function scales(pal, size) {
    size = size || 64;
    return memo('scl' + pal.join('') + size, function () {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const g = c.getContext('2d'), s = size / 4;
      g.fillStyle = pal[1]; g.fillRect(0, 0, size, size);
      for (let row = -1; row <= 8; row++) for (let col = -1; col <= 4; col++) {
        const cx = (col + (row % 2 ? 0.5 : 0)) * s + s / 2, cy = row * s * 0.5 + s * 0.4;
        for (let wy = -1; wy <= 1; wy++) for (let wx = -1; wx <= 1; wx++) {
          const x = cx + wx * size, y = cy + wy * size; if (x < -s || x > size + s || y < -s || y > size + s) continue;
          const gr = g.createRadialGradient(x - s * 0.18, y - s * 0.25, s * 0.05, x, y, s * 0.68);
          gr.addColorStop(0, pal[0]); gr.addColorStop(0.55, pal[1]); gr.addColorStop(1, pal[2]);
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, s * 0.62, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.38)'; g.lineWidth = Math.max(0.8, s * 0.07); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = Math.max(0.6, s * 0.05); g.beginPath(); g.arc(x, y, s * 0.5, Math.PI * 1.05, Math.PI * 1.65); g.stroke();
        }
      }
      return c;
    });
  }

  function wood(w, h, seed, pal) {
    return memo('wood' + w + 'x' + h + seed + pal.join(''), function () {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = N.rng(seed);
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.lineCap = 'round';
      for (let i = 0; i < h / 2.2; i++) {
        const y = r() * h, amp = 1 + r() * 3, ph = r() * TAU, fr = 0.01 + r() * 0.02;
        g.strokeStyle = r() < 0.5 ? 'rgba(30,14,4,' + (0.08 + r() * 0.16).toFixed(2) + ')' : 'rgba(255,220,160,' + (0.04 + r() * 0.08).toFixed(2) + ')'; g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath(); for (let x = 0; x <= w; x += 6) { const yy = y + Math.sin(x * fr + ph) * amp; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke();
      }
      for (let i = 0; i < 2; i++) { const kx = r() * w, ky = r() * h; for (let k = 1; k < 5; k++) { g.strokeStyle = 'rgba(30,14,4,0.16)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(kx, ky, k * 5, k * 2.6, 0, 0, TAU); g.stroke(); } }
      return c;
    });
  }

  function metal(w, h, pal) {
    return memo('metal' + w + 'x' + h + pal.join(''), function () {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), r = N.rng(5);
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, pal[0]); gr.addColorStop(0.45, pal[1]); gr.addColorStop(0.55, pal[0]); gr.addColorStop(1, pal[2]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < h * 1.5; i++) { g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'; g.lineWidth = 0.7; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 2); g.stroke(); }
      return c;
    });
  }

  GA.Textures = { fbm: fbm, voronoi: voronoi, scales: scales, wood: wood, metal: metal };
})(window.GA = window.GA || {});
