/* dev/chainsim.js — simulasi kerapatan rantai TANPA render. Hanya dimuat dengan ?debug=sim (hasil tampil di layar + console; GA.Sim.results).
 * Juga dipanggil dari ?test=1 (GA.Sim.run). Tidak butuh Node: berjalan di browser memakai Chain & Path yang sama dengan game.
 *
 * Untuk SEMUA arketipe jalur x 2 orientasi x 3 radius bola x 3 kesulitan: satu rantai penuh (25 bola) keluar dari portal dan "dimainkan"
 * 45 detik oleh pemain acak (menghancurkan bola, menyisipkan bola kutukan, menarik rantai mundur) dengan langkah waktu bergetar 8-50 ms.
 * Syarat: jarak pusat-pusat bola bersebelahan tetap dalam [0,96 ; 1,05] x diameter, kecuali celah sementara (bola hancur / sisip /
 * bola baru keluar) yang menutup dalam < 400 ms. Juga diuji: fase masuk (kepala tidak mencapai sarang, waktu isi), penutupan celah,
 * penyisipan halus, dan batas langkah waktu. */
(function (GA) {
  'use strict';
  const LO = 0.96, HI = 1.05, MAX_BAD = 0.4;
  const results = [];
  let fails = 0;
  function ok(name, cond, info) { results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (info ? '  — ' + info : '')); if (!cond) fails++; return cond; }
  const tick = function () { return new Promise(function (r) { setTimeout(r, 0); }); };

  function rng(seed) { let a = seed >>> 0; return function () { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const LAYS = [{ name: 'L', portrait: false, W: 960, H: 540, play: { x: 0, y: 84, w: 960, h: 456 } }, { name: 'P', portrait: true, W: 540, H: 960, play: { x: 0, y: 150, w: 540, h: 798 } }];

  function specs(n, kinds) {
    const out = []; for (let i = 0; i < n; i++) out.push({ qid: i, kind: 'num' });
    (kinds || []).forEach(function (k, i) { out.splice(4 + i * 6, 0, { kind: k }); });
    return out;
  }

  function mkChain(path, R, gp, n) {
    const c = new GA.Chain.Chain(path, { r: R, gp: gp });
    c.entryD = c.unit * 2.6;      // titik portal ±2,6 diameter dari awal jalur (nilai nyata: 172 px di R=32)
    c.setQueue(specs(n, ['curse', 'frost', 'egg']));
    return c;
  }

  /** Pantau pasangan bersebelahan: catat berapa lama pasangan (diidentifikasi bola belakang) keluar dari rentang. */
  function monitor(c, st, now) {
    const bs = c.balls, dia = c.r * 2;
    for (let i = 1; i < bs.length; i++) {
      const a = bs[i - 1], b = bs[i];
      if (!(a.d >= c.entryD && b.d >= c.entryD && a.d <= c.path.length - c.r)) { delete st.bad[b.id]; continue; }
      const q = Math.hypot(a.x - b.x, a.y - b.y) / dia, bad = q < LO || q > HI;
      st.pairs++;
      if (!bad) { if (st.bad[b.id] !== undefined) { st.maxBadT = Math.max(st.maxBadT, now - st.bad[b.id]); delete st.bad[b.id]; } if (q < st.min) st.min = q; if (q > st.max) st.max = q; if (!b.vo && !b.lag && b.emT > c.gp.EMERGE_ANIM_TIME) { st.sMin = Math.min(st.sMin, q); st.sMax = Math.max(st.sMax, q); } }
      else {
        if (st.bad[b.id] === undefined) st.bad[b.id] = now;
        const dur = now - st.bad[b.id]; if (dur > st.maxBadT) st.maxBadT = dur;
        if (dur > MAX_BAD && !st.firstBad) st.firstBad = 'q=' + q.toFixed(3) + ' bola#' + i + ' t=' + now.toFixed(1) + 's d=' + Math.round(b.d);
      }
    }
  }

  /** Satu skenario permainan acak pada satu jalur. Mengembalikan statistik. */
  function play(path, R, diff, seed, dur) {
    const r = rng(seed), gp = GA.Gameplay.resolve(diff, 0), c = mkChain(path, R, gp, 25);
    const st = { bad: {}, pairs: 0, min: 9, max: 0, sMin: 9, sMax: 0, maxBadT: 0, firstBad: '', nest: 0, removed: 0, inserted: 0, maxHead: 0 };
    let now = 0, nextKill = 3 + r() * 2, nextIns = 7 + r() * 3, spiked = false, maxStep = 0;
    c.onEmerge = function () {};
    while (now < dur) {
      let dt = 0.008 + r() * 0.042;
      if (!spiked && now > 12) { spiked = true; dt = 0.5; }      // tab di-resume: harus dibatasi MAX_DT
      const before = c.balls.length ? c.balls[0].d : 0;
      c.update(dt);
      const stepD = c.balls.length ? c.balls[0].d - before : 0; if (stepD > maxStep) maxStep = stepD;
      now += Math.min(dt, gp.MAX_DT);
      if (c.balls.length) st.maxHead = Math.max(st.maxHead, c.balls[0].d / c.path.length);
      // pemain acak: hancurkan satu bola terlihat, rantai mundur sedikit
      if (now > nextKill) {
        nextKill = now + 1.2 + r() * 2.2;
        const vis = c.balls.filter(function (b) { return c.visible(b) && b.kind === 'num'; });
        if (vis.length > 2) { const b = vis[Math.floor(r() * vis.length)]; c.remove(b); st.removed++; c.retreat(gp.RETREAT_SEC * c.speed + r() * 4 * gp.COMBO_RETREAT_DIAMS * c.unit); }
      }
      if (now > nextIns) {
        nextIns = now + 5 + r() * 5;
        const k = 2 + Math.floor(r() * Math.max(1, c.balls.filter(function (b) { return c.visible(b); }).length - 2));
        if (c.balls.length > 3) { c.insert(Math.min(k, c.balls.length), { kind: 'curse' }); st.inserted++; }
      }
      if (c.holeReached()) { const f = c.balls[0]; c.remove(f); st.nest++; c.retreat(10 * c.unit); }      // bola lolos (jarang): rantai mundur
      monitor(c, st, now);
    }
    st.t = c.stats; st.maxStepPx = maxStep; st.chain = c;
    return st;
  }

  /** Fase masuk: waktu isi dan posisi kepala (tanpa pemain). */
  function entryRun(path, R, diff) {
    const gp = GA.Gameplay.resolve(diff, 0), c = mkChain(path, R, gp, 25);
    let t = 0, maxHead = 0; const dt = 1 / 60;
    while (t < 30 && !(c.entry.phase === 'done')) { c.update(dt); t += dt; maxHead = Math.max(maxHead, c.balls[0].d / path.length); }
    return { fastEnd: c.stats.fastEnd, allOut: c.stats.allOut, nOut: c.balls.filter(function (b) { return b.out; }).length, headFrac: c.balls[0].d / path.length, doneT: t, c: c, vNormal: c.speed };
  }

  async function run(opts) {
    opts = opts || {};
    results.length = 0; fails = 0;
    const t0 = performance.now(), Rs = opts.radii || [26, 29, 32], diffs = opts.diffs || ['mudah', 'sedang', 'sulit'];
    let n = 0, worst = { t: 0, id: '' }, minQ = 9, maxQ = 0, sMin = 9, sMax = 0, bad = [], maxHead = 0, noEntry = [];
    const fills = [];
    for (const id of GA.Paths.ids) {
      for (const Lay of LAYS) {
        for (const R of Rs) {
          const L = { portrait: Lay.portrait, W: Lay.W, H: Lay.H, play: Lay.play, ballR: R, pad: R + 18 };
          const p0 = GA.Path.forLayout(id, L, R), paths = [p0].concat(p0.second ? [p0.second] : []);
          for (let pi = 0; pi < paths.length; pi++) {
            const path = paths[pi], tag = id + '/' + Lay.name + '/R' + R + (pi ? '#2' : '');
            for (let di = 0; di < diffs.length; di++) {
              const diff = diffs[di], step = id.indexOf('dual') === 0 ? 4 : 0;
              const st = play(path, R, diff, 1000 + n * 7 + di, 45); n++;
              minQ = Math.min(minQ, st.min); maxQ = Math.max(maxQ, st.max); sMin = Math.min(sMin, st.sMin); sMax = Math.max(sMax, st.sMax);
              if (st.maxBadT > worst.t) worst = { t: st.maxBadT, id: tag + '/' + diff };
              if (st.maxBadT > MAX_BAD) bad.push(tag + '/' + diff + ': celah ' + st.maxBadT.toFixed(2) + ' dtk (' + st.firstBad + ')');
              maxHead = Math.max(maxHead, st.maxHead);
              if (st.maxStepPx > st.chain.unit * 8 * gpMaxDt() * 1.01) noEntry.push(tag + ' loncatan ' + st.maxStepPx.toFixed(1) + 'px');
            }
            // fase masuk (sekali per jalur/radius, kesulitan sedang)
            const e = entryRun(path, R, 'sedang');
            fills.push({ tag: tag, e: e, len: path.length, unit: R * 2 });
          }
        }
        await tick();
      }
    }
    ok('kerapatan: jarak bola bersebelahan [' + LO + '–' + HI + '] x diameter (semua arketipe, 2 orientasi, 3 radius, 3 kesulitan); celah sementara < ' + (MAX_BAD * 1000) + ' ms',
      bad.length === 0, n + ' skenario x 45 dtk; celah terlama ' + (worst.t * 1000).toFixed(0) + ' ms (' + worst.id + ')' + (bad.length ? '; gagal: ' + bad.slice(0, 3).join(' | ') : ''));
    ok('kerapatan stabil (tanpa animasi): rasio ' + sMin.toFixed(3) + '–' + sMax.toFixed(3), sMin >= LO && sMax <= HI, 'termasuk tikungan, jembatan, dan tepat setelah keluar portal; terukur saat sisip/hancur: ' + minQ.toFixed(2) + '–' + maxQ.toFixed(2));
    ok('batas langkah waktu: lonjakan dt 500 ms tidak membuat kepala rantai melompat (> MAX_DT)', noEntry.length === 0, noEntry.slice(0, 3).join(' | '));
    // fase masuk
    let worstFill = 0, worstHead = 0, short = [], nOutMin = 99;
    fills.forEach(function (f) {
      const e = f.e; worstFill = Math.max(worstFill, e.allOut >= 0 ? e.allOut : e.fastEnd); worstHead = Math.max(worstHead, e.headFrac);
      nOutMin = Math.min(nOutMin, e.nOut);
      if (e.headFrac > 0.8) short.push(f.tag + ' kepala ' + (e.headFrac * 100).toFixed(0) + '%');
    });
    const gpS = GA.Gameplay.resolve('sedang', 0);
    ok('fase masuk: kepala rantai tidak mendekati sarang (< 80% jalur)', short.length === 0, 'kepala maks ' + (worstHead * 100).toFixed(0) + '%' + (short.length ? '; ' + short.slice(0, 3).join(' | ') : ''));
    results.push('info  fase masuk (landscape, R32, sedang) — bola keluar saat fase cepat berakhir / kepala% / panjang jalur:');
    fills.forEach(function (f) { if (/\/L\/R32$/.test(f.tag)) results.push('        ' + pad(f.tag.split('/')[0], 10) + f.e.nOut + ' bola, kepala ' + (f.e.headFrac * 100).toFixed(0) + '%, jalur ' + (f.len / f.unit).toFixed(0) + ' d, cepat ' + f.e.fastEnd.toFixed(1) + ' dtk'); });
    ok('fase masuk selesai dalam SPAWN_FILL_TIME + easing', fills.every(function (f) { return f.e.fastEnd >= 0 && f.e.fastEnd <= gpS.SPAWN_FILL_TIME + 0.8; }), 'terlama ' + fills.reduce(function (m, f) { return Math.max(m, f.e.fastEnd); }, 0).toFixed(1) + ' dtk (target ' + gpS.SPAWN_FILL_TIME + ')');
    // celah menutup & sisip (jalur tetap)
    gapAndInsert();
    results.push('--- ' + (fails ? fails + ' GAGAL' : 'SEMUA LULUS') + ' (' + ((performance.now() - t0) / 1000).toFixed(1) + ' dtk, ' + n + ' skenario)');
    GA.Sim.done = true; GA.Sim.fails = fails;
    return fails === 0;
  }
  function gpMaxDt() { return GA.Gameplay.DEFAULTS.MAX_DT; }
  function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

  /** Hancurkan satu bola di tengah rantai padat: celah menutup < 400 ms, bagian depan tetap berjalan normal. Sisip: bergeser halus, tanpa celah sesudahnya. */
  function gapAndInsert() {
    const L = { portrait: false, W: 960, H: 540, play: { x: 0, y: 84, w: 960, h: 456 }, ballR: 32, pad: 50 }, path = GA.Path.forLayout('serp4', L, 32);
    const gp = GA.Gameplay.resolve('sedang', 0), c = new GA.Chain.Chain(path, { r: 32, gp: gp });
    c.entryD = c.unit * 2.6; c.setQueue(specs(22, []));
    for (let i = 0; i < 700 && c.entry.phase !== 'done'; i++) c.update(1 / 60);
    for (let i = 0; i < 120; i++) c.update(1 / 60);      // diam di kecepatan normal
    const dia = c.unit;
    function closeTime(tag) {
      let t = 0; const dt = 1 / 120;
      for (; t < 2; t += dt) { c.update(dt); const s = c.spacing(); if (s.max <= HI && s.min >= LO && !c.animating()) break; }
      return t;
    }
    const mid = c.balls.filter(function (b) { return c.visible(b); });
    const target = mid[Math.floor(mid.length / 2)], idx = c.balls.indexOf(target), frontBefore = c.balls[0].d, frontIdx = idx - 2;
    const headBefore = c.balls[0].d;
    c.remove(target);
    const tClose = closeTime('hancur');
    const headMoved = c.balls[0].d - headBefore, expected = c.vNow * tClose;
    ok('bola hancur: celah menutup < 400 ms (GAP_CLOSE_SPEED ' + gp.GAP_CLOSE_SPEED + ' d/dtk)', tClose <= MAX_BAD, (tClose * 1000).toFixed(0) + ' ms');
    ok('bola hancur: bagian depan tetap berjalan normal (tidak ikut tersedot)', Math.abs(headMoved - expected) < dia * 0.35, 'bergerak ' + headMoved.toFixed(1) + ' px, harapan ≈ ' + expected.toFixed(1));
    // celah ganda (tiga bola berdekatan)
    const vis = c.balls.filter(function (b) { return c.visible(b); }), j = Math.floor(vis.length / 2);
    [vis[j], vis[j + 3]].forEach(function (b) { if (b) c.remove(b); });
    const tClose2 = closeTime('hancur3');
    ok('dua bola hancur berdekatan (celah 1 + 1 bola): semua celah menutup < 400 ms', tClose2 <= MAX_BAD, (tClose2 * 1000).toFixed(0) + ' ms');
    // sisip
    const k = Math.max(2, Math.floor(c.balls.filter(function (b) { return c.visible(b); }).length / 2)), nBefore = c.balls.length;
    const nb = c.insert(k, { kind: 'curse' });
    let maxStep = 0, prevPos = c.balls.map(function (b) { return b.d + b.vo; }), tIns = 0, tShift = -1;
    for (; tIns < 1; tIns += 1 / 120) {
      c.update(1 / 120);
      c.balls.forEach(function (b, i) { if (prevPos[i] !== undefined && i !== k) maxStep = Math.max(maxStep, Math.abs(b.d + b.vo - prevPos[i])); });
      prevPos = c.balls.map(function (b) { return b.d + b.vo; });
      if (tShift < 0 && !c.balls.some(function (b) { return b.vo !== 0; })) tShift = tIns + 1 / 120;
      if (!c.animating()) break;
    }
    const sp = c.spacing();
    ok('sisip: bola bertambah satu, tetangga bergeser halus (≤ 150 ms), tanpa celah sesudahnya', c.balls.length === nBefore + 1 && tShift > 0 && tShift <= 0.15 && sp.max <= HI && sp.min >= LO, 'bergeser ' + (tShift * 1000).toFixed(0) + ' ms (INSERT_TIME ' + gp.INSERT_TIME + '), selesai ' + (tIns * 1000).toFixed(0) + ' ms, rasio ' + sp.min.toFixed(3) + '–' + sp.max.toFixed(3));
    ok('sisip: loncatan visual per langkah kecil (tidak teleport)', maxStep < dia * 0.25, 'maks ' + maxStep.toFixed(1) + ' px per 8 ms');
    ok('sisip: tetangga hanya bergeser halus dan tidak bertabrakan (bola baru tepat di antara dua bola)', Math.abs(Math.hypot(nb.x - c.balls[k - 1].x, nb.y - c.balls[k - 1].y) / dia - gp.BALL_SPACING_FACTOR) < 0.03);
  }

  function show() {
    const pre = document.createElement('pre');
    pre.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;max-width:96vw;max-height:94vh;overflow:auto;margin:0;padding:8px;background:rgba(0,0,0,.9);color:#fff;font:11px/1.35 monospace;white-space:pre-wrap';
    pre.id = 'sim-results'; pre.textContent = results.join('\n'); document.body.appendChild(pre);
    console.log(results.join('\n'));
  }

  GA.Sim = { results: results, done: false, fails: 0, run: run, show: show };
  if (GA.Gameplay.debug.sim) setTimeout(function () { run().then(function () { show(); }).catch(function (e) { results.push('ERROR ' + e.message + '\n' + e.stack); GA.Sim.done = true; show(); }); }, 500);
})(window.GA = window.GA || {});
