/* main.js — loop game, layout responsif, input (Pointer Events), alur stage/boss.
 *
 * State: menu | intro | countdown | playing | paused | clearing | dying
 */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, FX = GA.FX, Path = GA.Path, Chain = GA.Chain, Shooter = GA.Shooter, Bullets = GA.Shooter.Bullets,
    Questions = GA.Questions, Obstacles = GA.Obstacles, Levels = GA.Levels, Bosses = GA.Bosses, UI = GA.UI, Audio = GA.Audio, Storage = GA.Storage;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const MAX_LIVES = 5;

  let L = null;                // layout logis
  let bg = null;               // cache latar statis
  let state = 'menu';
  let run = null;              // data stage yang sedang dimainkan
  let attract = null;          // adegan dekoratif di menu
  let cur = { l: 0, s: 0 };
  let t = 0, last = 0, hudShown = false;
  const keys = {};
  const ptr = { down: false, onShooter: false, id: null };
  const tmpM = { x: 0, y: 0 }, shk = { x: 0, y: 0 };

  /* ================= layout & latar ================= */
  function computeLayout() {
    const cssW = window.innerWidth, cssH = window.innerHeight;
    const portrait = cssH > cssW;
    const W = portrait ? 540 : 960, H = portrait ? 960 : 540;
    const scale = Math.min(cssW / W, cssH / H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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

  /** Ukuran kodok/bola pemain dan sisi gelembung untuk jalur saat ini. */
  function fitShooter(sh, path, R) {
    sh.setSize(L.ballR); sh.ammoR = Theme.ball.playerRatio * R;
    sh.setPos(path.shooter.x, path.shooter.y);
  }
  function makeObstacles(cfg, path, R, sh) {
    return Obstacles.create({ rocks: cfg.rocks, movers: cfg.movers }, path.shooter, L.portrait,
      { clear: function (x, y) { return pathDist(path, x, y) - (R + Theme.ball.trackMargin); }, frogR: sh.r, unit: L.ballR / 25 });
  }

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

  function sceneRef() { return run || attract; }

  function renderBg() {
    if (!bg) bg = document.createElement('canvas');
    bg.width = canvas.width; bg.height = canvas.height;
    const g = bg.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#16386f'; g.fillRect(0, 0, bg.width, bg.height);
    g.setTransform(L.px, 0, 0, L.px, L.dpr * L.ox, L.dpr * L.oy);
    const img = Theme.sprite('background');
    if (img) g.drawImage(img, 0, 0, L.W, L.H);
    else {
      const gr = g.createLinearGradient(0, 0, 0, L.H);
      gr.addColorStop(0, Theme.colors.grassA); gr.addColorStop(1, Theme.colors.grassB);
      g.fillStyle = gr; g.fillRect(0, 0, L.W, L.H);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      for (let y = 0; y < L.H; y += 96) g.fillRect(0, y, L.W, 48);
      const r = rng(7);
      for (let i = 0; i < 90; i++) { // bunga & rumput
        const x = r() * L.W, y = L.hud + r() * (L.H - L.hud), k = r();
        if (k < 0.55) { g.strokeStyle = 'rgba(40,120,40,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y - 9); g.moveTo(x, y); g.lineTo(x + 4, y - 8); g.stroke(); }
        else {
          const col = ['#ffffff', '#ffd1ec', '#fff3a0'][i % 3];
          g.fillStyle = col; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.2566) * 4, y + Math.sin(p * 1.2566) * 4, 3, 0, 6.283); g.fill(); }
          g.fillStyle = '#f2a60c'; g.beginPath(); g.arc(x, y, 2.4, 0, 6.283); g.fill();
        }
      }
    }
    const sc = sceneRef();
    if (sc) { g.save(); g.beginPath(); g.rect(0, 0, L.W, L.H); g.clip(); Path.drawTrack(g, sc.path, sc.R); g.restore(); }
  }

  function relayout() {
    const wasPortrait = L ? L.portrait : null;
    computeLayout();
    if (wasPortrait !== null && wasPortrait !== L.portrait) {
      if (run) rebuildForOrientation(run);
      if (attract) buildAttract();
    }
    renderBg();
  }

  /** Orientasi berubah di tengah permainan: bangun ulang jalur, pertahankan posisi relatif rantai. */
  function rebuildForOrientation(r) {
    const np = Path.forLayout(r.cfg.pathId, L), newR = stageR(r.cfg);
    const f = (2 * newR + 1) / (r.chain ? r.chain.D : 2 * r.R + 1);   // jarak antar-bola berubah mengikuti radius baru
    r.path = np; r.baseR = L.ballR; r.R = newR;
    if (r.chain) { r.chain.r = newR; r.chain.D = 2 * newR + 1; r.chain.minFront = newR * 8; r.chain.setPath(np, f); }
    fitShooter(r.shooter, np, newR);
    const on = r.obst.on;
    r.obst = makeObstacles(r.cfg, np, newR, r.shooter); r.obst.on = on; r.obst.alpha = on ? 1 : 0;
    if (r.boss) { r.boss.x = np.boss.x; r.boss.y = np.boss.y; r.boss.R = Math.round(2.45 * L.ballR); }
    Bullets.setSize(newR); Bullets.clear();
    r.shooter.setAngle(-Math.PI / 2);
  }

  /* ================= adegan menu (dekoratif) ================= */
  function buildAttract() {
    const R = L.ballR, path = Path.forLayout('hook', L);
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

  /* ================= stage ================= */
  function isCorrect(v) { return !!run.q && Math.abs(v - run.q.answer) < 1e-9; }

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
      const kinds = ['bomb', 'ice', 'bolt', 'life'];
      for (const k of kinds) {
        const p = sp[k] || 0;
        if (k === 'life' && run.lives >= run.maxLives) continue;
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
      const eff = b.nv !== null ? b.nv : b.value, ok = isCorrect(eff);
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

  function applyPhase() {
    const b = run.boss, ph = b.phase;
    run.chain.speedMul = ph.speedMul;
    run.obst.setMovers(ph.movers);
    run.qs = new Questions.Session(b.topics);
  }

  /** Radius bola rantai untuk stage ini (bola desimal boleh sedikit lebih besar). */
  function stageR(cfg) { return Math.min(L.ballR * cfg.ballScale, L.ballR * 1.2); }

  function buildRun(cfg) {
    const R = stageR(cfg);
    const path = Path.forLayout(cfg.pathId, L);
    const shooter = new Shooter.Shooter(); fitShooter(shooter, path, R);
    run = {
      cfg: cfg, path: path, R: R, baseR: L.ballR, shooter: shooter, chain: null, boss: null,
      obst: makeObstacles(cfg, path, R, shooter),
      lives: MAX_LIVES, maxLives: MAX_LIVES, score: 0, scoreShown: 0, combo: 0, maxCombo: 0, comboPulse: 0,
      correct: 0, wrong: 0, shots: 0, progress: 0, qs: null, q: null, qPop: 0, qTime: 0, qTimeMax: 0, bag: [],
      feedback: null, lifeLostT: 0, holeCd: 0, ensureT: 0, playing: false, clearT: 0, clearQ: null, dyingT: 0, reason: '',
      stageTag: 'Level ' + (cfg.level + 1) + ' · ' + (cfg.isBoss ? 'Boss' : 'Stage ' + (cfg.index + 1)), time: 0, bossDone: false
    };
    if (cfg.isBoss) {
      run.boss = Bosses.create(cfg.boss, path.boss, Math.round(2.45 * L.ballR));
      run.boss.speech = ''; run.boss.speechT = 0; // dialog muncul setelah hitung mundur
      run.obst.on = false; run.obst.alpha = 0;    // rintangan bergerak baru aktif di fase 2
    }
    FX.reset(); Bullets.setSize(R); Bullets.clear();
    renderBg();
  }

  function introInfo(cfg) {
    const d = Questions.describe(cfg.topics);
    const sp = [];
    ['bomb', 'ice', 'bolt', 'life'].forEach(function (k) { if ((cfg.specials[k] || 0) > 0) sp.push(k); });
    const extra = [];
    if (cfg.isBoss) extra.push('Raja Angka punya 3 fase. Jawab benar untuk melukainya; jawaban salah membuatnya menyerang!');
    if (cfg.rocks.length) extra.push('Batu menghalangi peluru, nyawa berkurang jika terkena.');
    if (cfg.movers.length && !cfg.isBoss) extra.push('Ada rintangan bergerak: tunggu celahnya!');
    return {
      heading: 'Level ' + (cfg.level + 1) + ' · ' + (cfg.isBoss ? 'Boss Final' : 'Stage ' + (cfg.index + 1)),
      name: cfg.name, label: cfg.label, example: d.example, rangeText: d.rangeText,
      tip: 'Tembak bola dengan jawaban yang benar.', extra: extra.join(' '), specials: sp
    };
  }

  function startStage(l, s, skipIntro) {
    cur = { l: l, s: s }; Audio.resume();
    UI.cancelCountdown();
    const cfg = Levels.get(l, s);
    buildRun(cfg);
    attract = null;
    if (skipIntro) { state = 'countdown'; UI.countdown(beginPlay); }
    else { state = 'intro'; UI.showIntro(introInfo(cfg)); }
  }

  function beginPlay() {
    const cfg = run.cfg, len = run.path.length;
    run.playing = true;
    run.qs = new Questions.Session(run.boss ? run.boss.topics : cfg.topics);
    run.chain = new Chain.Chain(run.path, { r: run.R, speed: cfg.speed, maxBalls: cfg.maxBalls, labeler: labelBall });
    run.q = run.qs.next(); run.qPop = 0.35;
    if (run.boss) {
      applyPhase();
      run.q = run.qs.next();
      run.boss.say(run.boss.phase.say, 3.4);
      run.qTimeMax = run.boss.phase.questionTime || 0;
    } else run.qTimeMax = cfg.questionTime || 0;
    run.qTime = run.qTimeMax;
    const D = run.chain.D, front = len * 0.34;     // rantai awal menutup jalur dari pintu masuk sampai bola terdepan
    run.chain.fill(Math.min(cfg.maxBalls, Math.ceil(front / D) + 1), front, Math.min(len * 0.22, 520));
    ensureCorrect();
    run.shooter.reset();
    state = 'playing';
  }

  /* ================= nyawa & akibat tembakan ================= */
  function loseLife(reason) {
    run.lives = Math.max(0, run.lives - 1);
    run.lifeLostT = 0.6; run.combo = 0; run.reason = reason;
    run.shooter.react('hurt');
    FX.shake(14); FX.flash(0.5, '255,50,70');
    if (run.lives <= 0 && state === 'playing') gameOver();
  }

  function gameOver() {
    state = 'dying'; run.dyingT = 0; Bullets.clear(); run.shooter.react('sad');
    Audio.play('lose');
    if (run.score > Storage.data.highScore) { Storage.data.highScore = run.score; Storage.save(); }
  }

  function setFeedback(text, hint, good) { run.feedback = { text: text, hint: hint || '', good: good, t: good ? 1.4 : 4.2 }; }

  function ballColors(b) { return Theme.ballColors[b.ci % 8]; }

  function onCorrect(bullet, ball) {
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo); run.comboPulse = 0.5;
    const pts = (100 + 25 * Math.min(run.combo - 1, 8)) * bullet.ammo.mult;
    run.score += pts; run.correct++;
    run.chain.remove(ball);
    FX.burst(ball.x, ball.y, ballColors(ball), 22);
    FX.text(ball.x, ball.y - 22, '+' + pts, '#ffd23f', 30);
    if (run.combo >= 2) FX.text(ball.x, ball.y - 56, 'KOMBO ×' + run.combo, '#ff9a3c', 22);
    Audio.play('correct', run.combo);
    run.chain.retreat((run.cfg.retreat + Math.min(run.combo, 5) * 20) * (1 + 0.4 * (run.R / 25 - 1)));
    run.shooter.react('happy');
    run.feedback = null;

    if (run.boss) {
      const r = run.boss.hit();
      run.progress = (run.boss.maxHp - run.boss.hp) / run.boss.maxHp;
      Audio.play('bossHit'); FX.shake(8);
      FX.text(run.boss.x, run.boss.y - run.boss.R - 4, '-1', '#ff6b6b', 34);
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
    if (ball) { ball.wob = 0.5; ball.red = 0.5; FX.text(ball.x, ball.y - 20, '✗', '#ff4d5e', 36); FX.ring(ball.x, ball.y, '#ff4d5e', 50); }
    Audio.play('wrong');
    setFeedback((why || 'Salah!') + ' ' + run.q.explain, run.q.hint, false);
    if (run.boss) { run.boss.attack(); Audio.play('bossAttack'); FX.shake(10); }
    loseLife('Jawaban salah');
  }

  function ballHit(bullet, ball) {
    switch (ball.kind) {
      case 'num':
        if (isCorrect(ball.value)) onCorrect(bullet, ball); else onWrong(bullet, ball);
        break;
      case 'bomb':
        run.chain.remove(ball); FX.burst(ball.x, ball.y, ['#ff6b2c', '#ffd23f', '#444'], 30); FX.text(ball.x, ball.y - 20, 'BOM!', '#ff6b2c', 34);
        Audio.play('bomb'); setFeedback('Bom! Jangan tembak bola bom.', '', false); loseLife('Menembak bom');
        break;
      case 'ice':
        run.chain.remove(ball); run.chain.slowT = 6; FX.burst(ball.x, ball.y, ['#d4f1ff', '#7fd0ff', '#fff'], 20); FX.text(ball.x, ball.y - 20, 'Lambat!', '#7fd0ff', 28); Audio.play('ice');
        break;
      case 'bolt':
        run.chain.remove(ball); run.chain.fastT = 4; run.chain.slowT = 0; FX.burst(ball.x, ball.y, ['#ffd23f', '#ff9a1f', '#5b2bd0'], 20); FX.text(ball.x, ball.y - 20, 'Cepat!', '#ffb02e', 28); Audio.play('bolt');
        break;
      case 'life':
        run.chain.remove(ball); run.lives = Math.min(run.maxLives, run.lives + 1); FX.burst(ball.x, ball.y, ['#ff8fb8', '#fff', '#e11d48'], 22); FX.text(ball.x, ball.y - 20, '+1 ♥', '#ff8fb8', 32); Audio.play('life');
        break;
    }
    if (state === 'playing') ensureCorrect();
  }

  function onBulletStep(b) {
    const o = run.obst.collide(b.x, b.y, Bullets.r);
    if (o) {
      run.obst.hitFlash(o);
      FX.burst(b.x, b.y, ['#cfd5e3', '#8a93a6', '#fff'], 14); FX.text(b.x, b.y - 22, 'Awas!', '#ff9a9a', 26);
      Audio.play('rock'); setFeedback('Peluru mengenai rintangan!', 'Tunggu celah atau bidik dari sudut lain.', false);
      loseLife('Peluru mengenai rintangan');
      return true;
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
    run.shots++;
    Audio.play('shoot');
  }

  function swapAmmo() { if (state === 'playing') { run.shooter.swap(); Audio.play('swap'); } }

  /* ================= selesai stage ================= */
  function startClearing(boss) {
    state = 'clearing'; run.clearT = 0; run.bossDone = !!boss;
    run.chain.paused = true; Bullets.clear(); run.obst.setMovers(false); run.shooter.react('cheer');
    run.clearQ = run.chain.balls.filter(function (b) { return run.chain.visible(b); });
    run.score += run.lives * 100; // bonus nyawa tersisa
    FX.text(L.W / 2, L.play.y + 60, boss ? 'RAJA ANGKA KALAH!' : 'STAGE SELESAI!', '#ffd23f', 40);
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
    const minT = run.bossDone ? 2.8 : 1.6;
    if (run.clearT > minT && (!run.clearQ || !run.clearQ.length)) finishStage();
  }

  function finishStage() {
    const cfg = run.cfg, id = cfg.id;
    const stars = run.lives >= 4 ? 3 : (run.lives >= 2 ? 2 : 1);
    const rec = Storage.record(id, stars, run.score);
    const nx = Levels.next(cfg.level, cfg.index);
    const total = run.correct + run.wrong;
    const acc = total ? Math.round(run.correct * 100 / total) : 100;
    const res = {
      eyebrow: run.stageTag,
      title: cfg.isBoss ? (nx ? 'Level ' + (cfg.level + 1) + ' Tamat!' : 'Kamu Juara Matematika!') : 'Stage Selesai!',
      subtitle: cfg.isBoss ? (nx ? 'Raja Angka sudah kalah. Level berikutnya terbuka!' : 'Semua level dan semua boss sudah kamu taklukkan!') : '',
      stars: stars, score: run.score, newBest: rec.newBest,
      detail: 'Benar ' + run.correct + ' · Salah ' + run.wrong + ' · Akurasi ' + acc + '% · Kombo ×' + run.maxCombo,
      canNext: !!nx, nextLabel: nx && nx.l !== cfg.level ? 'Level Berikutnya' : 'Stage Berikutnya'
    };
    state = 'cleared';
    UI.showClear(res);
  }

  /* ================= update ================= */
  function rayCircle(px, py, dx, dy, cx, cy, rad) {
    const fx = cx - px, fy = cy - py, proj = fx * dx + fy * dy;
    if (proj < 0) return Infinity;
    const d2 = fx * fx + fy * fy - proj * proj;
    if (d2 > rad * rad) return Infinity;
    return proj - Math.sqrt(rad * rad - d2);
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
    r.slowT = r.chain ? Math.max(0, r.chain.slowT) : 0; r.fastT = r.chain ? Math.max(0, r.chain.fastT) : 0;

    if (state === 'playing') {
      r.chain.update(dt);
      Bullets.update(dt, L.W, L.H, onBulletStep);
      if (state !== 'playing') return;

      // rantai sampai lubang akhir (FINISH)
      if (r.holeCd > 0) r.holeCd -= dt;
      else if (r.chain.holeReached()) {
        const f = r.chain.balls[0];
        const hp = Path.holeXY(r.path);
        r.chain.remove(f);
        FX.burst(hp.x, hp.y, ['#7a5cff', '#c9b6ff', '#fff'], 22); FX.text(hp.x, hp.y - 50, 'Masuk lubang!', '#ff9a9a', 28);
        Audio.play('hole');
        r.chain.retreat(650, 900); r.chain.hold = 0.5; r.holeCd = 1.8;
        setFeedback('Awas! Rantai masuk lubang FINISH.', 'Tembak lebih cepat agar rantai mundur.', false);
        loseLife('Rantai sampai di lubang');
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
          loseLife('Waktu habis');
          if (state === 'playing') nextQuestion();
        }
      }
      r.ensureT -= dt;
      if (r.ensureT <= 0) { r.ensureT = 0.6; ensureCorrect(); }

      // garis bidik
      let best = 640;
      const dx = Math.cos(sh.angle), dy = Math.sin(sh.angle);
      sh.muzzle(tmpM);
      const rad = r.R * 0.92 + Bullets.r;
      for (const b of r.chain.balls) {
        if (b.d < 0 || b.d > r.path.length) continue;
        const d = rayCircle(tmpM.x, tmpM.y, dx, dy, b.x, b.y, rad); if (d < best) best = d;
      }
      const od = r.obst.rayDist(tmpM.x, tmpM.y, dx, dy); if (od < best) best = od;
      sh.guideLen = best;
    } else if (state === 'clearing') {
      r.chain.update(dt);
      updateClearing(dt);
    } else if (state === 'dying') {
      r.dyingT += dt;
      if (r.dyingT > 1.0) {
        state = 'over';
        UI.showOver({ score: r.score, reason: r.reason ? 'Penyebab: ' + r.reason.toLowerCase() + '.' : '' });
      }
    }
  }

  /* ================= gambar ================= */
  function drawGuide(sh, t) {
    const a = sh.angle, dx = Math.cos(a), dy = Math.sin(a);
    sh.muzzle(tmpM);
    const len = sh.guideLen;
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.strokeStyle = 'rgba(27,42,73,0.5)'; ctx.lineWidth = 1.5;
    const off = (t * 40) % 22;
    for (let d = 18 + off; d < len - 8; d += 22) {
      ctx.beginPath(); ctx.arc(tmpM.x + dx * d, tmpM.y + dy * d, 3.2, 0, 6.283); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(tmpM.x + dx * len, tmpM.y + dy * len, 9, 0, 6.283); ctx.stroke();
  }

  function drawScene(sc, showGuide) {
    const R = sc.R;
    const center = { x: L.play.x + L.play.w / 2, y: L.play.y + L.play.h / 2 };
    Path.drawMarkers(ctx, sc.path, R, t, center, L.portrait ? 16 : 15);
    Path.drawHole(ctx, sc.path, R, t);
    if (sc.boss) {
      sc.boss.draw(ctx, t);
      sc.boss.drawHP(ctx, sc.boss.x, sc.boss.y + sc.boss.R * 1.08 + 12, Math.min(L.W * 0.6, 340));
    }
    if (sc.obst) sc.obst.draw(ctx, t);
    if (sc.chain) sc.chain.draw(ctx, t, L.px);
    if (showGuide) drawGuide(sc.shooter, t);
    sc.shooter.draw(ctx, t, L.px);
    if (sc === run) Bullets.draw(ctx, L.px, t);
    FX.draw(ctx);
  }

  function baseTransform() { ctx.setTransform(L.px, 0, 0, L.px, L.dpr * L.ox, L.dpr * L.oy); }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    const sc = sceneRef();
    if (!sc) return;
    FX.shakeOffset(shk);
    ctx.setTransform(L.px, 0, 0, L.px, L.dpr * (L.ox + shk.x * L.scale), L.dpr * (L.oy + shk.y * L.scale));
    // klip ke area logis supaya bola yang masuk dari luar tidak terlihat di pinggir letterbox
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, L.W, L.H); ctx.clip();
    drawScene(sc, run && state === 'playing');
    ctx.restore();
    baseTransform();
    if (run) UI.drawHUD(ctx, run, L, t);
    if (FX.flashA > 0.01) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(' + FX.flashCol + ',' + Math.min(0.6, FX.flashA).toFixed(3) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    const hudOn = state === 'playing' || state === 'paused'; if (hudOn !== hudShown) { hudShown = hudOn; UI.setHudButton(hudOn); }
    if (state === 'paused') { render(); requestAnimationFrame(frame); return; } // jeda: tidak ada yang bergerak (rantai, rintangan, partikel, animasi)
    t += dt;
    if (state === 'menu' || state === 'cleared') { if (attract) updateAttract(dt); else if (run) run.shooter.update(dt); }
    else if (run && (state === 'playing' || state === 'clearing' || state === 'dying')) updateRun(dt);
    else if (run) { run.obst.update(dt); if (run.boss) run.boss.update(dt); run.shooter.update(dt); }
    FX.update(dt);
    render();
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
  /** Teks lencana popup jeda: level, stage, dan namanya. */
  function pauseBadge() {
    const c = run.cfg;
    return 'Level ' + (c.level + 1) + ' · ' + (c.isBoss ? 'Boss - Raja Angka' : 'Stage ' + (c.index + 1) + ' - ' + c.name);
  }
  /** Progres stage hilang jika diulang/keluar? (untuk dialog konfirmasi) */
  function hasProgress() { return !!run && (run.score > 0 || run.correct > 0 || run.wrong > 0 || run.lives < run.maxLives); }

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

  function toMenu() {
    UI.cancelCountdown(); Audio.resume(); run = null; state = 'menu'; Bullets.clear(); FX.reset();
    buildAttract(); renderBg(); UI.refreshTitle(); UI.show('title');
  }

  const handlers = {
    stage: function (l, s) { startStage(l, s, false); },
    introGo: function () { state = 'countdown'; UI.countdown(beginPlay); },
    resume: resumeGame,
    pause: pauseGame,
    hasProgress: hasProgress,
    restart: function () { startStage(cur.l, cur.s, true); UI.hide(); },
    quit: toMenu,
    next: function () { const n = Levels.next(cur.l, cur.s); if (n) startStage(n.l, n.s, false); else toMenu(); },
    toggleSound: function () { const on = !Audio.isEnabled(); Audio.setEnabled(on); Storage.sound = on; UI.syncSound(); if (on) Audio.play('click'); }
  };

  /* ================= mulai ================= */
  Theme.loadSprites();
  Audio.setEnabled(Storage.sound);
  UI.init(handlers);
  computeLayout();
  buildAttract();
  renderBg();
  UI.refreshTitle();
  UI.show('title');
  requestAnimationFrame(function (n) { last = n; frame(n); });

  // untuk uji coba / debugging
  GA.game = { get state() { return state; }, get run() { return run; }, get layout() { return L; }, startStage: startStage, fire: fire, handlers: handlers, ensureCorrect: ensureCorrect };
})(window.GA = window.GA || {});
