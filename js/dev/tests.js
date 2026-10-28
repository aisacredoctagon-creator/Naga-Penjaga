/* dev/tests.js — uji otomatis di browser. Buka index.html?test=1 (hasil di sudut layar + console; objek GA.Tests.results).
 *
 * Yang diuji:
 *  1. Dek soal: tiap kategori x kesulitan menghasilkan 20 soal dengan JAWABAN UNIK dan ekspresi unik.
 *  2. Gelombang: 20 bola target unik, 4-6 kelompok, bola khusus tidak dihitung.
 *  3. Simulasi bot sempurna di tiap step: semua 20 soal selesai, tidak ada macet (softlock), selalu ada bola target terjangkau,
 *     progres tidak hilang saat bola lolos ke sarang.
 *  4. Penyimpanan: kunci step berurutan.
 * Tidak ada dependensi; berjalan tanpa render (GA.game.tick(dt, true)). */
(function (GA) {
  'use strict';
  const results = [];
  let fails = 0;
  function ok(name, cond, info) { results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (info ? '  — ' + info : '')); if (!cond) fails++; }
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function testDecks() {
    const Q = GA.Questions, L = GA.Levels;
    let bad = 0, total = 0, widened = 0;
    Q.CATEGORIES.forEach(function (c) {
      L.DIFFS.forEach(function (d) {
        for (let k = 0; k < 25; k++) {
          const deck = Q.deck(Q.topicsFor(c.id, d), 20); total++;
          const a = {}, e = {}; let dup = false;
          deck.forEach(function (q) { if (a[q.answerText] || e[q.text]) dup = true; a[q.answerText] = 1; e[q.text] = 1; });
          if (deck.length !== 20 || dup) { bad++; ok('dek ' + c.id + '/' + d, false, 'panjang ' + deck.length + (dup ? ', duplikat' : '')); break; }
        }
      });
    });
    ok('dek 20 soal berjawaban unik (semua kategori x kesulitan)', bad === 0, total + ' dek diuji');
  }

  function testWaves() {
    const LV = GA.Levels, sel = { slots: ['add', 'add', 'add', 'add', 'add'], same: true, random: false, diff: 'sedang' };
    let allOk = true;
    LV.DIFFS.forEach(function (d) {
      sel.diff = d;
      for (let s = 0; s < LV.count; s++) {
        const cfg = LV.build(s, sel, LV.resolveCats(sel)), w = GA.game.buildWaves(cfg, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19], 20, -1);
        const nums = w.filter(function (x) { return x.kind === 'num'; }), ids = {}; nums.forEach(function (x) { ids[x.qid] = 1; });
        const groups = w.filter(function (x) { return x.gap > 0; }).length + 1;
        if (nums.length !== 20 || Object.keys(ids).length !== 20 || groups < 4 || groups > 6) { allOk = false; ok('gelombang step ' + (s + 1) + '/' + d, false, nums.length + ' target, ' + groups + ' kelompok'); }
      }
    });
    ok('gelombang: 20 target unik dalam 4-6 kelompok, khusus tidak dihitung', allOk);
  }

  function testStrings() {
    const bad = GA.T.lint(5);
    ok('teks UI ringkas (maks. 5 kata per string, kecuali cerita)', bad.length === 0, bad.slice(0, 3).join(' | '));
  }

  function testContrast() {
    const c = GA.Dev.contrast();
    ok('kontras angka >= 4,5:1 (8 warna bola sihir + bola api)', c.min >= 4.5, 'terburuk ' + c.min.toFixed(1) + ':1');
  }

  /** Pustaka arketipe jalur: semua valid (jarak antar-segmen, radius tikungan, batas layar, ruang penembak/boss; dua jalur: jarak antar-jalur) di landscape DAN portrait. */
  function testPaths() {
    const R = 29, lays = [{ portrait: false, W: 960, H: 540, play: { x: 0, y: 84, w: 960, h: 456 } }, { portrait: true, W: 540, H: 960, play: { x: 0, y: 150, w: 540, h: 798 } }], bad = [], ratio = [];
    lays.forEach(function (L) { L.ballR = R; L.pad = R + 18; });
    [26, 29, 32].forEach(function (R) {      // radius bola bervariasi (kategori pecahan/desimal memakai bola lebih besar)
    lays.forEach(function (L) { L.ballR = R; L.pad = R + 18; });
    GA.Paths.ids.forEach(function (id) {
      lays.forEach(function (L) {
        const p = GA.Path.forLayout(id, L, R), reps = [p.report].concat(p.second ? [p.second.report] : []);
        reps.forEach(function (rep, k) { if (rep && !rep.ok) bad.push(id + (L.portrait ? '/P' : '/L') + (k ? '#2' : '') + ': ' + rep.issues.map(function (i) { return i.msg; }).join('; ')); });
        if (!p.second) ratio.push(p.length / Math.hypot(L.play.w, L.play.h));
      });
    });
    });
    ok('jalur: semua arketipe valid (landscape + portrait, termasuk dua-sarang)', bad.length === 0, GA.Paths.ids.length + ' arketipe' + (bad.length ? '; gagal: ' + bad.slice(0, 3).join(' | ') : '') + '; panjang / diagonal: ' + Math.min.apply(null, ratio).toFixed(1) + '–' + Math.max.apply(null, ratio).toFixed(1) + '×');
    const LV = GA.Levels; let pool = true, info = [];
    LV.POOL.forEach(function (p, i) { const okp = p.paths.length >= 3 && p.maps.length >= 3 && p.paths.every(function (x) { return GA.Paths.has(x); }) && p.maps.every(function (m) { return !!GA.Maps[m] && !!GA.Theme.scenes[m]; }); if (!okp) { pool = false; info.push('step ' + (i + 1)); } });
    ok('tiap step punya >= 3 arketipe jalur dan >= 3 peta berbeda', pool, info.join(','));
    const tiers = LV.HAZ_TIERS.map(function (_, i) { return LV.hazFor(i, 0.6).length; });
    ok('rintangan zona bertambah kumulatif per step', tiers.every(function (n, i) { return i === 0 || n > tiers[i - 1]; }), 'jenis per step: ' + tiers.join(', '));
  }

  function testStorage() {
    const S = GA.Storage, saved = JSON.stringify(S.data.prog || {}), un = S.unlockAll;
    S.unlockAll = false; S.data.prog = {};
    const a = S.unlocked('sedang'); S.recordStep('sedang', 0, 2, 500); const b = S.unlocked('sedang'); S.recordStep('sedang', 3, 3, 900); const c = S.unlocked('sedang');
    ok('penyimpanan: step terbuka berurutan', a === 1 && b === 2 && c === 2, [a, b, c].join(','));
    S.data.prog = JSON.parse(saved); S.unlockAll = un; S.save();
  }

  /** Bot sempurna: menjawab soal aktif dengan menembak bola targetnya (hanya bila garis tembak terbuka). */
  async function simStep(step, diff) {
    const G = GA.game, LV = GA.Levels, tag = 'step ' + (step + 1) + '/' + diff;
    const sel = { slots: ['add', 'sub', 'mul', 'div', 'int'], same: false, random: false, diff: diff };
    G.startAdventure(sel, true, step);
    G.handlers.introGo();
    for (let i = 0; i < 60 && G.state !== 'playing'; i++) await sleep(150);
    if (G.state !== 'playing') { ok('sim ' + tag, false, 'tidak masuk ke state playing (' + G.state + ')'); return; }
    const dt = 1 / 30, maxT = 1800, st = { t: 0, noQ: 0, none: 0, blocked: 0, frames: 0, stolen0: G.run.wrong, maxQ: 0 };
    let lastCorrect = 0, stuckT = 0, maxStuck = 0, lastQ = -2, think = 0, noOpenRun = 0, maxNoOpen = 0;
    const thinkSec = { mudah: 8, sedang: 6, sulit: 4 }[diff];    // bot "berpikir" seperti pemain (membaca soal + membidik)
    // jarak titik ke ruas garis tembak (untuk menunggu rintangan bergerak lewat seperti pemain sungguhan)
    const segDist = function (px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)); return Math.hypot(px - (ax + u * vx), py - (ay + u * vy)); };
    while ((G.state === 'playing' || G.state === 'cine') && st.t < maxT) {
      const r = G.run, sh = r.shooter;
      G.tick(dt, true); st.t += dt; st.frames++;
      if (G.state === 'cine') continue;      // sinematik pindah fase boss: waktu berjalan, tidak ada tembakan
      if (G.state !== 'playing') break;
      if (!r.q) { st.noQ += dt; continue; }
      if (r.qid !== lastQ) { lastQ = r.qid; think = thinkSec; }
      think -= dt;
      const vis = G.pendingVisible();
      if (vis.length && !vis.some(G.openLine)) { st.none++; noOpenRun += dt; maxNoOpen = Math.max(maxNoOpen, noOpenRun); } else noOpenRun = 0;
      const ab = G.allBalls().find(function (b) { return b.kind === 'num' && b.qid === r.qid; });
      if (!ab) continue;
      const open = G.openLine(ab); if (!open) st.blocked++;
      const m = sh.muzzle({ x: 0, y: 0 }), want = Math.atan2(ab.y - m.y, ab.x - m.x);
      sh.setAngle(want - sh.off);
      let clear = open;
      if (clear && r.haz.blocksLine(m.x, m.y, ab.x, ab.y, Math.hypot(ab.x - m.x, ab.y - m.y) / GA.Shooter.Bullets.speed + 0.15)) clear = false;   // tunggu rintangan zona selesai (ray test prediktif)
      if (clear && r.obst.predictedHit(m.x, m.y, ab.x, ab.y, GA.Shooter.Bullets.speed, GA.Shooter.Bullets.rObs * 0.55 + 8)) clear = false;   // tunggu lava/petir lewat (ray test prediktif)
      if (clear && think <= 0 && sh.canFire() && !G.anySettling()) { G.fire(); think = 1.6; }
      if (r.correct !== lastCorrect) { lastCorrect = r.correct; stuckT = 0; } else { stuckT += dt; maxStuck = Math.max(maxStuck, stuckT); }
    }
    const hs = G.run.haz.stats, r = G.run, done = r.deck.filter(function (q) { return q.done; }).length;
    const finished = done === 20 && r.correct === 20;
    ok('sim ' + tag + ': 20/20 soal selesai tanpa macet', finished, 'benar ' + r.correct + ', selesai ' + done + ', waktu sim ' + st.t.toFixed(0) + ' dtk, telur ' + r.lives + ', salah ' + r.wrong + ', tunggu-tanpa-soal ' + (st.noQ / st.t * 100).toFixed(0) + '%, jeda terpanjang antar-jawaban ' + maxStuck.toFixed(0) + ' dtk');
    if (r.boss) ok('sim ' + tag + ': boss kalah, fase naik di jawaban ke-7 dan ke-14', r.boss.defeated && r.boss.phaseIdx === 2 && r.boss.hp <= 0, 'fase ' + (r.boss.phaseIdx + 1) + ', hp ' + r.boss.hp);
    ok('sim ' + tag + ': selalu ada target terjangkau', st.none / st.frames < 0.35 && maxNoOpen < 4.5, 'bingkai tanpa jalur terbuka ' + (st.none / st.frames * 100).toFixed(1) + '%, terlama ' + maxNoOpen.toFixed(1) + ' dtk, aktif terhalang ' + (st.blocked / st.frames * 100).toFixed(1) + '%');
    ok('sim ' + tag + ': durasi masuk akal (1-8 menit untuk bot cepat)', st.t > 60 && st.t < 480, st.t.toFixed(0) + ' dtk');
    ok('sim ' + tag + ': rintangan zona adil (peringatan >= 1 dtk, busur <= 30%)', hs.minWarn >= 1.0 && hs.maxCover <= 0.3001, 'muncul ' + hs.spawned + ' (' + Object.keys(hs.byKind).join(',') + '), ditolak ' + hs.rejected + ', busur maks ' + (hs.maxCover * 100).toFixed(0) + '%, peringatan min ' + hs.minWarn + ' dtk');
    G.handlers.quit();
  }

  /** Ray test rintangan statis: lintasan mulut naga (semua sudut bidik) tidak boleh bertabrakan dengan rintangan saat peluru keluar. */
  function testMuzzleClear() {
    const G = GA.game, LV = GA.Levels, B = GA.Shooter.Bullets; let bad = 0, n = 0, worst = '';
    const sel = { slots: ['add', 'add', 'add', 'add', 'add'], same: true, random: false, diff: 'sulit' };
    for (let s = 0; s < LV.count; s++) {
      LV.POOL[s].paths.forEach(function (p) {
        G.startAdventure(sel, true, s); G.adv.picks[s].path = p; G.startStep(s, false);
        const r = G.run, sh = r.shooter, m = { x: 0, y: 0 }; n++;
        const save = sh.angle, al = r.obst.alpha; r.obst.alpha = 0;      // hanya rintangan statis (yang bergerak bersifat sementara)
        for (let a = 0; a < 360; a += 4) {
          sh.setAngle(a * Math.PI / 180); sh.muzzle(m);
          if (r.obst.collide(m.x, m.y, B.rObs) || r.obst.crystalHit(m.x, m.y, B.rObs)) { bad++; worst = 'step ' + (s + 1) + '/' + p + ' sudut ' + a; break; }
        }
        sh.setAngle(save); r.obst.alpha = al;
        G.handlers.quit();
      });
    }
    ok('rintangan statis tidak menimpa lintasan mulut naga (semua jalur x step)', bad === 0, n + ' layout diuji' + (worst ? ', gagal: ' + worst : ''));
  }

  /** Bola target lolos ke sarang: soalnya harus keluar lagi dari portal, progres jawaban benar tetap. */
  async function testSteal() {
    const G = GA.game, sel = { slots: ['add', 'add', 'add', 'add', 'add'], same: true, random: false, diff: 'mudah' };
    G.startAdventure(sel, true, 0); G.handlers.introGo();
    for (let i = 0; i < 60 && G.state !== 'playing'; i++) await sleep(150);
    for (let i = 0; i < 3000 && !G.run.chain.balls.some(function (b) { return b.kind === 'num' && G.run.chain.visible(b); }); i++) G.tick(1 / 30, true);
    const r = G.run, ch = r.chain, target = ch.balls.find(function (b) { return b.kind === 'num'; });
    const qid = target.qid, before = r.correct, lives = r.lives;
    ch.balls.forEach(function (b) { if (b !== target) b.d = Math.min(b.d, target.d - 1); });
    target.d = r.path.length;     // paksa sampai di sarang
    for (let i = 0; i < 60; i++) G.tick(1 / 30, true);
    const back = ch.balls.some(function (b) { return b.qid === qid; }) || ch.spawnQ.some(function (s) { return s.qid === qid; });
    ok('anti-macet: bola target yang lolos kembali ke antrean, progres tetap', back && r.correct === before && !r.deck[qid].done && r.lives === lives - 1, 'telur ' + lives + '→' + r.lives);
    G.handlers.quit();
  }

  /** Step 5: dua portal, dua rantai, dua sarang; 20 soal terbagi dua; salah satu sarang kosong = kalah. */
  async function testDual() {
    const G = GA.game, sel = { slots: ['add', 'add', 'add', 'add', 'add'], same: true, random: false, diff: 'mudah' };
    G.startAdventure(sel, true, 4); G.handlers.introGo();
    for (let i = 0; i < 60 && G.state !== 'playing'; i++) await sleep(150);
    const r = G.run, ids = {}, per = [0, 0];
    r.chains.forEach(function (c, i) { c.spawnQ.concat(c.balls).forEach(function (s) { if (s.kind === 'num') { ids[s.qid] = (ids[s.qid] || 0) + 1; per[i]++; } }); });
    ok('Step 5: dua rantai, dua sarang masing-masing 3 telur', r.chains.length === 2 && !!r.nest && r.nest[0] === 3 && r.nest[1] === 3 && !!r.path.second && r.lives === 6);
    ok('Step 5: 20 soal unik terbagi dua rantai', Object.keys(ids).length === 20 && per[0] === 10 && per[1] === 10, 'rantai: ' + per.join('+'));
    const eaten = [];
    for (let k = 0; k < 3; k++) {
      const c = r.chains[1];
      for (let i = 0; i < 4000 && !c.balls.some(function (b) { return b.kind === 'num'; }); i++) { G.tick(1 / 30, true); }
      const target = c.balls.find(function (b) { return b.kind === 'num'; }); if (!target) break;
      c.balls.forEach(function (b) { if (b !== target) b.d = Math.min(b.d, target.d - 1); });
      target.d = c.path.length;
      for (let i = 0; i < 40; i++) G.tick(1 / 30, true);
      eaten.push(r.nest[0] + '/' + r.nest[1] + ':' + G.state);
    }
    ok('Step 5: bola lolos hanya memecah telur di sarangnya; sarang kosong = kalah', r.nest[0] === 3 && r.nest[1] === 0 && G.state === 'dying', eaten.join(' '));
    G.handlers.quit();
  }

  /** Audio: semua suara berbunyi tanpa galat; tiap jenis rintangan, mekanik, dan zona punya suara/ambient/musik. */
  async function testAudio() {
    const A = GA.Audio, K = GA.Hazards.KINDS, names = A.names(), miss = [];
    A.unlock(); A.errors.length = 0;
    Object.keys(K).forEach(function (k) { if (names.indexOf('hz_' + k) < 0) miss.push('hz_' + k); if (names.indexOf('hzw_' + K[k].mech) < 0) miss.push('hzw_' + K[k].mech); });
    ok('audio: tiap jenis & mekanik rintangan punya suara', miss.length === 0, miss.join(','));
    const zones = {}; Object.keys(GA.Levels.ZONE).forEach(function (id) { zones[GA.Levels.ZONE[id]] = 1; });
    const zmiss = Object.keys(zones).filter(function (z) { return A.zones.indexOf(z) < 0 || A.songs.indexOf(z) < 0; });
    ok('audio: tiap zona punya ambient dan musik sendiri', zmiss.length === 0 && A.songs.indexOf('menu') >= 0 && A.zones.indexOf('menu') >= 0, zmiss.join(','));
    names.forEach(function (nm) { A.play(nm, 3, 0.2, 0.1); });
    A.zones.forEach(function (z) { A.ambient(z); A.music(z); });
    A.intensity(2); await sleep(700); A.intensity(0); A.music('menu'); A.ambient('menu');
    ok('audio: ' + names.length + ' suara, ' + A.zones.length + ' ambient, ' + A.songs.length + ' lagu berbunyi tanpa galat', A.errors.length === 0, A.errors.slice(0, 3).join(' | '));
  }

  async function runAll() {


    const t0 = performance.now();
    testDecks(); testWaves(); testStorage(); testStrings(); testContrast(); testPaths();
    testMuzzleClear();
    await testSteal();
    await testDual();
    await testAudio();
    const plan = [[0, 'mudah'], [1, 'sedang'], [2, 'sulit'], [3, 'sedang'], [4, 'sedang'], [0, 'sulit']];
    for (const p of plan) { try { await simStep(p[0], p[1]); } catch (e) { ok('sim step ' + (p[0] + 1) + '/' + p[1], false, 'error: ' + e.message); } }
    results.push('--- ' + (fails ? fails + ' GAGAL' : 'SEMUA LULUS') + ' (' + ((performance.now() - t0) / 1000).toFixed(1) + ' dtk)');
    GA.Tests.done = true;
    const pre = document.createElement('pre');
    pre.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99999;max-width:96vw;max-height:94vh;overflow:auto;margin:0;padding:8px;background:rgba(0,0,0,.88);color:#fff;font:11px/1.35 monospace;white-space:pre-wrap';
    pre.id = 'test-results'; pre.textContent = results.join('\n'); document.body.appendChild(pre);
    console.log(results.join('\n'));
  }

  GA.Tests = { results: results, done: false, run: runAll };
  setTimeout(function () { runAll().catch(function (e) { results.push('ERROR ' + e.message + '\n' + e.stack); GA.Tests.done = true; console.error(e); }); }, 600);
})(window.GA = window.GA || {});
