/* main.js — loop game, layout responsif, input (Pointer Events), alur petualangan.
 *
 * Alur: Judul → Main Menu (kategori & kesulitan) → cerita (sekali) → Step 1 → Step 2 → Step 3 (boss) → hasil.
 * State: menu | countdown | intro | playing | paused | clearing | stepdone | dying | result
 * Telur (nyawa) dibawa antar-step: `adv.eggs`. Konfigurasi step ada di levels.js, soal di questions.js,
 * rintangan di obstacles.js, boss di boss.js, cerita di story.js.
 */
(function (GA) {
  'use strict';
  const T = GA.T, Theme = GA.Theme, FX = GA.FX, Path = GA.Path, Chain = GA.Chain, Shooter = GA.Shooter, Bullets = GA.Shooter.Bullets,
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
      { clear: function (x, y) { return pathDist(path, x, y) - (R + Theme.ball.trackMargin); }, frogR: sh.r, muzzleR: sh.r * Theme.dragon.mouthDist, rObs: Bullets.rObs, unit: L.ballR / 25, bounds: { y0: L.play.y, y1: L.H } });
  }

  /** Rintangan zona (js/hazards.js) untuk run r: konteks berisi geometri, uji keadilan, dan kait ke permainan. */
  function makeHaz(r) {
    const sh = r.shooter;
    return GA.Hazards.create(r.cfg.haz, {
      R: r.R, play: L.play, bounds: { x0: 6, y0: L.play.y + 4, x1: L.W - 6, y1: L.H - 6 }, shooter: sh, muzzleR: sh.r * Theme.dragon.mouthDist, style: GA.Nest.styleFor(Theme.scene),
      rObs: function () { return Bullets.rObs; },
      clear: function (x, y) { let d = pathDist(r.path, x, y); if (r.path.second) d = Math.min(d, pathDist(r.path.second, x, y)); return d - (r.R + Theme.ball.trackMargin); },
      targetsOpen: function () { if (!r.chain || run !== r) return true; const v = pendingVisible(); return !v.length || v.some(openLine); },
      randomBall: function () { if (!r.chain || run !== r) return null; const v = pendingVisible().filter(function (b) { return b.qid !== r.qid; }); return v.length ? v[Math.floor(Math.random() * v.length)] : null; },
      fog: function (x, y, rad, dur) { r.chain.balls.forEach(function (b) { if (b.kind === 'num' && r.chain.visible(b) && b.qid !== r.qid && Math.hypot(b.x - x, b.y - y) < rad + r.R) { b.fog = dur; b.fogAge = 0; } }); },
      warn: function () { Audio.play('warn'); }
    });
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
    { const hon = r.haz.on; r.haz = makeHaz(r); r.haz.setOn(hon); }
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

  /* ================= soal, dek & bola target ================= */
  /** Teks efektif sebuah bola (memperhitungkan animasi balik label). Kebenaran dinilai dari TEKS, jadi pecahan 1/2 ≠ 2/4. */
  function ballText(b) { return b.nt !== null && b.nt !== undefined ? b.nt : b.text; }
  function isCorrectText(txt) { return !!run.q && txt === run.q.answerText; }

  /** Isi bola dari antrean gelombang: bola target membawa jawaban soal `qid` di dek; bola khusus tidak berangka. */
  function labelBall(b) {
    if (b.want && b.want !== 'num') { b.kind = b.want; b.value = 0; b.text = ''; return; }
    b.kind = 'num';
    const q = run && run.deck && b.qid != null ? run.deck[b.qid] : null;
    if (q) { b.value = q.answer; b.text = q.answerText; } else { b.value = 1 + Math.floor(Math.random() * 20); b.text = String(b.value); }
  }

  /** Penghalang garis tembak dari mulut naga ke bola b: null (terbuka) | { ball } (bola lain yang lebih dekat) | { obst } (rintangan). */
  function lineBlocker(b) {
    const sh = run.shooter; sh.muzzle(tmpM);
    const dx = b.x - tmpM.x, dy = b.y - tmpM.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
    const o = run.obst.rayFirst(tmpM.x, tmpM.y, ux, uy, Bullets.rObs);
    if (o && o.t < dist - run.R * 0.5) return { obst: o.o };
    const hzb = run.haz.blocksLine(tmpM.x, tmpM.y, b.x, b.y, 0);
    if (hzb) return { haz: hzb };
    const rad = run.R * 0.92 + Bullets.r;
    let best = null, bd = Infinity;
    for (const c of run.chain.balls) {
      if (c === b || !run.chain.visible(c)) continue;
      const d = rayCircle(tmpM.x, tmpM.y, ux, uy, c.x, c.y, rad);
      if (d < dist - run.R * 0.4 && d < bd) { bd = d; best = c; }
    }
    return best ? { ball: best } : null;
  }
  function openLine(b) { return !lineBlocker(b); }

  /** Anti-macet: bila semua bola target yang terlihat terhalang bola khusus (kutukan/beku/emas) > 1 dtk, penghalangnya lenyap sendiri. */
  function clearBlockers(vis) {
    let removed = false;
    vis.forEach(function (b) {
      const blk = lineBlocker(b); if (!blk) return;
      if (blk.haz) { run.haz.remove(blk.haz); FX.ring(blk.haz.x, blk.haz.y, '#ffd27a', 40); return; }      // rintangan zona menyingkir
      if (blk.obst) {        // rintangan statis menyurut sementara (kembali setelah ±9 dtk dengan peringatan berkedip)
        if (run.obst.isStatic(blk.obst)) { if (!(blk.obst.off > 0)) { run.obst.wilt(blk.obst, 9); FX.ring(blk.obst.x, blk.obst.y, '#9fe0a0', 40); } }
        else if (!(run.obst.calmT > 0)) { run.obst.calm(3); FX.ring(blk.obst.x, blk.obst.y, '#ffd27a', 40); }      // lava/petir menyingkir sebentar
        return;
      }
      const c = blk.ball;
      if (removed || c.kind === 'num') return;
      removed = true;
      run.chain.remove(c); FX.burst(c.x, c.y, ['#fff', '#c9a0ff', '#ffd27a'], 16); FX.ring(c.x, c.y, '#c9a0ff', 40);
      if (c.kind === 'egg') { run.lives = Math.min(run.maxLives, run.lives + 1); FX.text(c.x, c.y - 20, T('fx.egg'), '#ffe27a', 28); Audio.play('egg'); } else Audio.play('swap');
    });
  }

  /** Bola target yang soalnya belum selesai dan sudah muncul di jalur. */
  function pendingVisible() {
    const ch = run.chain, out = [];
    for (const b of ch.balls) if (b.kind === 'num' && b.qid != null && !run.deck[b.qid].done && ch.visible(b)) out.push(b);
    return out;
  }
  function activeBall() {
    if (run.qid < 0) return null;
    for (const b of run.chain.balls) if (b.kind === 'num' && b.qid === run.qid) return b;
    return null;
  }
  function setActive(qid) { run.qSerial++; run.qid = qid; run.q = run.deck[qid]; run.qPop = 0.35; run.qTime = run.qTimeMax; run.blockedT = 0; }

  /** Pilih soal aktif HANYA dari bola target yang sudah terlihat; utamakan yang garis tembaknya terbuka dan yang paling dekat sarang. */
  function pickActive(avoid) {
    const vis = pendingVisible();
    if (!vis.length) { run.q = null; run.qid = -1; run.qSerial++; return false; }
    let pool = vis.filter(openLine);
    if (!pool.length) pool = vis;                       // semua terhalang sesaat: rintangan bergerak akan lewat
    pool.sort(function (a, b) { return b.d - a.d; });
    pool = pool.slice(0, 5);
    if (avoid != null && pool.length > 1) { const f = pool.filter(function (b) { return b.qid !== avoid; }); if (f.length) pool = f; }
    setActive(pool[Math.floor(Math.random() * pool.length)].qid);
    return true;
  }

  /** Anti-macet: jaga selalu ada soal aktif yang bola targetnya terlihat & terjangkau. Dipanggil berkala. */
  function validateActive() {
    const vis = pendingVisible();
    if (vis.length && !vis.some(openLine)) { run.noOpenT = (run.noOpenT || 0) + 0.3; if (run.noOpenT > 1.0) { run.noOpenT = 0; clearBlockers(vis); } } else run.noOpenT = 0;
    const ab = activeBall();
    if (run.qid < 0 || !ab || !run.chain.visible(ab)) { pickActive(run.qid); return; }
    if (!openLine(ab)) {
      run.blockedT += 0.3;
      if (run.blockedT > 2.4) { if (pendingVisible().some(function (b) { return b.qid !== run.qid && openLine(b); })) pickActive(run.qid); run.blockedT = 0; }
    } else run.blockedT = 0;
  }

  /** Susun gelombang: soal dibagi `cfg.waves` kelompok yang keluar bergantian dari portal; bola khusus (tidak dihitung) disisipkan acak. */
  function buildWaves(cfg, n, speed) {
    const ids = [];
    for (let i = 0; i < n; i++) ids.push(i);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = ids[i]; ids[i] = ids[j]; ids[j] = x; }
    const g = Math.max(2, Math.min(cfg.waves, n)), groups = [];
    for (let k = 0; k < g; k++) groups.push([]);
    ids.forEach(function (id, i) { groups[i % g].push({ qid: id, kind: 'num' }); });
    const sp = cfg.specialsN || {}, kinds = [];
    ['curse', 'frost', 'egg'].forEach(function (k) { for (let i = 0; i < (sp[k] || 0); i++) kinds.push(k); });
    kinds.forEach(function (k, i) { const grp = groups[(1 + i * 2 + Math.floor(Math.random() * 2)) % g]; grp.splice(1 + Math.floor(Math.random() * grp.length), 0, { kind: k }); });
    const out = [], gap = cfg.gapSec * speed;
    groups.forEach(function (grp, gi) { grp.forEach(function (s, i) { s.gap = gi > 0 && i === 0 ? gap : 0; out.push(s); }); });
    return out;
  }

  /** Terapkan fase boss: kecepatan rantai dan rintangan bergerak (soal tetap dari dek 20 soal). */
  function applyPhase() {
    const b = run.boss, ph = b.phase;
    run.chain.speedMul = ph.speedMul;
    run.obst.setMovers(ph.movers); run.haz.setOn(ph.movers);
    run.qTimeMax = ph.questionTime || 0;
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
    else if (name === 'frost') { run.shooter.freeze(1.4); Audio.play('frost'); FX.text(run.shooter.x, run.shooter.y - run.shooter.r - 16, T('fx.frozen'), '#9fe0ff', 30); }
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
    cfg.speed = path.length / cfg.travel;      // kecepatan rantai = panjang jalur ÷ durasi tempuh target (±3-5 menit per step)
    const shooter = new Shooter.Shooter(); fitShooter(shooter, path, R);
    shooter.slip = cfg.nerf === 'ice';
    run = {
      cfg: cfg, path: path, R: R, baseR: L.ballR, shooter: shooter, chain: null, boss: null,
      obst: makeObstacles(cfg, path, R, shooter), haz: null, bats: cfg.bats ? new Obstacles.BatSwarm(cfg.bats) : null,
      lives: adv.eggs, maxLives: adv.maxEggs, startEggs: adv.eggs, stepNo: cfg.step + 1,
      score: adv.score, scoreAtStart: adv.score, scoreShown: adv.score, combo: 0, maxCombo: 0, comboPulse: 0,
      correct: 0, wrong: 0, shots: 0, progress: 0, total: cfg.total, deck: Questions.deck(cfg.topics, cfg.total), q: null, qid: -1, qSerial: 0, blockedT: 0, qPop: 0, qTime: 0, qTimeMax: 0,
      fx: { aim: cfg.buff === 'aim', twin: cfg.buff === 'twin', twinReady: false, shield: cfg.buff === 'shield' ? 1 : 0, freeze: cfg.buff === 'freeze' ? 1 : 0,
        heat: cfg.nerf === 'heat', ice: cfg.nerf === 'ice', current: cfg.nerf === 'current', note: '' },
      feedback: null, lifeLostT: 0, holeCd: 0, ensureT: 0, fogT: cfg.fog ? cfg.fog.every * 0.6 : 0,
      playing: false, clearT: 0, clearQ: null, dyingT: 0, reason: '', time: 0, bossDone: false, guide: []
    };
    run.haz = makeHaz(run);
    if (cfg.isBoss) {
      run.boss = Bosses.create(cfg.boss, path.boss, Math.round(2.45 * L.ballR));
      run.boss.speech = ''; run.boss.speechT = 0; // dialog muncul setelah hitung mundur
      run.obst.on = false; run.obst.alpha = 0; run.haz.setOn(false);    // rintangan baru aktif di fase 2
    }
    FX.reset(); Bullets.setSize(R); Bullets.clear();
    renderBg();
    GA.Effects.resetPortal(false);
  }

  function introInfo(cfg) {
    const d = Levels.describe(cfg), cat = Questions.categoryById(cfg.cat), sp = [], sps = cfg.specialsN || {};
    ['curse', 'frost', 'egg'].forEach(function (k) { if ((sps[k] || 0) > 0) sp.push(k); });
    return {
      tag: cfg.tag, place: cfg.place, story: Story.fmt(cfg.story), catName: cfg.isBoss ? cat.name + ' + campuran' : cat.name, catIcon: GA.Icons.cat[cat.id],
      exampleHtml: GA.MathText.html(d.exampleText), rangeText: d.rangeText, notes: cfg.notes, specials: sp,
      diffName: Levels.DIFF_NAMES[cfg.diff], total: cfg.total, buff: Levels.BUFFS[cfg.buff], nerf: Levels.NERFS[cfg.nerf]
    };
  }

  /** Mulai petualangan baru dengan pilihan menu `sel`. skipStory: lewati cerita meskipun belum pernah dilihat. */
  function startAdventure(sel, skipStory, first) {
    Audio.resume();
    first = first || 0;
    const cats = Levels.resolveCats(sel), n = Levels.count;
    const picks = []; for (let i = 0; i < n; i++) picks.push(Levels.pick(i));
    adv = { picks: picks, sel: sel, cats: cats, first: first, step: first, eggs: Levels.START_EGGS, maxEggs: Levels.MAX_EGGS, score: 0,
      stars: new Array(n).fill(0), correct: 0, wrong: 0, maxCombo: 0, snap: { eggs: Levels.START_EGGS, score: 0 } };
    run = null; if (!attract) buildAttract();
    if (!skipStory && !Storage.introSeen) {
      state = 'story'; renderBg();
      UI.showStory(Story.intro, { onDone: function () { Storage.introSeen = true; startStep(first, false); } });
    } else startStep(first, false);
  }

  function startStep(n, skipIntro) {
    UI.cancelCountdown(); Audio.resume();
    adv.step = n; adv.snap = { eggs: adv.eggs, score: adv.score };
    const cfg = Levels.build(n, adv.sel, adv.cats);
    cfg.pathId = adv.picks[n].path; cfg.scene = adv.picks[n].map;   // jalur & peta dipilih acak per petualangan; Ulangi memakai yang sama
    buildRun(cfg);
    GA.Balls.warm(run.R, L.px);      // siapkan tekstur & bingkai rotasi bola selama layar pembuka
    Audio.music({ swamp: 'forest', crystal: 'volcano' }[Levels.zoneOf(cfg.scene)] || Levels.zoneOf(cfg.scene));
    if (skipIntro) { state = 'countdown'; GA.Effects.openPortal(); UI.countdown(beginPlay); }
    else { state = 'intro'; UI.showIntro(introInfo(cfg)); }
  }

  function beginPlay() {
    const cfg = run.cfg, len = run.path.length;
    run.playing = true;
    run.chain = new Chain.Chain(run.path, { r: run.R, speed: cfg.speed, maxBalls: 999, labeler: labelBall });
    run.chain.entryD = GA.Effects.entryD();
    // zona kecepatan jalur + nerf Arus Deras: dua segmen tambahan tempat rantai melaju lebih cepat
    run.zones = (run.path.zones || []).slice();
    if (run.fx.current) CURRENT_ZONES.forEach(function (z) { run.zones.push({ from: len * z[0], to: len * z[1], mul: 1.5 }); });
    run.chain.zones = run.zones; run.chain.overWindows = run.path.overWindows;
    run.chain.onEmerge = function (b) { GA.Effects.pulse(0.55); const p = GA.Effects.portalPos(); if (p) FX.embers(p.x, p.y, Math.cos(p.a) * 90, Math.sin(p.a) * 90, 4, run.R * 0.5, '#d9b8ff'); };
    run.chain.setQueue(buildWaves(cfg, cfg.total, cfg.speed));      // 20 bola target + bola khusus keluar bergelombang dari portal
    if (run.boss) {
      applyPhase();
      run.boss.say(run.boss.phase.say, 3.4); run.boss.resetSpellTimer();
    } else run.qTimeMax = cfg.questionTime || 0;
    run.qTime = run.qTimeMax; run.qid = -1; run.q = null;
    run.shooter.reset();
    if (cfg.buff === 'gold' && run.lives < run.maxLives) { run.lives++; FX.text(run.shooter.x, run.shooter.y - run.shooter.r - 20, T('fx.egg'), '#ffe27a', 30); Audio.play('egg'); }
    state = 'playing';
    if (!Storage.coachSeen) {      // coachmark pendek, hanya pertama kali
      Storage.coachSeen = true;
      GA.Kit.coach(T('coach.1'), 2400); setTimeout(function () { GA.Kit.coach(T('coach.2'), 2400); }, 2600); setTimeout(function () { GA.Kit.coach(T('coach.3'), 2400); }, 5200);
    }
  }

  /* ================= telur (nyawa) & akibat tembakan ================= */
  function loseEgg(reason) {
    if (run.fx.shield > 0) {      // buff Perisai Telur: satu kesalahan dimaafkan
      run.fx.shield--; run.shooter.react('hurt'); FX.flash(0.25, '120,200,255');
      FX.text(run.shooter.x, run.shooter.y - run.shooter.r - 18, T('fx.shield'), '#9fe0ff', 30); Audio.play('frost');
      return;
    }
    { const nest = Path.holeXY(run.path), ep = GA.Nest.eggPos(nest, run.R, Math.max(0, run.lives - 1), run.maxLives), el = GA.Eggs.el[GA.Eggs.elFor(Theme.scene, run.lives - 1)]; FX.eggBreak(ep.x, ep.y, run.R, null); }   // telur pecah di sarang
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
    run.qSerial++;      // jawaban benar membatalkan penilaian peluru lain yang masih melayang untuk soal ini
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo); run.comboPulse = 0.5;
    const pts = (100 + 25 * Math.min(run.combo - 1, 8)) * bullet.ammo.mult * (bullet.twin ? 2 : 1);
    run.score += pts; run.correct++;
    run.deck[ball.qid].done = true;
    if (run.fx.twin && run.correct % 5 === 0 && !run.fx.twinReady) { run.fx.twinReady = true; FX.text(run.shooter.x, run.shooter.y - run.shooter.r - 18, T('fx.twinready'), '#ffd27a', 26); }
    run.chain.remove(ball);
    FX.shatter(ball.x, ball.y, ballColors(ball), run.R);
    FX.fireImpact(bullet.x, bullet.y, true, run.R);
    FX.pop(ball.x, ball.y - 24, '+' + pts, 'score', 30);
    if (run.combo >= 3) FX.pop(ball.x, ball.y - 62, [T('fx.c1'), T('fx.c2'), T('fx.c3')][run.combo % 3] + ' ×' + run.combo, 'combo', 24);
    Audio.play('correct', run.combo);
    run.chain.retreat((run.cfg.retreatSec * run.cfg.speed + Math.min(run.combo, 5) * 20) * (1 + 0.4 * (run.R / 25 - 1)));
    run.shooter.react('happy');
    run.feedback = null;
    run.progress = run.correct / run.total;

    if (run.boss) {
      const r = run.boss.hit();
      Audio.play('bossHit'); FX.shake(8);
      FX.text(run.boss.x, run.boss.y - run.boss.R - 4, '-1', '#c9a0ff', 34);
      if (r === 'defeat') { startClearing(true); return; }
      if (r === 'phase') { Audio.play('phase'); FX.confetti(run.boss.x, run.boss.y, 26); applyPhase(); }
    } else if (run.correct >= run.total) { startClearing(false); return; }
    pickActive(run.qid);
  }

  function onWrong(bullet, ball, why) {
    run.wrong++;
    FX.fireImpact(bullet.x, bullet.y, false, run.R);
    if (ball) { ball.wob = 0.5; ball.red = 0.5; FX.pop(ball.x, ball.y - 24, T('fx.wrong'), 'bad', 30); FX.ring(ball.x, ball.y, '#ff4d5e', 50); }
    Audio.play('wrong');
    if (run.q) setFeedback((why || T('fx.wrong')) + ' ' + run.q.explain, run.q.hint, false); else setFeedback(why || T('fx.wrong'), '', false);
    if (run.boss) { run.boss.attack(); Audio.play('bossAttack'); FX.shake(10); }
    if (run.cfg.freezeOnWrong) { run.shooter.freeze(run.cfg.freezeOnWrong); Audio.play('frost'); FX.text(run.shooter.x, run.shooter.y - run.shooter.r - 16, T('fx.frozen'), '#9fe0ff', 28); }
    loseEgg('Jawaban salah');
  }

  function ballHit(bullet, ball) {
    switch (ball.kind) {
      case 'num':
        if (isCorrectText(ballText(ball))) onCorrect(bullet, ball);
        else if (!run.q || bullet.serial !== run.qSerial) {      // peluru ditembakkan untuk soal sebelumnya (soal berganti saat peluru melayang): tidak dihukum
          FX.fireImpact(bullet.x, bullet.y, false, run.R); FX.pop(ball.x, ball.y - 24, T('fx.changed'), 'bad', 22);
        } else onWrong(bullet, ball);
        break;
      case 'curse':
        run.chain.remove(ball); FX.burst(ball.x, ball.y, ['#6a2f8f', '#c9a0ff', '#222'], 30); FX.text(ball.x, ball.y - 20, T('fx.curse'), '#c9a0ff', 32);
        Audio.play('curse'); setFeedback(T('fb.curse'), '', false); loseEgg('Menembak bola kutukan');
        break;
      case 'frost':
        run.chain.remove(ball); run.chain.slowT = 6; FX.burst(ball.x, ball.y, ['#d4f1ff', '#7fd0ff', '#fff'], 20); FX.text(ball.x, ball.y - 20, T('fx.slow'), '#7fd0ff', 28); Audio.play('frost');
        break;
      case 'egg':
        run.chain.remove(ball); run.lives = Math.min(run.maxLives, run.lives + 1); FX.burst(ball.x, ball.y, ['#ffe27a', '#fff', '#ffb02e'], 24); FX.text(ball.x, ball.y - 20, T('fx.egg'), '#ffe27a', 30); Audio.play('egg');
        break;
    }
    if (state === 'playing') validateActive();
  }

  /** Peluru bergerak satu langkah kecil. true = peluru habis. */
  function onBulletStep(b, sd) {
    const hz = run.haz.bullet(b, sd || 0.01);      // rintangan zona (js/hazards.js)
    if (hz === 'kill') {
      FX.burst(b.x, b.y, ['#ffb02e', '#ff5a1a', '#fff'], 14); FX.text(b.x, b.y - 22, T('fx.warn'), '#ff9a9a', 26); Audio.play('rock');
      setFeedback(T('fb.obst'), T('fb.obst2'), false); loseEgg('Peluru mengenai rintangan'); return true;
    }
    if (hz === 'absorb') { FX.burst(b.x, b.y, ['#7fe3ff', '#fff'], 10); return true; }
    if (hz === 'bounce') { Audio.play('crystal'); FX.burst(b.x, b.y, ['#7fe3ff', '#fff'], 10); return false; }
    const o = run.obst.collide(b.x, b.y, Bullets.rObs);
    if (o) {
      run.obst.hitFlash(o);
      const lava = o.kind === 'lava' || o.kind === 'bolt';
      FX.burst(b.x, b.y, lava ? ['#ffb02e', '#ff5a1a', '#fff'] : ['#8a5a30', '#4e3018', '#6ac060'], 14); FX.text(b.x, b.y - 22, T('fx.warn'), '#ff9a9a', 26);
      Audio.play(lava ? 'rock' : 'thorn');
      setFeedback(T('fb.obst'), T('fb.obst2'), false);
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
    if (state !== 'playing' || !sh.canFire() || run.chain.settling()) return; // tunggu rantai selesai bergeser / menutup celah
    sh.muzzle(tmpM);
    const bl = Bullets.fire(tmpM.x, tmpM.y, sh.aim, sh.takeShot());
    FX.muzzle(tmpM.x, tmpM.y, sh.aim, run.R); FX.shake(2.5);
    bl.twin = false; bl.serial = run.qSerial;
    if (run.fx.twinReady) { run.fx.twinReady = false; bl.twin = true; sh.reload = 0; FX.text(tmpM.x, tmpM.y - 30, T('fx.twin2'), '#ffd27a', 26); }   // buff Api Ganda: tembakan bonus, tanpa jeda isi ulang, skor ×2
    run.shots++;
    Audio.play('fire');
  }

  function swapAmmo() { if (state === 'playing') { run.shooter.swap(); Audio.play('swap'); } }

  /* ================= selesai step ================= */
  function startClearing(boss) {
    state = 'clearing'; run.clearT = 0; run.bossDone = !!boss; GA.Effects.closePortal();
    run.chain.paused = true; run.chain.ff = false; run.chain.spawnQ.length = 0; Bullets.clear(); run.obst.setMovers(false); run.haz.clearAll(); run.shooter.react('cheer');
    run.clearQ = run.chain.balls.filter(function (b) { return run.chain.visible(b); });
    run.score += run.lives * 100; // bonus telur tersisa
    FX.text(L.W / 2, L.play.y + 60, boss ? T('fx.boss') : T('fx.stepdone'), '#ffd23f', 40);
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
    syncAdv(); Storage.noteScore(adv.score);
    Storage.recordStep(cfg.diff, cfg.step, stars, adv.score);
    if (cfg.isBoss) { finishAdventure(true); return; }
    const bonus = adv.eggs < adv.maxEggs;
    if (bonus) adv.eggs++;
    state = 'stepdone';
    UI.showStepDone({ n: cfg.step + 1, tag: cfg.place, stars: stars, score: adv.score, eggs: adv.eggs, maxEggs: adv.maxEggs, bonus: bonus,
      correct: run.correct, wrong: run.wrong, combo: run.maxCombo, nextN: cfg.step + 2 });
  }

  function finishAdventure(win) {
    const rec = Storage.recordRun(adv.score);
    const res = {
      win: win, steps: Levels.STEPS.map(function (s, i) { return { name: (i + 1) + " · " + s.place, stars: adv.stars[i], i: i }; }).filter(function (s) { return s.i >= (adv.first || 0); }),
      score: adv.score, newBest: rec.newHigh, high: Storage.data.highScore, eggs: win ? adv.eggs : 0, maxEggs: adv.maxEggs, correct: adv.correct, wrong: adv.wrong, combo: adv.maxCombo
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
    let x = tmpM.x, y = tmpM.y, dx = Math.cos(sh.aim), dy = Math.sin(sh.aim);
    for (let k = 0; k < 2; k++) {
      let best = k ? 360 : (r.fx.aim ? 900 : 330), hit = null;
      if (r.haz && r.haz.blind > 0.3 && !k) best = Math.min(best, 80);      // asap kutukan menutup garis bidik
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
    sh.off = r.fx.heat ? Math.sin(t * 9.1) * 0.02 + Math.sin(t * 5.3 + 1) * 0.014 : 0;   // nerf Hawa Panas: bidikan bergetar
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
      r.chain.update(dt); r.haz.update(dt);
      Bullets.update(dt, L.W, L.H, onBulletStep);
      if (state !== 'playing') return;

      // kelelawar penyihir (tukar dua bola) & kabut sihir terjadwal
      if (r.bats) r.bats.update(dt, { chain: r.chain, W: L.W, H: L.H, active: !r.boss || r.boss.phaseIdx >= 2,
        onSwap: function (a, b) { r.chain.swapLabels(a, b); FX.ring(a.x, a.y, '#c9a0ff', 44); FX.ring(b.x, b.y, '#c9a0ff', 44); Audio.play('swap'); FX.text(a.x, a.y - 24, T('fx.swap'), '#c9a0ff', 24); validateActive(); } });
      if (r.cfg.fog) { r.fogT -= dt; if (r.fogT <= 0) { r.fogT = r.cfg.fog.every; fogBalls(r.cfg.fog.count, r.cfg.fog.dur); } }
      if (r.boss) { const sp = r.boss.tick(dt); if (sp) castSpell(sp); }

      // bola sihir sampai ke sarang
      if (r.holeCd > 0) r.holeCd -= dt;
      else if (r.chain.holeReached()) {
        const f = r.chain.balls[0];
        const hp = Path.holeXY(r.path);
        r.chain.remove(f);
        FX.burst(hp.x, hp.y, ['#7a5cff', '#c9b6ff', '#fff'], 22);
        if (f.kind === 'num') {
          // bola target lolos: satu telur hilang, rantai mundur, tetapi progres soal TIDAK hilang — soalnya keluar lagi dari portal
          FX.text(hp.x, hp.y - 50, T('fx.stolen'), '#ff9a9a', 28); Audio.play('steal');
          r.chain.requeue({ qid: f.qid, kind: 'num', gap: r.chain.D * 2.5 });
          r.chain.retreat(650, 900); r.chain.hold = 0.5; r.holeCd = 1.8;
          setFeedback(T('fb.hole'), T('fb.hole2'), false);
          loseEgg('Bola sihir sampai di sarang');
          if (state !== 'playing') return;
        } else r.holeCd = 0.4;      // bola khusus yang lolos lenyap tanpa hukuman
        validateActive();
      }

      // buff Waktu Beku: sekali, otomatis saat bola terdepan hampir sampai di sarang
      if (r.fx.freeze > 0 && r.chain.balls.length && r.path.length - r.chain.frontD() < r.R * 9) {
        r.fx.freeze--; r.chain.slowT = 7; FX.text(r.shooter.x, r.shooter.y - r.shooter.r - 18, T('fx.freeze'), '#9fe0ff', 30); Audio.play('frost');
      }

      // batas waktu soal (fase terakhir boss)
      if (r.qTimeMax && r.q) {
        r.qTime -= dt;
        if (r.qTime <= 0) {
          r.wrong++; Audio.play('wrong');
          setFeedback(T('fb.time') + ' ' + r.q.explain, r.q.hint, false);
          if (r.boss) { r.boss.attack(); Audio.play('bossAttack'); FX.shake(10); }
          loseEgg('Waktu habis');
          if (state === 'playing') pickActive(r.qid);
        }
      }
      r.ensureT -= dt;
      if (r.ensureT <= 0) { r.ensureT = 0.3; validateActive(); }
      r.chain.ff = r.qid < 0 && r.chain.spawnQ.length + r.chain.balls.length > 0;   // tidak ada target terlihat: percepat sampai kelompok berikutnya muncul

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

  /** Nerf Arus Deras: dua segmen jalur tempat rantai melaju lebih cepat, ditandai pita air bergerak. */
  const CURRENT_ZONES = [[0.2, 0.33], [0.58, 0.72]], tmpP = { x: 0, y: 0, a: 0 };
  function drawCurrent(r) {
    const len = r.path.length;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([16, 22]); ctx.lineDashOffset = -t * 70;
    ctx.lineWidth = r.R * 1.5; ctx.strokeStyle = 'rgba(150,225,255,' + (0.17 + 0.06 * Math.sin(t * 3)).toFixed(2) + ')';
    CURRENT_ZONES.forEach(function (z) {
      ctx.beginPath();
      for (let d = len * z[0], e = len * z[1], first = true; d <= e; d += 8) { r.path.at(d, tmpP); if (first) { ctx.moveTo(tmpP.x, tmpP.y); first = false; } else ctx.lineTo(tmpP.x, tmpP.y); }
      ctx.stroke();
    });
    ctx.restore();
  }

  /** fase 1: peta, sarang, boss, rintangan, rantai. fase 2: garis bidik, kelelawar, naga, peluru, efek. Penutup depan peta digambar di antaranya. */
  function drawScene(sc, showGuide, phase) {
    const R = sc.R;
    const center = { x: L.play.x + L.play.w / 2, y: L.play.y + L.play.h / 2 };
    if (phase === 2) {
      if (sc.chain) sc.chain.drawOver(ctx, t, L.px);
      if (showGuide && sc.guide && sc.guide.length) drawGuide(sc.shooter, t, sc.guide);
      if (sc.bats) sc.bats.draw(ctx, t);
      if (sc.haz) sc.haz.drawOver(ctx, t, sc.shooter.aim);
      sc.shooter.draw(ctx, t, L.px);
      if (sc === run) Bullets.draw(ctx, L.px, t);
      FX.draw(ctx);
      return;
    }
    GA.Scenery.drawAmbient(ctx, t, frameDt);
    GA.Effects.drawBirds(ctx, t, frameDt);
    FX.drawDecals(ctx, frameDt);
    GA.Effects.drawPortal(ctx, t, frameDt);
    Path.drawMarkers(ctx, sc.path, R, t, center, L.portrait ? 16 : 15);
    Path.drawNest(ctx, sc.path, R, t, sc.lives, sc.maxLives || 5, sc.lifeLostT > 0 ? 1 : 0, sc.chain && state === 'playing' ? Math.max(0, Math.min(1, 1 - (sc.path.length - sc.chain.frontD()) / (R * 14))) : 0);
    if (sc.boss) {
      sc.boss.draw(ctx, t);
      sc.boss.drawHP(ctx, sc.boss.x, sc.boss.y + sc.boss.R * 1.08 + 12, Math.min(L.W * 0.6, 340));
    }
    if (sc.obst) sc.obst.draw(ctx, t);
    if (sc.haz) sc.haz.draw(ctx, t);
    if (sc === run && sc.fx.current && sc.chain) drawCurrent(sc);
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
    start: function (sel, first) { startAdventure(sel, false, first || 0); },
    introGo: function () { state = 'countdown'; GA.Effects.openPortal(); UI.countdown(beginPlay); },
    resume: resumeGame,
    pause: pauseGame,
    hasProgress: hasProgress,
    // ulangi step ini dari awal, dengan telur & skor seperti saat step dimulai
    restart: function () { adv.eggs = adv.snap.eggs; adv.score = adv.snap.score; startStep(adv.step, true); UI.hide(); },
    quit: toTitle,
    nextStep: function () { startStep(adv.step + 1, false); },
    again: function () { startAdventure(adv.sel, true, adv.first || 0); },
    toMenu: toMenu,
    toggleSound: function () { const on = !Audio.isEnabled(); Audio.setEnabled(on); Storage.sound = on; UI.syncSound(); if (on) Audio.play('click'); },
    setQuality: function (m) { GA.Quality.setMode(m); Storage.quality = GA.Quality.mode; UI.syncSound(); },
    toggleMusic: function () { const on = !Audio.isMusic(); Audio.setMusic(on); Storage.music = on; UI.syncSound(); },
    replayStory: function () { UI.showStory(Story.intro, { onDone: function () { UI.show('settings'); } }); }
  };

  /* ================= mulai ================= */
  GA.Dragon.Dragon.onFlap = function () { if (state === 'playing') Audio.play('flap'); };     // bunyi kepakan sinkron dengan animasi sayap
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
  GA.game = { get state() { return state; }, get run() { return run; }, get adv() { return adv; }, get layout() { return L; }, tick: tick, startAdventure: startAdventure, startStep: startStep, fire: fire, handlers: handlers, validateActive: validateActive, pickActive: pickActive, openLine: openLine, pendingVisible: pendingVisible, buildWaves: buildWaves };
})(window.GA = window.GA || {});
