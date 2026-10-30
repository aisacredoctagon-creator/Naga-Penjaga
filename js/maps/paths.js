/* maps/paths.js — pustaka ARKETIPE jalur bola berbasis data + validator + mode debug.
 *
 * Tiap arketipe punya definisi LANDSCAPE dan PORTRAIT sendiri (titik kontrol ternormalisasi u,v pada area main yang sudah diberi
 * margin; spline Catmull-Rom di path.js mengubahnya menjadi jalur dengan tabel panjang busur). Penembak/boss/zona kecepatan ikut di sini.
 *   resolve(id, portrait) → { pts, shooter, boss, zones }      refine(path, ...) → jalur tervalidasi
 * Validator (dijalankan tiap jalur dibangun): jarak antar-segmen ≥ 2,5R + 8, radius tikungan ≥ 1,15R, jalur tetap di layar, ruang
 * penembak/boss bebas, dan deteksi persilangan (jembatan: bola di jalur atas digambar di atas jembatan, jalur bawah lewat di bawahnya).
 * Tikungan terlalu tajam dilunakkan otomatis (smoothing). ?debug=1 menampilkan jalur, titik kontrol, pelanggaran, dan laporan. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;
  /** Jangkauan sayap naga (× radius badan): jalur tidak boleh lebih dekat ke pusat daripada wingNeed = 1,6·dr + R + 2 (tepi bola di luar ujung sayap). */
  const WING_REACH = 1.6;
  const wingNeed = function (R) { return GA.Theme.dragon.radiusRatio * R * WING_REACH + R + 2; };

  /** Jarak mulut naga dari pusat (tempat peluru lahir): radiusRatio × mouthDist × R. */
  const muzzleL = function (R) { return GA.Theme.dragon.radiusRatio * GA.Theme.dragon.mouthDist * R; };

  /** INV-1 (tidak ada bola yang tertutup). Rantai penuh dan rapat: bola di arc s dan s ± k·D (D = 2R+1). Dari pivot naga C, untuk SETIAP posisi s (langkah 0,25R)
   *  ditembakkan tiga sinar: ke pusat bola dan ke titik tepi ±0,7R ke samping. Sinar harus pertama kali mengenai bola itu sendiri.
   *  Dua model sentuh: 'fat' = peluru nyata (peluru bergaris tengah = bola: sentuh pada jarak 0,92R + bulletR dari pusat bola; INI yang dialami pemain dan yang menjadi syarat lulus)
   *  dan 'thin' = sinar tipis (cakram bola R) sebagai pembanding. Mengembalikan { tot, fat, thin, badPts }. */
  function inv1(path, R, bulletR, L0) {
    const xs = path.xs, ys = path.ys, st = path.step, cx = path.shooter.x, cy = path.shooter.y, D = 2 * R + 1, n = xs.length, stepS = Math.max(st, 0.25 * R), rf = 0.92 * R + bulletR;
    const at = function (s) { const f = s / st, i = Math.floor(f), t = f - i; if (i < 0 || i >= n - 1) return null; return [xs[i] + (xs[i + 1] - xs[i]) * t, ys[i] + (ys[i + 1] - ys[i]) * t]; };
    // peluru berangkat dari MULUT naga (L0 dari pusat, di garis bidik), bukan dari pusat: bola yang sudah bersentuhan saat peluru lahir kena di s = L0 (Chain.hit memilih pusat bola TERDEKAT)
    const L = L0 || 0, first = function (ux, uy, balls, rad) {
      let best = 1e12, bi = -1, bd = 1e12; const mx = cx + ux * L, my = cy + uy * L;
      for (let i = 0; i < balls.length; i++) {
        const qx = balls[i][0] - cx, qy = balls[i][1] - cy, t = qx * ux + qy * uy, h2 = qx * qx + qy * qy - t * t; if (h2 >= rad * rad) continue;
        const sq = Math.sqrt(rad * rad - h2); if (t + sq <= L) continue;
        const th = Math.max(t - sq, L), dm = (balls[i][0] - mx) * (balls[i][0] - mx) + (balls[i][1] - my) * (balls[i][1] - my);
        if (th < best - 1e-6 || (Math.abs(th - best) <= 1e-6 && dm < bd)) { best = th; bi = i; bd = dm; }
      }
      return bi;
    };
    let tot = 0, fat = 0, thin = 0, ki = 0; const badPts = [], rays = [];
    for (let s = 0; s <= path.length; s += stepS) {
      const p = at(s); if (!p) continue; const balls = [p];
      for (let k = 1; k <= 14; k++) { const a = at(s + k * D), b = at(s - k * D); if (a) balls.push(a); if (b) balls.push(b); }
      const dx = p[0] - cx, dy = p[1] - cy, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl; let bad = false;
      for (const off of [0, 0.7, -0.7]) {
        const tx = dx + nx * off * R, ty = dy + ny * off * R, tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl; tot++;
        const hit = first(ux, uy, balls, rf); if (hit !== 0) { fat++; bad = true; }
        if (off === 0 && (ki++ % 6 === 0 || hit !== 0) && rays.length < 160) rays.push([cx, cy, p[0], p[1], hit === 0]);
        if (first(ux, uy, balls, R) !== 0) thin++;
      }
      if (bad && badPts.length < 60) badPts.push([p[0], p[1]]);
    }
    return { tot: tot, fat: fat, thin: thin, badPts: badPts, rays: rays };
  }

  /** INV-3: jarak minimum antar-segmen jalur (pasangan titik berjarak busur ≥ 6R); alur jalur tidak boleh saling menempel (≥ 2,5R + lebar alur). */
  function minSegGap(path, R, arcR) {
    const xs = path.xs, ys = path.ys, st = path.step, n = xs.length, S = 4, need = 2.5 * R + 8; let m = 1e9;
    for (let a = 0; a < n; a += S) for (let b = a + S; b < n; b += S) {
      if ((b - a) * st < (arcR || 6) * R) continue;
      const dx = xs[a] - xs[b], dy = ys[a] - ys[b], d = dx * dx + dy * dy;
      if (d < m) m = d;
    }
    return Math.sqrt(m);
  }



  /** Panjang kolam serpentin lama (commit ddd3183, sebelum revisi 6) per stage dan layout, diameter bola (2R). INV-4: panjang baru >= 95% dari MINIMUM kolam lama (keputusan pengguna);
   *  rata-rata dilaporkan sebagai pembanding. */
  const OLD_MIN = { portrait: [30.8, 26.1, 25.4], landscape: [27.1, 26.8, 20.8] };
  const OLD_LEN = { portrait: [38.35, 35.28, 25.47], landscape: [37.05, 34.54, 21.27] };
  const LAP_PITCH_FACTOR = 3, LAP_PITCH_MIN = 2.6, INV4_PCT = 0.95;

  /** Jarak terdekat dua bola yang BUKAN tetangga rantai (titik berjarak busur >= 4R): antar-lap, portal vs ujung; dipakai penyetel dan validator INV-5 (ukuran sama persis). */
  function lockDist(path, R) {
    const xs = path.xs, ys = path.ys, st = path.step, ns = xs.length, stepI = Math.max(1, Math.round(0.25 * R / st)), arcMin = Math.round(4 * R / st); let m = 1e18, at = null;
    for (let i = 0; i < ns; i += stepI) for (let j = i + arcMin; j < ns; j += 2) { const dx = xs[i] - xs[j], dy = ys[i] - ys[j], dd = dx * dx + dy * dy; if (dd < m) { m = dd; at = [xs[i], ys[i]]; } }
    return { min: Math.sqrt(m), at: at };
  }
  /** Radius lengkung minimum (tiga titik berjarak 6 sampel). */
  function minCurveR(path) {
    const xs = path.xs, ys = path.ys, n = xs.length, k6 = 6; let m = 1e9;
    for (let i = k6; i < n - k6; i += 3) {
      const ax = xs[i - k6], ay = ys[i - k6], bx = xs[i], by = ys[i], cx = xs[i + k6], cy = ys[i + k6];
      const ab = Math.hypot(bx - ax, by - ay), bc = Math.hypot(cx - bx, cy - by), ca = Math.hypot(ax - cx, ay - cy), cr = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
      if (cr < 1e-6) continue; const rad = ab * bc * ca / (2 * cr); if (rad < m) m = rad;
    }
    return m;
  }


  /* ===== Revisi 10: RUTE GRID — portal (awal) dan sarang (akhir) di sisi yang saling berseberangan =====
   * Jalur = rangkaian simpul pada grid persegi panjang berpusat di naga (jarak baris sx, sy >= 2,6R (INV-5); tikungan 90° berjari-jari min(sx, sy)/2 >= 1,3R, jadi U-turn = setengah lingkaran).
   * Simpul pertama = portal, simpul terakhir = sarang. Rute (data TPL) dicari offline oleh js/dev/routesearch.js (?debug=route) lalu divalidasi; tiap rute dipakai dalam bentuk asli dan cermin
   * (sumbu x dan/atau y), sehingga satu rute menghasilkan sampai 4 varian. Jarak baris diperlebar sampai memenuhi area bermain (maks. SPACING_CAP·R) supaya panjang jalur maksimal.
   * Aturan yang divalidasi tiap jalur dibangun (analyzeStar): INV-6 (portal-sarang berjauhan), INV-7 (jalur tidak melewati dekat portal/sarang selain di bagian awal/akhir), INV-8 (zona bersih). */
  const SPR_PORTAL = 2.45, SPR_NEST = 2.3;      // radius sprite portal (js/render/effects.js: R·2,45) dan sarang (js/render/eggs.js: cincin batu ≈ R·2,3), × R
  const ARC_FREE = 16, CLEAR7 = 3, CLEAR8 = 2;  // ARC_FREE = 8 diameter (16R) bagian awal/akhir jalur yang boleh dekat portal/sarang; INV-7: jarak >= sprite + 3R; INV-8: zona bersih = sprite + 2R
  const DESIGN_R = 32, MIN_PITCH = 2.6, SPACING_CAP = 3.3, DIST_FRAC = 0.55, ANG_MIN = 150;      // INV-6: jarak >= 0,55 × sisi terpanjang area bermain, selisih sudut terhadap pivot naga >= 150°
  /** Panjang jalur revisi 8 (spiral) per stage dan layout, diameter bola. INV-4: baru >= 95% dari yang lebih panjang antara ini dan serpentin lama terpendek (OLD_MIN). */
  const REV8_LEN = { portrait: [29.4, 25.3, 24.6], landscape: [29.3, 29.4, 25.1] };
  function lenMinD(portrait, stage) { const k = portrait ? 'portrait' : 'landscape'; return INV4_PCT * Math.max(OLD_MIN[k][stage], REV8_LEN[k][stage]); }

  /** Rute: ox, oy = geseran grid (0 / 0,5 kali jarak baris), nodes = "i,j i,j ..." (i = kolom, j = baris relatif terhadap naga; x = pivot + (i + ox)·sx, y = pivot + (j + oy)·sy). Dibuat oleh js/dev/routesearch.js. */
  const TPL = {
    /* Stage 1 (ULAR): serpentin panjang di kantong sisi naga. u = lanskap/desktop, p = potret. */
    ul1: { ox: 0, oy: 0.5, nodes: '-4,-2 -3,-2 -2,-2 -2,-1 -2,0 -3,0 -4,0 -4,1 -3,1 -2,1 -1,1 0,1 1,1 2,1 2,0 2,-1 2,-2 3,-2 4,-2 4,-1 4,0 4,1' },
    ul2: { ox: 0, oy: 0.5, nodes: '2,-2 3,-2 4,-2 4,-1 4,0 4,1 3,1 2,1 1,1 0,1 -1,1 -2,1 -2,0 -2,-1 -1,-1 -1,-2 -2,-2 -3,-2 -4,-2 -4,-1 -4,0 -4,1' },
    up1: { ox: 0, oy: 0.5, nodes: '-2,-4 -1,-4 0,-4 0,-3 -1,-3 -2,-3 -2,-2 -2,-1 -2,0 -2,1 -1,1 0,1 0,2 -1,2 -2,2 -2,3 -1,3 0,3 1,3 1,2 1,1 2,1 2,2 2,3' },
    up2: { ox: 0, oy: 0.5, nodes: '-2,3 -1,3 0,3 0,2 -1,2 -2,2 -2,1 -2,0 -2,-1 -2,-2 -1,-2 0,-2 0,-3 -1,-3 -2,-3 -2,-4 -1,-4 0,-4 1,-4 1,-3 1,-2 2,-2 2,-3 2,-4' },
    /* Stage 2 (TELUK): kait panjang melewati atas/bawah naga. */
    tl1: { ox: 0, oy: 0.5, nodes: '-4,-2 -4,-1 -4,0 -4,1 -3,1 -2,1 -1,1 -1,0 -2,0 -2,-1 -2,-2 -1,-2 0,-2 1,-2 2,-2 3,-2 4,-2 4,-1 4,0 4,1 3,1 2,1' },
    tl2: { ox: 0, oy: 0.5, nodes: '-4,-2 -3,-2 -3,-1 -4,-1 -4,0 -4,1 -3,1 -2,1 -2,0 -2,-1 -2,-2 -1,-2 0,-2 1,-2 2,-2 3,-2 4,-2 4,-1 4,0 4,1 3,1 2,1' },
    tp1: { ox: 0, oy: 0.5, nodes: '-2,-4 -1,-4 0,-4 0,-3 -1,-3 -2,-3 -2,-2 -2,-1 -2,0 -2,1 -2,2 -2,3 -1,3 -1,2 -1,1 0,1 1,1 1,2 1,3 2,3 2,2' },
    tp2: { ox: 0, oy: 0.5, nodes: '-2,-3 -2,-4 -1,-4 0,-4 0,-3 0,-2 1,-2 1,-3 1,-4 2,-4 2,-3 2,-2 2,-1 2,0 2,1 1,1 0,1 0,2 0,3 1,3 2,3' },
    /* Stage 3 (BENTENG): jalur lebih ringkas, menyisakan ruang lapang untuk boss. */
    bl1: { ox: 0, oy: 0.5, nodes: '-4,-2 -3,-2 -2,-2 -1,-2 0,-2 1,-2 2,-2 3,-2 4,-2 4,-1 3,-1 2,-1 2,0 1,0 1,1 2,1 3,1 4,1' },
    bl2: { ox: 0, oy: 0.5, nodes: '-4,-2 -3,-2 -2,-2 -2,-1 -2,0 -3,0 -4,0 -4,1 -3,1 -2,1 -1,1 0,1 1,1 2,1 3,1 4,1 4,0 4,-1' },
    bp1: { ox: 0, oy: 0.5, nodes: '-2,-4 -1,-4 0,-4 0,-3 -1,-3 -2,-3 -2,-2 -2,-1 -2,0 -2,1 -2,2 -2,3 -1,3 0,3 1,3 1,2 1,1 2,1 2,2 2,3' },
    bp2: { ox: 0, oy: 0.5, nodes: '2,-4 1,-4 0,-4 -1,-4 -2,-4 -2,-3 -1,-3 0,-3 0,-2 -1,-2 -2,-2 -2,-1 -2,0 -2,1 -1,1 0,1 0,2 0,3 -1,3 -2,3' },
    /* Radius bola besar (kategori pecahan/desimal 1,12×, R ≈ 36): grid lebih longgar, rute lebih ringkas (cadangan bila rute di atas tidak muat atau melanggar INV-6/7). */
    xl1: { ox: 0, oy: 0.5, nodes: '-3,-1 -2,-1 -2,0 -3,0 -4,0 -4,1 -3,1 -2,1 -1,1 0,1 1,1 2,1 3,1 4,1 4,0 3,0 2,0 2,-1 3,-1' },
    xl2: { ox: 0, oy: 0.5, nodes: '-3,-1 -2,-1 -2,0 -3,0 -4,0 -4,1 -3,1 -2,1 -1,1 0,1 1,1 2,1 2,0 2,-1 3,-1 3,0 3,1 4,1 4,0' },
    xp1: { ox: 0.5, oy: 0, nodes: '-1,-3 -2,-3 -2,-2 -1,-2 0,-2 1,-2 1,-1 1,0 1,1 1,2 0,2 -1,2 -2,2 -2,3 -1,3' }
  };
  function parseNodes(s) { return s.trim().split(/\s+/).map(function (t) { const a = t.split(','); return [+a[0], +a[1]]; }); }
  /** Cermin rute terhadap pivot naga: x → −x dan/atau y → −y (dalam indeks grid, memperhitungkan geseran ox/oy). */
  function mirrorNodes(nodes, t, fx, fy) { return nodes.map(function (n) { return [fx ? -n[0] - 2 * t.ox : n[0], fy ? -n[1] - 2 * t.oy : n[1]]; }); }

  /** Sudut 90° berfilet (jari-jari r) pada poligon sudut-bersih P; titik rapat (<= 18 px) di bagian lurus dan lengkung. */
  function filletPath(P, r) {
    const out = [P[0].slice()], push = function (x, y) { const q = out[out.length - 1], L = Math.hypot(x - q[0], y - q[1]), n = Math.ceil(L / 18); for (let s = 1; s <= n; s++) out.push([q[0] + (x - q[0]) * s / n, q[1] + (y - q[1]) * s / n]); };
    for (let k = 1; k < P.length - 1; k++) {
      const a = P[k - 1], b = P[k], c = P[k + 1];
      let ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1]; const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy); ux /= lu; uy /= lu; vx /= lv; vy /= lv;
      if (Math.abs(ux * vy - uy * vx) < 1e-6) { push(b[0], b[1]); continue; }
      const rr = Math.min(r, lu / 2 + 0.01, lv / 2 + 0.01), p0 = [b[0] - ux * rr, b[1] - uy * rr], p1 = [b[0] + vx * rr, b[1] + vy * rr];
      push(p0[0], p0[1]);
      const cx = p0[0] + vx * rr, cy = p0[1] + vy * rr, a0 = Math.atan2(p0[1] - cy, p0[0] - cx), a1 = Math.atan2(p1[1] - cy, p1[0] - cx); let da = a1 - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const n = Math.max(6, Math.ceil(Math.abs(da) * rr / 3)); for (let s = 1; s <= n; s++) { const an = a0 + da * s / n; out.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); }
    }
    push(P[P.length - 1][0], P[P.length - 1][1]); return out;
  }

  /** Letak boss (Stage 3) di ruang terlapang: jauh dari jalur (>= 1,5·bossR + R + 2), dari zona bersih portal/sarang (sprite + 2R + bossR), dan dari sayap naga. */
  function bossSpot(pts, d, bossR, P0, N0) {
    const R = d.R, pl = d.pl, bn = 1.5 * bossR + R + 2, needP = (SPR_PORTAL + CLEAR8) * R + bossR, needN = (SPR_NEST + CLEAR8) * R + bossR, needV = wingNeed(R) - R - 2 + bossR + 6;
    const sm = []; for (let i = 0; i < pts.length; i += 4) sm.push(pts[i]);
    let best = null;
    for (let y = pl.y + bossR + 40; y <= pl.y + pl.h - bossR - 10; y += 10) for (let x = pl.x + bossR + 10; x <= pl.x + pl.w - bossR - 10; x += 10) {
      let m = 1e12; for (let i = 0; i < sm.length; i++) { const dx = sm[i][0] - x, dy = sm[i][1] - y, dd = dx * dx + dy * dy; if (dd < m) m = dd; }
      const sc = Math.min(Math.sqrt(m) / bn, Math.hypot(x - P0[0], y - P0[1]) / needP, Math.hypot(x - N0[0], y - N0[1]) / needN, Math.hypot(x - d.cx, y - d.cy) / needV);
      if (!best || sc > best.sc) best = { x: x, y: y, sc: sc };
    }
    return best;
  }

  /** Kelonggaran INV-6/INV-7 sebuah polyline rute (px; negatif = melanggar): min dari jarak portal-sarang, sudut, jarak jalur ke portal (setelah 16R pertama) dan ke sarang (sebelum 16R terakhir). Dipakai penyetel jarak baris. */
  function routeSlack(P, d, R) {
    const n = P.length, arc = new Array(n); arc[0] = 0; for (let i = 1; i < n; i++) arc[i] = arc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    const L = arc[n - 1], p0 = P[0], n0 = P[n - 1], free = ARC_FREE * R, pl = d.pl; let mP = 1e9, mN = 1e9;
    for (let i = 0; i < n; i += 2) {
      if (arc[i] > free) mP = Math.min(mP, Math.hypot(P[i][0] - p0[0], P[i][1] - p0[1]));
      if (L - arc[i] > free) mN = Math.min(mN, Math.hypot(P[i][0] - n0[0], P[i][1] - n0[1]));
    }
    let da = Math.abs(Math.atan2(p0[1] - d.cy, p0[0] - d.cx) - Math.atan2(n0[1] - d.cy, n0[0] - d.cx)); if (da > Math.PI) da = 2 * Math.PI - da;
    return Math.min(mP - (SPR_PORTAL + CLEAR7) * R, mN - (SPR_NEST + CLEAR7) * R, Math.hypot(p0[0] - n0[0], p0[1] - n0[1]) - DIST_FRAC * Math.max(pl.w, pl.h), (da * 180 / Math.PI - ANG_MIN) * 2);
  }

  /** Geometri satu rute (piksel logis) untuk layout d, atau null bila grid tidak muat (jarak baris < 2,6R). Jarak baris (sx, sy):
   *  (1) bentuk rancangan = jarak maksimum yang muat untuk R = 32 (radius rancangan), diskalakan R/32 (semua syarat sebanding R, jadi valid bila muat);
   *  (2) bila tidak muat: jarak maksimum yang muat (maks. SPACING_CAP·R), lalu diperkecil bertahap sampai INV-6/INV-7 terpenuhi (minimum 2,6R). */
  function routeGeom(d, t, flip, boss) {
    const R = d.R, pl = d.pl, cx = d.cx, cy = d.cy, pad = d.pad;
    let nodes = parseNodes(t.nodes); if (flip) nodes = mirrorNodes(nodes, t, flip.indexOf('x') >= 0, flip.indexOf('y') >= 0);
    const n = nodes.length;
    const fit = function (Rf, cap) {      // jarak maksimum yang muat untuk bola berjari-jari Rf: portal dan sarang penuh di area bermain; simpul lain >= pad dari tepi dan di bawah zona HUD
      const PR = SPR_PORTAL * Rf, NR = SPR_NEST * Rf, hudY = pl.y + d.gapR * Rf + 1; let sx = cap * Rf, sy = cap * Rf;
      nodes.forEach(function (nd, k) {
        const m = k === 0 ? PR : (k === n - 1 ? NR : pad), x0 = pl.x + m, x1 = pl.x + pl.w - m, y0 = Math.max(hudY, k === 0 || k === n - 1 ? pl.y + m : 0), y1 = pl.y + pl.h - m, a = nd[0] + t.ox, b = nd[1] + t.oy;
        if (a > 1e-9) sx = Math.min(sx, (x1 - cx) / a); else if (a < -1e-9) sx = Math.min(sx, (cx - x0) / -a);
        if (b > 1e-9) sy = Math.min(sy, (y1 - cy) / b); else if (b < -1e-9) sy = Math.min(sy, (cy - y0) / -b);
      });
      return [sx, sy];
    };
    const mp = MIN_PITCH * R, F = fit(R, SPACING_CAP);
    if (F[0] < mp - 0.3 || F[1] < mp - 0.3) return null;
    const build = function (ax, ay) { const C = nodes.map(function (nd) { return [cx + (nd[0] + t.ox) * ax, cy + (nd[1] + t.oy) * ay]; }), r = Math.min(ax, ay) / 2; return { C: C, r: r, P: filletPath(C, r), sx: ax, sy: ay }; };
    const D = fit(DESIGN_R, SPACING_CAP), k = R / DESIGN_R; let best = null, bs = -1e9;
    if (D[0] * k <= F[0] + 0.01 && D[1] * k <= F[1] + 0.01 && D[0] * k >= mp - 0.3 && D[1] * k >= mp - 0.3) { best = build(D[0] * k, D[1] * k); bs = routeSlack(best.P, d, R); }
    for (let i = 0; i <= 12 && bs < 0.5; i++) {      // perkecil jarak baris (u: 1 → 0) sampai INV-6/7 terpenuhi; ambil yang paling longgar bila tidak ada
      const u = 1 - i / 12, c = build(mp + (F[0] - mp) * u, mp + (F[1] - mp) * u), s = routeSlack(c.P, d, R);
      if (s > bs) { bs = s; best = c; }
    }
    const g = best; g.n = n; g.boss = null; g.slack = bs;
    if (boss) { const bossR = Math.round(boss * R), b = bossSpot(g.P, d, bossR, g.C[0], g.C[n - 1]); g.boss = b; g.bossR = bossR; }
    return g;
  }

  /** Arketipe rute: o = { stage, p, l, boss: { p: k, l: k } }; p / l = [templat, cermin] atau daftar alternatif [[templat, cermin], ...] (dicoba berurutan: yang pertama muat dan memenuhi INV-6/7, dan untuk boss
   *  punya ruang; alternatif untuk radius bola besar, mis. kategori pecahan/desimal 1,12×). cermin: '', 'x', 'y', 'xy'; k = radius boss × R. */
  function routeArch(id, o) {
    return function (portrait, d) {
      const cfg = portrait ? o.p : o.l, opts = Array.isArray(cfg[0]) ? cfg : [cfg], boss = o.boss ? (portrait ? o.boss.p : o.boss.l) : 0;
      let g = null, used = null;
      for (let k = 0; k < opts.length; k++) {
        const t = TPL[opts[k][0]], c = t ? routeGeom(d, t, opts[k][1], boss) : null; if (!c) continue;
        const good = c.slack >= 0.4 && (!boss || (c.boss && c.boss.sc >= 1));
        if (!g || good) { g = c; used = opts[k]; } if (good) break;
      }
      const P = g ? g.P : [[d.cx, d.cy + 100], [d.cx + 100, d.cy + 100]];
      const out = { pts: P.map(function (p) { return [(p[0] - d.ox) / d.iw, (p[1] - d.oy) / d.ih]; }), shooter: [(d.cx - d.ox) / d.iw, (d.cy - d.oy) / d.ih], star: true, spiral: true, route: true, stage: o.stage, failed: !g,
        fit: g ? { nodes: g.n, sx: +g.sx.toFixed(1), sy: +g.sy.toFixed(1), r: +g.r.toFixed(1), tpl: used[0] + (used[1] ? '/' + used[1] : '') } : { failed: true } };
      if (g) out.ctrl = g.C.map(function (p) { return [(p[0] - d.ox) / d.iw, (p[1] - d.oy) / d.ih]; });      // simpul grid (titik kontrol untuk ?debug=1)
      if (g && g.boss) { out.boss = [(g.boss.x - d.ox) / d.iw, (g.boss.y - d.oy) / d.ih]; out.bossR = g.bossR; out.bossScore = g.boss.sc; }
      return out;
    };
  }
  /** Arketipe (jalur spiral revisi 8 dihapus). Stage 1 ULAR (serpentin di kantong), Stage 2 TELUK (kait panjang), Stage 3 BENTENG (boss di ruang lapang). Tiap stage 3 varian (rute + cermin), dipilih acak per petualangan (levels.js). */
  const ARCH = {
    ular1: routeArch('ular1', { stage: 0, p: [['up1', ''], ['xp1', '']], l: [['ul1', ''], ['xl1', '']] }),
    ular2: routeArch('ular2', { stage: 0, p: [['up2', 'x'], ['xp1', 'x']], l: [['ul2', 'x'], ['xl2', 'x']] }),
    ular3: routeArch('ular3', { stage: 0, p: [['up1', 'xy'], ['xp1', 'xy']], l: [['ul1', 'xy'], ['xl2', 'xy']] }),
    teluk1: routeArch('teluk1', { stage: 1, p: [['tp1', ''], ['xp1', 'y']], l: [['tl1', ''], ['xl2', 'y']] }),
    teluk2: routeArch('teluk2', { stage: 1, p: [['tp2', 'x'], ['xp1', 'xy']], l: [['tl2', 'y'], ['xl2', 'y']] }),
    teluk3: routeArch('teluk3', { stage: 1, p: [['tp1', 'y'], ['xp1', 'x']], l: [['tl1', 'xy'], ['xl1', 'x']] }),
    benteng1: routeArch('benteng1', { stage: 2, p: [['bp1', ''], ['xp1', '']], l: [['bl1', ''], ['xl1', '']], boss: { p: 1.25, l: 1.5 } }),
    benteng2: routeArch('benteng2', { stage: 2, p: [['bp2', 'x'], ['xp1', 'x']], l: [['bl2', 'x'], ['xl2', 'x']], boss: { p: 1.25, l: 1.5 } }),
    benteng3: routeArch('benteng3', { stage: 2, p: [['bp1', 'xy'], ['xp1', 'xy']], l: [['bl1', 'y'], ['xl2', 'xy']], boss: { p: 1.25, l: 1.5 } })
  };

  const PLAY_IDS = ['ular1', 'ular2', 'ular3', 'teluk1', 'teluk2', 'teluk3', 'benteng1', 'benteng2', 'benteng3'];
  function has(id) { return !!ARCH[id]; }
  /** Margin atas jalur untuk bola stage berjari-jari R (bola kategori bisa 1,12× bola layout): pusat bola >= (hudGap + 1)R di bawah panel HUD. */
  function padTopFor(L, R) {
    const base = L && L.padTop != null ? L.padTop : (L && L.pad) || 40;
    return R && L && L.hudGap != null ? Math.max(base, Math.round((L.hudGap + 1) * R * (L.portrait ? 1.12 : 1.05))) : base;
  }
  function resolve(id, portrait, L, R) {
    const pl = L && L.play, pad = L && L.pad != null ? L.pad : 40, padTop = padTopFor(L, R), iw = pl ? pl.w - 2 * pad : 440, ih = pl ? pl.h - padTop - pad : 356 - (padTop - pad);
    const vc = pl ? (pl.h / 2 - padTop) / ih : 0.5;      // pusat arena (tengah area bermain) dalam koordinat ternormalisasi area jalur
    return ARCH[id] ? ARCH[id](!!portrait, { iw: iw, ih: ih, vc: vc, asp: ih / iw, R: R || 29, pad: pad, gapR: ((L && L.hudGap != null) ? L.hudGap : 1.5) + 1, portrait: !!portrait, pl: pl || { x: 0, y: 0, w: 540, h: 400 }, padTop: padTop, ox: (pl ? pl.x : 0) + pad, oy: (pl ? pl.y : 0) + padTop, cx: pl ? pl.x + pl.w / 2 : 270, cy: pl ? pl.y + pl.h / 2 : 200 }) : null;
  }

  /* ---------- validator ---------- */
  function analyze(path, R, L, def) {
    const xs = path.xs, ys = path.ys, st = path.step, n = xs.length, S = 4, pl = L.play;
    const need = def && def.spiral ? LAP_PITCH_MIN * R - 0.5 : 2.5 * R + 8, issues = [], viol = [], idx = [];
    for (let i = 0; i < n; i += S) idx.push(i);
    // persilangan: sampel berjauhan di sepanjang jalur tetapi hampir berimpit
    const cross = [];
    for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
      const arc = (idx[b] - idx[a]) * st; if (arc < 6 * R) continue;
      const dx = xs[idx[a]] - xs[idx[b]], dy = ys[idx[a]] - ys[idx[b]];
      if (dx * dx + dy * dy < R * R * 0.64) {
        const x = (xs[idx[a]] + xs[idx[b]]) / 2, y = (ys[idx[a]] + ys[idx[b]]) / 2;
        let c = null; for (let k = 0; k < cross.length; k++) if (Math.hypot(cross[k].x - x, cross[k].y - y) < 2.5 * R) { c = cross[k]; break; }
        if (!c) cross.push({ x: x, y: y, d1: idx[a] * st, d2: idx[b] * st }); else { c.d1 = Math.min(c.d1, idx[a] * st); c.d2 = Math.max(c.d2, idx[b] * st); }
      }
    }
    const nearCross = function (i) { for (let k = 0; k < cross.length; k++) if (Math.hypot(cross[k].x - xs[i], cross[k].y - ys[i]) < 3.6 * R) return true; return false; };
    // jarak minimum antar-segmen
    let minGap = 1e9;
    for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
      const arc = (idx[b] - idx[a]) * st; if (arc < 6 * R) continue;
      const dx = xs[idx[a]] - xs[idx[b]], dy = ys[idx[a]] - ys[idx[b]], d = Math.sqrt(dx * dx + dy * dy);
      if (d >= need * 1.6 || nearCross(idx[a]) || nearCross(idx[b])) continue;
      if (d < minGap) minGap = d;
      if (d < need && viol.length < 30) viol.push([xs[idx[a]], ys[idx[a]]]);
    }
    if (minGap < need) issues.push({ kind: 'gap', msg: 'jarak antar-segmen ' + Math.round(minGap) + ' < ' + Math.round(need) });
    // radius tikungan
    let minR = 1e9, sharp = [];
    const k6 = 6;
    for (let i = k6; i < n - k6; i += 3) {
      const ax = xs[i - k6], ay = ys[i - k6], bx = xs[i], by = ys[i], cx = xs[i + k6], cy = ys[i + k6];
      const ab = Math.hypot(bx - ax, by - ay), bc = Math.hypot(cx - bx, cy - by), ca = Math.hypot(ax - cx, ay - cy), cr = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
      if (cr < 1e-6) continue;
      const rad = ab * bc * ca / (2 * cr); if (rad < minR) minR = rad;
      if (rad < 1.15 * R && sharp.length < 20) sharp.push([bx, by]);
    }
    if (minR < 1.15 * R) issues.push({ kind: 'radius', msg: 'tikungan tajam r=' + Math.round(minR) + ' < ' + Math.round(1.15 * R) });
    // batas layar (setelah titik masuk pertama)
    let first = -1; for (let i = 0; i < n; i++) if (xs[i] >= pl.x && xs[i] <= pl.x + pl.w && ys[i] >= pl.y && ys[i] <= pl.y + pl.h) { first = i; break; }
    let out = 0; for (let i = Math.max(0, first); i < n; i++) if (xs[i] < pl.x - R * 0.6 || xs[i] > pl.x + pl.w + R * 0.6 || ys[i] < pl.y - R * 0.6 || ys[i] > pl.y + pl.h + R * 0.6) out++;
    if (first < 0 || out > 0) issues.push({ kind: 'bounds', msg: first < 0 ? 'jalur tidak masuk layar' : out + ' titik keluar layar' });
    // ruang penembak dan boss
    const near = function (px, py) { let m = 1e12; for (let i = 0; i < n; i += 3) { const dx = xs[i] - px, dy = ys[i] - py, d = dx * dx + dy * dy; if (d < m) m = d; } return Math.sqrt(m); };
    const dr = GA.Theme.dragon.radiusRatio * R, star = !!(def && def.star), shNeed = star ? wingNeed(R) - 2 : dr * 1.5 + R + 12, shClear = near(path.shooter.x, path.shooter.y);
    if (shClear < shNeed) issues.push({ kind: 'shooter', msg: (star ? 'jalur terlalu dekat sayap naga ' : 'ruang penembak ') + Math.round(shClear) + ' < ' + Math.round(shNeed) });
    let bossClear = null;
    if (path.boss) { bossClear = near(path.boss.x, path.boss.y); const bn = path.boss.R ? 1.5 * path.boss.R + R + 2 : 2.45 * R + R + 8; if (bossClear < bn) issues.push({ kind: 'boss', msg: 'ruang boss ' + Math.round(bossClear) + ' < ' + Math.round(bn) }); }
    const star2 = star ? analyzeStar(path, R, L, def) : null;
    if (star2) star2.issues.forEach(function (i) { issues.push(i); });
    if (cross.length && !(def && def.bridge)) issues.push({ kind: 'cross', msg: cross.length + ' persilangan tanpa jembatan' });
    return { ok: !issues.length, star: star2, issues: issues, minGap: minGap > 1e8 ? null : minGap, need: need, minRadius: minR > 1e8 ? null : minR, shooterClear: shClear, bossClear: bossClear, crossings: cross, violations: viol, sharp: sharp, length: path.length };
  }


  /** Validator jalur bintang (naga di pusat): (1) sudut mengelilingi pusat hanya bertambah, ≤ 360°; (2) tangen ≥ 55° dari arah radial (peluru sebesar bola: 0,92R + R);
   *  (3) ray test dari naga ke setiap posisi bola di sepanjang jalur: tidak ada bola lain yang tersentuh peluru lebih dulu (peluru berhenti di bola pertama);
   *  (4) jalur ≥ 2,5R di bawah HUD (margin bola 1,5R), sayap naga tidak menutupi (≥ wingNeed dari pusat). */
  function analyzeStar(path, R, L, def) {
    const spiral = !!(def && def.spiral);
    const xs = path.xs, ys = path.ys, n = xs.length, cx = path.shooter.x, cy = path.shooter.y, issues = [], pl = L.play, wn = wingNeed(R);
    // INV-2: pivot naga = tengah area bermain (di bawah HUD/zona informasi)
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
    if (Math.hypot(cx - pcx, cy - pcy) > 1.5) issues.push({ kind: 'center', msg: 'naga bukan di tengah area bermain (' + Math.round(cx - pcx) + ',' + Math.round(cy - pcy) + ')' });
    // sudut kumulatif ≤ 330° dan arah tunggal; celah sudut ≥ 30° antara ujung (platform) dan awal (portal)
    let ang = 0, prev = Math.atan2(ys[0] - cy, xs[0] - cx), hi = 0, acc = 0, maxBack = 0; const a0 = prev;
    for (let i = 1; i < n; i++) { const a = Math.atan2(ys[i] - cy, xs[i] - cx); let da = a - prev; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; ang += da; prev = a; }
    const sgn = ang >= 0 ? 1 : -1; prev = a0;
    for (let i = 1; i < n; i++) { const a = Math.atan2(ys[i] - cy, xs[i] - cx); let da = a - prev; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; prev = a; acc += da * sgn; if (acc > hi) hi = acc; if (hi - acc > maxBack) maxBack = hi - acc; }
    const sweepDeg = Math.abs(ang) * 180 / Math.PI;
    if (!spiral && sweepDeg > 330.5) issues.push({ kind: 'angle', msg: 'rentang sudut ' + sweepDeg.toFixed(0) + '° (> 330°; celah portal < 30°)' });
    if (!spiral && maxBack > 0.03) issues.push({ kind: 'angle', msg: 'sudut berbalik ' + (maxBack * 180 / Math.PI).toFixed(1) + '°' });
    // INV-2: ujung jalur di tepi platform/sarang tengah; jalur tidak lebih dekat ke pusat daripada jangkauan sayap; portal penuh di area bermain
    let first = -1; for (let i = 0; i < n; i++) if (xs[i] >= pl.x + 2 && xs[i] <= pl.x + pl.w - 2 && ys[i] >= pl.y + 2 && ys[i] <= pl.y + pl.h - 2) { first = i; break; }
    let minR = 1e9, minY = 1e9;
    for (let i = Math.max(0, first); i < n; i += 2) { const rl = Math.hypot(xs[i] - cx, ys[i] - cy); if (rl < minR) minR = rl; if (ys[i] < minY) minY = ys[i]; }
    const endD = Math.hypot(xs[n - 1] - cx, ys[n - 1] - cy);
    if (minR < wn - 2) issues.push({ kind: 'wing', msg: 'jalur ' + Math.round(minR) + ' dari naga < ' + Math.round(wn) + ' (sayap menutupi bola)' });
    if (endD < wn - 2) issues.push({ kind: 'end', msg: 'ujung jalur ' + Math.round(endD) + ' dari pusat (di dalam platform naga)' });
    const gapR = (L.hudGap == null ? 1.5 : L.hudGap) + 1;
    if (minY < pl.y + gapR * R - 2) issues.push({ kind: 'hud', msg: 'jalur ' + ((minY - pl.y) / R).toFixed(2) + 'R di bawah HUD (< ' + gapR.toFixed(1) + 'R)' });
    const PR = (def && def.route ? SPR_PORTAL : 2.2) * R, sx = xs[Math.max(0, first)], sy = ys[Math.max(0, first)];
    if (sx < pl.x + PR - 1 || sx > pl.x + pl.w - PR + 1 || sy < pl.y + PR - 1 || sy > pl.y + pl.h - PR + 1) issues.push({ kind: 'portal', msg: 'portal tidak penuh di area bermain' });
    // INV-1 dengan peluru nyata (syarat lulus) + sinar tipis (pembanding)
    const v = spiral ? { tot: 0, fat: 0, thin: 0, badPts: [], rays: [] } : inv1(path, R, R, muzzleL(R));
    // Opsi A: INV-4 (panjang >= 95% serpentin lama) dan INV-5 (target-lock): titik berjarak busur >= 1,9R tidak boleh lebih dekat dari 1,9R (radius kunci terjamin 0,95R; tetangga rantai 1,96R)
    let sp = null;
    if (spiral) {
      const Dch = 2 * R * 0.98, ld = lockDist(path, R); let lockMin = ld.min; const lockAt = ld.at;      // jarak terdekat dua bola yang BUKAN tetangga rantai (busur >= 4R): antar-lap, portal vs ujung; tetangga rantai selalu 1,96R (solver jarak)
      const kl = L.portrait ? 'portrait' : 'landscape', stg = (def && def.stage) || 0;
      const lenD = path.length / (2 * R), old = OLD_MIN[kl][stg], oldMean = OLD_LEN[kl][stg], rev8 = REV8_LEN[kl][stg], need95 = INV4_PCT * Math.max(old, rev8);
      sp = { lenD: lenD, old: old, oldMean: oldMean, rev8: rev8, need: need95, pct: 100 * lenD / old, pctMean: 100 * lenD / oldMean, pctRev8: 100 * lenD / rev8, ratioChain: path.length / (20 * 2 * R * 0.98), lockMin: Math.min(lockMin, Dch), lockR: Math.min(lockMin, Dch) / (2 * R) };
      if (lockMin < LAP_PITCH_MIN * R - 0.5) { issues.push({ kind: 'lock', msg: 'INV-5: dua bola non-tetangga terlalu dekat untuk target-lock (' + (lockMin / R).toFixed(2) + 'R < ' + LAP_PITCH_MIN + 'R)' }); v.badPts.push(lockAt); }
      if (lenD < need95 && Math.abs(R - 32) <= 1.5) issues.push({ kind: 'length', msg: 'INV-4: panjang ' + lenD.toFixed(1) + ' d < ' + need95.toFixed(1) + ' d (95% dari ' + Math.max(old, rev8).toFixed(1) + ' d: serpentin lama terpendek ' + old.toFixed(1) + ', revisi 8 ' + rev8.toFixed(1) + ') = ' + (100 * lenD / Math.max(old, rev8)).toFixed(0) + '%' });
    }
    const rt = def && def.route ? routeChecks(path, R, L, def, v) : null;
    if (rt) rt.issues.forEach(function (i) { issues.push(i); });
    if (!spiral && v.fat > 0) issues.push({ kind: 'inv1', msg: 'INV-1: ' + v.fat + '/' + v.tot + ' sinar mengenai bola lain lebih dulu (peluru nyata)' });
    return { issues: issues, inv1: v, rayBad: v.badPts, minCenter: minR, endDist: endD, sweepDeg: sweepDeg, spiral: sp, route: rt && rt.info };
  }

  /** INV-6/7/8 untuk jalur rute (portal = titik awal jalur, sarang = titik akhir).
   *  INV-6: jarak pusat portal-sarang >= 0,55 × sisi terpanjang area bermain DAN selisih sudut keduanya terhadap pivot naga >= 150°.
   *  INV-7: titik jalur yang berjarak busur > 8 diameter (16R) dari ujung awal harus >= sprite portal + 3R dari pusat portal; titik yang berjarak busur > 8 diameter dari ujung akhir harus >= sprite sarang + 3R dari pusat sarang.
   *  INV-8: dalam radius sprite + 2R dari portal/sarang tidak ada naga + sayap (dan boss); dekorasi/rintangan/label diperiksa di background.js, hazards.js, path.js (tes). */
  function routeChecks(path, R, L, def, v) {
    const xs = path.xs, ys = path.ys, n = xs.length, st = path.step, pl = L.play, cx = path.shooter.x, cy = path.shooter.y, issues = [];
    const P = { x: xs[0], y: ys[0] }, N = { x: xs[n - 1], y: ys[n - 1] }, rP = SPR_PORTAL * R, rN = SPR_NEST * R, long = Math.max(pl.w, pl.h);
    const dist = Math.hypot(P.x - N.x, P.y - N.y); let da = Math.abs(Math.atan2(P.y - cy, P.x - cx) - Math.atan2(N.y - cy, N.x - cx)); if (da > Math.PI) da = 2 * Math.PI - da; da = da * 180 / Math.PI;
    if (dist < DIST_FRAC * long - 0.5) issues.push({ kind: 'inv6', msg: 'INV-6: portal-sarang ' + Math.round(dist) + ' px = ' + (dist / long).toFixed(2) + ' × sisi terpanjang (< ' + DIST_FRAC + ')' });
    if (da < ANG_MIN - 0.5) issues.push({ kind: 'inv6', msg: 'INV-6: selisih sudut portal-sarang terhadap naga ' + da.toFixed(0) + '° (< ' + ANG_MIN + '°)' });
    const free = ARC_FREE * R; let mP = 1e9, mN = 1e9, atP = null, atN = null;
    for (let i = 0; i < n; i++) {
      const s = i * st;
      if (s > free) { const d1 = Math.hypot(xs[i] - P.x, ys[i] - P.y); if (d1 < mP) { mP = d1; atP = [xs[i], ys[i]]; } }
      if ((n - 1 - i) * st > free) { const d2 = Math.hypot(xs[i] - N.x, ys[i] - N.y); if (d2 < mN) { mN = d2; atN = [xs[i], ys[i]]; } }
    }
    const needP = rP + CLEAR7 * R, needN = rN + CLEAR7 * R, bad = [];
    if (mP < needP - 0.5) { issues.push({ kind: 'inv7', msg: 'INV-7: jalur ' + (mP / R).toFixed(2) + 'R dari portal (< ' + (needP / R).toFixed(2) + 'R) setelah 8 diameter pertama' }); bad.push(atP); }
    if (mN < needN - 0.5) { issues.push({ kind: 'inv7', msg: 'INV-7: jalur ' + (mN / R).toFixed(2) + 'R dari sarang (< ' + (needN / R).toFixed(2) + 'R) sebelum 8 diameter terakhir' }); bad.push(atN); }
    const wing = wingNeed(R) - R - 2, dP = Math.hypot(P.x - cx, P.y - cy) - wing, dN = Math.hypot(N.x - cx, N.y - cy) - wing, zP = rP + CLEAR8 * R, zN = rN + CLEAR8 * R;
    if (dP < zP - 0.5) issues.push({ kind: 'inv8', msg: 'INV-8: sayap naga ' + (dP / R).toFixed(2) + 'R dari pusat portal (< ' + (zP / R).toFixed(2) + 'R)' });
    if (dN < zN - 0.5) issues.push({ kind: 'inv8', msg: 'INV-8: sayap naga ' + (dN / R).toFixed(2) + 'R dari pusat sarang (< ' + (zN / R).toFixed(2) + 'R)' });
    if (path.boss) {
      const br = path.boss.R || Math.round(2.45 * R), b1 = Math.hypot(path.boss.x - P.x, path.boss.y - P.y) - br, b2 = Math.hypot(path.boss.x - N.x, path.boss.y - N.y) - br;
      if (b1 < zP - 0.5) issues.push({ kind: 'inv8', msg: 'INV-8: boss menyentuh zona bersih portal' }); if (b2 < zN - 0.5) issues.push({ kind: 'inv8', msg: 'INV-8: boss menyentuh zona bersih sarang' });
    }
    bad.forEach(function (p) { if (p) v.badPts.push(p); });
    return { issues: issues, info: { P: P, N: N, dist: dist, long: long, frac: dist / long, ang: da, minP: mP, minN: mN, needP: needP, needN: needN, zP: zP, zN: zN, rP: rP, rN: rN, wing: wing, atP: atP, atN: atN } };
  }

  /** Lunakkan tikungan tajam:
 ambil titik tiap ~28 px, haluskan (rata-rata tetangga), bangun ulang jalur. */
  function soften(path, passes) {
    const xs = path.xs, ys = path.ys, pts = [];
    for (let i = 0; i < xs.length; i += 14) pts.push([xs[i], ys[i]]);
    pts.push([xs[xs.length - 1], ys[ys.length - 1]]);
    for (let p = 0; p < passes; p++) for (let i = 1; i < pts.length - 1; i++) { pts[i] = [(pts[i - 1][0] + 2 * pts[i][0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4]; }
    const np = new GA.Path.Path(pts);
    np.shooter = path.shooter; np.boss = path.boss; np.presetId = path.presetId; np.play = path.play; np.ctrl = path.ctrl; np.star = path.star;
    return np;
  }

  /** Validasi + perbaikan otomatis + data persilangan/zona. Mengembalikan jalur (mungkin objek baru). */
  function refine(path, R, L, def) {
    let rep = analyze(path, R, L, def), tries = 0;
    while (rep.issues.some(function (i) { return i.kind === 'radius'; }) && tries < 3) { path = soften(path, 3 + tries * 2); rep = analyze(path, R, L, def); tries++; }
    rep.softened = tries;
    path.report = rep;
    const len = path.length;
    path.zones = ((def && def.zones) || []).map(function (z) { return { from: z.from * len, to: z.to * len, mul: z.mul }; });
    // jembatan di jalur ATAS (bagian yang lebih akhir): bola di sana digambar di atas jembatan
    path.bridges = []; path.overWindows = [];
    if (def && def.bridge) rep.crossings.forEach(function (c) {
      const i = Math.min(path.xs.length - 2, Math.max(1, Math.round(c.d2 / path.step))), a = Math.atan2(path.ys[i + 1] - path.ys[i - 1], path.xs[i + 1] - path.xs[i - 1]);
      path.bridges.push({ x: c.x, y: c.y, a: a, d: c.d2 }); path.overWindows.push([c.d2 - 3.4 * R, c.d2 + 3.4 * R]);
    });
    if (GA.debug && rep.issues.length) console.warn('[jalur ' + path.presetId + '] ' + rep.issues.map(function (i) { return i.msg; }).join('; '));
    return path;
  }

  /* ---------- mode debug (?debug=1) ---------- */
  function drawDebug(ctx, path, R, t) {
    if (!path) return;
    const rep = path.report || {};
    ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,255,255,0.9)'; ctx.stroke(path.poly());
    (path.ctrl || []).forEach(function (p, i) { ctx.fillStyle = 'rgba(255,255,0,0.95)'; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.fillText(String(i), p[0] + 5, p[1] - 5); });
    if (rep.star) {      // INV-1: sinar uji dari naga ke tiap posisi bola (hijau = mengenai bola itu sendiri, merah = terhalang bola lain), bola tertutup diisi merah
      ctx.lineWidth = 1; (rep.star.inv1.rays || []).forEach(function (r) { ctx.strokeStyle = r[4] ? 'rgba(120,255,140,0.2)' : 'rgba(255,60,60,0.9)'; ctx.beginPath(); ctx.moveTo(r[0], r[1]); ctx.lineTo(r[2], r[3]); ctx.stroke(); });
      ctx.fillStyle = 'rgba(255,40,40,0.5)'; (rep.star.rayBad || []).forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, TAU); ctx.fill(); });
    }
    ctx.strokeStyle = 'rgba(255,60,60,0.9)'; ctx.lineWidth = 2;
    (rep.violations || []).forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], R * 0.7, 0, TAU); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(255,160,0,0.95)'; (rep.sharp || []).forEach(function (p) { ctx.beginPath(); ctx.rect(p[0] - 8, p[1] - 8, 16, 16); ctx.stroke(); });
    (rep.crossings || []).forEach(function (c) { ctx.strokeStyle = 'rgba(0,255,120,0.9)'; ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.6, 0, TAU); ctx.stroke(); });
    ctx.strokeStyle = 'rgba(120,255,120,0.7)'; ctx.setLineDash([6, 6]);
    const dr = GA.Theme.dragon.radiusRatio * R; ctx.beginPath(); ctx.arc(path.shooter.x, path.shooter.y, dr * 1.5 + R + 12, 0, TAU); ctx.stroke();
    if (path.boss) { ctx.beginPath(); ctx.arc(path.boss.x, path.boss.y, 2.45 * R + R + 8, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]);
    (path.zones || []).forEach(function (z) { const a = path.at(z.from, {}), b = path.at(z.to, {}); ctx.strokeStyle = 'rgba(255,0,255,0.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); });
    const ed = GA.Effects && GA.Effects.entryD ? GA.Effects.entryD() : 0, ep = path.at(ed, {}); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ep.x, ep.y, R * 2.2, 0, TAU); ctx.stroke();
    let y0 = (path.play ? path.play.y : 100) + 8;
    ctx.font = '11px monospace'; ctx.textAlign = 'left';
    const lines = ['jalur ' + path.presetId + '  panjang ' + Math.round(path.length) + '  R ' + R, 'gap min ' + (rep.minGap ? Math.round(rep.minGap) : '-') + ' (butuh ' + Math.round(rep.need || 0) + ')  radius min ' + (rep.minRadius ? Math.round(rep.minRadius) : '-') + '  lunak ' + (rep.softened || 0) + 'x', 'ruang penembak ' + Math.round(rep.shooterClear || 0) + '  silang ' + (rep.crossings || []).length].concat(rep.star && rep.star.spiral ? ['INV-4 panjang ' + rep.star.spiral.lenD.toFixed(1) + ' d = ' + rep.star.spiral.pct.toFixed(0) + '% serpentin lama terpendek (' + rep.star.spiral.old.toFixed(1) + ' d)  rasio rantai ' + rep.star.spiral.ratioChain.toFixed(2), 'INV-5 jarak bola non-tetangga ' + (rep.star.spiral.lockMin / R).toFixed(2) + 'R  kunci ' + rep.star.spiral.lockR.toFixed(2) + ' dia'] : rep.star ? ['INV-1 peluru nyata ' + rep.star.inv1.fat + '/' + rep.star.inv1.tot + '  sinar tipis ' + rep.star.inv1.thin + '  sudut ' + Math.round(rep.star.sweepDeg) + '°  ujung ' + Math.round(rep.star.endDist)] : []).concat((rep.issues || []).map(function (i) { return '! ' + i.msg; }));
    const rt = rep.star && rep.star.route;
    if (rt) {      // INV-6/7/8: garis portal-sarang, zona INV-7 (putus-putus) dan zona bersih INV-8 (titik-titik); pelanggaran INV-7 ditandai merah (bola merah di rayBad)
      ctx.save(); ctx.lineWidth = 1.5;
      [[rt.P, rt.rP, 'rgba(182,156,255,0.95)'], [rt.N, rt.rN, 'rgba(255,170,60,0.95)']].forEach(function (z) {
        ctx.strokeStyle = z[2]; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(z[0].x, z[0].y, z[1] + CLEAR7 * R, 0, TAU); ctx.stroke();
        ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.arc(z[0].x, z[0].y, z[1] + CLEAR8 * R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(z[0].x, z[0].y, z[1], 0, TAU); ctx.stroke();
      });
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(rt.P.x, rt.P.y); ctx.lineTo(rt.N.x, rt.N.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText(Math.round(rt.dist) + ' px', (rt.P.x + rt.N.x) / 2, (rt.P.y + rt.N.y) / 2 - 6); ctx.restore();
      lines.push('INV-6 portal-sarang ' + Math.round(rt.dist) + ' px = ' + rt.frac.toFixed(2) + ' × sisi terpanjang (≥ ' + DIST_FRAC + '), sudut ' + rt.ang.toFixed(0) + '° (≥ ' + ANG_MIN + '°)');
      lines.push('INV-7 jalur→portal ' + (rt.minP / R).toFixed(2) + 'R (≥ ' + (rt.needP / R).toFixed(2) + ')  jalur→sarang ' + (rt.minN / R).toFixed(2) + 'R (≥ ' + (rt.needN / R).toFixed(2) + ')   INV-8 zona bersih ' + (rt.zP / R).toFixed(2) + 'R / ' + (rt.zN / R).toFixed(2) + 'R');
    }
    // panel laporan (teks dipotong ≤ 54 karakter): ditaruh di tempat yang paling sedikit menutupi jalur, zona portal/sarang, dan naga
    { const pl = path.play || { x: 0, y: 100, w: 540, h: 400 }, wrapped = []; lines.forEach(function (l) { for (let i = 0; i < l.length; i += 54) wrapped.push((i ? '  ' : '') + l.slice(i, i + 54)); });
      const ph = 12 + 11 * wrapped.length, pw = 330, pts = [], circles = [];
      for (let i = 0; i < path.xs.length; i += 6) pts.push([path.xs[i], path.ys[i]]);
      circles.push([path.shooter.x, path.shooter.y, GA.Theme.dragon.radiusRatio * R * 2.4]); if (path.boss) circles.push([path.boss.x, path.boss.y, (path.boss.R || 2.45 * R) + 8]);
      if (rt) { circles.push([rt.P.x, rt.P.y, rt.rP + CLEAR7 * R]); circles.push([rt.N.x, rt.N.y, rt.rN + CLEAR7 * R]); }
      let bx = 4, by = pl.y + 8, bp = 1e9;
      for (let y = pl.y + 6; y <= pl.y + pl.h - ph - 4; y += 14) for (let x = 4; x <= pl.w - pw - 4; x += 14) {
        let pen = 0;
        circles.forEach(function (c) { const cx = Math.max(x, Math.min(c[0], x + pw)), cy = Math.max(y, Math.min(c[1], y + ph)); if (Math.hypot(c[0] - cx, c[1] - cy) < c[2]) pen += 40; });
        for (let i = 0; i < pts.length; i++) { const cx = Math.max(x, Math.min(pts[i][0], x + pw)), cy = Math.max(y, Math.min(pts[i][1], y + ph)); if (Math.hypot(pts[i][0] - cx, pts[i][1] - cy) < R + 4) pen++; }
        pen += (y - pl.y) * 0.002; if (pen < bp) { bp = pen; bx = x; by = y; }
      }
      y0 = by; ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(bx, y0, pw, ph);
      ctx.font = '10px monospace'; ctx.textAlign = 'left';
      wrapped.forEach(function (l, i) { ctx.fillStyle = l.trim()[0] === '!' ? '#ff9a7d' : (rep.ok ? '#7dff9a' : '#dfe'); ctx.fillText(l, bx + 6, y0 + 14 + i * 11); }); }
    ctx.restore();
  }

  GA.Paths = { has: has, resolve: resolve, refine: refine, analyze: analyze, analyzeStar: analyzeStar, inv1: inv1, muzzleL: muzzleL, padTopFor: padTopFor, drawDebug: drawDebug, ids: PLAY_IDS, all: Object.keys(ARCH), wingNeed: wingNeed, WING_REACH: WING_REACH, SPR_PORTAL: SPR_PORTAL, SPR_NEST: SPR_NEST, CLEAR7: CLEAR7, CLEAR8: CLEAR8, ARC_FREE: ARC_FREE, DIST_FRAC: DIST_FRAC, ANG_MIN: ANG_MIN, TPL: TPL, lenMinD: lenMinD, routeGeom: routeGeom, parseNodes: parseNodes, mirrorNodes: mirrorNodes, filletPath: filletPath, routeChecks: routeChecks, MIN_PITCH: MIN_PITCH, SPACING_CAP: SPACING_CAP,
    /** Alat dev (js/dev/routesearch.js): daftarkan arketipe rute sementara. */ registerRoute: function (id, o) { ARCH[id] = routeArch(id, o); } };
  GA.debug = /[?&]debug(=1|&|$)/.test(location.search);
})(window.GA = window.GA || {});
