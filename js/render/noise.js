/* noise.js — RNG berbenih dan tekstur noise yang bisa diulang (tileable), untuk lukisan peta prosedural.
 * Tekstur dipakai sebagai pola (pattern) dengan mode campur 'soft-light' / 'multiply' agar permukaan tampak bertekstur. */
(function (GA) {
  'use strict';

  function rng(seed) {
    seed = seed | 0;
    return function () {
      seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }

  const smooth = function (t) { return t * t * (3 - 2 * t); };

  /** Kanvas noise nilai abu-abu `size`×`size` yang dapat diulang. octaves: jumlah lapisan, base: kisi awal (mis. 6). */
  function tile(size, seed, octaves, base) {
    const r = rng(seed), c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size), d = img.data, val = new Float32Array(size * size);
    let amp = 1, tot = 0;
    for (let o = 0; o < octaves; o++) {
      const n = (base || 6) << o, grid = new Float32Array(n * n);
      for (let i = 0; i < grid.length; i++) grid[i] = r();
      for (let y = 0; y < size; y++) {
        const fy = y / size * n, y0 = Math.floor(fy), ty = smooth(fy - y0), ya = y0 % n, yb = (y0 + 1) % n;
        for (let x = 0; x < size; x++) {
          const fx = x / size * n, x0 = Math.floor(fx), tx = smooth(fx - x0), xa = x0 % n, xb = (x0 + 1) % n;
          const a = grid[ya * n + xa], b = grid[ya * n + xb], cc = grid[yb * n + xa], dd = grid[yb * n + xb];
          val[y * size + x] += ((a + (b - a) * tx) * (1 - ty) + (cc + (dd - cc) * tx) * ty) * amp;
        }
      }
      tot += amp; amp *= 0.5;
    }
    for (let i = 0; i < val.length; i++) { const v = Math.max(0, Math.min(255, Math.round(val[i] / tot * 255 * 1.0))); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    return c;
  }

  /** Isi seluruh kanvas (ruang piksel) dengan pola noise: mode campur, alpha, dan skala pola. */
  function overlay(g, w, h, tex, mode, alpha, scale) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const p = g.createPattern(tex, 'repeat');
    try { if (p.setTransform) p.setTransform(new DOMMatrix().scale(scale || 1)); } catch (e) { /* abaikan */ }
    g.globalCompositeOperation = mode || 'soft-light'; g.globalAlpha = alpha == null ? 0.5 : alpha;
    g.fillStyle = p; g.fillRect(0, 0, w, h);
    g.restore();
  }

  GA.Noise = { rng: rng, tile: tile, overlay: overlay };
})(window.GA = window.GA || {});
