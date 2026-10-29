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

  /** Format soal: Stage 1 hitung hasil (a op b = ▢), Stage 2 angka hilang (solusi valid: tanpa pembagian nol, nilai pas, pecahan sederhana, desimal <= 2 angka),
   * Stage 3 gabungan (≈ separuh-separuh, tidak > 3 berturut-turut sama pada URUTAN main). Semua kategori x kesulitan x format. */
  function testFormats() {
    const Q = GA.Questions, QM = GA.QM, L = GA.Levels, prng = QM.prng, gcdf = function (a, b) { return b ? gcdf(b, a % b) : a; };
    const OPS = { '+': function (a, b) { return a + b; }, '−': function (a, b) { return a - b; }, '×': function (a, b) { return a * b; }, '÷': function (a, b) { return a / b; } };
    let bad = [], total = 0, miss = 0, blankMis = 0;
    Q.CATEGORIES.forEach(function (c) {
      L.DIFFS.forEach(function (d) {
        ['result', 'missing'].forEach(function (fm) {
          for (let k = 0; k < 8; k++) {
            const deck = Q.deck(Q.topicsFor(c.id, d), 20, prng(1000 + k * 37), fm); total++;
            const A = {}, E = {};
            deck.forEach(function (q) {
              const tag = c.id + '/' + d + '/' + fm + ': ' + q.text;
              if (A[q.answerText] || E[q.text]) bad.push('duplikat ' + tag); A[q.answerText] = 1; E[q.text] = 1;
              if (/NaN|Infinity|undefined|\?/.test(q.text + q.answerText)) bad.push('teks rusak ' + tag);
              const nb = (q.text.match(/▢/g) || []).length;
              if (fm === 'result') { if (!/ = ▢$/.test(q.text) || nb !== 1) bad.push('format hasil salah ' + tag); return; }
              miss++; if (nb !== 1 || / = ▢$/.test(q.text)) { blankMis++; bad.push('format hilang salah ' + tag); }
              const e = q.eq; if (!e) { bad.push('tanpa eq ' + tag); return; }
              const f = OPS[e.op]; if (!f) { bad.push('operator ' + e.op + ' ' + tag); return; }
              if (e.op === '÷' && (Math.abs(e.b.v) < 1e-9 || Math.abs(e.c.v) < 1e-9)) bad.push('pembagian nol ' + tag);
              const lhs = f(e.a.v, e.b.v);
              if (!isFinite(lhs) || Math.abs(lhs - e.c.v) > 1e-6) bad.push('persamaan tidak cocok ' + tag + ' (' + lhs + ' vs ' + e.c.v + ')');
              const hidden = q.text.indexOf('▢') < q.text.indexOf(e.op) ? e.a : e.b;
              if (Math.abs(hidden.v - q.answer) > 1e-3 || hidden.t !== q.answerText) bad.push('jawaban != bagian hilang ' + tag + ' ' + q.answerText);
              if (e.frac) { const m = /^(\d+)(?:\/(\d+))?$/.exec(q.answerText); if (!m || (m[2] && gcdf(+m[1], +m[2]) !== 1)) bad.push('pecahan tidak sederhana ' + tag + ' ' + q.answerText); }
              const dec = /,(\d+)/g; let mm; while ((mm = dec.exec(q.text + ' ' + q.answerText))) if (mm[1].length > 2) bad.push('desimal > 2 angka ' + tag);
              if (q.choices.some(function (ch) { return ch.text === q.answerText; })) bad.push('pengecoh = jawaban ' + tag);
            });
          }
        });
      });
    });
    ok('format soal: hasil (a op b = ▢) dan angka hilang valid untuk semua kategori x kesulitan', bad.length === 0, total + ' dek, ' + miss + ' soal hilang' + (bad.length ? '; gagal: ' + bad.slice(0, 3).join(' | ') : ''));
    // contoh dari soal nyata: ▢ + 3 = 18 memuat pengecoh 21 (menambah, bukan mengurangi)
    let sawWrongOp = false;
    for (let k = 0; k < 60 && !sawWrongOp; k++) {
      const q = Q.generate({ type: 'add', min: 5, max: 20 }, 'missing'), e = q.eq, other = /^▢/.test(q.text) ? e.b.v : e.a.v;
      if (q.choices.some(function (ch) { return ch.value === e.c.v + other; })) sawWrongOp = true;
    }
    ok('pengecoh "operasi salah" (▢ + 3 = 18 → 21) muncul pada soal angka hilang', sawWrongOp);
    // Stage 3: gabungan, pola pada urutan main
    let patOk = true, halves = [], runs = 0;
    for (let s = 0; s < 40; s++) {
      const cfg = L.build(2, { slots: ['add', 'sub', 'mul'], same: false, random: false, diff: 'sedang' }, ['add', 'sub', 'mul']);
      const qm = new QM.Manager({ topics: cfg.topics, total: 20, seed: 500 + s * 13, format: 'mixed' });
      const seq = qm.order.map(function (id) { return /▢$/.test(qm.questions[id].text) ? 'R' : 'M'; }), nR = seq.filter(function (x) { return x === 'R'; }).length;
      halves.push(nR);
      let run = 1; for (let i = 1; i < seq.length; i++) { run = seq[i] === seq[i - 1] ? run + 1 : 1; runs = Math.max(runs, run); }
      if (nR < 8 || nR > 12 || runs > 3) patOk = false;
    }
    ok('Stage 3 gabungan: ≈ separuh-separuh dan tidak > 3 soal berturut-turut berformat sama (urutan main)', patOk, 'hasil ' + Math.min.apply(null, halves) + '–' + Math.max.apply(null, halves) + ' dari 20, rangkaian terpanjang ' + runs);
  }

  /** Zona informasi: bagian HUD (di bawah plakat soal, di atas area main), tinggi tetap, tidak menimpa plakat/peta di portrait, landscape, desktop. */
  function testHud() {
    const bad = [];
    [[390, 844], [844, 390], [1440, 900]].forEach(function (sz) {
      const portrait = sz[1] > sz[0], W = portrait ? 540 : 960, H = portrait ? 960 : 540, sc = Math.min(sz[0] / W, sz[1] / H), L = { portrait: portrait, W: W, H: H, scale: sc }, G = GA.HUD.geo(L), m = G.m, z = G.info;
      if (z.y < G.q.y + G.q.h || z.y + z.h > m.h - 6 || z.x < 0 || z.x + z.w > W || m.h >= H * 0.4) bad.push(sz.join('×') + ': zona info ' + Math.round(z.y) + '–' + Math.round(z.y + z.h) + ' vs HUD ' + m.h);
      if (z.h < 24) bad.push(sz.join('×') + ': zona info terlalu pendek ' + z.h);
    });
    ok('zona informasi: di dalam HUD (bawah plakat soal), tinggi tetap, tidak menimpa peta (390×844, 844×390, 1440×900)', bad.length === 0, bad.join(' | '));
  }

  function testWaves() {
    const LV = GA.Levels, sel = { slots: ['add', 'add', 'add', 'add', 'add'], same: true, random: false, diff: 'sedang' };
    let allOk = true;
    LV.DIFFS.forEach(function (d) {
      sel.diff = d;
      for (let s = 0; s < LV.count; s++) {
        const cfg = LV.build(s, sel, LV.resolveCats(sel)), w = GA.game.buildStream(cfg, [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19], -1);
        const nums = w.filter(function (x) { return x.kind === 'num'; }), ids = {}; nums.forEach(function (x) { ids[x.qid] = 1; });
        let adj = false, early = false; w.forEach(function (x, i) { if (x.kind !== 'num') { if (i < 3) early = true; if (i > 0 && w[i - 1].kind !== 'num') adj = true; } });
        if (nums.length !== 20 || Object.keys(ids).length !== 20 || w.some(function (x) { return x.gap; }) || adj || early) { allOk = false; ok('aliran step ' + (s + 1) + '/' + d, false, nums.length + ' target' + (adj ? ', khusus berdempetan' : '') + (early ? ', khusus di awal' : '')); }
      }
    });
    ok('aliran bola: 20 target unik dalam SATU aliran tanpa jeda, khusus tidak dihitung/tersebar', allOk);
  }

  function testStrings() {
    const bad = GA.T.lint(5);
    ok('teks UI ringkas (maks. 5 kata per string, kecuali cerita)', bad.length === 0, bad.slice(0, 3).join(' | '));
  }

  function testContrast() {
    const c = GA.Dev.contrast();
    ok('kontras angka >= 4,5:1 (8 warna bola sihir)', c.min >= 4.5, 'terburuk ' + c.min.toFixed(1) + ':1');
  }

  /** Pustaka arketipe jalur: semua valid (jarak antar-segmen, radius tikungan, batas layar, ruang penembak/boss; dua jalur: jarak antar-jalur) di landscape DAN portrait. */
  function testPaths() {
    const mk = function (portrait) { const W = portrait ? 540 : 960, H = portrait ? 960 : 540, h = GA.HUD.metrics({ portrait: portrait, W: W, scale: 1 }).h; return { portrait: portrait, W: W, H: H, play: { x: 0, y: h, w: W, h: H - h - (portrait ? 12 : 0) } }; };
    const R = 29, lays = [mk(false), mk(true)], bad = [], ratio = [];
    lays.forEach(function (L) { L.ballR = R; L.pad = R + 18; });
    [26, 29, 32].forEach(function (R) {      // radius bola bervariasi (kategori pecahan/desimal memakai bola lebih besar)
    lays.forEach(function (L) { L.ballR = R; L.pad = R + 18; });
    GA.Paths.ids.forEach(function (id) {
      lays.forEach(function (L) {
        const p = GA.Path.forLayout(id, L, R), reps = [p.report];
        reps.forEach(function (rep, k) { if (rep && !rep.ok) bad.push(id + (L.portrait ? '/P' : '/L') + (k ? '#2' : '') + ': ' + rep.issues.map(function (i) { return i.msg; }).join('; ')); });
        ratio.push(p.length / Math.hypot(L.play.w, L.play.h));
      });
    });
    });
    ok('jalur: semua arketipe valid (landscape + portrait)', bad.length === 0, GA.Paths.ids.length + ' arketipe' + (bad.length ? '; gagal: ' + bad.slice(0, 3).join(' | ') : '') + '; panjang / diagonal: ' + Math.min.apply(null, ratio).toFixed(1) + '–' + Math.max.apply(null, ratio).toFixed(1) + '×');
    const LV = GA.Levels; let pool = true, info = [];
    LV.STAGES.map(function (s) { return s.pool; }).forEach(function (p, i) { const okp = p.paths.length >= 3 && p.maps.length >= 3 && p.paths.every(function (x) { return GA.Paths.has(x); }) && p.maps.every(function (m) { return !!GA.Maps[m] && !!GA.Theme.scenes[m]; }); if (!okp) { pool = false; info.push('step ' + (i + 1)); } });
    ok('tiap stage punya >= 3 arketipe jalur dan >= 3 peta berbeda', pool, info.join(','));
    const tiers = LV.HAZ_TIERS.map(function (_, i) { return LV.hazFor(i, 0.6).length; });
    ok('rintangan zona bertambah kumulatif per stage', tiers.every(function (n, i) { return i === 0 || n > tiers[i - 1]; }), 'jenis per stage: ' + tiers.join(', '));
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
    const G = GA.game, LV = GA.Levels, tag = 'stage ' + (step + 1) + '/' + diff;
    const sel = { slots: ['add', 'sub', 'mul'], same: false, random: false, diff: diff };
    G.startAdventure(sel, true, step);
    G.handlers.introGo();
    for (let i = 0; i < 60 && G.state !== 'playing'; i++) await sleep(150);
    if (G.state !== 'playing') { ok('sim ' + tag, false, 'tidak masuk ke state playing (' + G.state + ')'); return; }
    const dt = 1 / 30, maxT = 1800, st = { t: 0, noQ: 0, none: 0, blocked: 0, frames: 0, stolen0: G.run.wrong, maxQ: 0 };
    let lastCorrect = 0, stuckT = 0, maxStuck = 0, lastQ = -2, think = 0, noOpenRun = 0, maxNoOpen = 0, wrongSeen = 0, lastFire = null; const wrongInfo = [];
    const thinkSec = { mudah: 8, sedang: 6, sulit: 4 }[diff];    // bot "berpikir" seperti pemain (membaca soal + membidik)
    // jarak titik ke ruas garis tembak (untuk menunggu rintangan bergerak lewat seperti pemain sungguhan)
    const segDist = function (px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)); return Math.hypot(px - (ax + u * vx), py - (ay + u * vy)); };
    while ((G.state === 'playing' || G.state === 'cine') && st.t < maxT) {
      const r = G.run, sh = r.shooter;
      r.lives = 3; r.wrongTally = 0;      // bot sempurna tidak boleh "mati" oleh rintangan zona acak (hanya 3 telur): yang diuji = tidak macet, bukan kelangsungan hidup
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
      let m = sh.muzzle({ x: 0, y: 0 }), want = Math.atan2(ab.y - m.y, ab.x - m.x);
      for (let it = 0; it < 3; it++) { sh.setAngle(want); m = sh.muzzle({ x: 0, y: 0 }); want = Math.atan2(ab.y - m.y, ab.x - m.x); }      // mulut naga bergeser saat memutar: bidik berulang sampai konvergen
      sh.setAngle(want);
      let clear = open;
      if (clear && r.haz.blocksLine(m.x, m.y, ab.x, ab.y, Math.hypot(ab.x - m.x, ab.y - m.y) / GA.Shooter.Bullets.speed + 0.15)) clear = false;   // tunggu rintangan zona selesai (ray test prediktif)
      if (clear) for (let k = 0; k < r.haz.list.length; k++) { const e = r.haz.list[k]; if (e.mech === 'deflect' && segDist(e.x, e.y, m.x, m.y, ab.x, ab.y) < e.r + 24) { clear = false; break; } }   // ombak membelokkan api: bot sempurna menunggu (rantai rapat: peluru yang melenceng mengenai bola tetangga)
      if (clear && think <= 0 && sh.canFire() && !G.anySettling() && !r.chain.balls.some(function (b) { return b.sw; })) {
        { const B = GA.Shooter.Bullets, m2 = sh.muzzle({ x: 0, y: 0 }), ux = Math.cos(sh.aim), uy = Math.sin(sh.aim); let px = m2.x, py = m2.y, pred = null;   // diagnostik: bola pertama yang akan kena
          for (let s = 0; s < 120 && !pred; s++) { px += ux * 9; py += uy * 9; pred = r.chain.hit(px, py, B.r); }
          lastFire = { t: st.t.toFixed(0), path: r.cfg.pathId, tgt: ab.ch.balls.indexOf(ab), hit: pred ? pred.ch.balls.indexOf(pred) : -1, aim: ((Math.atan2(ab.y - m2.y, ab.x - m2.x) - sh.aim) * Math.hypot(ab.x - m2.x, ab.y - m2.y)).toFixed(0) + 'px', haz: r.haz.list.map(function (e) { return e.kind + ':' + e.mech; }).join(',') }; }
        if (lastFire.hit >= 0 && lastFire.hit !== lastFire.tgt && (st.mis = (st.mis || 0) + dt) < 2.5) { /* bola lain akan kena lebih dulu: tunggu rantai bergeser */ } else { st.mis = 0; G.fire(); think = 1.6; } }
      if (r.wrong > wrongSeen) { wrongSeen = r.wrong; if (wrongInfo.length < 3) wrongInfo.push(JSON.stringify(lastFire)); }
      if (r.correct !== lastCorrect) { lastCorrect = r.correct; stuckT = 0; } else { stuckT += dt; maxStuck = Math.max(maxStuck, stuckT); }
    }
    const hs = G.run.haz.stats, r = G.run, done = r.qm.solvedCount();
    const finished = done === 20 && r.correct === 20;
    ok('sim ' + tag + ': 20/20 soal selesai tanpa macet', finished, 'benar ' + r.correct + ', selesai ' + done + ', waktu sim ' + st.t.toFixed(0) + ' dtk, telur ' + r.lives + ', salah ' + r.wrong + ', tunggu-tanpa-soal ' + (st.noQ / st.t * 100).toFixed(0) + '%, jeda terpanjang antar-jawaban ' + maxStuck.toFixed(0) + ' dtk' + (wrongInfo.length ? '; salah pertama: ' + wrongInfo.join(' ') : ''));
    if (r.boss) ok('sim ' + tag + ': boss kalah, pola/fase naik sesuai jumlah bar (BOSS_HP_BARS)', r.boss.defeated && r.boss.tier === r.boss.tiers.length - 1 && r.boss.hp <= 0, 'pola ' + (r.boss.phaseIdx + 1) + ', hp ' + r.boss.hp);
    ok('sim ' + tag + ': selalu ada target terjangkau', st.none / st.frames < 0.35 && maxNoOpen < 4.5, 'bingkai tanpa jalur terbuka ' + (st.none / st.frames * 100).toFixed(1) + '%, terlama ' + maxNoOpen.toFixed(1) + ' dtk, aktif terhalang ' + (st.blocked / st.frames * 100).toFixed(1) + '%');
    ok('sim ' + tag + ': durasi masuk akal (1-8 menit untuk bot cepat)', st.t > 60 && st.t < 480, st.t.toFixed(0) + ' dtk');
    ok('sim ' + tag + ': rintangan zona adil (peringatan >= 1 dtk, busur <= 30%)', hs.minWarn >= 1.0 && hs.maxCover <= 0.3001, 'muncul ' + hs.spawned + ' (' + Object.keys(hs.byKind).join(',') + '), ditolak ' + hs.rejected + ', busur maks ' + (hs.maxCover * 100).toFixed(0) + '%, peringatan min ' + hs.minWarn + ' dtk');
    G.handlers.quit();
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
    ok('anti-macet: bola target yang lolos kembali ke antrean, progres tetap', back && r.correct === before && !r.qm.isSolved(qid) && r.lives === lives - 1, 'telur ' + lives + '→' + r.lives);
    G.handlers.quit();
  }

  /** Tiga stage, telur 3/3 (refresh tiap stage + Ulangi), WRONG_ANSWERS_PER_EGG, batas telur 0..3, satu portal/sarang/rantai, tanpa buff/nerf/kutukan. */
  async function testStages() {
    const G = GA.game, LV = GA.Levels, GP = GA.Gameplay.DEFAULTS, sel = { slots: ['add', 'sub', 'mul'], same: false, random: false, diff: 'sedang' };
    ok('3 stage: Stage 3 = boss, tiap stage 20 soal, format hasil/hilang/gabungan', LV.count === 3 && LV.STAGES[2].boss && LV.STAGES.map(function (s) { return s.format; }).join() === 'result,missing,mixed' && LV.TOTAL_Q === 20);
    ok('rintangan serentak maks. 2/3/4 dan jenis kumulatif', GA.Gameplay.HAZ_MAX.join() === '2,3,4' && LV.hazFor(0, 0.6).length === 2 && LV.hazFor(1, 0.6).length === 4 && LV.hazFor(2, 0.6).length > 4);
    G.startAdventure(sel, true, 0); G.handlers.introGo();
    for (let i = 0; i < 60 && G.state !== 'playing'; i++) await sleep(150);
    let r = G.run;
    ok('telur 3/3 di awal stage; satu rantai, satu sarang, tanpa buff/nerf', r.lives === 3 && r.maxLives === 3 && !!r.chain && !r.chains && !r.nest && !r.fx && !r.cfg.buff && !r.cfg.nerf);
    G.loseEgg('uji'); G.loseEgg('uji'); const after2 = r.lives; G.healEgg(); G.healEgg(); G.healEgg(); const healed = r.lives;
    ok('telur tidak pernah > 3 (telur emas) atau < 0', after2 === 1 && healed === 3, after2 + ' lalu ' + healed);
    G.handlers.quit();
    G.startAdventure(sel, true, 0); G.handlers.introGo(); for (let i = 0; i < 60 && G.state !== 'playing'; i++) await sleep(150);
    r = G.run; G.loseEgg('uji');
    const lost = r.lives; G.handlers.restart(); for (let i = 0; i < 60 && G.state !== 'playing'; i++) await sleep(150);
    ok('Ulangi: telur kembali 3/3 dan soal baru (percobaan 2)', lost === 2 && G.run.lives === 3 && G.run.attempt === 2, 'telur ' + lost + '→' + G.run.lives);
    G.handlers.quit();
  }

  /** Migrasi simpanan lama (5 step, kunci hilang/rusak) tidak crash dan dipotong ke 3 stage. */
  function testMigrate() {
    const M = GA.Storage.migrate, legacy = { sel: { slots: ['add', 'sub', 'mul', 'div', 'int'], same: false, diff: 'sulit' }, prog: { sedang: { stars: [3, 2, 1, 3, 3], best: [100, 200, 300, 400, 500] } }, highScore: 999, introSeen: true };
    let threw = false, a, b, c, d;
    try { a = M(legacy); b = M(null); c = M({ sel: 7, prog: [1], highScore: 'x', last: 5, settings: 3 }); d = M(JSON.parse('{"v":1,"prog":{"mudah":{"stars":null}}}')); } catch (e) { threw = true; }
    ok('migrasi simpanan lama: dipotong ke 3 stage, kunci rusak/hilang aman', !threw && a.v === 2 && a.sel.slots.length === 3 && a.prog.sedang.stars.join() === '3,2,1' && a.prog.sedang.best.length === 3 && a.highScore === 999 && a.introSeen === true && b.sel === null && c.highScore === 0 && d.prog.mudah.stars.join() === '0,0,0', threw ? 'melempar galat' : 'v' + a.v + ' ' + a.prog.sedang.stars.join('/'));
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
    testDecks(); testFormats(); testHud(); testWaves(); testStorage(); testMigrate(); testStrings(); testContrast(); testPaths();
    await testStages();
    await testSteal();
    await testAudio();
    for (let i = 0; i < 40 && !GA.Sim; i++) await sleep(50);
    for (let i = 0; i < 40 && !GA.AimSweep; i++) await sleep(50);
    if (GA.AimSweep) {      // sapu sudut bidik termasuk ke portal (js/dev/aimsweep.js; juga ?debug=aim)
      await GA.AimSweep.run();
      GA.AimSweep.results.forEach(function (line) { if (line.indexOf('---') !== 0) results.push(line); });
      fails += GA.AimSweep.fails;
    }
    if (GA.Sim) {      // simulasi kerapatan rantai (js/dev/chainsim.js; juga ?debug=sim)
      await GA.Sim.run();
      GA.Sim.results.forEach(function (line) { if (line.indexOf('---') !== 0) results.push(line); });
      fails += GA.Sim.fails;
    }
    for (let i = 0; i < 40 && !GA.QSim; i++) await sleep(50);
    if (GA.QSim) {      // simulasi soal aktif (js/dev/qsim.js; juga ?debug=sim)
      await GA.QSim.run();
      GA.QSim.results.forEach(function (line) { if (line.indexOf('---') !== 0) results.push(line); });
      fails += GA.QSim.fails;
    }
    const plan = [[0, 'mudah'], [1, 'sedang'], [2, 'sulit'], [2, 'sedang'], [0, 'sulit'], [1, 'mudah']];
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
