/* dev/aimsweep.js — uji sapu sudut bidik (GA.AimSweep.run), termasuk saat diarahkan ke PORTAL. Dimuat dengan ?debug=aim (hasil di layar + console)
 * dan dipanggil dari ?test=1. Tanpa render (GA.game.tick(dt, true)).
 *
 * Untuk tiap stage x jalur x ukuran layar (390×844, 844×390, 1440×900), pada tiga saat (portal baru terbuka, bola keluar cepat, bola sudah banyak):
 *   1. sapu sudut bidik 0–360° (langkah 2°) + sudut tepat ke pusat portal ± beberapa derajat: garis bidik HARUS terhingga (tanpa NaN/Infinity),
 *      panjangnya 0..maks, stabil (dihitung dua kali memberi hasil sama), dan sama dengan ray-march peluru (berhenti di bola pertama, atau panjang maksimum);
 *   2. tembakan ke berbagai sudut (juga ke portal): tidak ada peluru yang tersangkut (semua hilang < 3 dtk), tembakan yang meleset tidak menghukum;
 *   3. geser jari (pointer sentuh) melintasi portal: sudut bidik terhingga di tiap langkah dan peluru terbang normal;
 * dan tidak ada galat di console. */
(function (GA) {
  'use strict';
  const results = [];
  let fails = 0;
  function ok(name, cond, info) { results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (info ? '  — ' + info : '')); if (!cond) fails++; return cond; }
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const VIEWS = [[390, 844], [844, 390], [1440, 900]];
  const SEL = { slots: ['add', 'sub', 'mul'], same: false, random: false, diff: 'sedang' };
  const fin = function (v) { return typeof v === 'number' && isFinite(v); };

  function marchHit(r, x, y, ux, uy, maxLen) {
    const B = GA.Shooter.Bullets;
    for (let d = 4; d <= maxLen + 40; d += 4) { const h = r.chain.hit(x + ux * d, y + uy * d, B.r); if (h) return { d: d, b: h }; }
    return null;
  }

  /** Satu skenario: kembalikan daftar masalah (string). */
  async function scenario(G, stage, pathId, mapId, view) {
    const bad = [], tag = 'S' + (stage + 1) + '/' + pathId + '/' + view.join('×');
    GA.devViewport = { w: view[0], h: view[1] }; G.relayout();
    G.startAdventure(SEL, true, stage); G.adv.picks[stage] = { path: pathId, map: mapId }; G.startStep(stage, true); G.skipCountdown();
    if (G.state !== 'playing') return [tag + ': tidak masuk playing (' + G.state + ')'];
    const r = G.run, sh = r.shooter, B = GA.Shooter.Bullets, m = { x: 0, y: 0 }, P = GA.Effects.portalPos();
    let nGuide = 0, nShots = 0;
    const checkGuide = function (what) {
      sh.muzzle(m); G.tick(0.0005, true);
      const g1 = r.guide && r.guide[0]; if (!g1) { bad.push(tag + ' ' + what + ': tanpa garis bidik'); return; }
      nGuide++;
      const len1 = Math.hypot(g1.x1 - g1.x0, g1.y1 - g1.y0);
      if (![g1.x0, g1.y0, g1.x1, g1.y1].every(fin) || len1 < 0 || len1 > 1000) { bad.push(tag + ' ' + what + ': garis bidik tidak terhingga/negatif (' + g1.x1 + ',' + g1.y1 + ' len ' + len1 + ')'); return; }
      G.tick(0.0005, true); const g2 = r.guide[0], len2 = Math.hypot(g2.x1 - g2.x0, g2.y1 - g2.y0);
      if (Math.abs(len1 - len2) > 4) {      // sinar menyerempet tepi bola: bola yang bergeser 0,02 px bisa melewati ambang sekali; tidak stabil hanya bila hasil masih berubah pada tick ketiga
        G.tick(0.000001, true); const g3 = r.guide[0], len3 = Math.hypot(g3.x1 - g3.x0, g3.y1 - g3.y0);
        if (Math.abs(len3 - len2) > 4) bad.push(tag + ' ' + what + ': garis bidik tidak stabil ' + len2.toFixed(1) + ' vs ' + len3.toFixed(1));
      }
      if (r.haz.blind > 0.3) return;
      const ux = Math.cos(sh.aim), uy = Math.sin(sh.aim), mh = marchHit(r, g2.x0, g2.y0, ux, uy, 340);
      if (mh && mh.d <= 330) { if (Math.abs(mh.d - len2) > 14) bad.push(tag + ' ' + what + ': garis berhenti ' + len2.toFixed(0) + ' padahal bola kena di ' + mh.d); }
      else if (len2 < 320) bad.push(tag + ' ' + what + ': garis berhenti ' + len2.toFixed(0) + ' padahal tidak ada bola');
    };
    const snaps = [0.4, 1.6, 6];
    let simT = 0;
    for (const T of snaps) {
      while (simT < T) { G.tick(1 / 60, true); simT += 1 / 60; if (G.state !== 'playing') return bad.concat([tag + ': state ' + G.state]); }
      for (let a = 0; a < 360; a += 2) { sh.setAngle(a * Math.PI / 180); checkGuide('sudut ' + a + ' @' + T + 's'); }
      if (P) { sh.muzzle(m); const to = Math.atan2(P.y - m.y, P.x - m.x); for (let k = -4; k <= 4; k++) { sh.setAngle(to + k * 0.012); checkGuide('portal' + (k >= 0 ? '+' : '') + k + ' @' + T + 's'); } }
    }
    // tembakan: sudut tersebar + ke portal; tidak ada peluru tersangkut; meleset = tanpa hukuman
    const angs = []; for (let a = 0; a < 360; a += 30) angs.push(a * Math.PI / 180);
    if (P) { sh.muzzle(m); const to = Math.atan2(P.y - m.y, P.x - m.x); angs.push(to, to + 0.03, to - 0.03); }
    for (const a of angs) {
      if (G.state !== 'playing') break;
      r.lives = 3; r.wrongTally = 0; sh.reload = 0; sh.setAngle(a); G.tick(1 / 60, true);
      sh.muzzle(m); const mh = marchHit(r, m.x, m.y, Math.cos(sh.aim), Math.sin(sh.aim), 1200), lives0 = r.lives, wrong0 = r.wrong;
      if (!sh.canFire() || G.anySettling()) { for (let i = 0; i < 60 && (!sh.canFire() || G.anySettling()); i++) G.tick(1 / 30, true); }
      G.fire(); nShots++;
      let t = 0, hz = false, ballsBefore = r.chain.balls.length; for (; t < 3.2 && B.list.some(function (b) { return b.on; }); t += 1 / 30) { G.tick(1 / 30, true); if (r.haz.list.length) hz = true; }
      if (B.list.some(function (b) { return b.on; })) bad.push(tag + ' tembakan ' + Math.round(a * 57.3) + '°: peluru tersangkut (> 3 dtk)');
      // meleset = tanpa hukuman: telur hilang tanpa jawaban salah dan tanpa rintangan zona aktif selama terbang = tidak wajar (bola yang baru keluar dari portal di jalur peluru = wajar)
      if (!mh && !hz && r.lives < lives0 && r.wrong === wrong0 && r.chain.balls.length >= ballsBefore) bad.push(tag + ' tembakan meleset ' + Math.round(a * 57.3) + '° dihukum tanpa sebab');
    }
    // sentuhan: geser jari melintasi portal
    if (P && G.state === 'playing') {
      const cv = document.getElementById('game'), L = G.layout, rect = cv.getBoundingClientRect(), toClient = function (x, y) { return { x: rect.left + L.ox + x * L.scale, y: rect.top + L.oy + y * L.scale }; };
      const ev = function (type, p) { cv.dispatchEvent(new PointerEvent(type, { clientX: p.x, clientY: p.y, pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true })); };
      const a0 = toClient(L.W * 0.5, L.H * 0.75), steps = 40; let prev = null;
      ev('pointerdown', a0);
      for (let i = 0; i <= steps; i++) {
        const u = i / steps, px = P.x + (u - 0.5) * 240, py = P.y + (u - 0.5) * 60, c = toClient(px, py); ev('pointermove', c); G.tick(1 / 60, true);
        if (!fin(sh.angle) || !r.guide || !r.guide[0] || ![r.guide[0].x1, r.guide[0].y1].every(fin)) { bad.push(tag + ' sentuhan: sudut/garis tidak terhingga di langkah ' + i); break; }
        prev = sh.angle;
      }
      ev('pointerup', toClient(P.x, P.y));
      let t = 0; for (; t < 3.2 && B.list.some(function (b) { return b.on; }); t += 1 / 30) G.tick(1 / 30, true);
      if (B.list.some(function (b) { return b.on; })) bad.push(tag + ' sentuhan: peluru tersangkut');
    }
    G.handlers.quit();
    return bad.concat(nGuide < 100 ? [tag + ': terlalu sedikit sampel (' + nGuide + ')'] : []);
  }

  async function run(opts) {
    opts = opts || {};
    results.length = 0; fails = 0;
    const G = GA.game, t0 = performance.now(), errs = [], oErr = console.error;
    console.error = function () { errs.push(Array.prototype.join.call(arguments, ' ').slice(0, 160)); return oErr.apply(console, arguments); };
    window.addEventListener('error', function onErr(e) { errs.push('window: ' + e.message); });
    let n = 0, problems = [];
    const stages = opts.stages || [0, 1, 2];
    for (const view of (opts.views || VIEWS)) {
      for (const st of stages) {
        const pool = GA.Levels.STAGES[st].pool;
        for (let i = 0; i < pool.paths.length; i++) {
          if (opts.maxPaths && i >= opts.maxPaths) break;
          try { const b = await scenario(G, st, pool.paths[i], pool.maps[i % pool.maps.length], view); n++; problems = problems.concat(b); }
          catch (e) { problems.push('S' + (st + 1) + '/' + pool.paths[i] + ': galat ' + e.message); try { G.handlers.quit(); } catch (e2) { /* abaikan */ } }
          await sleep(0);
        }
      }
    }
    GA.devViewport = null; G.relayout();
    console.error = oErr;
    ok('sapu sudut bidik 0–360° (termasuk ke portal, portal terbuka + bola keluar): garis terhingga, stabil, = ray-march peluru; tidak ada peluru tersangkut; sentuhan melintasi portal', problems.length === 0, n + ' skenario (stage x jalur x 390×844 / 844×390 / 1440×900)' + (problems.length ? '; ' + problems.length + ' masalah: ' + problems.slice(0, 4).join(' | ') : ''));
    ok('sapu sudut bidik: tidak ada galat di console', errs.length === 0, errs.slice(0, 2).join(' | '));
    results.push('--- bidik: ' + (fails ? fails + ' GAGAL' : 'SEMUA LULUS') + ' (' + ((performance.now() - t0) / 1000).toFixed(1) + ' dtk)');
    GA.AimSweep.done = true; GA.AimSweep.fails = fails; GA.AimSweep.problems = problems;
  }

  function show() {
    const pre = document.createElement('pre'); pre.id = 'aimsweep-results';
    pre.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;max-width:96vw;max-height:60vh;overflow:auto;margin:0;padding:8px;background:rgba(0,0,0,.88);color:#fff;font:11px/1.35 monospace;white-space:pre-wrap';
    pre.textContent = results.join('\n'); document.body.appendChild(pre); console.log(results.join('\n'));
  }

  GA.AimSweep = { results: results, done: false, fails: 0, problems: [], run: run, show: show };
  if (GA.Gameplay.debug.aim && !/[?&]test(=|&|$)/.test(location.search)) setTimeout(function () { run().then(show).catch(function (e) { results.push('ERROR ' + e.message); GA.AimSweep.done = true; show(); }); }, 900);
})(window.GA = window.GA || {});
