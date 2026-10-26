/* main.js — loop game, layout responsif, input (Pointer Events), alur petualangan.
 *
 * Alur: Judul → Main Menu (kategori & kesulitan) → cerita (sekali) → Step 1 → Step 2 → Step 3 (boss) → hasil.
 * State: menu | countdown | intro | playing | paused | clearing | stepdone | dying | result
 * Telur (nyawa) dibawa antar-step: `adv.eggs`. Konfigurasi step ada di levels.js, soal di questions.js,
 * rintangan di obstacles.js, boss di boss.js, cerita di story.js.
 */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, FX = GA.FX, Path = GA.Path, Chain = GA.Chain, Shooter = GA.Shooter, Bullets = GA.Shooter.Bullets,
    Questions = GA.Questions, Obstacles = GA.Obstacles, Levels = GA.Levels, Bosses = GA.Bosses, UI = GA.UI, Audio = GA.Audio, Storage = GA.Storage, Story = GA.Story;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let L = null;                // layout logis
  let state = 'menu';
  let run = null;              // data step yang sedang dimainkan
  let adv = null;              // data petualangan (3 step)
  let attract = null;          // adegan dekoratif di menu
  let t = 0, last = 0, hudShown = false, frameDt = 0;
  const keys = {};
  const ptr = { down: false, onShooter: false, id: null };
  const tmpM = { x: 0, y: 0 }, shk = { x: 0, y: 0 };

  /* ================= layout & latar ================= */
  function computeLayout() {
    const cssW = window.innerWidth, cssH = window.innerHeight;
    const portrait = cssH > cssW;
    const W = portrait ? 540 : 960, H = portrait ? 960 : 540;
    const scale = Math.min(cssW / W, cssH / H);
    const dpr = Math.min(window.devicePixelRatio || 1, GA.Quality ? GA.Quality.dprCap : 2);
    const hud = UI.hudMetrics({ portrait: portrait, scale: scale, W: W }).h;
    let ballR = Theme.ballRadiusFor(W, H, scale);
    if (run && Math.abs(ballR - run.baseR) < 3) ballR = run.baseR; // jangan bangun ulang jika jendela hanya berubah sedikit
    L = { portrait: portrait, W: W, H: H, scale: scale, dpr: dpr, cssW: cssW, cssH: cssH, ox: (cssW - W * scale) / 2, oy: (cssH - H * scale) / 2,
      px: dpr * scale, hud: hud, ballR: ballR, pad: ballR + Theme.ball.trackMargin + 6, play: { x: 0, y: hud, w: W, h: H - hud - (portrait ? 12 : 0) } };
    GA.view = { W: W, H: H };
    FX.unit = ballR / 25; Bullets.setSize(run ? run.R : ballR);
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    UI.placeHudButton(L);
  }

  /** Jarak terdekat titik (x,y) ke garis tengah jalur. */
  function pathDist(path, x, y) {
    let m = 1e12; const xs = path.xs, ys = path.ys;
    for (let i = 0; i < xs.length; i += 3) { const dx = xs[i] - x, dy = ys[i] - y, d = dx * dx + dy * dy; if (d < m) m = d; }
    return Math.sqrt(m);
  }

  /** Ukuran naga/bola api/bola preview untuk jalur saat ini. */
  function fitShooter(sh, path, R) {
    sh.setSize(R);  // naga, bola api siap tembak (= bola rantai), dan bola preview dihitung dari radius bola step ini
    sh.setPos(path.shooter.x, path.shooter.y);
  }
  function makeObstacles(cfg, path, R, sh) {
    return Obstacles.create({ rocks: cfg.rocks, movers: cfg.movers, crystals: cfg.crystals }, path.shooter, L.portrait,
      { clear: function (x, y) { return pathDist(path, x, y) - (R + Theme.ball.trackMargin); }, frogR: sh.r, unit: L.ballR / 25, bounds: { y0: L.play.y, y1: L.H } });
  }

  function sceneRef() { return run || attract; }

  /** Latar tiap step (js/scenery.js): id adegan mengikuti step yang sedang dimainkan. */
  function renderBg() {
    const sc = sceneRef(), id = run ? run.cfg.scene : 'menu';
    GA.Scenery.build(canvas, L, id, sc ? sc.path : null, sc ? sc.R : 0);
    GA.Effects.setPath(L, sc ? sc.path : null, sc ? sc.R : 0, id);
    if (sc && sc.chain) sc.chain.entryD = GA.Effects.entryD();
  }

  function relayout() {
    const wasPortrait = L ? L.portrait : null;
    computeLayout();
    if (wasPortrait !== null && wasPortrait !== L.portrait) {
      if (run) { rebuildForOrientation(run); if (state === 'playing') pauseGame(); }   // layar berputar: jeda otomatis, jalur dibangun ulang, posisi bola dipetakan menurut jarak relatif
      if (attract) buildAttract();
    }
    renderBg();
  }

  /** Orientasi berubah di tengah permainan: bangun ulang jalur, pertahankan posisi relatif rantai. */
  function rebuildForOrientation(r) {
    const newR = stageR(r.cfg), np = Path.forLayout(r.cfg.pathId, L, newR);
    const f = (2 * newR + 1) / (r.chain ? r.chain.D : 2 * r.R + 1);   // jarak antar-bola berubah mengikuti radius baru
    r.path = np; r.baseR = L.ballR; r.R = newR;
    if (r.chain) { r.chain.zones = np.zones; r.chain.overWindows = np.overWindows; r.chain.r = newR; r.chain.D = 2 * newR + 1; r.chain.minFront = newR * 8; r.chain.setPath(np, f); }
    fitShooter(r.shooter, np, newR);
    const on = r.obst.on;
    r.obst = makeObstacles(r.cfg, np, newR, r.shooter); r.obst.on = on; r.obst.alpha = on ? 1 : 0;
    if (r.boss) { r.boss.x = np.boss.x; r.boss.y = np.boss.y; r.boss.R = Math.round(2.45 * L.ballR); }
    Bullets.setSize(newR); Bullets.clear();
    r.shooter.setAngle(-Math.PI / 2);
  }

  /* ================= adegan menu (dekoratif) ================= */
  function buildAttract() {
    const R = L.ballR, path = Path.forLayout('hook', L, R);
    const chain = new Chain.Chain(path, { r: R, speed: 34, maxBalls: 26 });
    chain.fill(Math.min(24, Math.ceil(path.length * 0.55 / (2 * R + 1)) + 1), path.length * 0.55, 0);
    const sh = new Shooter.Shooter(); fitShooter(sh, path, R);
    attract = { path: path, chain: chain, shooter: sh, R: R, obst: null, boss: null };
  }

  function updateAttract(dt) {
    const a = attract;
    a.chain.update(dt);
    a.shooter.setAngle(-Math.PI / 2 + Math.sin(t * 0.6) * 1.1);
    a.shooter.update(dt);
    if (a.chain.holeReached()) a.chain.fill(Math.min(24, Math.ceil(a.path.length * 0.2 / a.chain.D) + 1), a.path.length * 0.2, 0);
  }

  /* ================= soal & label bola ================= */
  /** Teks efektif sebuah bola (memperhitungkan animasi balik label). Kebenaran dinilai dari TEKS, jadi pecahan 1/2 ≠ 2/4. */
  function ballText(b) { return b.nt !== null && b.nt !== undefined ? b.nt : b.text; }
  function isCorrectText(txt) { return !!run.q && txt === run.q.answerText; }

  function numLabel(b) {
    const q = run.q;
    if (!q) { b.value = 1 + Math.floor(Math.random() * 20); b.text = String(b.value); return; }
    if (Math.random() < run.cfg.pCorrect) { b.value = q.answer; b.text = q.answerText; return; }
    if (!run.bag.length) { run.bag = q.choices.slice(); for (let i = run.bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = run.bag[i]; run.bag[i] = run.bag[j]; run.bag[j] = x; } }
    const c = run.bag.pop(); b.value = c.value; b.text = c.text;
  }

  function labelBall(b) {
    const sp = run && run.cfg.specials;
    if (sp && run.playing) {
      let r = Math.random();
      for (const k of ['curse', 'frost', 'egg']) {
        const p = sp[k] || 0;
        if (k === 'egg' && run.lives >= run.maxLives) continue;
        if (r < p) { b.kind = k; b.value = 0; b.text = ''; return; }
        r -= p;
      }
    }
    b.kind = 'num'; numLabel(b);
  }

  function relabelAll() {
    run.bag = [];
    run.chain.relabel(numLabel);
    ensureCorrect();
  }

  /** Pastikan minimal satu bola benar tersedia (di layar bila ada bola yang terlihat). */
  function ensureCorrect() {
    if (!run.q) return;
    const ch = run.chain;
    let visCorrect = 0, anyCorrect = 0;
    const visNum = [], allNum = [];
    for (const b of ch.balls) {
      if (b.kind !== 'num') continue;
      const ok = isCorrectText(ballText(b));
      allNum.push(b); if (ok) anyCorrect++;
      if (ch.visible(b)) { visNum.push(b); if (ok) visCorrect++; }
    }
    let pick = null;
    if (visNum.length && visCorrect === 0) pick = visNum[Math.floor(Math.random() * visNum.length)];
    else if (!visNum.length && !anyCorrect && allNum.length) pick = allNum[0];
    if (!pick) return;
    if (ch.visible(pick)) { pick.nv = run.q.answer; pick.nt = run.q.answerText; pick.flipT = 0.36; }
    else { pick.value = run.q.answer; pick.text = run.q.answerText; }
  }

  function nextQuestion() {
    run.q = run.qs.next();
    run.qPop = 0.35;
    const ph = run.boss ? run.boss.phase : null;
    run.qTimeMax = (ph && ph.questionTime) || run.cfg.questionTime || 0;
    run.qTime = run.qTimeMax;
    if (run.chain) relabelAll();
  }

  /** Terapkan fase boss: kecepatan rantai, rintangan bergerak, jenis soal. */
  function applyPhase() {
    const b = run.boss, ph = b.phase;
    run.chain.speedMul = ph.speedMul;
    run.obst.setMovers(ph.movers);
    run.qs = new Questions.Session(b.topics, { maxChoices: run.cfg.maxChoices });
  }

  /* ================= mantra & rintangan dinamis ================= */
  /** Kabut sihir: sembunyikan angka `count` bola yang terlihat selama `dur` detik (tetap ada minimal satu jawaban benar yang terbaca). */
  function fogBalls(count, dur) {
    const ch = run.chain, vis = ch.balls.filter(function (b) { return b.kind === 'num' && ch.visible(b); });
    for (let i = vis.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = vis[i]; vis[i] = vis[j]; vis[j] = x; }
    vis.slice(0, count).forEach(function (b) { b.fog = dur; b.fogAge = 0; });
    const clearCorrect = vis.some(function (b) { return isCorrectText(ballText(b)) && b.fog <= 0; });
    if (!clearCorrect) { const c = vis.find(function (b) { return isCorrectText(ballText(b)); }); if (c) c.fog = 0; }
    Audio.play('spell');
  }

  function swapSomeBalls(pairs) {
    const ch = run.chain, vis = ch.balls.filter(function (b) { return b.kind === 'num' && ch.visible(b); });
    for (let k = 0; k < pairs && vis.length >= 2; k++) {
      const a = vis.splice(Math.floor(Math.random() * vis.length), 1)[0], b = vis.splice(Math.floor(Math.random() * vis.length), 1)[0];
      if (!b) break;
      if (ballText(a) !== ballText(b)) { ch.swapLabels(a, b); FX.ring(a.x, a.y, '#c9a0ff', 44); FX.ring(b.x, b.y, '#c9a0ff', 44); }
    }
    Audio.play('swap');
  }

  function castSpell(name) {
    Audio.play('spell'); FX.flash(0.25, '170,110,255');
    if (name === 'fog') fogBalls(3 + (run.boss.phaseIdx >= 2 ? 1 : 0), 6);
    else if (name === 'frost') { run.shooter.freeze(1.4); Audio.play('frost'); FX.text(run.shooter.x, run.shooter.y - run.shooter.r - 16, 'Beku!', '#9fe0ff', 30); }
    else if (name === 'swap') swapSomeBalls(2);
    FX.ring(run.boss.x, run.boss.y, '#c9a0ff', run.boss.R * 1.6);
  }

  /* ================= petualangan & step ================= */
  /** Radius bola rantai untuk step ini (bola desimal/pecahan boleh sedikit lebih besar). */
  function stageR(cfg) { return Math.min(L.ballR * cfg.ballScale, L.ballR * 1.2); }

  function buildRun(cfg) {
    const R = stageR(cfg);
    Theme.setScene(cfg.scene);
    const path = Path.forLayout(cfg.pathId, L, R);
    cfg.maxBalls = Math.max(10, Math.round(path.length / (2 * R + 1) * 0.55 * cfg.maxBalls / 18));   // jumlah bola mengikuti panjang jalur
    cfg.startBalls = Math.min(cfg.maxBalls, 14);
    const shooter = new Shooter.Shooter(); fitShooter(shooter, path, R);
    run = {
      cfg: cfg, path: path, R: R, baseR: L.ballR, shooter: shooter, chain: null, boss: null,
      obst: makeObstacles(cfg, path, R, shooter), bats: cfg.bats ? new Obstacles.BatSwarm(cfg.bats) : null,
      lives: adv.eggs, maxLives: adv.maxEggs, startEggs: adv.eggs, stepNo: cfg.step + 1,
      score: adv.score, scoreAtStart: adv.score, scoreShown: adv.score, combo: 0, maxCombo: 0, comboPulse: 0,
      correct: 0, wrong: 0, shots: 0, progress: 0, qs: null, q: null, qPop: 0, qTime: 0, qTimeMax: 0, bag: [],
      feedback: null, lifeLostT: 0, holeCd: 0, ensureT: 0, fogT: cfg.fog ? cfg.fog.every * 0.6 : 0,
      playing: false, clearT: 0, clearQ: null, dyingT: 0, reason: '', time: 0, bossDone: false, guide: []
    };
    if (cfg.isBoss) {
      run.boss = Bosses.create(cfg.boss, path.boss, Math.round(2.45 * L.ballR));
      run.boss.speech = ''; run.boss.speechT = 0; // dialog muncul setelah hitung mundur
      run.obst.on = false; run.obst.alpha = 0;    // rintangan bergerak baru aktif di fase 2
    }
    FX.reset(); Bullets.setSize(R); Bullets.clear();
    renderBg();
    GA.Effects.resetPortal(false);
  }

  function introInfo(cfg) {
    const d = Levels.describe(cfg), cat = Questions.categoryById(cfg.cat), sp = [], sps = cfg.specials || {};
    ['curse', 'frost', 'egg'].forEach(function (k) { if ((sps[k] || 0) > 0) sp.push(k); });
    return {
      tag: cfg.tag, place: cfg.place, story: cfg.story, catName: cfg.isBoss ? cat.name + ' + campuran' : cat.name, catIcon: cat.icon,
      exampleHtml: GA.MathText.html(d.exampleText), rangeText: d.rangeText, notes: cfg.notes, specials: sp,
      diffName: Levels.DIFF_NAMES[cfg.diff]
    };
  }

  /** Mulai petualangan baru dengan pilihan menu `sel`. skipStory: lewati cerita meskipun belum pernah dilihat. */
  function startAdventure(sel, skipStory) {
    Audio.resume();
    const cats = Levels.resolveCats(sel);
    adv = { picks: [0, 1, 2].map(function (i) { return Levels.pick(i); }), sel: sel, cats: cats, key: sel.random ? null : Storage.runKey(cats, sel.diff), step: 0, eggs: Levels.START_EGGS, maxEggs: Levels.MAX_EGGS, score: 0,
      stars: [0, 0, 0], correct: 0, wrong: 0, maxCombo: 0, snap: { eggs: Levels.START_EGGS, score: 0 } };
    run = null; if (!attract) buildAttract();
    if (!skipStory && !Storage.introSeen) {
      state = 'story'; renderBg();
      UI.showStory(Story.intro, { onDone: function () { Storage.introSeen = true; startStep(0, false); } });
    } else startStep(0, false);
  }

  function startStep(n, skipIntro) {
    UI.cancelCountdown(); Audio.resume();
    adv.step = n; adv.snap = { eggs: adv.eggs, score: adv.score };
    const cfg = Levels.build(n, adv.sel, adv.cats);
    cfg.pathId = adv.picks[n].path; cfg.scene = adv.picks[n].map;   // jalur & peta dipilih acak per petualangan; Ulangi memakai yang sama
    buildRun(cfg);
    Audio.music(cfg.scene);
    if (skipIntro) { state = 'countdown'; GA.Effects.openPortal(); UI.countdown(beginPlay); }
    else { state = 'intro'; UI.showIntro(introInfo(cfg)); }
  }

  function beginPlay() {
    const cfg = run.cfg, len = run.path.length;
    run.playing = true;
    run.qs = new Questions.Session(run.boss ? run.boss.topics : cfg.topics, { maxChoices: cfg.maxChoices });
    run.chain = new Chain.Chain(run.path, { r: run.R, speed: cfg.speed, maxBalls: cfg.maxBalls, labeler: labelBall });
    run.chain.entryD = GA.Effects.entryD(); run.chain.zones = run.path.zones; run.chain.overWindows = run.path.overWindows;
    run.chain.onEmerge = function (b) { GA.Effects.pulse(0.55); const p = GA.Effects.portalPos(); if (p) FX.embers(p.x, p.y, Math.cos(p.a) * 90, Math.sin(p.a) * 90, 4, run.R * 0.5, '#d9b8ff'); };
    run.q = run.qs.next(); run.qPop = 0.35;
    if (run.boss) {
      applyPhase();
      run.q = run.qs.next();
      run.boss.say(run.boss.phase.say, 3.4); run.boss.resetSpellTimer();
      run.qTimeMax = run.boss.phase.questionTime || 0;
    } else run.qTimeMax = cfg.questionTime || 0;
    run.qTime = run.qTimeMax;
    const D = run.chain.D, front = len * 0.34;     // rantai awal menutup jalur dari pintu masuk sampai bola terdepan
    run.chain.fill(Math.min(cfg.maxBalls, Math.ceil(front / D) + 1), front, Math.min(len * 0.22, 520));
    ensureCorrect();
    run.shooter.reset();
    state = 'playing';
  }

  /* ================= telur (nyawa) & akibat tembakan ================= */
  function loseEgg(reason) {
    run.lives = Math.max(0, run.lives - 1);
    run.lifeLostT = 0.6; run.combo = 0; run.reason = reason;
    run.shooter.react('hurt');
    FX.shake(14); FX.flash(0.5, '255,50,70');
    if (run.lives <= 0 && state === 'playing') gameOver();
  }

  function gameOver() {
    state = 'dying'; run.dyingT = 0; Bullets.clear(); run.shooter.react('sad');
    Audio.play('lose');
    syncAdv();
    Storage.noteScore(run.score);
  }

  function setFeedback(text, hint, good) { run.feedback = { text: text, hint: hint || '', good: good, t: good ? 1.4 : 4.2 }; }

  function ballColors(b) { return Theme.ballColors[b.ci % 8]; }

  function onCorrect(bullet, ball) {
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo); run.comboPulse = 0.5;
    const pts = (100 + 25 * Math.min(run.combo - 1, 8)) * bullet.ammo.mult;
    run.score += pts; run.correct++;
    run.chain.remove(ball);
    FX.shatter(ball.x, ball.y, ballColors(ball), run.R);
    FX.fireImpact(bullet.x, bullet.y, true, run.R);
    FX.pop(ball.x, ball.y - 24, '+' + pts, 'score', 30);
    if (run.combo >= 3) FX.pop(ball.x, ball.y - 62, ['Hebat!', 'Mantap!', 'Luar biasa!'][run.combo % 3] + ' ×' + run.combo, 'combo', 24);
    Audio.play('correct', run.combo);
    run.chain.retreat((run.cfg.retreat + Math.min(run.combo, 5) * 20) * (1 + 0.4 * (run.R / 25 - 1)));
    run.shooter.react('happy');
    run.feedback = null;

    if (run.boss) {
      const r = run.boss.hit();
      run.progress = (run.boss.maxHp - run.boss.hp) / run.boss.maxHp;
      Audio.play('bossHit'); FX.shake(8);
      FX.text(run.boss.x, run.boss.y - run.boss.R - 4, '-1', '#c9a0ff', 34);
      if (r === 'defeat') { startClearing(true); return; }
      if (r === 'phase') { Audio.play('phase'); FX.confetti(run.boss.x, run.boss.y, 26); applyPhase(); }
    } else {
      run.progress = run.correct / run.cfg.goal;
      if (run.correct >= run.cfg.goal) { startClearing(false); return; }
    }
    nextQuestion();
  }

  function onWrong(bullet, ball, why) {
    run.wrong++;
    FX.fireImpact(bullet.x, bullet.y, false, run.R);
    if (ball) { ball.wob = 0.5; ball.red = 0.5; FX.pop(ball.x, ball.y - 24, 'Salah!', 'bad', 30); FX.ring(ball.x, ball.y, '#ff4d5e', 50); }
    Audio.play('wrong');
    setFeedback((why || 'Salah!') + ' ' + run.q.explain, run.q.hint, false);
    if (run.boss) { run.boss.attack(); Audio.play('bossAttack'); FX.shake(10); }
    if (run.cfg.freezeOnWrong) { run.shooter.freeze(run.cfg.freezeOnWrong); Audio.play('frost'); FX.text(run.shooter.x, run.shooter.y - run.shooter.r - 16, 'Beku!', '#9fe0ff', 28); }
    loseEgg('Jawaban salah');
  }

  function ballHit(bullet, ball) {
    switch (ball.kind) {
      case 'num':
        if (isCorrectText(ballText(ball))) onCorrect(bullet, ball); else onWrong(bullet, ball);
        break;
      case 'curse':
        run.chain.remove(ball); FX.burst(ball.x, ball.y, ['#6a2f8f', '#c9a0ff', '#222'], 30); FX.text(ball.x, ball.y - 20, 'KUTUKAN!', '#c9a0ff', 32);
        Audio.play('curse'); setFeedback('Bola kutukan! Jangan ditembak.', '', false); loseEgg('Menembak bola kutukan');
        break;
      case 'frost':
        run.chain.remove(ball); run.chain.slowT = 6; FX.burst(ball.x, ball.y, ['#d4f1ff', '#7fd0ff', '#fff'], 20); FX.text(ball.x, ball.y - 20, 'Lambat!', '#7fd0ff', 28); Audio.play('frost');
        break;
      case 'egg':
        run.chain.remove(ball); run.lives = Math.min(run.maxLives, run.lives + 1); FX.burst(ball.x, ball.y, ['#ffe27a', '#fff', '#ffb02e'], 24); FX.text(ball.x, ball.y - 20, '+1 telur', '#ffe27a', 30); Audio.play('egg');
        break;
    }
    if (state === 'playing') ensureCorrect();
  }

  /** Peluru bergerak satu langkah kecil. true = peluru habis. */
  function onBulletStep(b) {
    const o = run.obst.collide(b.x, b.y, Bullets.rObs);
    if (o) {
      run.obst.hitFlash(o);
      const lava = o.kind === 'lava' || o.kind === 'bolt';
      FX.burst(b.x, b.y, lava ? ['#ffb02e', '#ff5a1a', '#fff'] : ['#8a5a30', '#4e3018', '#6ac060'], 14); FX.text(b.x, b.y - 22, 'Awas!', '#ff9a9a', 26);
      Audio.play(lava ? 'rock' : 'thorn');
      setFeedback(lava ? 'Peluru terkena lahar/petir!' : 'Peluru terkena akar berduri!', 'Tunggu celah atau bidik dari sudut lain.', false);
      loseEgg('Peluru mengenai rintangan');
      return true;
    }
    const c = run.obst.crystalHit(b.x, b.y, Bullets.rObs);
    if (c) {
      c.flash = 0.25; Audio.play('crystal');
      if (b.bounces >= 1) { FX.burst(b.x, b.y, ['#7fe3ff', '#fff'], 10); return true; }   // pantulan kedua diserap kristal
      let nx = b.x - c.x, ny = b.y - c.y; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
      const away = c.r * 0.95 + Bullets.rObs + 2;
      b.x = c.x + nx * away; b.y = c.y + ny * away; b.bounces++;
      FX.burst(b.x, b.y, ['#7fe3ff', '#fff'], 10);
      return false;
    }
    const ball = run.chain.hit(b.x, b.y, Bullets.r);
    if (ball) { ballHit(b, ball); return true; }
    return false;
  }

  function fire() {
    const sh = run.shooter;
    if (state !== 'playing' || !sh.canFire() || run.chain.pending > 1) return; // tunggu rantai selesai meluncur masuk
    sh.muzzle(tmpM);
    Bullets.fire(tmpM.x, tmpM.y, sh.angle, sh.takeShot());
    FX.muzzle(tmpM.x, tmpM.y, sh.angle, run.R); FX.shake(2.5);
    run.shots++;
    Audio.play('fire');
  }

  function swapAmmo() { if (state === 'playing') { run.shooter.swap(); Audio.play('swap'); } }

  /* ================= selesai step ================= */
  function startClearing(boss) {
    state = 'clearing'; run.clearT = 0; run.bossDone = !!boss; GA.Effects.closePortal();
    run.chain.paused = true; Bullets.clear(); run.obst.setMovers(false); run.shooter.react('cheer');
    run.clearQ = run.chain.balls.filter(function (b) { return run.chain.visible(b); });
    run.score += run.lives * 100; // bonus telur tersisa
    FX.text(L.W / 2, L.play.y + 60, boss ? 'PENYIHIR KALAH!' : 'STEP SELESAI!', '#ffd23f', 40);
    FX.confetti(L.W / 2, L.H * 0.55, 40);
    Audio.play('win');
  }

  function updateClearing(dt) {
    run.clearT += dt;
    if (run.clearQ && run.clearQ.length && run.clearT > 0.15) {
      const n = Math.max(1, Math.round(dt / 0.04));
      for (let i = 0; i < n && run.clearQ.length; i++) {
        const b = run.clearQ.shift(); run.chain.remove(b);
        if (b.kind === 'num') FX.burst(b.x, b.y, ballColors(b), 12); else FX.burst(b.x, b.y, ['#fff', '#ffd23f'], 8);
        run.score += 10;
      }
    }
    if (run.bossDone && Math.random() < dt * 6) FX.confetti(L.W / 2 + (Math.random() - 0.5) * 300, L.H * 0.4, 8);
    const minT = run.bossDone ? 3.2 : 1.6;
    if (run.clearT > minT && (!run.clearQ || !run.clearQ.length)) finishStep();
  }

  function syncAdv() { adv.score = run.score; adv.eggs = run.lives; adv.correct += run.correct; adv.wrong += run.wrong; adv.maxCombo = Math.max(adv.maxCombo, run.maxCombo); run.synced = true; }

  function finishStep() {
    const cfg = run.cfg, lost = Math.max(0, run.startEggs - run.lives);
    const stars = lost === 0 ? 3 : (lost <= 2 ? 2 : 1);
    adv.stars[cfg.step] = stars;
    if (adv.key) Storage.recordStep(adv.key, cfg.step, stars);
    syncAdv(); Storage.noteScore(adv.score);
    const total = run.correct + run.wrong, acc = total ? Math.round(run.correct * 100 / total) : 100;
    if (cfg.isBoss) { finishAdventure(true); return; }
    const bonus = adv.eggs < adv.maxEggs;
    if (bonus) adv.eggs++;
    const next = Levels.STEPS[cfg.step + 1];
    state = 'stepdone';
    UI.showStepDone({
      eyebrow: cfg.tag + ' · ' + cfg.place, title: 'Step ' + (cfg.step + 1) + ' Selesai!', subtitle: 'Berikutnya: ' + next.place,
      stars: stars, score: adv.score, eggs: adv.eggs, maxEggs: adv.maxEggs, bonus: bonus,
      detail: 'Benar ' + run.correct + ' · Salah ' + run.wrong + ' · Akurasi ' + acc + '% · Kombo ×' + run.maxCombo,
      nextLabel: 'Ke Step ' + (cfg.step + 2)
    });
  }

  function finishAdventure(win) {
    const rec = adv.key ? Storage.recordRun(adv.key, adv.score, win) : { newBest: false };
    const total = adv.correct + adv.wrong, acc = total ? Math.round(adv.correct * 100 / total) : 100;
    const res = {
      win: win, title: win ? 'Telur-Telur Selamat!' : 'Telur Dicuri…',
      subtitle: win ? 'Penyihir Jahat berhasil dikalahkan!' : (run && run.reason ? 'Penyebab: ' + run.reason.toLowerCase() + '.' : ''),
      steps: Levels.STEPS.map(function (s, i) { return { name: 'Step ' + (i + 1) + ' · ' + s.place, stars: adv.stars[i] }; }),
      score: adv.score, newBest: rec.newBest, high: Storage.data.highScore, eggs: win ? adv.eggs : 0, maxEggs: adv.maxEggs,
      detail: 'Benar ' + adv.correct + ' · Salah ' + adv.wrong + ' · Akurasi ' + acc + '% · Kombo ×' + adv.maxCombo
    };
    state = 'story';
    UI.showStory(win ? [Story.win] : [Story.lose], { skippable: false, onDone: function () { state = 'result'; UI.showResult(res); } });
  }

  /* ================= update ================= */
  function rayCircle(px, py, dx, dy, cx, cy, rad) {
    const fx = cx - px, fy = cy - py, proj = fx * dx + fy * dy;
    if (proj < 0) return Infinity;
    const d2 = fx * fx + fy * fy - proj * proj;
    if (d2 > rad * rad) return Infinity;
    return proj - Math.sqrt(rad * rad - d2);
  }

  /** Garis bidik: satu ruas lurus, atau dua ruas bila mengenai kristal (pantulan). */
  function computeGuide(r) {
    const sh = r.shooter, segs = [], rad = r.R * 0.92 + Bullets.r;
    sh.muzzle(tmpM);
    let x = tmpM.x, y = tmpM.y, dx = Math.cos(sh.angle), dy = Math.sin(sh.angle);
    for (let k = 0; k < 2; k++) {
      let best = 640, hit = null;
      for (const b of r.chain.balls) {
        if (!r.chain.visible(b)) continue;
        const d = rayCircle(x, y, dx, dy, b.x, b.y, rad); if (d < best) best = d;
      }
      const h = r.obst.rayFirst(x, y, dx, dy, Bullets.rObs);
      if (h && h.t < best) { best = h.t; hit = h; }
      segs.push({ x0: x, y0: y, x1: x + dx * best, y1: y + dy * best, end: !(hit && hit.crystal && k === 0) });
      if (!(hit && hit.crystal && k === 0)) break;
      const px = x + dx * best, py = y + dy * best;
      let nx = px - hit.o.x, ny = py - hit.o.y; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const dot = dx * nx + dy * ny; dx -= 2 * dot * nx; dy -= 2 * dot * ny;
      x = px + nx * 4; y = py + ny * 4;
    }
    r.guide = segs;
  }

  function updateRun(dt) {
    const r = run, sh = r.shooter;
    r.time += dt;
    // papan ketik
    if (state === 'playing') {
      if (keys.ArrowLeft || keys.a) sh.setAngle(sh.angle - 2.4 * dt);
      if (keys.ArrowRight || keys.d) sh.setAngle(sh.angle + 2.4 * dt);
    }
    sh.update(dt);
    r.obst.update(dt);
    if (r.boss) r.boss.update(dt);
    if (r.scoreShown !== r.score) r.scoreShown += (r.score - r.scoreShown) * Math.min(1, dt * 9) || 0;
    if (Math.abs(r.score - r.scoreShown) < 0.5) r.scoreShown = r.score;
    if (r.comboPulse > 0) r.comboPulse -= dt;
    if (r.qPop > 0) r.qPop -= dt;
    if (r.lifeLostT > 0) r.lifeLostT -= dt;
    if (r.feedback) { r.feedback.t -= dt; if (r.feedback.t <= 0) r.feedback = null; }
    r.slowT = r.chain ? Math.max(0, r.chain.slowT) : 0;

    if (state === 'playing') {
      r.chain.update(dt);
      Bullets.update(dt, L.W, L.H, onBulletStep);
      if (state !== 'playing') return;

      // kelelawar penyihir (tukar dua bola) & kabut sihir terjadwal
      if (r.bats) r.bats.update(dt, { chain: r.chain, W: L.W, H: L.H, active: !r.boss || r.boss.phaseIdx >= 2,
        onSwap: function (a, b) { r.chain.swapLabels(a, b); FX.ring(a.x, a.y, '#c9a0ff', 44); FX.ring(b.x, b.y, '#c9a0ff', 44); Audio.play('swap'); FX.text(a.x, a.y - 24, 'Tukar!', '#c9a0ff', 24); ensureCorrect(); } });
      if (r.cfg.fog) { r.fogT -= dt; if (r.fogT <= 0) { r.fogT = r.cfg.fog.every; fogBalls(r.cfg.fog.count, r.cfg.fog.dur); } }
      if (r.boss) { const sp = r.boss.tick(dt); if (sp) castSpell(sp); }

      // bola sihir sampai ke sarang
      if (r.holeCd > 0) r.holeCd -= dt;
      else if (r.chain.holeReached()) {
        const f = r.chain.balls[0];
        const hp = Path.holeXY(r.path);
        r.chain.remove(f);
        FX.burst(hp.x, hp.y, ['#7a5cff', '#c9b6ff', '#fff'], 22); FX.text(hp.x, hp.y - 50, 'Telur dicuri!', '#ff9a9a', 28);
        Audio.play('steal');
        r.chain.retreat(650, 900); r.chain.hold = 0.5; r.holeCd = 1.8;
        setFeedback('Awas! Bola sihir sampai di sarang.', 'Tembak lebih cepat agar rantai mundur.', false);
        loseEgg('Bola sihir sampai di sarang');
        if (state !== 'playing') return;
        ensureCorrect();
      }

      // batas waktu soal
      if (r.qTimeMax) {
        r.qTime -= dt;
        if (r.qTime <= 0) {
          r.wrong++; Audio.play('wrong');
          setFeedback('Waktu habis! ' + r.q.explain, r.q.hint, false);
          if (r.boss) { r.boss.attack(); Audio.play('bossAttack'); FX.shake(10); }
          loseEgg('Waktu habis');
          if (state === 'playing') nextQuestion();
        }
      }
      r.ensureT -= dt;
      if (r.ensureT <= 0) { r.ensureT = 0.6; ensureCorrect(); }

      computeGuide(r);
    } else if (state === 'clearing') {
      r.chain.update(dt);
      updateClearing(dt);
    } else if (state === 'dying') {
      r.dyingT += dt;
      if (r.dyingT > 1.0) finishAdventure(false);
    }
  }

  /* ================= gambar ================= */
  function drawGuide(sh, t, segs) {
    ctx.fillStyle = 'rgba(255,236,170,0.9)'; ctx.strokeStyle = 'rgba(60,20,10,0.5)'; ctx.lineWidth = 1.5;
    const off = (t * 40) % 22;
    segs.forEach(function (s, k) {
      const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0), dx = (s.x1 - s.x0) / (len || 1), dy = (s.y1 - s.y0) / (len || 1);
      for (let d = (k ? 6 : 18) + off; d < len - 8; d += 22) {
        ctx.beginPath(); ctx.arc(s.x0 + dx * d, s.y0 + dy * d, 3.2, 0, 6.283); ctx.fill(); ctx.stroke();
      }
      if (!s.end) { ctx.strokeStyle = 'rgba(127,227,255,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x1, s.y1, 8, 0, 6.283); ctx.stroke(); ctx.strokeStyle = 'rgba(60,20,10,0.5)'; ctx.lineWidth = 1.5; }
    });
    const e = segs[segs.length - 1];
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x1, e.y1, 9, 0, 6.283); ctx.stroke();
  }

  /** fase 1: peta, sarang, boss, rintangan, rantai. fase 2: garis bidik, kelelawar, naga, peluru, efek. Penutup depan peta digambar di antaranya. */
  function drawScene(sc, showGuide, phase) {
    const R = sc.R;
    const center = { x: L.play.x + L.play.w / 2, y: L.play.y + L.play.h / 2 };
    if (phase === 2) {
      if (sc.chain) sc.chain.drawOver(ctx, t, L.px);
      if (showGuide && sc.guide && sc.guide.length) drawGuide(sc.shooter, t, sc.guide);
      if (sc.bats) sc.bats.draw(ctx, t);
      sc.shooter.draw(ctx, t, L.px);
      if (sc === run) Bullets.draw(ctx, L.px, t);
      FX.draw(ctx);
      return;
    }
    GA.Scenery.drawAmbient(ctx, t, frameDt);
    FX.drawDecals(ctx, frameDt);
    GA.Effects.drawPortal(ctx, t, frameDt);
    Path.drawMarkers(ctx, sc.path, R, t, center, L.portrait ? 16 : 15);
    Path.drawNest(ctx, sc.path, R, t, sc.lives, sc.maxLives || 5, sc.lifeLostT > 0 ? 1 : 0, sc.chain && state === 'playing' ? Math.max(0, Math.min(1, 1 - (sc.path.length - sc.chain.frontD()) / (R * 14))) : 0);
    if (sc.boss) {
      sc.boss.draw(ctx, t);
      sc.boss.drawHP(ctx, sc.boss.x, sc.boss.y + sc.boss.R * 1.08 + 12, Math.min(L.W * 0.6, 340));
    }
    if (sc.obst) sc.obst.draw(ctx, t);
    if (sc.chain) sc.chain.draw(ctx, t, L.px);
  }

  function baseTransform() { ctx.setTransform(L.px, 0, 0, L.px, L.dpr * L.ox, L.dpr * L.oy); }

  function render() {
    GA.Scenery.drawBack(ctx, t);
    const sc = sceneRef();
    if (!sc) return;
    FX.shakeOffset(shk);
    ctx.setTransform(L.px, 0, 0, L.px, L.dpr * (L.ox + shk.x * L.scale), L.dpr * (L.oy + shk.y * L.scale));
    // klip ke area logis supaya bola yang masuk dari luar tidak terlihat di pinggir letterbox
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, L.W, L.H); ctx.clip();
    drawScene(sc, run && state === 'playing', 1);
    ctx.restore();
    GA.Scenery.drawFront(ctx, shk.x * L.px, shk.y * L.px, t);
    ctx.save(); ctx.setTransform(L.px, 0, 0, L.px, L.dpr * (L.ox + shk.x * L.scale), L.dpr * (L.oy + shk.y * L.scale));
    ctx.beginPath(); ctx.rect(0, 0, L.W, L.H); ctx.clip();
    drawScene(sc, run && state === 'playing', 2);
    GA.Scenery.drawOver(ctx, t, frameDt);
    if (GA.debug && sc.path) GA.Paths.drawDebug(ctx, sc.path, sc.R, t);
    ctx.restore();
    baseTransform();
    if (run) UI.drawHUD(ctx, run, L, t);
    if (GA.debug) { ctx.save(); ctx.font = '12px monospace'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; const dt2 = 'fps ' + GA.Quality.fps.toFixed(0) + ' 00b7 grafik ' + GA.Quality.label() + ' 00b7 dpr ' + L.dpr; ctx.strokeText(dt2, 8, L.H - 8); ctx.fillText(dt2, 8, L.H - 8); ctx.restore(); }
    if (FX.flashA > 0.01) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(' + FX.flashCol + ',' + Math.min(0.6, FX.flashA).toFixed(3) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /** Satu langkah permainan: dt detik. Dipisah dari requestAnimationFrame agar bisa dijalankan manual (uji coba). */
  function tick(dt, noRender) {
    frameDt = state === 'paused' ? 0 : dt;
    const hudOn = state === 'playing' || state === 'paused'; if (hudOn !== hudShown) { hudShown = hudOn; UI.setHudButton(hudOn); }
    if (state === 'paused') { if (!noRender) render(); return; } // jeda: tidak ada yang bergerak (rantai, rintangan, partikel, animasi)
    t += dt;
    if (run && (state === 'playing' || state === 'clearing' || state === 'dying')) updateRun(dt);
    else if (run) { run.obst.update(dt); if (run.boss) run.boss.update(dt); run.shooter.update(dt); }
    else if (attract) updateAttract(dt);
    FX.update(dt);
    if (!noRender) render();
  }

  function frame(now) {
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw || 0.016); last = now;
    GA.Quality.sample(raw, state === 'playing' && !document.hidden);
    tick(dt);
    requestAnimationFrame(frame);
  }

  /* ================= input ================= */
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - L.ox) / L.scale, y: (e.clientY - r.top - L.oy) / L.scale };
  }
  const swapMin = function () { return Math.max(64, 26 / L.scale); };

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault(); Audio.unlock();
    if (state !== 'playing') return;
    const p = toLogical(e);
    if (UI.hitPause(p.x, p.y, L)) { pauseGame(); return; }
    ptr.down = true; ptr.id = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
    ptr.onShooter = run.shooter.hitsSwap(p.x, p.y, swapMin());
    if (!ptr.onShooter) run.shooter.aimAt(p.x, p.y);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (state !== 'playing') return;
    if (!(ptr.down || e.pointerType === 'mouse')) return;
    if (ptr.down && ptr.onShooter) return;
    const p = toLogical(e); run.shooter.aimAt(p.x, p.y);
  });
  function release(e) {
    if (!ptr.down || (e.pointerId !== undefined && e.pointerId !== ptr.id)) return;
    ptr.down = false;
    if (state !== 'playing') return;
    const p = toLogical(e);
    if (ptr.onShooter && run.shooter.hitsSwap(p.x, p.y, swapMin())) { swapAmmo(); return; }
    run.shooter.aimAt(p.x, p.y);
    fire();
  }
  canvas.addEventListener('pointerup', function (e) { e.preventDefault(); release(e); });
  canvas.addEventListener('pointercancel', function () { ptr.down = false; });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (e.repeat) return;
      if (state === 'playing') pauseGame(); else if (state === 'paused' && !UI.pauseKey()) resumeGame();
      return;
    }
    if (state !== 'playing') return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); GA.lastFireKey = performance.now(); fire(); }
    if (e.key === 'q' || e.key === 'Q' || e.key === 'Shift') swapAmmo();
  });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; if (state === 'playing') pauseGame(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && state === 'playing') pauseGame(); });
  let rz = 0;
  function onResize() { cancelAnimationFrame(rz); rz = requestAnimationFrame(relayout); }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  // cegah zoom cubit / gestur yang tidak sengaja
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) { if (e.target === canvas) e.preventDefault(); }, { passive: false });

  /* ================= alur menu ================= */
  /** Teks lencana popup jeda: step dan nama tempatnya. */
  function pauseBadge() { const c = run.cfg; return c.tag + ' · ' + c.place; }
  /** Progres step hilang jika diulang/keluar? (untuk dialog konfirmasi) */
  function hasProgress() { return !!run && (run.score > run.scoreAtStart || run.correct > 0 || run.wrong > 0 || run.lives < run.startEggs) && state !== 'menu'; }

  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused'; ptr.down = false; for (const k in keys) keys[k] = false;
    Audio.suspend();
    UI.showPause({ badge: pauseBadge() });
  }
  function resumeGame() {
    if (state !== 'paused') return;
    Audio.resume(); state = 'playing'; last = performance.now();
    UI.hidePause();
  }

  function toTitle() {
    UI.cancelCountdown(); Audio.resume(); run = null; adv = null; state = 'menu'; Bullets.clear(); FX.reset();
    Theme.setScene('menu'); Audio.music('menu');
    buildAttract(); renderBg(); GA.Effects.resetPortal(true); UI.refreshTitle(); UI.show('title');
  }
  function toMenu() {
    toTitle(); GA.Menu.open();
  }

  const handlers = {
    start: function (sel) { startAdventure(sel, false); },
    introGo: function () { state = 'countdown'; GA.Effects.openPortal(); UI.countdown(beginPlay); },
    resume: resumeGame,
    pause: pauseGame,
    hasProgress: hasProgress,
    // ulangi step ini dari awal, dengan telur & skor seperti saat step dimulai
    restart: function () { adv.eggs = adv.snap.eggs; adv.score = adv.snap.score; startStep(adv.step, true); UI.hide(); },
    quit: toTitle,
    nextStep: function () { startStep(adv.step + 1, false); },
    again: function () { startAdventure(adv.sel, true); },
    toMenu: toMenu,
    toggleSound: function () { const on = !Audio.isEnabled(); Audio.setEnabled(on); Storage.sound = on; UI.syncSound(); if (on) Audio.play('click'); },
    toggleQuality: function () { Storage.quality = GA.Quality.cycle(); UI.syncSound(); },
    toggleMusic: function () { const on = !Audio.isMusic(); Audio.setMusic(on); Storage.music = on; UI.syncSound(); },
    replayStory: function () { UI.showStory(Story.intro, { onDone: function () { UI.show('settings'); } }); }
  };

  /* ================= mulai ================= */
  Theme.loadSprites();
  GA.Assets.onReady = function () { GA.Background.invalidate(); renderBg(); };
  GA.Background.onArtReady = function () { renderBg(); };
  GA.Assets.load();
  // prefers-reduced-motion: kurangi getar, kilatan, goyangan dedaunan, dan efek atmosfer berat
  (function () {
    const rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = function () { const on = !!(rm && rm.matches); FX.reduce = on; GA.Background.reduceMotion = on; if (on) GA.Effects.setQuality(Math.min(GA.Effects.quality, 1)); };
    apply(); if (rm && rm.addEventListener) rm.addEventListener('change', apply);
  })();
  Audio.setEnabled(Storage.sound); Audio.setMusic(Storage.music);
  UI.init(handlers);
  GA.Quality.init(Storage.quality, function () { computeLayout(); GA.Background.invalidate(); renderBg(); UI.syncSound(); });
  GA.Menu.init(handlers);
  Theme.setScene('menu');
  computeLayout();
  buildAttract();
  renderBg();
  GA.Effects.resetPortal(true);
  UI.refreshTitle();
  UI.show('title');
  Audio.music('menu');
  requestAnimationFrame(function (n) { last = n; frame(n); });

  // untuk uji coba / debugging
  GA.game = { get state() { return state; }, get run() { return run; }, get adv() { return adv; }, get layout() { return L; }, tick: tick, startAdventure: startAdventure, startStep: startStep, fire: fire, handlers: handlers, ensureCorrect: ensureCorrect };
})(window.GA = window.GA || {});
