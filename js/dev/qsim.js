/* dev/qsim.js — simulasi soal aktif TANPA render (GA.QSim.run). Dimuat dengan ?debug=sim (hasil tampil di layar + console; GA.QSim.results)
 * dan dipanggil dari ?test=1. Memastikan soal aktif TIDAK berubah kecuali lewat QuestionManager.advance() dengan pemicu sah:
 *   idle penuh (rantai bergerak sepanjang stage), tembakan salah, bola dicuri ke sarang, semua stage (rintangan zona, kabut, penukaran bola,
 *   boss 1-2 bar), resize & rotasi berulang, jeda/lanjut + blur, ganti kualitas, TIMEOUT boss, pemulihan snapshot,
 *   dan keterbacaan plakat soal di 390x844, 844x390, 1440x900. Tidak butuh Node: memakai game yang sama lewat GA.game.tick(dt, true). */
(function (GA) {
  'use strict';
  const results = [];
  let fails = 0;
  function ok(name, cond, info) { results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (info ? '  — ' + info : '')); if (!cond) fails++; return cond; }
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const DT = 1 / 30;
  const SEL = function (diff) { return { cat: 'add', diff: diff || 'sedang' }; };
  const FRACSEL = { cat: 'frac', diff: 'sulit' };

  /** Pemain bot: menembak bola jawaban soal aktif bila garis tembak aman (sama dengan bot di tests.js, disederhanakan). mode: 'bot' | 'wrong' | 'none'. */
  function Bot(mode, thinkSec) {
    this.mode = mode; this.think = 0; this.lastQ = -9; this.thinkSec = thinkSec == null ? 4 : thinkSec; this.shots = 0;
  }
  Bot.prototype.act = function (G, dt) {
    const r = G.run, sh = r.shooter; if (this.mode === 'none' || !r.q || G.state !== 'playing') return;
    if (r.qid !== this.lastQ) { this.lastQ = r.qid; this.think = this.thinkSec; }
    this.think -= dt; if (this.think > 0 || !sh.canFire() || G.anySettling() || r.chain.balls.some(function (b) { return b.sw; })) return;      // tunggu bola selesai bertukar tempat
    let tgt = null;
    if (this.mode === 'wrong') { const vis = G.pendingVisible().filter(function (b) { return b.qid !== r.qid && G.openLine(b); }); tgt = vis[0] || null; }
    else tgt = G.allBalls().find(function (b) { return b.kind === 'num' && b.qid === r.qid && b.ch.visible(b); });
    if (!tgt) return;
    if (G.aimAtBall(tgt) !== tgt || !G.openLine(tgt)) return;      // target-lock memilih bola itu; garis lurus bebas rintangan tinggi
    G.fire(); this.shots++; this.think = this.mode === 'wrong' ? 2 : 1.6;
  };

  /** Satu skenario: jalankan game dan amati SETIAP perubahan soal aktif. Kembalikan ringkasan pengamat. */
  async function drive(o) {
    const G = GA.game;
    G.startAdventure(o.sel || SEL(o.diff), true, o.step); G.handlers.introGo();
    for (let i = 0; i < 80 && G.state !== 'playing'; i++) await sleep(120);
    const r = G.run, qm = r.qm, bot = new Bot(o.mode || 'bot', o.think), obs = { changes: [], badChange: [], missing: 0, ticks: 0, t: 0, idMoves: 0, maxMissingRun: 0 };
    let prevQ = r.q, prevId = r.qid, prevSerial = qm.serial, prevLog = qm.log.length, prevCorrect = r.correct, missRun = 0;
    const maxT = o.secs || 200;
    if (o.setup) o.setup(r, G, obs);
    while (obs.t < maxT && (G.state === 'playing' || G.state === 'cine' || G.state === 'paused')) {
      if (G.state === 'paused') { G.handlers.resume(); continue; }
      if (o.immortal) r.lives = Math.max(r.lives, 3);
      if (o.before) o.before(obs.t, r, G, bot);
      G.tick(DT, true); obs.t += DT; obs.ticks++;
      if (o.after) o.after(obs.t, r, G, bot);
      // --- pengamat soal ---
      const id = r.qid, serial = qm.serial, lg = qm.log.length;
      if (id !== prevId || r.q !== prevQ) {
        const last = qm.log[qm.log.length - 1];
        const legit = serial > prevSerial && lg > prevLog && last && last.to === id && (last.reason !== 'ANSWERED_CORRECT' || r.correct > prevCorrect);
        obs.changes.push({ t: +obs.t.toFixed(2), from: prevId, to: id, reason: last ? last.reason : '?' });
        if (!legit) obs.badChange.push({ t: +obs.t.toFixed(2), from: prevId, to: id });
      }
      if (id >= 0) {      // jawaban untuk soal aktif harus selalu ada (di rantai atau antre di portal)
        const has = G.allBalls().some(function (b) { return b.kind === 'num' && b.qid === id; }) || r.chain.spawnQ.some(function (s) { return s.kind === 'num' && s.qid === id; });
        if (!has) { obs.missing++; missRun++; obs.maxMissingRun = Math.max(obs.maxMissingRun, missRun); } else missRun = 0;
      }
      prevId = id; prevQ = r.q; prevSerial = serial; prevLog = lg; prevCorrect = r.correct;
      bot.act(G, DT);
      if (o.stop && o.stop(obs.t, r, G)) break;
    }
    obs.r = r; obs.qm = qm; obs.state = G.state;
    obs.reasons = {}; qm.log.forEach(function (e) { obs.reasons[e.reason] = (obs.reasons[e.reason] || 0) + 1; });
    return obs;
  }
  const reasonsOnly = function (obs, allowed) { return Object.keys(obs.reasons).every(function (k) { return allowed.indexOf(k) >= 0; }); };
  const fmt = function (o) { return Object.keys(o).map(function (k) { return k + '=' + o[k]; }).join(' '); };
  const clean = function (obs, allowed, label) {
    ok(label + ': soal hanya berubah lewat pemicu sah (' + allowed.join('/') + ')', reasonsOnly(obs, allowed) && obs.badChange.length === 0 && obs.qm.violations.length === 0, fmt(obs.reasons) + (obs.badChange.length ? ' | liar: ' + JSON.stringify(obs.badChange.slice(0, 2)) : '') + ' | ' + obs.t.toFixed(0) + ' dtk');
    ok(label + ': jawaban soal aktif selalu ada (rantai / antre portal)', obs.missing === 0, 'bingkai tanpa bola target: ' + obs.missing);
  };

  /* ---------- skenario ---------- */
  async function scIdle() {
    for (const step of [0, 1, 2]) {
      const first = { q: null };
      const o = await drive({ step: step, mode: 'none', secs: 90, immortal: true, setup: function (r) { first.q = null; }, after: function (t, r) { if (!first.q && r.q) first.q = r.q; } });
      clean(o, ['STEP_START'], 'idle penuh stage ' + (step + 1) + ' (rantai bergerak, rintangan zona aktif)');
      ok('idle step ' + (step + 1) + ': teks soal tidak berubah (objek sama)', !!first.q && o.r.q === first.q && o.r.q.text === first.q.text, first.q ? first.q.text : '-');
      G().handlers.quit();
    }
  }
  const G = function () { return GA.game; };

  async function scWrong() {
    let infoOk = 0, infoBad = [], prevWrong = 0;
    const o = await drive({ step: 1, mode: 'wrong', secs: 70, immortal: true, think: 1,
      after: function (t, r) {
        if (r.wrong > prevWrong) {      // umpan balik salah: di ZONA INFORMASI, soal dengan nilai yang salah ("21 + 3 ≠ 18"), tanpa membocorkan jawaban
          prevWrong = r.wrong; const f = r.info, q = r.q;
          if (f && f.tone === 'bad' && f.math && f.math.indexOf(' ≠ ') > 0 && q && f.math.replace(' ≠ ', ' = ') !== q.text.replace('▢', q.answerText) && f.math.indexOf('▢') < 0 && r.qFlash > 0) infoOk++; else infoBad.push(f ? f.math : 'tanpa info');
        }
      } });
    clean(o, ['STEP_START', 'ANSWERED_CORRECT'], 'peluru salah (stage 2)');
    ok('peluru salah: dihitung salah (telur berkurang) tetapi soal tetap; soal hanya pindah bila tembakan kebetulan mengenai jawaban benar', o.r.wrong >= 10 && o.qm.solvedCount() === o.r.correct && o.qm.log.length === 1 + o.r.correct, 'salah ' + o.r.wrong + ', benar ' + o.r.correct + ', perubahan ' + (o.qm.log.length - 1));
    ok('umpan balik salah: pesan di zona informasi ("a + b ≠ nilai salah", tanpa jawaban benar), plakat berkedip', infoOk >= 10 && infoBad.length === 0, infoOk + ' pesan' + (infoBad.length ? ', cacat: ' + infoBad.slice(0, 2).join(' | ') : ''));
    G().handlers.quit();
  }

  async function scStolen() {
    let stolen = 0, back = 0, q0 = null, maxWait = 0, wait = 0, waiting = false, rebornSeen = 0;
    const o = await drive({ step: 0, mode: 'none', secs: 120, immortal: true,
      before: function (t, r) {
        if (!q0) q0 = r.q;
        if (waiting) return;
        if (stolen < 4 && t > 6 + stolen * 14) {      // paksa bola jawaban soal aktif sampai di sarang
          const c = r.chain.balls.some(function (b) { return b.kind === 'num' && b.qid === r.qid && r.chain.visible(b); }) ? r.chain : null;
          const tg = c && c.balls.find(function (b) { return b.kind === 'num' && b.qid === r.qid; });
          if (tg && c.hcd <= 0) { c.balls.splice(c.balls.indexOf(tg), 1); c.balls.unshift(tg); c.balls.forEach(function (b) { if (b !== tg) b.d = Math.min(b.d, c.path.length - c.D * 2); }); tg.d = c.path.length; stolen++; waiting = true; wait = 0; }
        }
      },
      after: function (t, r) {
        if (!waiting) return;
        wait += DT; const ab = r.chain.balls.find(function (b) { return b.kind === 'num' && b.qid === r.qid && r.chain.visible(b) && b.out; });
        if (ab && wait > 0.5 && ab.reborn) { back++; if (ab.reborn) rebornSeen++; maxWait = Math.max(maxWait, wait); waiting = false; }
        else if (wait > 20) { waiting = false; }
      } });
    clean(o, ['STEP_START'], 'bola jawaban dicuri ke sarang');
    ok('dicuri: bola yang sama muncul lagi dari portal (bercahaya), soal tetap', stolen >= 3 && back === stolen && rebornSeen === back && o.r.q === q0 && o.r.lives >= 0, 'dicuri ' + stolen + ', kembali ' + back + ' (reborn ' + rebornSeen + '), terlama ' + maxWait.toFixed(1) + ' dtk');
    G().handlers.quit();
  }

  async function scFull() {
    for (const step of [0, 1, 2]) {
      const o = await drive({ step: step, mode: 'bot', secs: 900, immortal: true, think: [8, 5, 4][step] });
      const solved = o.qm.log.filter(function (e) { return e.reason === 'ANSWERED_CORRECT'; }).map(function (e) { return e.from; }).sort(function (a, b) { return a - b; });
      const perm = solved.length === 20 && solved.every(function (v, i) { return v === i; });
      clean(o, ['STEP_START', 'ANSWERED_CORRECT', 'TIMEOUT'], 'stage ' + (step + 1) + ' penuh (bot)');
      ok('stage ' + (step + 1) + ': 20 soal terjawab tepat sekali masing-masing', perm && o.r.correct === 20 && o.qm.solvedCount() === 20, 'terjawab ' + solved.length + ', benar ' + o.r.correct + ', ' + fmt(o.reasons));
      ok('stage ' + (step + 1) + ': setiap perubahan soal teramati = satu jawaban benar / TIMEOUT', o.changes.length === (o.reasons.ANSWERED_CORRECT || 0) + (o.reasons.TIMEOUT || 0), o.changes.length + ' perubahan teramati');
      G().handlers.quit();
    }
  }

  /** Penukaran bola di game sungguhan (jeda dipercepat 3–5 dtk): soal aktif TIDAK berubah, pasangan sah, rantai tetap rapat, semua tahap 2 dan 3. */
  async function scSwap() {
    const E = GA.Gameplay.SWAP_EVERY, save = E.slice(); E[1] = [3, 5]; E[2] = [3, 5];
    try {
      for (const step of [1, 2]) {
        let mgr = null, badRun = 0, maxBad = 0, minR = 9, maxR = 0, qBefore = null, qChanged = 0;
        const o = await drive({ step: step, mode: 'bot', secs: 260, immortal: true, think: 9,      // bot lambat: jawaban benar membatalkan pasangan yang memuat bola soal aktif, jadi jendela penukaran harus cukup panjang
          before: function (t, r) { mgr = r.swap || mgr; },
          after: function (t, r) {
            const c = r.chain; if (!c || c.animating()) { badRun = 0; return; }
            const s = c.spacing(); if (!s.n) return; minR = Math.min(minR, s.min); maxR = Math.max(maxR, s.max);
            if (s.min < 0.96 || s.max > 1.05) { badRun++; maxBad = Math.max(maxBad, badRun); } else badRun = 0;
          },
          stop: function (t, r) { return !!mgr && mgr.stats.executed >= 5 && t > 40; } });
        clean(o, ['STEP_START', 'ANSWERED_CORRECT', 'TIMEOUT'], 'penukaran bola stage ' + (step + 1));
        ok('stage ' + (step + 1) + ': penukaran terjadi berulang (≥ 5; penjaga 4 dtk awal dan 3 dtk setelah soal berganti membatasi jendela) dan jarak bola tetap rapat sesudahnya', !!mgr && mgr.stats.executed >= 5 && maxBad < 30, 'indikator ' + (mgr ? mgr.stats.telegraphs : 0) + ', tukar ' + (mgr ? mgr.stats.executed : 0) + ', batal ' + (mgr ? mgr.stats.fizzled : 0) + (mgr && mgr.stats.why ? ' ' + JSON.stringify(mgr.stats.why) : '') + ', rasio ' + minR.toFixed(3) + '–' + maxR.toFixed(3));
        G().handlers.quit();
      }
    } finally { E[1] = save[1]; E[2] = save[2]; }
  }

  /** Overview jawaban: grid 20 chip (✓ / ✓ + titik / strip), kartu soal saat chip diketuk, hasil tersimpan dan bisa dibuka lagi; menang dan Game Over. */
  async function scOverview() {
    const U = GA.UI, S = GA.Storage;
    const mk = function (win, k) {
      const items = []; for (let i = 0; i < 20; i++) items.push({ id: i, text: (i + 1) + ' + 3 = ▢', answerText: String(i + 4), wrong: i % 4 === 1 ? 2 : 0, wrongVals: i % 4 === 1 ? ['99', '7'] : [], solved: win || i < k, first: (win || i < k) && i % 4 !== 1 });
      const first = items.filter(function (x) { return x.first; }).length;
      return { win: win, stage: 0, diff: 'sedang', eggs: win ? 2 : 0, maxEggs: 3, pct: first / 20, stars: win ? 2 : 0, items: items, score: 1234, wrong: 10, combo: 5, place: 'Lembah Hutan Naga', tag: 'Stage 1' };
    };
    U.showOverview(mk(true, 20), { next: true });
    const chips = document.querySelectorAll('#s-result .ov-chip'), ok1 = document.querySelectorAll('#s-result .ov-ok').length, redo = document.querySelectorAll('#s-result .ov-redo').length, none = document.querySelectorAll('#s-result .ov-none').length;
    ok('overview menang: 20 chip bernomor; benar langsung (✓), benar setelah salah (✓ + titik), tanpa "belum terjawab"', chips.length === 20 && ok1 === 15 && redo === 5 && none === 0, ok1 + ' / ' + redo + ' / ' + none);
    const hasIcons = [].every.call(chips, function (c) { return !!c.querySelector('svg') && !!c.getAttribute('aria-label'); });
    ok('overview: status dibedakan lewat ikon dan bentuk (bukan hanya warna), tiap chip punya label aksesibilitas', hasIcons && document.querySelector('#s-result .ov-ok .ic-check') && document.querySelector('#s-result .ov-redo .ic-checkdot'));
    chips[1].click();
    const card = document.getElementById('ov-card').textContent;
    ok('overview: ketuk chip → kartu soal lengkap + jawaban benar + jumlah salah + nilai yang sempat salah', /2/.test(card) && /5/.test(card) && /99/.test(card) && document.querySelector('#ov-card .ov-arrow'), card.replace(/\s+/g, ' ').slice(0, 60));
    ok('overview: target sentuh chip >= 44px', [].every.call(chips, function (c) { const b = c.getBoundingClientRect(); return b.width >= 43.5 && b.height >= 43.5; }), Math.round(chips[0].getBoundingClientRect().width) + 'px');
    const btns = [].map.call(document.querySelectorAll('#s-result .ov-btns [data-act]'), function (b) { return b.getAttribute('data-act'); }).join();
    ok('overview menang: tombol Ulangi, Lanjut, Menu', btns === 'ov-retry,ov-next,ov-menu', btns);
    U.showOverview(mk(false, 6), { next: false });
    const none2 = document.querySelectorAll('#s-result .ov-none').length, btns2 = [].map.call(document.querySelectorAll('#s-result .ov-btns [data-act]'), function (b) { return b.getAttribute('data-act'); }).join();
    ok('overview Game Over: soal belum terjawab bertanda strip; tanpa tombol Lanjut', none2 === 14 && btns2 === 'ov-retry,ov-menu', none2 + ' strip; ' + btns2);
    // lencana "Rekor baru!" di overview Game Over hanya bila rekor terlampaui
    U.showOverview(Object.assign(mk(false, 6), { newBest: true }), { next: false }); const nb1 = !!document.querySelector('#s-result .ov-best');
    U.showOverview(mk(false, 6), { next: false }); const nb2 = !!document.querySelector('#s-result .ov-best');
    ok('overview Game Over: lencana "Rekor baru!" hanya bila rekor terlampaui', nb1 && !nb2, nb1 + ',' + nb2);
    G().handlers.quit();
  }

  async function scLayout() {
    const sizes = [[390, 844], [844, 390], [1440, 900], [390, 844], [1440, 900], [844, 390]];
    let k = 0, q0 = null, qid0 = -1, swaps = 0, idBefore = [];
    const o = await drive({ step: 1, mode: 'bot', secs: 160, immortal: true, think: 5,
      before: function (t, r, g) {
        if (!q0) q0 = r.q;
        if (k < sizes.length && t > 4 + k * 6) {
          const q = r.q, id = r.qid; GA.devViewport = { w: sizes[k][0], h: sizes[k][1] }; g.relayout(); k++; swaps++;
          if (r.q !== q || r.qid !== id) idBefore.push('berubah saat ' + sizes.join()); if (g.state === 'paused') g.handlers.resume();
        }
      },
      stop: function (t, r) { return k >= sizes.length && t > 4 + sizes.length * 6 + 8; } });
    GA.devViewport = null; G().relayout();
    clean(o, ['STEP_START', 'ANSWERED_CORRECT'], 'resize & rotasi berulang (390×844 / 844×390 / 1440×900)');
    ok('resize/rotasi: soal aktif tidak tersentuh oleh rebuild layout', idBefore.length === 0 && swaps === sizes.length, swaps + ' perubahan ukuran, ' + o.r.correct + ' jawaban benar');
    G().handlers.quit();
  }

  async function scPause() {
    let n = 0;
    const o = await drive({ step: 0, mode: 'bot', secs: 120, immortal: true, think: 4,
      before: function (t, r, g) {
        if (t > 4 + n * 3 && n < 8) {
          const q = r.q; n++;
          if (n % 3 === 0) window.dispatchEvent(new Event('blur')); else g.handlers.pause();      // blur / tab disembunyikan = jeda otomatis
          if (g.state !== 'paused') n--; else { for (let i = 0; i < 20; i++) g.tick(DT, true); g.handlers.resume(); }
          if (r.q !== q) o2.bad++;
        }
      }, stop: function (t, r) { return n >= 8 && r.correct >= 3; } });
    clean(o, ['STEP_START', 'ANSWERED_CORRECT'], 'jeda / lanjut / blur berkali-kali');
    ok('jeda berkali-kali: ' + n + ' kali tidak mengganti soal', n >= 6 && o2.bad === 0, n + ' jeda');
    G().handlers.quit();
  }
  const o2 = { bad: 0 };

  async function scQuality() {
    const modes = ['rendah', 'sedang', 'tinggi', 'auto', 'rendah', 'tinggi']; let k = 0, bad = 0;
    const o = await drive({ step: 2, mode: 'bot', secs: 120, immortal: true, think: 4,
      before: function (t, r) { if (k < modes.length && t > 4 + k * 3) { const q = r.q; GA.Quality.setMode(modes[k++]); if (r.q !== q) bad++; } },
      stop: function (t, r) { return k >= modes.length && r.correct >= 3; } });
    GA.Quality.setMode('auto');
    clean(o, ['STEP_START', 'ANSWERED_CORRECT'], 'ganti kualitas grafis berulang');
    ok('ganti kualitas: soal aktif tidak berubah', bad === 0 && k === modes.length, k + ' pergantian');
    G().handlers.quit();
  }

  async function scTimeout() {
    // Stage 3, fase akhir boss (soal berbatas waktu): bot menjawab sampai fase itu, lalu diam sampai beberapa TIMEOUT; setelah itu selesaikan.
    let phase3 = false, idleStart = 0, expires = [], q = null, qAt = 0, lastTime = null, beforeAdv = null;
    const o = await drive({ step: 2, mode: 'bot', secs: 1200, immortal: true, think: 4,
      before: function (t, r, g, bot) {
        if (!phase3 && r.boss && r.boss.phase.questionTime > 0 && g.state === 'playing') { phase3 = true; idleStart = t; bot.mode = 'none'; }
        if (phase3 && bot.mode === 'none' && expires.length >= 3 && t > idleStart) bot.mode = 'bot';
        if (phase3 && r.qExpire > 0 && !beforeAdv) beforeAdv = { id: r.qid, t: t, queue: r.qm.queue() };
      },
      after: function (t, r) {
        const e = r.qm.log[r.qm.log.length - 1];
        if (e && e.reason === 'TIMEOUT' && (!expires.length || expires[expires.length - 1].serial !== r.qm.serial)) { expires.push({ serial: r.qm.serial, from: e.from, to: e.to, t: t, wait: beforeAdv ? t - beforeAdv.t : -1, qBefore: beforeAdv ? beforeAdv.queue : null, qAfter: r.qm.queue() }); beforeAdv = null; }
      } });
    clean(o, ['STEP_START', 'ANSWERED_CORRECT', 'TIMEOUT'], 'boss fase akhir dengan TIMEOUT');
    const moved = expires.length >= 3 && expires.every(function (e) { return e.qBefore && e.qAfter[e.qAfter.length - 1] === e.from && e.qAfter[0] === e.to && e.to !== e.from; });
    ok('TIMEOUT: efek tampil dulu (≥ 0,4 dtk) lalu soal pindah, soal lama kembali ke ujung antrean', moved && expires.every(function (e) { return e.wait >= 0.4; }), expires.length + ' TIMEOUT, jeda efek ' + expires.map(function (e) { return e.wait.toFixed(2); }).join('/'));
    const solved = o.qm.log.filter(function (e) { return e.reason === 'ANSWERED_CORRECT'; }).map(function (e) { return e.from; }).sort(function (a, b) { return a - b; });
    ok('boss + TIMEOUT: tetap 20 soal terjawab tepat sekali masing-masing', solved.length === 20 && solved.every(function (v, i) { return v === i; }), 'terjawab ' + solved.length + ', ' + fmt(o.reasons));
    G().handlers.quit();
  }

  /** Dek ber-seed: sama persis untuk seed sama; snapshot/restore (pemulihan tersimpan) mengembalikan soal & urutan yang sama. */
  function scRestore() {
    const QM = GA.QM, Lv = GA.Levels, sel = SEL('sedang'), cats = Lv.resolveCats(sel);
    let same = true, diff = false, rest = true;
    for (let s = 0; s < Lv.count; s++) {
      const cfg = Lv.build(s, sel, cats), seed = QM.seedFor(12345, s, 1);
      const a = new QM.Manager({ topics: cfg.topics, total: cfg.total, seed: seed }), b = new QM.Manager({ topics: cfg.topics, total: cfg.total, seed: seed });
      const c = new QM.Manager({ topics: cfg.topics, total: cfg.total, seed: QM.seedFor(12345, s, 2) });
      if (JSON.stringify(a.questions) !== JSON.stringify(b.questions) || a.order.join() !== b.order.join()) same = false;
      if (JSON.stringify(a.questions) !== JSON.stringify(c.questions) || a.order.join() !== c.order.join()) diff = true;
      a.advance('STEP_START'); for (let i = 0; i < 7; i++) a.advance('ANSWERED_CORRECT'); a.advance('TIMEOUT');
      const snap = JSON.parse(JSON.stringify(a.snapshot())); b.restore(snap);
      if (b.activeId !== a.activeId || b.queue().join() !== a.queue().join() || b.solvedCount() !== 7 || b.active.text !== a.active.text) rest = false;
      let frozen = Object.isFrozen(a.active) && Object.isFrozen(a.questions[0]); try { 'use strict'; a.active.text = 'x'; frozen = frozen && a.active.text !== 'x'; } catch (e) { /* mode ketat: melempar = beku */ }
      if (!frozen) rest = false;
    }
    ok('seed: dek & urutan identik untuk seed sama, berbeda untuk percobaan lain (3 stage)', same && diff);
    ok('pemulihan: snapshot → restore memberi soal aktif, antrean, dan terjawab yang sama; soal beku (immutable)', rest);
    // guard: menimpa soal aktif di luar advance() harus melempar Error (mode ketat) dan tercatat
    const G2 = GA.game; G2.startAdventure(sel, true, 0); const r = G2.run; let threw = false; const before = r.qm.violations.length;
    try { r.q = { id: 99, text: 'x' }; } catch (e) { threw = true; }
    ok('guard dev: menimpa run.q di luar advance() melempar Error dan tercatat', (!GA.QM.strict || threw) && r.qm.violations.length === before + 1 && r.q === r.qm.active, 'strict=' + GA.QM.strict);
    let bad = false; try { r.qm.advance('ASAL'); } catch (e) { bad = true; }
    ok('advance menolak alasan di luar enum tertutup', bad);
    G2.handlers.quit();
  }

  /** Keterbacaan plakat soal di 3 ukuran: pecahan bersusun, negatif, desimal — utuh (muat), tidak mengecil di bawah ukuran terbaca. */
  async function scReadable() {
    const G2 = GA.game, MT = GA.MathText, c = document.createElement('canvas').getContext('2d');
    const texts = ['−3/4 + 5/6 − 1/2 = ▢', '12,75 × 4,8 = ▢', '−125 ÷ (−5) + 17 − (−46) = ▢', '(−7) × (−12) − 38 + 99 = ▢', '▢ + 3/8 = 7/12', '123,456 + 78,9 = ▢', '(−12) × ▢ = 108', '▢ ÷ (−4,5) = 1,25'];
    G2.startAdventure(FRACSEL, true, 2); G2.handlers.introGo(); for (let i = 0; i < 80 && G2.state !== 'playing'; i++) await sleep(120);
    const r = G2.run; const q0 = r.q, out = []; let allFit = true, minPx = 1e9;
    for (const sz of [[390, 844], [844, 390], [1440, 900]]) {
      GA.devViewport = { w: sz[0], h: sz[1] }; G2.relayout(); if (G2.state === 'paused') G2.handlers.resume();
      const L = G2.layout, q = GA.HUD.geo(L).q, por = L.portrait, inner = q.h - 20, maxW = q.w - 140;
      texts.concat([q0.text]).forEach(function (tx) {
        const s = MT.fit(c, tx, maxW, inner, por ? 44 : 42), mm = MT.measure(c, tx, s);
        if (mm.w > maxW + 0.5 || mm.h > inner + 0.5) allFit = false;
        minPx = Math.min(minPx, s * L.scale);
      });
      out.push(sz.join('×') + ' plakat ' + Math.round(q.w) + '×' + Math.round(q.h));
    }
    GA.devViewport = null; G2.relayout(); if (G2.state === 'paused') G2.handlers.resume();
    ok('keterbacaan: soal (pecahan bersusun, negatif, desimal) utuh di 390×844, 844×390, 1440×900', allFit, out.join(' | '));
    ok('keterbacaan: ukuran huruf terkecil ≥ 14 px layar', minPx >= 14, 'terkecil ' + minPx.toFixed(1) + ' px');
    ok('keterbacaan: resize tidak mengubah soal aktif', r.q === q0, q0.text);
    G2.handlers.quit();
  }

  async function run() {
    const t0 = performance.now(), texts = [], oText = GA.FX.text, oPop = GA.FX.pop;
    GA.FX.text = function (x, y, s) { texts.push(String(s)); return oText.apply(GA.FX, arguments); }; GA.FX.pop = function (x, y, s) { texts.push(String(s)); return oPop.apply(GA.FX, arguments); };      // pantau teks yang melayang di peta
    for (const f of [scRestore, scIdle, scWrong, scStolen, scSwap, scOverview, scLayout, scPause, scQuality, scReadable, scFull, scTimeout]) {
      try { await f(); } catch (e) { ok(f.name, false, 'error: ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); try { GA.devViewport = null; GA.game.handlers.quit(); } catch (e2) { /* abaikan */ } }
    }
    GA.FX.text = oText; GA.FX.pop = oPop;
    ok('tidak ada teks melayang di atas peta (hanya angka skor/-1 boss)', texts.every(function (s) { return /^[+−-]?\d+$/.test(s); }), texts.length + ' popup' + (texts.some(function (s) { return !/^[+−-]?\d+$/.test(s); }) ? ', teks: ' + texts.filter(function (s) { return !/^[+−-]?\d+$/.test(s); }).slice(0, 3).join(' | ') : ''));
    results.push('--- soal aktif: ' + (fails ? fails + ' GAGAL' : 'SEMUA LULUS') + ' (' + ((performance.now() - t0) / 1000).toFixed(1) + ' dtk)');
    GA.QSim.done = true; GA.QSim.fails = fails;
  }

  function show() {
    const pre = document.createElement('pre'); pre.id = 'qsim-results';
    pre.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99999;max-width:96vw;max-height:60vh;overflow:auto;margin:0;padding:8px;background:rgba(0,0,0,.88);color:#fff;font:11px/1.35 monospace;white-space:pre-wrap';
    pre.textContent = results.join('\n'); document.body.appendChild(pre); console.log(results.join('\n'));
  }

  GA.QSim = { results: results, done: false, fails: 0, run: run, show: show };
  if (/debug=[^&]*sim/.test(location.search) && !/[?&]test(=|&|$)/.test(location.search)) setTimeout(function () { run().then(show).catch(function (e) { results.push('ERROR ' + e.message); GA.QSim.done = true; show(); }); }, 900);
})(window.GA = window.GA || {});
