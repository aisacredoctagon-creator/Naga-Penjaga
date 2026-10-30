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
    [[26, 26], [29, 29], [32, 32], [36, 32]].forEach(function (rp) {      // [radius bola stage, radius bola layout]: kategori pecahan/desimal memakai bola 1,12x
    const R = rp[0];
    lays.forEach(function (L) { L.ballR = rp[1]; L.pad = rp[1] + 18; L.hudGap = L.portrait ? 1.5 : 1.0; L.padTop = Math.round((L.hudGap + 1) * rp[1] * (L.portrait ? 1.12 : 1.05)); });
    GA.Paths.ids.forEach(function (id) {
      lays.forEach(function (L) {
        const p = GA.Path.forLayout(id, L, R), reps = [p.report];
        reps.forEach(function (rep, k) { if (rep && !rep.ok) bad.push(id + (L.portrait ? '/P' : '/L') + (k ? '#2' : '') + ': ' + rep.issues.map(function (i) { return i.msg; }).join('; ')); });
        ratio.push(p.length / Math.hypot(L.play.w, L.play.h));
      });
    });
    });
    ok('jalur: semua arketipe valid (bintang: ray test, HUD >= 2,5R, sayap, sudut <= 360°; landscape + portrait)', bad.length === 0, GA.Paths.ids.length + ' arketipe' + (bad.length ? '; gagal: ' + bad.slice(0, 3).join(' | ') : '') + '; panjang / diagonal: ' + Math.min.apply(null, ratio).toFixed(1) + '–' + Math.max.apply(null, ratio).toFixed(1) + '×');
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
    ok('sim ' + tag + ': selalu ada target terjangkau', st.none / st.frames < 0.5 && maxNoOpen < 4.5, 'bingkai tanpa jalur terbuka ' + (st.none / st.frames * 100).toFixed(1) + '%, terlama ' + maxNoOpen.toFixed(1) + ' dtk, aktif terhalang ' + (st.blocked / st.frames * 100).toFixed(1) + '%');
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

  /** Lapisan: untuk SEMUA jalur x 3 ukuran layar (390×844, 844×390, 1440×900), objek depan peta tidak menyentuh area jalur (garis tengah ± 2R = bola + margin 1R)
   *  dan setelah bermain sebentar tidak ada bola yang tertimpa elemen lain (?debug=layers: DEPAN/PORTAL/SARANG/BOSS/NAGA/RINTANGAN). */
  async function testLayers() {
    const G = GA.game, LV = GA.Levels, sizes = [[390, 844], [844, 390], [1440, 900]], bad = [], dyn = []; let n = 0, worst = 0;
    const sel = { slots: ['add', 'add', 'add', 'add', 'add'], same: true, random: false, diff: 'sedang' };
    for (const sz of sizes) {
      GA.devViewport = { w: sz[0], h: sz[1] }; G.relayout();
      for (let s = 0; s < LV.count; s++) {
        for (const p of LV.STAGES[s].pool.paths) {
          G.startAdventure(sel, true, s); G.adv.picks[s].path = p; G.startStep(s, false); G.handlers.introGo();
          for (let i = 0; i < 60 && G.state !== 'playing'; i++) await sleep(100);
          const r = G.run, path = r.path, R = r.R, pt = { x: 0, y: 0 }, e0 = GA.Effects.entryD(0); n++;
          for (let d = e0; d < path.length; d += R) { path.at(d, pt); const c = GA.Background.frontCover(pt.x, pt.y, 2 * R); if (c > worst) worst = c; if (c > 0.12 && bad.length < 4) bad.push(sz.join('×') + ' ' + p + ' d=' + Math.round(d) + ' cover=' + c.toFixed(2)); }
          for (let i = 0; i < 900; i++) { r.lives = 3; G.tick(1 / 30, true); if (i % 30 === 0 && GA.LayersDebug) G.allBalls().forEach(function (b) { const cs = GA.LayersDebug.causes(b, r, G.layout).filter(function (c) { return c !== 'HUD'; }); if (cs.length && dyn.length < 4) dyn.push(sz.join('×') + ' ' + p + ' ' + cs.join('+')); }); }
          G.handlers.quit();
        }
      }
    }
    GA.devViewport = null; G.relayout();
    ok('lapisan: objek depan tidak menyentuh area jalur (± 2R) di semua jalur x 3 layar', bad.length === 0, n + ' layout, cover maks ' + worst.toFixed(2) + (bad.length ? ' | ' + bad.join('; ') : ''));
    ok('lapisan: tidak ada bola tertimpa portal/sarang/boss/naga/rintangan/objek depan (?debug=layers)', dyn.length === 0, dyn.join('; '));
  }

  /** Indikator penukaran terlihat di 3 ukuran layar: lencana ⇄ tiap bola berada penuh di dalam area bermain (di bawah HUD, di dalam tepi), cincin tidak tertimpa
   *  (indikator digambar di lapisan 7, di atas bola/naga/efek), dan jarak pasangan bervariasi. */
  async function testSwapVisible() {
    const G = GA.game, sizes = [[390, 844], [844, 390], [1440, 900]], bad = [], gaps = {}; let n = 0, pairs = 0;
    for (const sz of sizes) {
      GA.devViewport = { w: sz[0], h: sz[1] }; G.relayout();
      for (const stage of [1, 2]) {
        G.startAdventure({ slots: ['add', 'add', 'add', 'add', 'add'], same: true, random: false, diff: 'sedang' }, true, stage); G.startStep(stage, false); G.handlers.introGo();
        for (let i = 0; i < 80 && G.state !== 'playing'; i++) await sleep(100);
        const r = G.run, V = GA.view;
        for (let i = 0; i < 700; i++) { r.lives = 3; G.tick(1 / 30, true); }
        for (let k = 0; k < 6; k++) {
          r.swap.pend = null; r.swap.last = {}; if (!GA.SwapDebug.fire()) { for (let i = 0; i < 90; i++) { r.lives = 3; G.tick(1 / 30, true); } continue; }
          for (let i = 0; i < 20; i++) { r.lives = 3; G.tick(1 / 30, true); }
          if (!r.swap.pend) continue;
          r.swap.pend.pairs.forEach(function (pr) {
            pairs++; const g = Math.abs(r.chain.balls.indexOf(pr[0]) - r.chain.balls.indexOf(pr[1])); gaps[g] = (gaps[g] || 0) + 1;
            [pr[0], pr[1]].forEach(function (q) {
              const p = GA.Swap.SwapManager.badgePos(q, r.R, 1.3, { x: 0, y: 0, r: 0 }); n++;
              if (p.y - p.r < V.hud || p.x - p.r < 0 || p.x + p.r > V.W || p.y + p.r > V.H || q.y - r.R < V.hud - 1) bad.push(sz.join('×') + ' st' + (stage + 1) + ' badge(' + Math.round(p.x) + ',' + Math.round(p.y) + ') hud ' + V.hud);
            });
          });
          for (let i = 0; i < 90; i++) { r.lives = 3; G.tick(1 / 30, true); }
        }
        G.handlers.quit();
      }
    }
    GA.devViewport = null; G.relayout();
    const ks = Object.keys(gaps), near = (gaps[1] || 0) / Math.max(1, pairs);
    ok('indikator penukaran: lencana ⇄ tiap bola terlihat penuh (di bawah HUD, di dalam layar) di 390×844, 844×390, 1440×900', n > 20 && bad.length === 0, n + ' lencana' + (bad.length ? ' | ' + bad.slice(0, 3).join('; ') : ''));
    ok('penukaran manual (?debug=swap): jarak pasangan bervariasi, bukan hanya bertetangga', ks.length >= 3 && near < 0.4, 'jarak: ' + ks.map(function (k) { return k + '×' + gaps[k]; }).join(' '));
  }

  /** Posisi bola jawaban diacak (QM.arrange, revisi 7 tahap d): (1) ribuan seed memenuhi batas keadilan: permutasi sah, deterministik per seed, beda tiap percobaan, jawaban soal pertama = bola pertama,
   *  jawaban soal ke-k hanya di antara bola yang sudah keluar saat soal itu aktif (model nominal per stage), maks 2 jawaban berurutan bertetangga; (2) DISTRIBUSI: posisi jawaban soal yang baru aktif di antara bola
   *  rantai (0% = depan/dekat sarang ... 100% = ekor/dekat portal) merata: tiap sepertiga memuat 25–42% (model nominal 5000 seed per stage, lalu bot di mesin permainan asli: bola benar-benar keluar dari portal,
   *  pemain menjawab ~6 dtk, 10% salah); (3) 20 soal terjawab tepat sekali dan tanpa macet (bot menyelesaikan stage; bola jawaban selalu ada). */
  async function testArrange() {
    const QM = GA.QM, N = 20, SEEDS = 5000, GPS = [0, 1, 2].map(function (s) { return GA.Gameplay.resolve('sedang', s); });
    let notPerm = 0, ident = 0, detBad = 0, diff = 0, firstBad = 0, hidden = 0, runBad = 0; const thirds = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], posQ0 = {}, posLast = {};
    for (let st = 0; st < 3; st++) {
      const gp = GPS[st], opt = { first: gp.SHUFFLE_FIRST, maxRun: gp.SHUFFLE_MAXRUN, lead: gp.SHUFFLE_LEAD, emit: gp.SHUFFLE_EMIT, tLead: gp.SHUFFLE_TLEAD, cons: gp.SHUFFLE_CONS, tEmit: gp.SHUFFLE_TEMIT };
      for (let s = 1; s <= SEEDS; s++) {
        const p = QM.arrange(N, QM.prng(s * 7919), opt), q = QM.arrange(N, QM.prng(s * 7919), opt), r2 = QM.arrange(N, QM.prng(s * 7919 + 1), opt);
        if (p.join() !== q.join()) detBad++; if (p.join() !== r2.join()) diff++;
        if (p.slice().sort(function (a, b) { return a - b; }).some(function (v, i) { return v !== i; })) notPerm++;
        if (p.every(function (k, i) { return k === i; })) ident++;
        const pos = []; p.forEach(function (k, i) { pos[k] = i; });
        if (pos[0] >= gp.SHUFFLE_FIRST) firstBad++;
        let runA = 1, runD = 1, bad = false;
        const used = new Array(N).fill(false); used[pos[0]] = true;
        for (let k = 1; k < N; k++) {
          runA = pos[k] === pos[k - 1] + 1 ? runA + 1 : 1; runD = pos[k] === pos[k - 1] - 1 ? runD + 1 : 1; if (runA > gp.SHUFFLE_MAXRUN || runD > gp.SHUFFLE_MAXRUN) bad = true;
          const E = QM.emitted(k, N, opt), Et = Math.max(E, QM.emitted(k, N, opt, true)); if (pos[k] >= E) hidden++;
          const ex = []; for (let q2 = 0; q2 < Et; q2++) if (!used[q2]) ex.push(q2); thirds[st][QM.thirdOf(ex.indexOf(pos[k]), ex.length)]++; used[pos[k]] = true;
        }
        if (bad) runBad++;
        if (st === 1) { posQ0[pos[0]] = (posQ0[pos[0]] || 0) + 1; posLast[pos[N - 1]] = (posLast[pos[N - 1]] || 0) + 1; }
      }
    }
    ok('posisi bola jawaban: ' + (3 * SEEDS) + ' seed (3 stage): permutasi sah, deterministik per seed, jawaban soal pertama = bola pertama, jawaban selalu di antara bola yang sudah keluar, maks ' + GPS[0].SHUFFLE_MAXRUN + ' jawaban berurutan bertetangga', notPerm === 0 && detBad === 0 && firstBad === 0 && hidden === 0 && runBad === 0, 'bukan permutasi ' + notPerm + ', beda-seed sama ' + detBad + ', pertama ' + firstBad + ', belum keluar ' + hidden + ', pola ' + runBad);
    ok('posisi bola jawaban: berbeda antar percobaan (seed lain), tidak pernah sama dengan urutan soal, soal terakhir tersebar', diff > 3 * SEEDS * 0.95 && ident === 0 && Object.keys(posLast).length >= 6, 'beda ' + diff + '/' + (3 * SEEDS) + ', identik ' + ident + ', posisi soal terakhir ' + Object.keys(posLast).length);
    const pc = thirds.map(function (t) { const s = t[0] + t[1] + t[2]; return t.map(function (v) { return 100 * v / s; }); });
    ok('distribusi (model nominal, ' + SEEDS + ' seed/stage): tiap sepertiga rantai memuat 25–42% jawaban soal aktif', pc.every(function (t) { return t.every(function (v) { return v >= 25 && v <= 42; }); }), pc.map(function (t, i) { return 'S' + (i + 1) + ' ' + t.map(function (v) { return v.toFixed(1); }).join('/'); }).join('  '));
    // mesin permainan asli: bot ?debug=pace (dimuat oleh ?test=1)
    for (let i = 0; i < 40 && !GA.Pace; i++) await sleep(50);
    if (!GA.Pace) { ok('distribusi (mesin asli): bot tersedia', false, 'js/dev/pacing.js tidak dimuat'); return; }
    const G = GA.game, rows = [];
    GA.devViewport = { w: 390, h: 844 }; G.relayout();
    let allAns = 0, allRuns = 0, bad20 = 0;
    for (let st = 0; st < 3; st++) {
      const stat = GA.Pace.newStat(); let won = 0;
      for (let s = 1; s <= 100; s++) { const x = GA.Pace.play(st, 'sedang', s, { think: [6, 2], acc: 0.9, maxT: 900, stat: stat }); allRuns++; allAns += x.answered; if (x.win) { won++; if (x.answered !== N) bad20++; } }
      const nv = stat.n - stat.hidden; rows.push({ st: st + 1, th: stat.chainA.map(function (v) { return 100 * v / nv; }), all: stat.chain.map(function (v) { return 100 * v / nv; }), hid: 100 * stat.hidden / stat.n, won: won, endG: stat.endGuard });
    }
    GA.devViewport = null; G.relayout();
    // sampel 100 putaran × 20 soal: simpangan ±1,5 poin, jadi batas uji 22–45 (tabel 300 putaran × 9 sel di docs/shuffle-d.md: 24,8–41,9%)
    ok('distribusi (mesin asli, 100 putaran/stage, potret, Sedang): di antara bola jawaban yang ada, tiap sepertiga rantai (depan/tengah/ekor) memuat ±25–42% jawaban soal aktif', rows.every(function (r) { return r.th.every(function (v) { return v >= 22 && v <= 45; }); }), rows.map(function (r) { return 'S' + r.st + ' ' + r.th.map(function (v) { return v.toFixed(1); }).join('/') + ' (semua bola terlihat ' + r.all.map(function (v) { return v.toFixed(0); }).join('/') + ')'; }).join('  '));
    ok('jawaban soal aktif sudah keluar saat aktif (mesin asli: <= 18% belum keluar dari portal; yang belum keluar dimunculkan game lewat surfaceTarget/percepatan), tidak pernah di 12% terakhir jalur', rows.every(function (r) { return r.hid <= 18 && r.endG === 0; }), rows.map(function (r) { return 'S' + r.st + ' belum keluar ' + r.hid.toFixed(1) + '%, 12% terakhir ' + r.endG; }).join('  '));
    ok('20 soal terjawab tepat sekali, tanpa macet: semua stage yang dimenangkan bot menjawab tepat 20 soal', bad20 === 0, 'putaran ' + allRuns + ', menang dengan jawaban != 20: ' + bad20);
  }

  /** Invarian jalur (revisi 8, spiral stadion + tembakan lontar) pada TIGA ukuran layar nyata (390×844, 844×390, 1440×900) untuk semua arketipe stage 1–3:
   *  INV-2 naga di tengah area bermain, jalur mengelilingi dan berujung di platform (sayap tidak menutupi), portal penuh di area, tidak di bawah HUD; INV-3 jarak antar-segmen >= 2,6R (pitch);
   *  INV-4 panjang >= 95% dari serpentin lama TERPENDEK untuk stage dan layout yang sama (commit ddd3183); INV-5 keterpilihan: dua bola non-tetangga >= 2,6R, tetangga rantai 1,96R, jadi target-lock
   *  (bola terdekat dalam 1,0R dari titik bidik) memilih bola itu sendiri untuk semua titik dalam 0,98R dari pusat bola. Juga: penyetel tidak jatuh ke cadangan, tiap stage >= 2 varian. */
  function testInvariants() {
    const G = GA.game, sizes = [[390, 844], [844, 390], [1440, 900]], bad2 = [], bad3 = [], bad4 = [], bad5 = [], badFit = []; let builds = 0, minGap = 1e9, minPct = 1e9, minLock = 1e9, minPitchSeen = 1e9, laps = [];
    const INV2 = { center: 1, wing: 1, end: 1, hud: 1, portal: 1, bounds: 1, shooter: 1, hud2: 1 };
    sizes.forEach(function (sz) {
      GA.devViewport = { w: sz[0], h: sz[1] }; G.relayout();
      const L = G.layout, R = L.ballR;
      GA.Paths.ids.forEach(function (id) {
        const p = GA.Path.forLayout(id, L, R), rep = p.report, st = rep.star, sp = st.spiral, tag = id + '@' + sz.join('×'), def = GA.Paths.resolve(id, L.portrait, L, R);
        builds++; if (rep.minGap != null) minGap = Math.min(minGap, rep.minGap / R); minPct = Math.min(minPct, sp.pct); minLock = Math.min(minLock, sp.lockMin / R); if (def.fit) { minPitchSeen = Math.min(minPitchSeen, def.fit.pitch); laps.push(def.fit.n); }
        if (def.failed) badFit.push(tag);
        rep.issues.forEach(function (i) { if (i.kind === 'length') bad4.push(tag + ' ' + i.msg); else if (i.kind === 'lock') bad5.push(tag + ' ' + i.msg); else if (i.kind === 'gap') bad3.push(tag + ' ' + i.msg); else if (INV2[i.kind]) bad2.push(tag + ' ' + i.msg); else bad2.push(tag + ' ' + i.msg); });
      });
    });
    GA.devViewport = null; G.relayout();
    const stageVar = GA.Levels.STAGES.map(function (s) { return s.pool.paths.length; });
    ok('INV-2: ' + builds + ' jalur (stage 1–3 × varian × 3 ukuran layar): naga di tengah area bermain, jalur mengelilingi dan berujung di platform, sayap tidak menutupi, portal penuh di area dan tidak di bawah HUD', bad2.length === 0, bad2.slice(0, 3).join(' | '));
    ok('INV-3: jarak antar-segmen jalur (pitch antar-lap) >= 2,6R (minimum terukur ' + minGap.toFixed(2) + 'R; pitch penyetel ≥ ' + minPitchSeen.toFixed(1) + 'R)', bad3.length === 0, bad3.slice(0, 3).join(' | '));
    ok('INV-4: panjang jalur >= 95% serpentin lama terpendek per stage dan layout (terendah terukur ' + minPct.toFixed(0) + '%)', bad4.length === 0, bad4.slice(0, 3).join(' | '));
    ok('INV-5: keterpilihan target-lock: dua bola non-tetangga >= 2,6R (terdekat ' + minLock.toFixed(2) + 'R; tetangga rantai 1,96R)', bad5.length === 0, bad5.slice(0, 3).join(' | '));
    ok('penyetel jalur menemukan bentuk lolos untuk semua ukuran (tanpa cadangan); tiap stage >= 2 varian (' + stageVar.join('/') + '); putaran ' + Math.min.apply(null, laps).toFixed(2) + '–' + Math.max.apply(null, laps).toFixed(2), badFit.length === 0 && stageVar.every(function (n) { return n >= 2; }), badFit.slice(0, 3).join(', '));
  }

  /** Telegraf penukaran (revisi 7 tahap e) di game sungguhan, 3 ukuran layar: (1) peringatan → mulai menukar SELALU >= 2000 ms (default 2500; konfigurasi di bawah 2000 dijepit); (2) fase: peringatan 0,8 dtk lalu sorot;
   *  (3) tidak ada penukaran terjadwal dalam 4 dtk pertama atau 3 dtk setelah soal aktif berganti; (4) eksekusi ditahan selama peluru terbang; (5) bola hancur selama telegraf membatalkan pasangan; (6) jeda layar membekukan hitung mundur;
   *  (7) rotasi layar di tengah telegraf tidak mengulang / memotong hitung mundur; (8) dua pasangan (Stage 3 fase 2) berwarna dan berikon beda; (9) prefers-reduced-motion: gambar statis tanpa galat, jeda tetap. */
  async function testSwapTiming() {
    const G = GA.game, sizes = [[390, 844], [844, 390], [1440, 900]], bad = [], iv = [], DT = 1 / 30, SEL = { slots: ['add', 'sub', 'mul'], same: false, random: false, diff: 'sedang' };
    let early = 0, schedN = 0, holdOk = true, cancelOk = true, pauseOk = true, rotOk = true, rotN = 0, rotSurv = 0, rotFizz = 0, motionOk = true, pairsOk = true, startBad = [];
    const tick = function (r, sec, render) { for (let i = 0, n = Math.round(sec / DT); i < n; i++) { if (G.state === 'paused') G.handlers.resume(); r.lives = 3; G.tick(DT, !render); } };
    const begin = function (stage) { G.startAdventure(SEL, true, stage); G.startStep(stage, true); G.skipCountdown(); return G.run; };
    // konfigurasi di bawah batas dijepit
    const gLow = GA.Gameplay.resolve('sedang', 1); GA.Gameplay.overrides.SWAP_TELEGRAPH_MS = 800; const gClamp = GA.Gameplay.resolve('sedang', 1); delete GA.Gameplay.overrides.SWAP_TELEGRAPH_MS;
    for (const sz of sizes) {
      GA.devViewport = { w: sz[0], h: sz[1] }; G.relayout();
      for (const stage of [1, 2]) {
        let r = begin(stage); tick(r, 14); const sw = r.swap, tag = sz.join('×') + ' st' + (stage + 1);
        // (1)+(2) manual: 3 kali, ukur dari jumlah tick
        for (let k = 0, tries = 0; k < 3 && tries < 12; tries++) {
          sw.pend = null; sw.last = {}; if (!GA.SwapDebug.fire()) { tick(r, 3); continue; }
          k++;
          let t = 0, sawWarn = false, sawHi = false; const ex0 = sw.stats.executed;
          for (let i = 0; i < 300 && sw.stats.executed === ex0 && sw.pend; i++) { const ph = sw.phase(); if (ph === 'warn') sawWarn = true; if (ph === 'hi') sawHi = true; tick(r, DT); t += DT; }
          iv.push(t); if (!(sawWarn && sawHi)) bad.push(tag + ' fase tidak lengkap');
          if (Math.abs(sw.warnDur - 0.8) > 0.01) bad.push(tag + ' peringatan ' + sw.warnDur);
          tick(r, 1.6);
        }
        // (3) jadwal: tidak dalam 4 dtk pertama / 3 dtk setelah pergantian soal
        r = begin(stage); const s2 = r.swap; s2.every = [0.1, 0.2]; s2.timer = 0.1; tick(r, 3.8); early += s2.stats.telegraphs;
        tick(r, 20); const st = s2.stats.starts.filter(function (s) { return !s.manual; }); schedN += st.length; st.forEach(function (s) { if (s.clock < 4 - 1e-6 || s.qT < 3 - 1e-6) startBad.push(tag + ' clock ' + s.clock + ' qT ' + s.qT); });
        // pergantian soal: penjaga 3 dtk
        s2.pend = null; s2.timer = 0.05; s2.qSerial = -1; s2.update(0.01); const before = s2.stats.telegraphs; tick(r, 2.5); if (s2.stats.telegraphs !== before) startBad.push(tag + ' mulai < 3 dtk setelah soal berganti');
        // (4) tahan saat peluru terbang
        r = begin(stage); tick(r, 14); const s3 = r.swap, hooks = s3.o.hooks, busy0 = hooks.busy; let flying = true; hooks.busy = function () { return flying; };
        s3.pend = null; s3.every = null; if (GA.SwapDebug.fire()) {
          const ex0 = s3.stats.executed; tick(r, 3.4); if (s3.stats.executed !== ex0 || !s3.pend) holdOk = false; flying = false; tick(r, 0.2); if (s3.stats.executed === ex0) holdOk = false;
          const last = s3.stats.intervals[s3.stats.intervals.length - 1]; if (!(last >= 3.3)) holdOk = false;
        }
        hooks.busy = busy0;
        // (5) bola hancur selama telegraf membatalkan pasangan
        tick(r, 2); s3.pend = null; s3.last = {}; if (GA.SwapDebug.fire()) { const pr = s3.pend.pairs[0], ex0 = s3.stats.executed, fz0 = s3.stats.fizzled; tick(r, 0.6); r.chain.remove(pr[0]); tick(r, 0.2); if (s3.stats.fizzled !== fz0 + 1 || s3.stats.executed !== ex0 || s3.pend) cancelOk = false; }
        // (6) jeda membekukan hitung mundur
        tick(r, 2); s3.pend = null; s3.last = {}; if (GA.SwapDebug.fire()) { tick(r, 0.7); const t0 = s3.pend.t; G.handlers.pause(); for (let i = 0; i < 90; i++) G.tick(DT, true); const t1 = s3.pend && s3.pend.t; G.handlers.resume(); if (!s3.pend || Math.abs(t1 - t0) > 0.05) pauseOk = false; }
        // (7) rotasi di tengah telegraf
        tick(r, 3); s3.pend = null; s3.last = {}; if (GA.SwapDebug.fire()) {
          rotN++; const ex0 = s3.stats.executed, fz0 = s3.stats.fizzled, pend = s3.pend; tick(r, 1.0); const tBefore = pend.t; GA.devViewport = { w: sz[1], h: sz[0] }; G.relayout(); tick(r, 0.1, true);
          if (G.run.swap !== s3) rotOk = false;
          if (s3.stats.fizzled > fz0) { rotFizz++; GA.devViewport = { w: sz[0], h: sz[1] }; G.relayout(); } else {      // bola pasangan jatuh di belakang portal pada jalur baru: dibatalkan dengan efek kecil (aturan batal), bukan telegraf yang terpotong
          rotSurv++; if (s3.pend !== pend || pend.t < tBefore) rotOk = false;
          for (let i = 0; i < 300 && s3.stats.executed === ex0 && s3.pend; i++) { if (G.state === 'paused') G.handlers.resume(); tick(r, DT); } const lastI = s3.stats.intervals[s3.stats.intervals.length - 1];
          if (!(lastI >= 2.0 && lastI < 2.7)) rotOk = false; GA.devViewport = { w: sz[0], h: sz[1] }; G.relayout(); }
        }
        // (9) reduced-motion: gambar statis tanpa galat
        tick(r, 3); s3.pend = null; s3.last = {}; GA.Swap.reduced = true;
        if (GA.SwapDebug.fire()) { try { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const cx = cv.getContext('2d'); tick(r, 1.2); const q = s3.pend.pairs[0][0], p1 = GA.Swap.SwapManager.badgePos(q, r.R, 1.0, { x: 0, y: 0, r: 0 }), p2 = GA.Swap.SwapManager.badgePos(q, r.R, 1.6, { x: 0, y: 0, r: 0 }); if (Math.abs(p1.y - p2.y) > 1e-6) motionOk = false; s3.draw(cx, 1.0, r.R); tick(r, 1.5); } catch (e) { motionOk = false; bad.push('reduced-motion: ' + e.message); } }
        GA.Swap.reduced = null;
        G.handlers.quit();
      }
    }
    // (8) dua pasangan: berwarna dan berikon berbeda; digambar tanpa galat
    const PS = GA.Swap.PAIR_STYLE; pairsOk = PS.length >= 2 && PS[0][0] !== PS[1][0] && PS[0][1] !== PS[1][1] && PS[0][2] !== PS[1][2];
    { const r = begin(2); tick(r, 20); r.swap.o.pairs = function () { return 2; }; r.swap.pend = null; r.swap.last = {}; if (GA.SwapDebug.fire()) { pairsOk = pairsOk && r.swap.pend.pairs.length === 2; try { const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32; tick(r, 1.5); r.swap.draw(cv.getContext('2d'), 1.0, r.R); } catch (e) { pairsOk = false; } } G.handlers.quit(); }
    GA.devViewport = null; G.relayout();
    const mn = Math.min.apply(null, iv), mx = Math.max.apply(null, iv);
    ok('telegraf penukaran: peringatan → mulai menukar >= 2000 ms (default ' + gLow.SWAP_TELEGRAPH_MS + ' ms; konfigurasi 800 ms dijepit ke ' + gClamp.SWAP_TELEGRAPH_MS + ' ms), 3 ukuran layar × Stage 2–3', iv.length >= 12 && mn >= 2.0 - 1e-6 && mx < 2.7 && gLow.SWAP_TELEGRAPH_MS === 2500 && gClamp.SWAP_TELEGRAPH_MS === 2000 && bad.length === 0, iv.length + ' penukaran, jeda ' + mn.toFixed(2) + '–' + mx.toFixed(2) + ' dtk' + (bad.length ? ' | ' + bad.slice(0, 3).join('; ') : ''));
    ok('telegraf penukaran: tidak ada penukaran terjadwal dalam 4 dtk pertama stage atau 3 dtk setelah soal aktif berganti', early === 0 && schedN >= 3 && startBad.length === 0, early + ' dini, ' + schedN + ' terjadwal' + (startBad.length ? ' | ' + startBad.slice(0, 3).join('; ') : ''));
    ok('telegraf penukaran: eksekusi ditahan selama peluru terbang (indikator tetap), lalu jalan; bola hancur membatalkan pasangan; jeda membekukan hitung mundur', holdOk && cancelOk && pauseOk, 'tahan ' + holdOk + ', batal ' + cancelOk + ', jeda ' + pauseOk);
    ok('telegraf penukaran: rotasi layar di tengah telegraf tidak mengulang / memotong hitung mundur (' + rotN + ' rotasi)', rotOk && rotSurv >= 3, 'rotasi ' + rotN + ': hitung mundur berlanjut ' + rotSurv + ', pasangan batal karena bola di belakang portal ' + rotFizz + ', galat ' + !rotOk);
    ok('telegraf penukaran: dua pasangan (Stage 3 fase 2) berwarna dan berikon beda; prefers-reduced-motion = cincin statis tanpa galat dengan jeda sama', pairsOk && motionOk, 'pasangan ' + pairsOk + ', reduced-motion ' + motionOk);
  }

  async function runAll() {





    const t0 = performance.now();
    testDecks(); testFormats(); testHud(); testWaves(); testStorage(); testMigrate(); testStrings(); testContrast(); testPaths(); testInvariants();
    await testStages();
    await testSteal();
    await testAudio();
    await testLayers();
    await testSwapVisible();
    await testSwapTiming();
    await testArrange();
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

  GA.Tests = { results: results, done: false, run: runAll, swapTiming: testSwapTiming };
  if (/[?&]only=swap/.test(location.search)) setTimeout(function () { testSwapTiming().then(function () { GA.Tests.done = true; }).catch(function (e) { results.push('ERROR ' + e.message + ' - ' + e.stack); GA.Tests.done = true; }); }, 600);      // ?test=1&only=swap: hanya telegraf penukaran
  else if (/[?&]only=paths/.test(location.search)) setTimeout(function () { try { testPaths(); testInvariants(); } catch (e) { results.push('ERROR ' + e.message + ' - ' + e.stack); } GA.Tests.done = true; }, 600);      // ?test=1&only=paths: hanya uji jalur
  else setTimeout(function () { runAll().catch(function (e) { results.push('ERROR ' + e.message + '\n' + e.stack); GA.Tests.done = true; console.error(e); }); }, 600);
})(window.GA = window.GA || {});
