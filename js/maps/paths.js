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

  const fitCache = {};

  /* ===== Revisi 8: jalur SPIRAL STADION (kapsul) di sekitar naga + tembakan lontar "target-lock" =====
   * Naga di tengah area bermain, di sumbu stadion. Jalur masuk dari portal di tepi luar (apex) mengelilingi naga menuju sarang di sebelah platform tengah. Jarak antar-lap (pitch, garis tengah ke
   * garis tengah) 3R diturunkan sampai batas 2,6R bila perlu panjang. Potret: sumbu vertikal (memakai tinggi layar); lanskap/desktop: sumbu horizontal. Lobus (Stage 2) dan poligon/bintang (Stage 3)
   * memodulasi jari-jari dengan fase terkunci pada posisi di dalam lap (semua lap sefase, jadi jarak antar-lap tetap) dan mengecil ke dalam. Penyetel otomatis memilih bentuk paling bergaya
   * yang lolos INV-3 (jarak antar-segmen >= 2,6R), radius tikungan >= 1,15R, dan portal penuh di area bermain, lalu pitch terbesar yang memenuhi INV-4 (panjang). */

  /** Panjang kolam serpentin lama (commit ddd3183, sebelum revisi 6) per stage dan layout, diameter bola (2R). INV-4: panjang baru >= 95% dari MINIMUM kolam lama (keputusan pengguna);
   *  rata-rata dilaporkan sebagai pembanding. */
  const OLD_MIN = { portrait: [30.8, 26.1, 25.4], landscape: [27.1, 26.8, 20.8] };
  const OLD_LEN = { portrait: [38.35, 35.28, 25.47], landscape: [37.05, 34.54, 21.27] };
  const LAP_PITCH_FACTOR = 3, LAP_PITCH_MIN = 2.6, INV4_PCT = 0.95;

  /** Titik pada kurva offset ρ dari sumbu vertikal (y = −h1 … +h2) di parameter tau ∈ [0,1): bobot tetap (ws = sisi lurus, wa = busur) agar posisi apex tidak bergeser saat ρ berubah.
   *  Mulai di kanan-bawah, naik, busur atas, turun di kiri, busur bawah (berlawanan arah jarum jam di layar). */
  function capsuleTau(tau, rho, h1, h2, ws, wa) {
    tau = ((tau % 1) + 1) % 1; const L1 = h1 + h2;
    if (tau < ws) return [rho, h2 - L1 * tau / ws];
    tau -= ws; if (tau < wa) { const a = Math.PI * tau / wa; return [rho * Math.cos(a), -h1 - rho * Math.sin(a)]; }
    tau -= wa; if (tau < ws) return [-rho, -h1 + L1 * tau / ws];
    tau -= ws; const a = Math.PI * tau / wa; return [-rho * Math.cos(a), h2 + rho * Math.sin(a)];
  }
  /** Bentuk gelombang modulasi ∈ [−1, 1]: lobus (sinus), poligon bersudut membulat (sinus terpangkat, puncak datar), bintang (segitiga membulat). */
  function modWave(shape, x) {
    const s = Math.sin(x);
    if (shape === 'poly') return Math.tanh(2.4 * s) / Math.tanh(2.4);      // puncak datar, sudut membulat
    if (shape === 'star') return 0.7 * (2 / Math.PI) * Math.asin(s) + 0.3 * s;      // segitiga membulat
    return s;
  }
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

  /** o: id, stage (0..2), dir (±1), apex ('top'|'bottom' potret; 'left'|'right' lanskap), shape ('lobe'|'poly'|'star'), k (jumlah lobus/sisi), A (amplitudo px × R/32), boss { side: 'top'|'left'|'right', k }. */
  function spiralA(d, o) {
    const R = d.R, wing = wingNeed(R), pl = d.pl, PR = 2.2 * R, ex = d.iw / 2, top = d.vc * d.ih, bot = d.ih - top, dir = o.dir || 1, portrait = d.portrait;
    const key = ['A', o.id, R, d.iw, d.ih, d.vc, portrait].join('|');
    let fit = fitCache[key];
    if (!fit) {
      let bossR = 0, bn = 0; if (o.boss) { bossR = Math.round((o.boss.k || 1.25) * R); bn = 1.5 * bossR + R + 2; }
      const oldMin = OLD_MIN[portrait ? 'portrait' : 'landscape'][o.stage || 0], target = INV4_PCT * oldMin, A0 = (o.A || 0) * R / 32;
      // batas luas: potret = sumbu vertikal (atas/bawah), lanskap = sumbu horizontal (kiri/kanan); boss menyisihkan ruang di sisinya
      let lim1, lim2, rLat;      // lim1/lim2 = batas pusat-bola sepanjang sumbu (atas|kiri, bawah|kanan); rLat = batas lateral
      if (portrait) { lim1 = top; lim2 = bot; rLat = ex; if (o.boss && o.boss.side === 'top') lim1 = Math.min(lim1, (d.cy - pl.y) - 24 - bossR - bn - 6); }
      else {
        lim1 = lim2 = ex; rLat = Math.min(top, bot);
        if (o.boss && o.boss.side === 'right') lim2 = Math.min(lim2, (pl.x + pl.w - 24 - bossR) - d.cx - bn - 6); if (o.boss && o.boss.side === 'left') lim1 = Math.min(lim1, d.cx - (pl.x + 24 + bossR) - bn - 6);
      }
      const why = { portal: 0, gap: 0, curve: 0, gapMin: 9, curveMin: 99 };
      const to = function (p) { return portrait ? [dir * p[0], p[1]] : [p[1], dir * p[0]]; };
      const tryA = function (A) {
        { const sp0 = Math.min(rLat, lim1, lim2) - wing; let am = 1e9; for (let u = 0.02; u < 0.99; u += 0.02) { const tp = Math.pow(Math.sin(Math.PI * u), 0.7); am = Math.min(am, 0.9 * sp0 * (1 - u) / tp, 0.9 * sp0 * u / tp); } A = Math.min(A, am); }      // lobus (selubung sin^0,7) tidak boleh menembus batas luar (HUD/tepi) maupun jangkauan sayap
        const rOut = Math.min(rLat, lim1, lim2);      // jari-jari luar dasar; lobus tidak menambah ekstensi luar karena amplitudonya nol di ujung luar dan dalam (selubung sin^0,7 sepanjang spiral)
        if (rOut < wing + 4) return null;
        const h1 = Math.max(0, lim1 - rOut), h2 = Math.max(0, lim2 - rOut), span = rOut - wing;
        const rm = (rOut + wing) / 2, L1 = h1 + h2, ws = L1 / (2 * L1 + 2 * Math.PI * rm), wa = 0.5 - ws, apexTau = (o.apex === 'bottom' || o.apex === 'right') ? 1 - wa / 2 : ws + wa / 2;
        const build = function (n, shift) {
          const N = Math.max(260, Math.round(n * 560)), P = [], t0 = apexTau - (shift || 0);
          for (let i = 0; i <= N; i++) {
            const f = n * i / N, rho = rOut - span * f / n, tau = t0 + f, taper = Math.pow(Math.max(0, Math.sin(Math.PI * f / n)), 0.7);      // selubung: lobus muncul perlahan dari portal, terbesar di tengah spiral, hilang di dekat sarang
            const rr = rho + (A ? A * taper * modWave(o.shape, 2 * Math.PI * (o.k || 5) * (tau - apexTau)) : 0);
            P.push(to(capsuleTau(tau, rr, h1, h2, ws, wa)));
          }
          return P;
        };
        const evalN = function (n) {
          // portal harus penuh di area bermain: bila apex terlalu dekat tepi, titik awal digeser mundur sepanjang jalur (jalur tetap melewati apex sesudahnya)
          let P = null, shift = 0;
          for (let s = 0; s <= 0.08 + 1e-9; s += 0.01) { const Q = build(n, s), sx = d.cx + Q[0][0], sy = d.cy + Q[0][1]; if (sx >= pl.x + PR - 1 && sx <= pl.x + pl.w - PR + 1 && sy >= pl.y + PR - 1 && sy <= pl.y + pl.h - PR + 1) { P = Q; shift = s; break; } }
          if (!P) { why.portal++; return null; }
          const path = new GA.Path.Path(P); path.shooter = { x: 0, y: 0 };
          { const g4 = lockDist(path, R).min, cr = minCurveR(path); if (g4 < LAP_PITCH_MIN * R - 0.5) { why.gap++; why.gapMin = Math.min(why.gapMin, g4 / R); return null; } if (cr < 1.4 * R) { why.curve++; why.curveMin = Math.min(why.curveMin, cr / R); return null; } }      // jarak dua bola non-tetangga (busur >= 4R) >= 2,6R; lengkung cukup landai agar rantai rapat
          return { P: P, n: n, shift: shift, len: path.length / (2 * R), A: A, rOut: rOut, h1: h1, h2: h2, span: span };
        };
        let best = null;
        for (let pf = LAP_PITCH_FACTOR; pf >= LAP_PITCH_MIN - 1e-9; pf -= 0.1) {
          let cand = null; const nmax = span / (pf * R);
          if (nmax >= 1) cand = evalN(nmax); else for (let n = 0.99; n >= 0.5 && !cand; n -= 0.01) cand = evalN(n);
          if (!cand) continue; cand.pitch = Math.max(LAP_PITCH_MIN, +pf.toFixed(2));
          if (!best || cand.len > best.len) best = cand;
          if (cand.len >= target) return cand;      // pitch terbesar yang memenuhi INV-4
          if (nmax < 1) break;
        }
        return best;
      };
      let pick = null, any = null;
      for (const f of [1, 0.8, 0.6, 0.4, 0.2, 0]) { const A = A0 * f, c = tryA(A); if (!c) continue; if (!any || c.len > any.len) any = c; if (c.len >= target) { pick = c; break; } if (!A0) break; }
      fit = fitCache[key] = pick || any || { P: [[0, 0], [1, 0]], n: 0, len: 0, A: 0, rOut: 0, h1: 0, h2: 0, span: 0, pitch: 0, failed: true };
      fit.target = target; fit.oldMin = oldMin; fit.oldMean = OLD_LEN[portrait ? 'portrait' : 'landscape'][o.stage || 0]; fit.why = why; fit.bossR = bossR; fit.bn = bn; fit.lim1 = lim1; fit.lim2 = lim2;
    }
    const out = { pts: fit.P.map(function (p) { return [(d.cx + p[0] - d.ox) / d.iw, (d.cy + p[1] - d.oy) / d.ih]; }), shooter: [(d.cx - d.ox) / d.iw, (d.cy - d.oy) / d.ih], star: true, spiral: true, stage: o.stage || 0,
      fit: { n: +fit.n.toFixed(2), pitch: fit.pitch, lenD: +fit.len.toFixed(1), rOut: Math.round(fit.rOut), h1: Math.round(fit.h1), h2: Math.round(fit.h2), A: +fit.A.toFixed(1), target: +fit.target.toFixed(1), oldMin: fit.oldMin, oldMean: fit.oldMean }, failed: !!fit.failed, why: fit.why };
    if (o.boss) {
      const ext1 = fit.h1 + fit.rOut, ext2 = fit.h2 + fit.rOut; let bx = d.cx, by = d.cy;
      if (o.boss.side === 'top') by = d.cy - ext1 - fit.bn - 6; else if (o.boss.side === 'right') bx = d.cx + ext2 + fit.bn + 6; else bx = d.cx - ext1 - fit.bn - 6;
      out.boss = [(bx - d.ox) / d.iw, (by - d.oy) / d.ih]; out.bossR = fit.bossR;
    }
    return out;
  }
  const spiralArch = function (id, op, ol) { return function (portrait, d) { return spiralA(d, Object.assign({ id: id + (portrait ? 'p' : 'l') }, portrait ? op : ol)); }; };

  /** Arketipe (semua jalur lama dihapus). Potret: stadion vertikal, portal di apex atas/bawah. Lanskap/desktop: stadion horizontal, portal di apex kiri/kanan. 3 varian per stage (arah dan apex berbeda),
   *  dipilih acak per petualangan (levels.js). Stage 1 SIPUT: spiral stadion polos. Stage 2 LOBUS: 4–6 lobus yang mengecil ke dalam. Stage 3 POLIGON: poligon/bintang membulat + boss di luar spiral
   *  (atas pada potret, samping pada lanskap). */
  const ARCH = {
    siput1: spiralArch('siput1', { stage: 0, dir: 1, apex: 'top' }, { stage: 0, dir: 1, apex: 'left' }),
    siput2: spiralArch('siput2', { stage: 0, dir: -1, apex: 'bottom' }, { stage: 0, dir: -1, apex: 'right' }),
    siput3: spiralArch('siput3', { stage: 0, dir: -1, apex: 'top' }, { stage: 0, dir: -1, apex: 'left' }),
    lobus1: spiralArch('lobus1', { stage: 1, dir: 1, apex: 'top', shape: 'lobe', k: 5, A: 22 }, { stage: 1, dir: 1, apex: 'left', shape: 'lobe', k: 5, A: 22 }),
    lobus2: spiralArch('lobus2', { stage: 1, dir: -1, apex: 'bottom', shape: 'lobe', k: 4, A: 24 }, { stage: 1, dir: -1, apex: 'right', shape: 'lobe', k: 4, A: 24 }),
    lobus3: spiralArch('lobus3', { stage: 1, dir: 1, apex: 'bottom', shape: 'lobe', k: 6, A: 18 }, { stage: 1, dir: 1, apex: 'right', shape: 'lobe', k: 6, A: 18 }),
    poligon1: spiralArch('poligon1', { stage: 2, dir: 1, apex: 'bottom', shape: 'poly', k: 5, A: 22, boss: { side: 'top', k: 1.25 } }, { stage: 2, dir: 1, apex: 'left', shape: 'poly', k: 5, A: 22, boss: { side: 'right', k: 1.5 } }),
    poligon2: spiralArch('poligon2', { stage: 2, dir: -1, apex: 'bottom', shape: 'star', k: 5, A: 22, boss: { side: 'top', k: 1.25 } }, { stage: 2, dir: -1, apex: 'right', shape: 'star', k: 5, A: 22, boss: { side: 'left', k: 1.5 } }),
    poligon3: spiralArch('poligon3', { stage: 2, dir: 1, apex: 'bottom', shape: 'poly', k: 6, A: 20, boss: { side: 'top', k: 1.25 } }, { stage: 2, dir: 1, apex: 'left', shape: 'poly', k: 6, A: 20, boss: { side: 'right', k: 1.5 } })
  };

  const PLAY_IDS = ['siput1', 'siput2', 'siput3', 'lobus1', 'lobus2', 'lobus3', 'poligon1', 'poligon2', 'poligon3'];
  function has(id) { return !!ARCH[id]; }
  /** Margin atas jalur untuk bola stage berjari-jari R (bola kategori bisa 1,12× bola layout): pusat bola >= (hudGap + 1)R di bawah panel HUD. */
  function padTopFor(L, R) {
    const base = L && L.padTop != null ? L.padTop : (L && L.pad) || 40;
    return R && L && L.hudGap != null ? Math.max(base, Math.round((L.hudGap + 1) * R * (L.portrait ? 1.12 : 1.05))) : base;
  }
  function resolve(id, portrait, L, R) {
    const pl = L && L.play, pad = L && L.pad != null ? L.pad : 40, padTop = padTopFor(L, R), iw = pl ? pl.w - 2 * pad : 440, ih = pl ? pl.h - padTop - pad : 356 - (padTop - pad);
    const vc = pl ? (pl.h / 2 - padTop) / ih : 0.5;      // pusat arena (tengah area bermain) dalam koordinat ternormalisasi area jalur
    return ARCH[id] ? ARCH[id](!!portrait, { iw: iw, ih: ih, vc: vc, asp: ih / iw, R: R || 29, portrait: !!portrait, pl: pl || { x: 0, y: 0, w: 540, h: 400 }, padTop: padTop, ox: (pl ? pl.x : 0) + pad, oy: (pl ? pl.y : 0) + padTop, cx: pl ? pl.x + pl.w / 2 : 270, cy: pl ? pl.y + pl.h / 2 : 200 }) : null;
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
    const PR = 2.2 * R, sx = xs[Math.max(0, first)], sy = ys[Math.max(0, first)];
    if (sx < pl.x + PR - 1 || sx > pl.x + pl.w - PR + 1 || sy < pl.y + PR - 1 || sy > pl.y + pl.h - PR + 1) issues.push({ kind: 'portal', msg: 'portal tidak penuh di area bermain' });
    // INV-1 dengan peluru nyata (syarat lulus) + sinar tipis (pembanding)
    const v = spiral ? { tot: 0, fat: 0, thin: 0, badPts: [], rays: [] } : inv1(path, R, R, muzzleL(R));
    // Opsi A: INV-4 (panjang >= 95% serpentin lama) dan INV-5 (target-lock): titik berjarak busur >= 1,9R tidak boleh lebih dekat dari 1,9R (radius kunci terjamin 0,95R; tetangga rantai 1,96R)
    let sp = null;
    if (spiral) {
      const Dch = 2 * R * 0.98, ld = lockDist(path, R); let lockMin = ld.min; const lockAt = ld.at;      // jarak terdekat dua bola yang BUKAN tetangga rantai (busur >= 4R): antar-lap, portal vs ujung; tetangga rantai selalu 1,96R (solver jarak)
      const lenD = path.length / (2 * R), old = OLD_MIN[L.portrait ? 'portrait' : 'landscape'][(def && def.stage) || 0], oldMean = OLD_LEN[L.portrait ? 'portrait' : 'landscape'][(def && def.stage) || 0], need95 = INV4_PCT * old;
      sp = { lenD: lenD, old: old, oldMean: oldMean, need: need95, pct: 100 * lenD / old, pctMean: 100 * lenD / oldMean, ratioChain: path.length / (20 * 2 * R * 0.98), lockMin: Math.min(lockMin, Dch), lockR: Math.min(lockMin, Dch) / (2 * R) };
      if (lockMin < LAP_PITCH_MIN * R - 0.5) { issues.push({ kind: 'lock', msg: 'INV-5: dua bola non-tetangga terlalu dekat untuk target-lock (' + (lockMin / R).toFixed(2) + 'R < ' + LAP_PITCH_MIN + 'R)' }); v.badPts.push(lockAt); }
      if (lenD < need95 && Math.abs(R - 32) <= 1.5) issues.push({ kind: 'length', msg: 'INV-4: panjang ' + lenD.toFixed(1) + ' d < ' + need95.toFixed(1) + ' d (95% serpentin lama terpendek ' + old.toFixed(1) + ' d) = ' + sp.pct.toFixed(0) + '%' });
    }
    if (!spiral && v.fat > 0) issues.push({ kind: 'inv1', msg: 'INV-1: ' + v.fat + '/' + v.tot + ' sinar mengenai bola lain lebih dulu (peluru nyata)' });
    return { issues: issues, inv1: v, rayBad: v.badPts, minCenter: minR, endDist: endD, sweepDeg: sweepDeg, spiral: sp };
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
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; const y0 = (path.play ? path.play.y : 100) + 8; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(4, y0, 330, 14 + 12 * ((rep.issues || []).length + 4));
    ctx.fillStyle = rep.ok ? '#7dff9a' : '#ff9a7d'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
    const lines = ['jalur ' + path.presetId + '  panjang ' + Math.round(path.length) + '  R ' + R, 'gap min ' + (rep.minGap ? Math.round(rep.minGap) : '-') + ' (butuh ' + Math.round(rep.need || 0) + ')  radius min ' + (rep.minRadius ? Math.round(rep.minRadius) : '-') + '  lunak ' + (rep.softened || 0) + 'x', 'ruang penembak ' + Math.round(rep.shooterClear || 0) + '  silang ' + (rep.crossings || []).length].concat(rep.star && rep.star.spiral ? ['INV-4 panjang ' + rep.star.spiral.lenD.toFixed(1) + ' d = ' + rep.star.spiral.pct.toFixed(0) + '% serpentin lama terpendek (' + rep.star.spiral.old.toFixed(1) + ' d)  rasio rantai ' + rep.star.spiral.ratioChain.toFixed(2), 'INV-5 jarak bola non-tetangga ' + (rep.star.spiral.lockMin / R).toFixed(2) + 'R  kunci ' + rep.star.spiral.lockR.toFixed(2) + ' dia'] : rep.star ? ['INV-1 peluru nyata ' + rep.star.inv1.fat + '/' + rep.star.inv1.tot + '  sinar tipis ' + rep.star.inv1.thin + '  sudut ' + Math.round(rep.star.sweepDeg) + '°  ujung ' + Math.round(rep.star.endDist)] : []).concat((rep.issues || []).map(function (i) { return '! ' + i.msg; }));
    lines.forEach(function (l, i) { ctx.fillText(l, 10, y0 + 16 + i * 12); });
    ctx.restore();
  }

  GA.Paths = { has: has, resolve: resolve, refine: refine, analyze: analyze, analyzeStar: analyzeStar, inv1: inv1, muzzleL: muzzleL, padTopFor: padTopFor, drawDebug: drawDebug, ids: PLAY_IDS, all: Object.keys(ARCH), wingNeed: wingNeed, WING_REACH: WING_REACH };
  GA.debug = /[?&]debug(=1|&|$)/.test(location.search);
})(window.GA = window.GA || {});
