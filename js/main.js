/* main.js — loop game, layout responsif, input (Pointer Events), alur petualangan.
 *
 * Alur: Halaman awal (kategori + kesulitan, ui/start.js) → Mulai Main → cerita (sekali) → Stage 1 → Stage 2 → Stage 3 (Final Boss) → hasil → halaman awal.
 * State: menu | story | intro | countdown | playing | cine | paused | clearing | stepdone | dying | result
 * Telur (nyawa) selalu 3/3 di awal setiap stage (juga saat Ulangi). Konfigurasi stage ada di levels.js, angka gameplay di config/gameplay.js,
 * soal di questions.js + qmanager.js, rintangan zona di hazards.js, boss di boss.js, cerita di story.js.
 */
(function (GA) {
  'use strict';
  const T = GA.T, Theme = GA.Theme, FX = GA.FX, Path = GA.Path, Chain = GA.Chain, Shooter = GA.Shooter, Bullets = GA.Shooter.Bullets,
    Questions = GA.Questions, Levels = GA.Levels, Bosses = GA.Bosses, UI = GA.UI, Audio = GA.Audio, Storage = GA.Storage, Story = GA.Story, Gameplay = GA.Gameplay;
  let canvas = null, ctx = null;      // dibuat oleh boot() dan dilepas oleh destroy() (mesin tidak berjalan di halaman awal)

  let L = null;                // layout logis
  let state = 'menu';
  let run = null;              // data stage yang sedang dimainkan
  let adv = null;              // data petualangan (3 stage)
  let attract = null;          // adegan dekoratif di menu
  let t = 0, last = 0, hudShown = false, frameDt = 0;
  const keys = {};
  const ptr = { down: false, id: null, type: 'mouse' };      // type: 'mouse' | 'touch' | 'key' (radius target-lock dan offset titik bidik)
  const tmpM = { x: 0, y: 0 }, shk = { x: 0, y: 0 };

  /* ================= layout & latar ================= */
  function computeLayout() {
    const ov = GA.devViewport, cssW = Math.max(1, ov ? ov.w : window.innerWidth), cssH = Math.max(1, ov ? ov.h : window.innerHeight);      // devViewport: hanya untuk uji (js/dev/qsim.js); jendela berukuran 0 (panel tersembunyi) tidak boleh menghasilkan NaN
    const portrait = cssH > cssW;
    const W = portrait ? 540 : 960, H = portrait ? 960 : 540;
    const scale = Math.min(cssW / W, cssH / H);
    const dpr = Math.min(window.devicePixelRatio || 1, GA.Quality ? GA.Quality.dprCap : 2);
    const hud = UI.hudMetrics({ portrait: portrait, scale: scale, W: W }).h;
    let ballR = Theme.ballRadiusFor(W, H, scale);
    if (run && Math.abs(ballR - run.baseR) < 3) ballR = run.baseR; // jangan bangun ulang jika jendela hanya berubah sedikit
    L = { portrait: portrait, W: W, H: H, scale: scale, dpr: dpr, cssW: cssW, cssH: cssH, ox: (cssW - W * scale) / 2, oy: (cssH - H * scale) / 2,
      px: dpr * scale, hud: hud, ballR: ballR, pad: ballR + Theme.ball.trackMargin + 6, hudGap: portrait ? 1.5 : 1.0, padTop: Math.round(((portrait ? 1.5 : 1.0) + 1) * ballR * (portrait ? 1.12 : 1.05)), play: { x: 0, y: hud, w: W, h: H - hud - (portrait ? 12 : 0) } };
    GA.view = { W: W, H: H, hud: hud, minY: hud + (L.hudGap + 1) * ballR - 2 };      // minY: pusat bola tidak boleh lebih tinggi (gerak tukar melengkung tidak masuk ke zona HUD / bar boss)
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
    sh.setSize(R);  // naga, bola api siap tembak (= bola rantai), dan bola preview dihitung dari radius bola stage ini
    sh.setPos(path.shooter.x, path.shooter.y);
  }

  /** Pusat-x bar darah boss: tengah layar, atau digeser ke kiri/kanan bila menimpa sprite portal atau sarang (INV-8: HUD/label tidak menimpa portal dan sarang). */
  function bossBarX(sc, w, cy, top, bottom) {
    const P = GA.Paths, xs = sc.path.xs, ys = sc.path.ys, n = xs.length, R = sc.R, circles = [[xs[0], ys[0], P.SPR_PORTAL * R + 6], [xs[n - 1], ys[n - 1], P.SPR_NEST * R + 6]], y0 = cy - top, y1 = cy + bottom;
    const hit = function (cx) { return circles.some(function (c) { const px = Math.max(cx - w / 2, Math.min(c[0], cx + w / 2)), py = Math.max(y0, Math.min(c[1], y1)); return Math.hypot(c[0] - px, c[1] - py) < c[2]; }); };
    const cand = [L.W / 2, L.W - w / 2 - 8, w / 2 + 8];
    for (let i = 0; i < cand.length; i++) if (!hit(cand[i])) return cand[i];
    return cand[0];
  }

  /** Zona bersih INV-8 (sprite + 2R) di sekitar portal (titik awal jalur) dan sarang (titik akhir): tanpa rintangan, dekorasi, atau label lain. */
  function clearZonesOf(path, R) {
    const P = GA.Paths, n = path.xs.length;
    return [{ x: path.xs[0], y: path.ys[0], r: (P.SPR_PORTAL + P.CLEAR8) * R }, { x: path.xs[n - 1], y: path.ys[n - 1], r: (P.SPR_NEST + P.CLEAR8) * R }];
  }

  /** Rintangan zona (js/hazards.js) untuk run r: konteks berisi geometri, uji keadilan, dan kait ke permainan. */
  function makeHaz(r) {
    const sh = r.shooter;
    return GA.Hazards.create(r.cfg.haz, {
      R: r.R, play: L.play, bounds: { x0: 6, y0: L.play.y + 4, x1: L.W - 6, y1: L.H - 6 }, shooter: sh, zones: clearZonesOf(r.path, r.R), muzzleR: sh.r * Theme.dragon.mouthDist, style: GA.Nest.styleFor(Theme.scene), maxTotal: r.cfg.hazMax,
      rObs: function () { return Bullets.rObs; },
      clear: function (x, y) { return pathDist(r.path, x, y) - (r.R + Theme.ball.trackMargin); },
      targetsOpen: function () { if (!r.chain || run !== r) return true; const v = pendingVisible(); const ab = v.find(function (b) { return b.qid === r.qid; }); return (!v.length || v.some(openLine)) && (!ab || openLine(ab)); },      // revisi 8: bola jawaban soal AKTIF juga harus tetap punya garis terbuka
      randomBall: function () { if (!r.chain || run !== r) return null; const v = pendingVisible().filter(function (b) { return b.qid !== r.qid; }); return v.length ? v[Math.floor(Math.random() * v.length)] : null; },
      fog: function (x, y, rad, dur) { allBalls().forEach(function (b) { if (b.kind === 'num' && b.ch.visible(b) && b.qid !== r.qid && Math.hypot(b.x - x, b.y - y) < rad + r.R) { b.fog = dur; b.fogAge = 0; } }); },
      warn: function (e) { Audio.hazard(e.kind, e.mech, 'warn', e.x / L.W); },
      activate: function (e) { Audio.hazard(e.kind, e.mech, 'on', e.x / L.W); }
    });
  }

  function sceneRef() { return run || attract; }

  /** Latar tiap stage (js/scenery.js): id adegan mengikuti stage yang sedang dimainkan. */
  function renderBg() {
    const sc = sceneRef(), id = run ? run.cfg.scene : 'menu';
    GA.Scenery.build(canvas, L, id, sc ? sc.path : null, sc ? sc.R : 0);
    GA.Effects.setPath(L, sc ? sc.path : null, sc ? sc.R : 0, id);
    if (sc && sc.chain) sc.chain.entryD = GA.Effects.entryD();
  }

  /** Zona kecepatan jalur (bagian jalur tempat rantai melaju lebih cepat; data di maps/paths.js). */
  function chainZones(path) { return (path.zones || []).slice(); }

  function relayout() {
    if (!booted) return;      // mesin sudah dibongkar (rotasi saat kembali ke halaman awal)
    const wasPortrait = L ? L.portrait : null;
    computeLayout();
    if (wasPortrait !== null && wasPortrait !== L.portrait) {
      if (run) { rebuildForOrientation(run); if (state === 'playing') pauseGame(); }   // layar berputar: jeda otomatis, jalur dibangun ulang, posisi bola dipetakan menurut jarak relatif
      if (attract) buildAttract();
    }
    renderBg();
  }

  /** Orientasi berubah di tengah permainan: bangun ulang jalur, pertahankan posisi relatif rantai. Antrean soal, telur, dan progres tidak disentuh. */
  function rebuildForOrientation(r) {
    const newR = stageR(r.cfg), np = Path.forLayout(r.cfg.pathId, L, newR);
    r.path = np; r.baseR = L.ballR; r.R = newR; Gameplay.fill(r.gp, r.cfg.diff, r.cfg.step, L.portrait); Gameplay.track(r.gp, r.cfg.diff, r.cfg.step, L.portrait);      // kecepatan rantai mengikuti orientasi baru
    if (r.chain) { r.chain.zones = chainZones(np); r.chain.overWindows = np.overWindows; r.chain.setPath(np, newR); }   // posisi relatif sepanjang jalur dipertahankan; bola yang rapat dirapatkan ulang (tanpa celah)
    fitShooter(r.shooter, np, newR);
    { const hon = r.haz.on; r.haz = makeHaz(r); r.haz.setOn(hon); }
    if (r.boss) { r.boss.x = np.boss.x; r.boss.y = np.boss.y; r.boss.R = np.boss.R || Math.round(2.45 * L.ballR); }
    Bullets.setSize(newR); Bullets.clear();
    r.shooter.setAngle(-Math.PI / 2);
  }

  /* ================= adegan menu (dekoratif) ================= */
  function buildAttract() {
    const R = L.ballR, path = Path.forLayout('ular1', L, R);
    const chain = new Chain.Chain(path, { r: R, speed: 34, maxBalls: 26 });
    chain.fill(Math.min(24, Math.ceil(path.length * 0.55 / chain.D) + 1), path.length * 0.55, 0);
    const sh = new Shooter.Shooter(); fitShooter(sh, path, R);
    attract = { path: path, chain: chain, shooter: sh, R: R, boss: null };
  }

  function updateAttract(dt) {
    const a = attract;
    a.chain.update(dt);
    a.shooter.setAngle(-Math.PI / 2 + Math.sin(t * 0.6) * 1.1);
    a.shooter.update(dt);
    if (a.chain.holeReached()) a.chain.fill(Math.min(24, Math.ceil(a.path.length * 0.2 / a.chain.D) + 1), a.path.length * 0.2, 0);   // rantai dekoratif menu memakai kecepatan piksel tetap (34 px/dtk)
  }

  /* ================= soal, dek & bola target ================= */
  /** Teks efektif sebuah bola (memperhitungkan animasi balik label). Kebenaran dinilai dari TEKS, jadi pecahan 1/2 ≠ 2/4. */
  function ballText(b) { return b.nt !== null && b.nt !== undefined ? b.nt : b.text; }
  function isCorrectText(txt) { return !!run.q && txt === run.q.answerText; }

  /** Isi bola dari antrean: bola target membawa jawaban soal `qid` di dek; bola khusus tidak berangka. */
  function labelBall(b) {
    if (b.want && b.want !== 'num') { b.kind = b.want; b.value = 0; b.text = ''; return; }
    b.kind = 'num';
    const q = run && run.deck && b.qid != null ? run.deck[b.qid] : null;
    if (q) { b.value = q.answer; b.text = q.answerText; } else { b.value = 1 + Math.floor(Math.random() * 20); b.text = String(b.value); }
  }

  /** Semua bola rantai stage ini. */
  function allBalls() { return run.chain.balls; }
  function anySettling() { return run.chain.settling(); }

  /** Pandangan rantai untuk penukar bola (kelelawar): daftar semua bola + tes terlihat per bola. */
  const batsFacade = { balls: null, visible: function (b) { return b.ch.visible(b); } };
  function batsView() { batsFacade.balls = allBalls(); return batsFacade; }

  /** Penghalang lontaran dari mulut naga ke bola b (revisi 8): null (terbuka) | { haz } = rintangan TINGGI aktif / hampir aktif di garis lurus. Bola lain TIDAK pernah menghalangi (bola api terbang di atasnya). */
  function lineBlocker(b) {
    const sh = run.shooter, a = Math.atan2(b.y - sh.y, b.x - sh.x), d0 = sh.r * Theme.dragon.mouthDist, mx = sh.x + Math.cos(a) * d0, my = sh.y + Math.sin(a) * d0;
    const hzb = run.haz.blocksLine(mx, my, b.x, b.y, run.gp.LOB_TIME);
    return hzb ? { haz: hzb } : null;
  }
  function openLine(b) { return !lineBlocker(b); }

  /** Anti-macet: bila bola target terhalang rintangan tinggi > 1 dtk, rintangan itu menyingkir. */
  function clearBlockers(vis) {
    vis.forEach(function (b) {
      const blk = lineBlocker(b); if (!blk) return;
      run.haz.remove(blk.haz); FX.ring(blk.haz.x, blk.haz.y, '#ffd27a', 40);
    });
  }

  /** TARGET-LOCK: bola terlihat terdekat dengan titik bidik (px,py) dalam radius mult × R, atau null. Pitch jalur ≥ 2,6R dan jarak tetangga rantai 1,96R membuat pilihan tidak ambigu. */
  function pickTarget(px, py, mult) {
    let best = null, bd = (mult * run.R) * (mult * run.R);
    for (const b of allBalls()) {
      if (!b.ch.visible(b)) continue;
      const dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy; if (d2 < bd) { bd = d2; best = b; }
    }
    return best;
  }
  function lockMult() { return ptr.type === 'mouse' ? run.gp.LOCK_RADIUS : run.gp.LOCK_RADIUS_TOUCH; }
  /** Perbarui target-lock tiap frame dan penonjolan bola yang terkunci. */
  function updateLock(r, dt) {
    const sh = r.shooter, tgt = state === 'playing' ? pickTarget(sh.aimPt.x, sh.aimPt.y, lockMult()) : null;
    r.lock = tgt; r.lockBlocked = tgt ? !!lineBlocker(tgt) : false;
    allBalls().forEach(function (b) { const k = b.lockK || 0, want = b === tgt ? 1 : 0; b.lockK = Math.abs(want - k) < 0.01 ? want : k + (want - k) * Math.min(1, dt * 14); });
  }

  /** Bola target yang soalnya belum selesai dan sudah muncul di jalur. */
  function pendingVisible() {
    const out = [];
    for (const b of allBalls()) if (b.kind === 'num' && b.qid != null && !run.qm.isSolved(b.qid) && b.ch.visible(b)) out.push(b);
    return out;
  }
  /** Bola yang membawa jawaban soal `qid` (qid sama; penukaran angka memindahkan qid bersama angkanya). */
  function targetBall(qid) {
    if (qid < 0) return null;
    for (const b of allBalls()) if (b.kind === 'num' && b.qid === qid) return b;
    return null;
  }
  function activeBall() { return targetBall(run.qid); }
  function targetQueued(qid) { for (const s of run.chain.spawnQ) if (s.kind === 'num' && s.qid === qid) return true; return false; }

  /** Dipanggil QuestionManager SETELAH soal berganti lewat advance(reason): reset timer, transisi plakat terlihat, SFX tick. */
  function onQuestionChange(ev, from) {
    run.qTime = run.qTimeMax; run.blockedT = 0; run.qPop = 0.38; run.qExpire = 0;
    run.qTrans = { t: 0, from: from, reason: ev.reason, solved: ev.reason === 'ANSWERED_CORRECT' };
    Audio.play('tick');
    // penjaga keadilan: bola jawaban soal yang baru aktif tidak boleh berada di 12% terakhir jalur; bila terjadi, rantai melambat sebentar (tanpa menandai bola)
    const q = run.qm.active, c = run.chain;
    if (q && c) { const b = targetBall(q.id); if (b && b.d > c.path.length * (1 - run.gp.ACTIVE_END_GUARD)) { c.slowT = Math.max(c.slowT, run.gp.ACTIVE_SLOW_SEC); run.endGuards = (run.endGuards || 0) + 1; } }
  }

  /** Bola target soal aktif muncul lagi dari portal (dicuri ke sarang / hilang): soal TETAP, bola bercahaya agar terlihat. */
  function respawnTarget(qid) {
    run.chain.requeue({ qid: qid, kind: 'num', reborn: true });
    GA.Effects.pulse(1.0);
  }

  /** Bola jawaban soal aktif masih antre di belakang cadangan bola yang tersembunyi di portal (rantai ditarik mundur): selipkan tepat di
   * batas portal setelah rantai berhenti bergeser, supaya muncul segera dari portal (bercahaya) tanpa menunggu seluruh cadangan keluar. */
  function surfaceTarget(qid) {
    const c = run.chain;
    const i = c.spawnQ.findIndex(function (s) { return s.kind === 'num' && s.qid === qid; }); if (i < 0) return;
    if (c.hold > 0 || Math.abs(c.pending) > 2) return;                      // rantai masih bergeser / tertahan
    const k = c.balls.findIndex(function (b) { return b.d < c.entryD; });    // bola tersembunyi pertama = antrean berikutnya yang keluar
    if (k < 1) return;                                                       // tidak ada cadangan tersembunyi: spawn biasa akan memunculkannya
    const spec = c.spawnQ.splice(i, 1)[0], nb = c.insert(k, spec);
    run.beacons.push({ b: nb, t: 2.6, n: 0 }); GA.Effects.pulse(1.0); Audio.play('emerge', undefined, 0);
  }

  /** Perawatan target soal aktif (tiap 0.3 dtk). TIDAK PERNAH mengganti soal: bila bolanya terhalang, penghalang disingkirkan; bila hilang, dimunculkan lagi. */
  function validateActive() {
    const vis = pendingVisible();
    if (vis.length && !vis.some(openLine)) { run.noOpenT = (run.noOpenT || 0) + 0.3; if (run.noOpenT > 1.0) { run.noOpenT = 0; clearBlockers(vis); } } else run.noOpenT = 0;
    const q = run.qm.active; if (!q) return;
    if (!targetBall(q.id)) { if (!targetQueued(q.id)) respawnTarget(q.id); else surfaceTarget(q.id); }
    const ab = targetBall(q.id);
    if (!ab || !ab.ch.visible(ab)) { run.blockedT = 0; return; }       // belum keluar / di belakang portal: tunggu, soal tetap
    if (!lineBlocker(ab)) { run.blockedT = 0; return; }
    run.blockedT += 0.3;
    if (run.blockedT > 1.0) { clearBlockers([ab]); run.blockedT = 0; }                        // rintangan tinggi menyingkir
  }

  function shuffled(a, rng) {
    const o = a.slice(); rng = rng || Math.random;
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = o[i]; o[i] = o[j]; o[j] = x; }
    return o;
  }

  /** Aliran bola dari kumpulan soal `qids`: SATU urutan kontinu (tanpa kelompok/jeda) yang keluar dari portal. Bola khusus
   * (tidak dihitung dalam 20) disisipkan acak, tidak di 3 bola pertama dan tidak berdempetan. */
  function buildStream(cfg, qids) {
    const rng = run && run.qm ? function () { return run.qm.rand(); } : Math.random;      // ber-seed: aliran bisa direproduksi
    const out = qids.map(function (id) { return { qid: id, kind: 'num' }; });      // urutan bola = urutan soal yang sudah diacak dalam blok kecil (lihat beginPlay)
    const sp = cfg.specialsN || {}, kinds = [];
    ['frost', 'egg'].forEach(function (k) { for (let i = 0; i < (sp[k] || 0); i++) kinds.push(k); });
    shuffled(kinds, rng).forEach(function (k, i) {
      const n = out.length, lo = Math.min(3, n), slot = Math.max(1, Math.floor((n - lo) / (kinds.length || 1)));
      const pos = Math.min(out.length, lo + i * slot + Math.floor(rng() * slot));      // satu bola khusus per "irisan" aliran: tersebar merata
      out.splice(pos + i, 0, { kind: k });
    });
    return out;
  }

  /** Terapkan pola boss saat ini: kecepatan rantai dan rintangan zona (soal tetap dari dek 20 soal). */
  function applyPhase() {
    const b = run.boss, ph = b.phase;
    run.chain.speedMul = ph.speedMul;
    run.haz.setOn(ph.movers);
    run.qTimeMax = ph.questionTime || 0;
    Audio.intensity(b.phaseIdx);      // musik makin padat tiap pola
  }

  /* ================= penukaran bola (js/swap.js) ================= */
  /** Stage 3, fase 2 boss (bar 2 / pola paling berat): dua pasangan sekaligus. */
  function swapPhase2() { const b = run.boss; return !!b && (b.bars === 2 ? b.tier === 1 : b.tier === 2); }

  function makeSwap(c) {
    const cfg = run.cfg;
    return new GA.Swap.SwapManager({
      chain: c, rng: GA.QM.prng((run.qm.seed ^ 0x5A17C0DE) >>> 0), every: Gameplay.SWAP_EVERY[cfg.step] || null, gp: run.gp, qm: run.qm, actor: cfg.isBoss ? 'wizard' : 'bat',
      pairs: function () { return swapPhase2() ? run.gp.SWAP_PAIRS_PHASE2 : 1; },
      hooks: {
        busy: function () { return Bullets.list.some(function (b) { return b.on; }); },      // peluru terbang: eksekusi ditahan (indikator tetap tampil)
        warn: function (pairs) {      // peringatan ≥ 2,5 dtk sebelum menukar: SFX peringatan lalu naik nada; pelaku mulai beraksi (penyihir mengangkat tongkat, kelelawar mendekat)
          Audio.play('swapWarn', run.gp.SWAP_TELEGRAPH);
          if (run.boss) { run.boss.castT = run.gp.SWAP_TELEGRAPH; run.boss.say(run.boss.def.lines.spell.swap, 1.6); }
          if (!Storage.swapSeen) { Storage.swapSeen = true; setInfo({ tone: 'coach', icon: 'swap', text: T('coach.swap'), dur: 2.6 }); } else setInfo({ tone: 'info', icon: 'swap', text: T('coach.swap'), dur: run.gp.SWAP_TELEGRAPH });      // coachmark ⇄ sekali, tersimpan; ikon ⇄ juga muncul di zona informasi HUD setiap penukaran
        },
        go: function (pairs) {
          Audio.play('swapGo', pairs.length);
          pairs.forEach(function (pr) { FX.burst(pr[0].x, pr[0].y, ['#e6d0ff', '#c9a0ff', '#fff'], 14); FX.burst(pr[1].x, pr[1].y, ['#e6d0ff', '#c9a0ff', '#fff'], 14); });
          run.later.push({ t: run.gp.SWAP_ANIM, fn: function () { pairs.forEach(function (pr) { FX.burst(pr[0].x, pr[0].y, ['#e6d0ff', '#c9a0ff', '#fff'], 12); FX.burst(pr[1].x, pr[1].y, ['#e6d0ff', '#c9a0ff', '#fff'], 12); }); validateActive(); } });
        },
        fizzle: function (pr) { Audio.play('fizzle'); [pr[0], pr[1]].forEach(function (b) { FX.burst(b.x, b.y, ['#8a7aa8', '#c9c0d8'], 8); FX.ring(b.x, b.y, '#8a7aa8', run.R * 1.4); }); }
      }
    });
  }

  /* ================= mantra boss ================= */
  /** Kabut sihir: sembunyikan angka `count` bola yang terlihat selama `dur` detik (tetap ada minimal satu jawaban benar yang terbaca). */
  function fogBalls(count, dur) {
    const vis = allBalls().filter(function (b) { return b.kind === 'num' && b.ch.visible(b); });
    for (let i = vis.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = vis[i]; vis[i] = vis[j]; vis[j] = x; }
    vis.slice(0, count).forEach(function (b) { b.fog = dur; b.fogAge = 0; });
    const clearCorrect = vis.some(function (b) { return isCorrectText(ballText(b)) && b.fog <= 0; });
    if (!clearCorrect) { const c = vis.find(function (b) { return isCorrectText(ballText(b)); }); if (c) c.fog = 0; }
    Audio.play('spell');
  }

  function castSpell(name) {
    Audio.play('spell'); FX.flash(0.25, '170,110,255');
    if (name === 'fog') fogBalls(3 + (run.boss.phaseIdx >= 1 ? 1 : 0), 6);
    else if (name === 'frost') { run.shooter.freeze(1.4); Audio.play('frost'); }
    FX.ring(run.boss.x, run.boss.y, '#c9a0ff', run.boss.R * 1.6);
  }

  /* ================= petualangan & stage ================= */
  /** Radius bola rantai untuk stage ini (bola desimal/pecahan boleh sedikit lebih besar). */
  function stageR(cfg) {
    let R = Math.min(L.ballR * cfg.ballScale, L.ballR * 1.2);
    // revisi 10: bola kategori besar (1,08–1,12×) di layar kecil (bola dasar >= 33) bisa membuat rute grid tidak muat; kecilkan bertahap (tidak pernah di bawah radius bola dasar) sampai jalur valid (INV-2..8)
    for (; R > L.ballR + 0.01; R -= 0.5) { const rep = Path.forLayout(cfg.pathId, L, R).report; if (!rep.issues.some(function (i) { return i.kind !== "length"; })) return R; }
    return Math.max(L.ballR, R);
  }

  function buildRun(cfg) {
    const R = stageR(cfg);
    Theme.setScene(cfg.scene);
    const path = Path.forLayout(cfg.pathId, L, R);
    const gp = Gameplay.resolve(cfg.diff, cfg.step, L.portrait); Gameplay.track(gp, cfg.diff, cfg.step, L.portrait);      // parameter gameplay hidup (config/gameplay.js; panel ?debug=tune mengubahnya langsung)
    const shooter = new Shooter.Shooter(); fitShooter(shooter, path, R);
    const attempt = adv.attempts[cfg.step] = (adv.attempts[cfg.step] || 0) + 1;      // percobaan ke-n untuk stage ini (seed soal berbeda tiap percobaan)
    const qm = new GA.QM.Manager({ topics: cfg.topics, total: cfg.total, seed: GA.QM.seedFor(adv.seed, cfg.step, attempt), format: cfg.format, onChange: onQuestionChange });
    run = {
      cfg: cfg, gp: gp, path: path, R: R, baseR: L.ballR, shooter: shooter, chain: null, boss: null,
      haz: null, lives: gp.EGGS_MAX, maxLives: gp.EGGS_MAX, wrongTally: 0, stepNo: cfg.step + 1,
      score: adv.score, scoreAtStart: adv.score, scoreShown: adv.score, combo: 0, maxCombo: 0, comboPulse: 0,
      correct: 0, wrong: 0, shots: 0, progress: 0, total: cfg.total, qm: qm, deck: qm.questions, attempt: attempt, beacons: [], qTrans: null, qExpire: 0, blockedT: 0, qPop: 0, qTime: 0, qTimeMax: 0,
      info: null, qFlash: 0, coach: [], coachT: 0, swap: null, later: [], lifeLostT: 0, ensureT: 0,
      playing: false, clearT: 0, clearQ: null, dyingT: 0, reason: '', time: 0, bossDone: false, guide: [], lock: null, lockBlocked: false
    };
    run.haz = makeHaz(run);
    // soal aktif hanya boleh diubah lewat qm.advance(): properti ini hanya-baca (menulis = pelanggaran, dicatat / melempar Error pada mode ketat)
    Object.defineProperties(run, {
      q: { enumerable: true, get: function () { return qm.active; }, set: function (v) { qm.violation('run.q = ' + (v && v.id)); } },
      qid: { enumerable: true, get: function () { return qm.activeId; }, set: function (v) { qm.violation('run.qid = ' + v); } },
      qSerial: { enumerable: true, get: function () { return qm.serial; }, set: function (v) { qm.violation('run.qSerial = ' + v); } }
    });
    if (cfg.isBoss) {
      run.boss = Bosses.create(cfg.boss, path.boss, path.boss.R || Math.round(2.45 * L.ballR), cfg.total, gp.BOSS_HP_BARS);
      run.boss.speech = ''; run.boss.speechT = 0; // dialog muncul setelah hitung mundur
      run.haz.setOn(false);    // rintangan zona baru aktif saat pola boss berikutnya
    }
    FX.reset(); Bullets.setSize(R); Bullets.clear();
    renderBg();
    GA.Effects.resetPortal(false);
  }

  function introInfo(cfg) {
    const d = Levels.describe(cfg), cat = Questions.categoryById(cfg.cat);
    return {
      stageNo: cfg.step + 1, tag: cfg.tag, place: cfg.place, icon: cfg.icon, story: Story.fmt(cfg.story), boss: cfg.isBoss, format: cfg.format,
      catName: cfg.isBoss ? cat.name + ' + campuran' : cat.name, catIcon: GA.Icons.cat[cat.id],
      examplesHtml: d.examples.map(function (x) { return GA.MathText.html(x); }), diffName: Levels.DIFF_NAMES[cfg.diff], total: cfg.total
    };
  }

  /** Mulai petualangan baru dengan pilihan menu `sel`. skipStory: lewati cerita meskipun belum pernah dilihat. */
  function startAdventure(sel, skipStory, first) {
    Audio.resume();
    first = first || 0;
    const cats = Levels.resolveCats(sel), n = Levels.count;
    const picks = []; for (let i = 0; i < n; i++) picks.push(Levels.pick(i));
    adv = { picks: picks, sel: sel, cats: cats, first: first, step: first, score: 0, best0: Storage.highScore, announced: 0,
      seed: (Math.random() * 4294967296) >>> 0, attempts: {}, stars: new Array(n).fill(0), results: new Array(n).fill(null), correct: 0, wrong: 0, maxCombo: 0, snap: { score: 0 } };
    run = null; if (!attract) buildAttract();
    if (!skipStory && !Storage.introSeen) {
      state = 'story'; renderBg();
      UI.showStory(Story.intro, { onDone: function () { Storage.introSeen = true; startStep(first, false); } });
    } else startStep(first, false);
  }

  function startStep(n, skipIntro) {
    UI.cancelCountdown(); Audio.resume();
    adv.step = n; adv.snap = { score: adv.score };
    const cfg = Levels.build(n, adv.sel, adv.cats);
    cfg.pathId = adv.picks[n].path; cfg.scene = adv.picks[n].map;   // jalur & peta dipilih acak per petualangan; Ulangi memakai yang sama
    buildRun(cfg);
    GA.Balls.warm(run.R, L.px);      // siapkan tekstur & bingkai rotasi bola selama layar pembuka
    { const zone = Levels.zoneOf(cfg.scene); Audio.music(zone); Audio.ambient(zone); Audio.intensity(0); }      // musik + ambient mengikuti zona
    if (skipIntro) { state = 'countdown'; GA.Effects.openPortal(); Audio.play('portal'); UI.countdown(beginPlay); }
    else { state = 'intro'; UI.showIntro(introInfo(cfg)); }
  }

  function beginPlay() {
    const cfg = run.cfg;
    run.playing = true;
    const order = run.qm.order;
    // posisi bola jawaban di rantai: pengacakan ber-seed (seed per stage per percobaan) dengan batas keadilan (QM.arrange); urutan antrean SOAL tidak berubah
    const gpS = run.gp, perm = GA.QM.arrange(order.length, function () { return run.qm.rand(); }, { first: gpS.SHUFFLE_FIRST, maxRun: gpS.SHUFFLE_MAXRUN, lead: gpS.SHUFFLE_LEAD, emit: gpS.SHUFFLE_EMIT, tLead: gpS.SHUFFLE_TLEAD, cons: gpS.SHUFFLE_CONS, tEmit: gpS.SHUFFLE_TEMIT });
    const ids = perm.map(function (k) { return order[k]; });
    const c = new Chain.Chain(run.path, { r: run.R, gp: run.gp, labeler: labelBall });     // kecepatan = gp.CHAIN_BASE_SPEED (diameter/dtk), sama di semua layar
    c.idx = 0; c.hcd = 0; c.entryD = GA.Effects.entryD();
    c.zones = chainZones(run.path); c.overWindows = run.path.overWindows;
    c.onEmerge = function (b) { if (b && b.reborn && b.qid === run.qid) run.beacons.push({ b: b, t: 2.6, n: 0 }); GA.Effects.pulse(b && b.reborn ? 1.0 : 0.55); const pp = GA.Effects.portalPos(); if (pp) Audio.play('emerge', undefined, (pp.x / L.W * 2 - 1) * 0.6); if (pp) FX.embers(pp.x, pp.y, Math.cos(pp.a) * 90, Math.sin(pp.a) * 90, 4, run.R * 0.5, '#d9b8ff'); };
    c.setQueue(buildStream(cfg, ids));      // bola target + bola khusus: satu aliran kontinu dari portal (portal sudah terbuka sejak hitung mundur)
    run.chain = c; run.swap = makeSwap(c);
    if (run.boss) {
      applyPhase();
      run.boss.say(run.boss.phase.say, 3.4); run.boss.resetSpellTimer();
    } else run.qTimeMax = cfg.questionTime || 0;
    run.qTime = run.qTimeMax;
    run.qm.advance(run.attempt > 1 ? 'STEP_RESTART' : 'STEP_START');      // soal pertama aktif sejak portal terbuka
    run.shooter.reset();
    state = 'playing';
    if (!Storage.coachSeen) { Storage.coachSeen = true; run.coach = [['target', 'coach.1'], ['flame', 'coach.2'], ['target', 'coach.3']]; run.coachT = 0.6; }      // coachmark pendek di zona informasi, hanya pertama kali
  }

  /* ================= telur (nyawa) & akibat tembakan ================= */
  /** Tambah satu telur (bola telur emas), tidak pernah lebih dari EGGS_MAX. */
  function healEgg() { run.lives = Math.min(run.maxLives, run.lives + 1); }

  /** Kehilangan satu telur (bola sampai di sarang / zona berbahaya / jawaban salah yang menggenapi WRONG_ANSWERS_PER_EGG). Telur tidak pernah < 0. */
  function loseEgg(reason) {
    if (state !== 'playing') return;
    const have = run.lives, nest = Path.holeXY(run.path), ep = GA.Nest.eggPos(nest, run.R, Math.max(0, have - 1), run.maxLives);
    FX.eggBreak(ep.x, ep.y, run.R, null);   // telur pecah di sarang
    run.lives = Math.max(0, run.lives - 1);
    Audio.play('eggBreak');
    if (run.lives === 1) Audio.play('heart');      // tinggal satu telur: detak jantung
    run.lifeLostT = 0.6; run.combo = 0; run.reason = reason;
    run.shooter.react('hurt');
    FX.shake(14); FX.flash(0.5, '255,50,70');
    if (run.lives <= 0) gameOver();
  }

  function gameOver() {
    state = 'dying'; run.dyingT = 0; run.swap = null; Bullets.clear(); run.shooter.react('sad');
    Audio.play('lose');
    syncAdv();
  }

  /* ================= sinematik pindah fase boss (bisa dilewati) ================= */
  const CINE_LEN = 2.4, CINE_MIN = 0.3;
  function startCine() {
    state = 'cine'; run.cineT = 0; Bullets.clear(); ptr.down = false;
    FX.flash(0.4, '255,60,140'); FX.shake(12); Audio.play('cine');
  }
  function updateCine(dt) {
    run.cineT += dt; run.boss.update(dt); run.shooter.update(dt);
    if (run.cineT >= CINE_LEN) endCine();
  }
  function endCine() {
    if (state !== 'cine') return;
    state = 'playing'; run.boss.wrathT = Math.min(run.boss.wrathT, 0.5); last = performance.now();
  }
  function skipCine() { if (state === 'cine' && run.cineT > CINE_MIN) endCine(); }
  /** 0..1 naik lalu turun selama sinematik: dasar zoom kamera ke boss dan pita sinema. */
  function cineK() { return state === 'cine' ? Math.sin(Math.min(1, run.cineT / CINE_LEN) * Math.PI) : 0; }
  function cineZoom() {
    const k = cineK(); if (k <= 0 || !run.boss) return;
    const z = 1 + 0.1 * Math.min(1, k * 1.6), py = run.boss.y + run.boss.R * 0.7; ctx.translate(run.boss.x, py); ctx.scale(z, z); ctx.translate(-run.boss.x, -py);
  }
  function drawCine() {
    if (state !== 'cine' || !run || !run.boss) return;
    const e = Math.max(0, Math.min(1, run.cineT / 0.3, (CINE_LEN - run.cineT) / 0.3)), bh = L.H * 0.1 * e, W = L.W, Fo = Theme.fonts;
    ctx.fillStyle = 'rgba(8,3,18,0.94)'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, L.H - bh, W, bh);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.round(bh * 0.46) + 'px ' + (Fo.title || Fo.ui); ctx.fillStyle = '#e6c9ff'; ctx.fillText(run.boss.phase.name, W / 2, L.H - bh / 2);
    if (run.cineT > CINE_MIN) { ctx.font = '700 ' + Math.round(bh * 0.28) + 'px ' + Fo.ui; ctx.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.3 * Math.sin(t * 5)).toFixed(2) + ')'; ctx.fillText(T('cine.skip'), W / 2, bh / 2); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  /** Pesan singkat di ZONA INFORMASI HUD (strip tetap di bawah plakat soal, tidak menimpa peta). o: { tone: bad|good|info|coach, icon, text | math, dur }. */
  function setInfo(o) { run.info = { tone: o.tone || 'info', icon: o.icon || 'target', text: o.text || '', math: o.math || '', dur: o.dur || 1.4, t: o.dur || 1.4 }; }

  function ballColors(b) { return Theme.ballColors[b.ci % 8]; }

  function onCorrect(bullet, ball) {
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo); run.comboPulse = 0.5;
    const pts = 100 + 25 * Math.min(run.combo - 1, 8);
    run.score += pts; run.correct++;
    run.qm.advance('ANSWERED_CORRECT');      // soal berikutnya aktif; juga membatalkan penilaian peluru lain yang masih melayang (qSerial)
    ball.ch.remove(ball);
    FX.shatter(ball.x, ball.y, ballColors(ball), run.R);
    FX.fireImpact(bullet.x, bullet.y, true, run.R);
    FX.pop(ball.x, ball.y - 24, '+' + pts, 'score', 30);
    Audio.play('correct', run.combo); Audio.play('shatter', undefined, (ball.x / L.W * 2 - 1) * 0.6);
    { const gp = run.gp, ch = ball.ch;      // rantai mundur sedikit; jawaban beruntun juga meredakan tekanan bertahap
      ch.retreat((gp.RETREAT_SEC * ch.speed + Math.min(run.combo, 5) * gp.COMBO_RETREAT_DIAMS * ch.unit) * (1 + 0.4 * (run.R / 25 - 1)));
      if (run.combo >= 2) ch.relieve(gp.PRESSURE_DROP); }
    run.shooter.react('happy');
    run.progress = run.correct / run.total;

    if (run.boss) {
      const r = run.boss.hit();
      Audio.play('bossHit'); Audio.play('shield'); FX.shake(8);
      FX.text(run.boss.x, run.boss.y - run.boss.R - 4, '-1', '#c9a0ff', 34);
      if (r === 'defeat') { startClearing(true); return; }
      if (r === 'phase') { Audio.play('phase'); Audio.play('wrath'); applyPhase(); run.qTime = run.qTimeMax; startCine(); return; }
      if (r === 'tier') { Audio.play('wrath'); applyPhase(); run.qTime = run.qTimeMax; }
    } else if (run.correct >= run.total) { startClearing(false); return; }
  }

  function onWrong(bullet, ball, why) {
    run.wrong++;
    run.qm.noteWrong(run.q.id, ballText(ball));      // catatan untuk overview jawaban (tidak mengubah soal atau antrean)
    FX.fireImpact(bullet.x, bullet.y, false, run.R);
    if (ball) { ball.wob = 0.5; ball.red = 0.5; FX.ring(ball.x, ball.y, '#ff4d5e', 50); }
    Audio.play('wrong');
    // umpan balik salah: soal dengan nilai yang baru ditembak, mis. "20 + 3 ≠ 18" (tanpa membocorkan jawaban); plakat berkedip merah
    setInfo({ tone: 'bad', icon: 'cross', math: run.q.text.replace(GA.MathText.BLANK, ballText(ball)).replace(' = ', ' ≠ '), dur: 1.4 }); run.qFlash = 0.5;
    if (run.boss) { run.boss.attack(); Audio.play('bossAttack'); Audio.play('laugh'); FX.shake(10); }
    run.wrongTally++;
    if (run.wrongTally >= run.gp.WRONG_ANSWERS_PER_EGG) { run.wrongTally = 0; loseEgg('Jawaban salah'); }
  }

  function ballHit(bullet, ball) {
    switch (ball.kind) {
      case 'num':
        if (isCorrectText(ballText(ball))) onCorrect(bullet, ball);
        else if (!run.q || bullet.serial !== run.qSerial) {      // peluru ditembakkan untuk soal sebelumnya (soal berganti saat peluru melayang): tidak dihukum
          FX.fireImpact(bullet.x, bullet.y, false, run.R); FX.ring(ball.x, ball.y, '#ffd27a', 40);
        } else onWrong(bullet, ball);
        break;
      case 'frost':
        ball.ch.remove(ball); ball.ch.slowT = run.gp.FROST_BALL_TIME; FX.burst(ball.x, ball.y, ['#d4f1ff', '#7fd0ff', '#fff'], 20); Audio.play('frost');
        break;
      case 'egg':
        ball.ch.remove(ball); healEgg(); FX.burst(ball.x, ball.y, ['#ffe27a', '#fff', '#ffb02e'], 24); setInfo({ tone: 'good', icon: 'egg', text: T('fx.egg') }); Audio.play('egg');
        break;
    }
    if (state === 'playing') validateActive();
  }

  /** Peluru bergerak satu langkah kecil. true = peluru habis. */
  function onBulletStep(b, sd) {
    const hz = run.haz.bullet(b, sd || 0.01);      // rintangan zona (js/hazards.js)
    if (hz === 'kill') {
      FX.burst(b.x, b.y, ['#ffb02e', '#ff5a1a', '#fff'], 14); Audio.play('rock');
      setInfo({ tone: 'bad', icon: 'warn', text: T('fb.obst') }); loseEgg('Peluru mengenai rintangan'); return true;
    }
    if (hz === 'absorb') { FX.burst(b.x, b.y, ['#7fe3ff', '#fff'], 10); return true; }
    if (hz === 'bounce') { Audio.play('crystal'); FX.burst(b.x, b.y, ['#7fe3ff', '#fff'], 10); return false; }
    const ball = run.chain.hit(b.x, b.y, Bullets.r);
    if (ball) { ballHit(b, ball); return true; }
    return false;
  }

  function fire() {
    const sh = run.shooter;
    if (state !== 'playing' || !sh.canFire() || anySettling()) return; // tunggu rantai selesai bergeser / menutup celah
    sh.muzzle(tmpM);
    const gp = run.gp, tgt = run.lock;      // target-lock saat ini (null bila tidak ada bola dalam radius: bola api terbang ke titik bidik lalu padam tanpa hukuman)
    const bl = Bullets.lob(tmpM.x, tmpM.y, tgt, sh.aimPt.x, sh.aimPt.y, sh.takeShot(), gp.LOB_TIME, gp.LOB_PEAK * run.R, gp.LOB_GROW);
    FX.muzzle(tmpM.x, tmpM.y, sh.aim, run.R); FX.shake(2.5);
    bl.serial = run.qSerial;
    run.shots++;
    Audio.play('fire');
  }

  /** Lontaran kena rintangan tinggi di jalan (strike = hancur + telur hilang, kristal = diserap tanpa hukuman). */
  function onLobStep(b, sd) {
    const hz = run.haz.bullet(b, sd || 0.01);
    if (hz === 'kill') {
      FX.burst(b.x, b.y, ['#ffb02e', '#ff5a1a', '#fff'], 14); Audio.play('rock');
      setInfo({ tone: 'bad', icon: 'warn', text: T('fb.obst') }); loseEgg('Peluru mengenai rintangan'); return true;
    }
    if (hz === 'absorb' || hz === 'bounce') { FX.burst(b.x, b.y, ['#7fe3ff', '#fff'], 10); return true; }
    return false;
  }
  /** Lontaran mendarat: hasil memakai mekanik yang sudah ada pada bola TARGET; bila target sudah hilang / tidak ada, bola api padam tanpa hukuman. */
  function onLobLand(b) {
    const ball = b.tgt;
    if (ball && ball.ch.balls.indexOf(ball) >= 0 && ball.ch.visible(ball)) { b.x = ball.x; b.y = ball.y; ballHit(b, ball); return; }
    FX.burst(b.x, b.y, ['#ffb02e', '#ffe8a0', '#fff'], 8); FX.ring(b.x, b.y, '#ffd27a', run.R * 1.2);
  }


  /* ================= selesai stage ================= */
  function startClearing(boss) {
    state = 'clearing'; run.clearT = 0; run.bossDone = !!boss; GA.Effects.closePortal();
    run.swap = null; run.chain.paused = true; run.chain.ff = false; run.chain.spawnQ.length = 0; Bullets.clear(); run.haz.clearAll(); run.shooter.react('cheer');
    run.clearQ = allBalls().filter(function (b) { return b.ch.visible(b); });
    run.score += run.lives * 100; // bonus telur tersisa
    setInfo({ tone: 'good', icon: 'check', text: boss ? T('fx.boss') : T('fx.stepdone'), dur: 3 });
    FX.confetti(L.W / 2, L.H * 0.55, 40);
    Audio.play('win'); if (boss) Audio.play('dissolve');
  }

  function updateClearing(dt) {
    run.clearT += dt;
    if (run.clearQ && run.clearQ.length && run.clearT > 0.15) {
      const n = Math.max(1, Math.round(dt / 0.04));
      for (let i = 0; i < n && run.clearQ.length; i++) {
        const b = run.clearQ.shift(); b.ch.remove(b);
        if (b.kind === 'num') FX.burst(b.x, b.y, ballColors(b), 12); else FX.burst(b.x, b.y, ['#fff', '#ffd23f'], 8);
        run.score += 10;
      }
    }
    if (run.bossDone && Math.random() < dt * 6) FX.confetti(L.W / 2 + (Math.random() - 0.5) * 300, L.H * 0.4, 8);
    const minT = run.bossDone ? 3.2 : 1.6;
    if (run.clearT > minT && (!run.clearQ || !run.clearQ.length)) finishStep();
  }

  function syncAdv() { adv.score = run.score; adv.correct += run.correct; adv.wrong += run.wrong; adv.maxCombo = Math.max(adv.maxCombo, run.maxCombo); run.synced = true; }

  /** Hasil satu stage dari QuestionManager: bintang menurut persentase benar-pertama-kali (Gameplay.STAR_*), dan data overview per soal. */
  function stageResult(win) {
    const qm = run.qm, gp = run.gp, items = qm.questions.map(function (q) {
      const s = qm.stats(q.id);
      return { id: q.id, text: q.text, answerText: q.answerText, wrong: s.wrong, wrongVals: s.vals.slice(), solved: qm.isSolved(q.id), first: qm.isSolved(q.id) && s.wrong === 0 };
    });
    const first = items.filter(function (i) { return i.first; }).length, pct = first / items.length;
    const stars = !win ? 0 : (pct >= gp.STAR_3_PCT ? 3 : (pct >= gp.STAR_2_PCT ? 2 : 1));
    return { win: !!win, stage: run.cfg.step, diff: run.cfg.diff, eggs: run.lives, maxEggs: run.maxLives, pct: pct, stars: stars, items: items, score: run.score, wrong: run.wrong, combo: run.maxCombo, place: run.cfg.place, tag: run.cfg.tag };
  }

  function finishStep() {
    const cfg = run.cfg, res = stageResult(true);
    adv.stars[cfg.step] = res.stars; adv.results[cfg.step] = res;
    syncAdv(); Storage.noteScore(adv.score);
    state = 'stepdone';
    UI.showOverview(res, { next: true });      // Stage 3: Lanjut = cerita akhir + ringkasan petualangan
  }

  /** Rekor skor dicatat di akhir permainan (menang Stage 3 / Game Over). true = melampaui rekor sebelumnya ("Rekor baru!"). Pembanding = rekor saat petualangan dimulai
   *  atau skor yang sudah diumumkan di petualangan ini (Ulangi setelah Game Over tidak mengumumkan rekor yang sama dua kali). */
  function recordEnd() {
    const nb = adv.score > 0 && adv.score > Math.max(adv.best0, adv.announced);
    Storage.noteScore(adv.score); if (nb) adv.announced = adv.score;
    return nb;
  }

  /** Setelah overview Stage 3: cerita akhir, lalu ringkasan petualangan. */
  function finishAdventure(win) {
    const nb = recordEnd();
    const res = {
      win: win, steps: Levels.STAGES.map(function (s, i) { return { name: (i + 1) + " · " + s.place, stars: adv.stars[i], i: i }; }).filter(function (s) { return s.i >= (adv.first || 0); }),
      score: adv.score, newBest: nb, high: Storage.highScore, correct: adv.correct, wrong: adv.wrong, combo: adv.maxCombo
    };
    state = 'story';
    UI.showStory([Story.win], { skippable: false, onDone: function () { state = 'result'; UI.showResult(res); } });
  }

  /** Game Over: cerita singkat lalu overview jawaban stage ini. */
  function afterGameOver() {
    const res = stageResult(false);
    res.newBest = recordEnd();
    adv.results[run.cfg.step] = res;
    state = 'story';
    UI.showStory([Story.lose], { skippable: false, onDone: function () { state = 'stepdone'; UI.showOverview(res, { next: false }); } });
  }

  /* ================= update ================= */
  /** Jarak dari (px,py) searah (dx,dy) sampai menyentuh lingkaran (cx,cy,rad): Infinity bila tidak kena; 0 bila titik awal sudah di dalam lingkaran
   * (tidak pernah negatif atau NaN, supaya garis bidik tetap stabil). Portal BUKAN penghalang: hanya bola yang sudah keluar (visible) yang diuji. */
  function rayCircle(px, py, dx, dy, cx, cy, rad) {
    const fx = cx - px, fy = cy - py, proj = fx * dx + fy * dy;
    if (!(rad > 0) || !isFinite(proj)) return Infinity;
    const d2 = fx * fx + fy * fy - proj * proj;
    if (d2 > rad * rad) return Infinity;
    if (fx * fx + fy * fy <= rad * rad) return 0;
    if (proj < 0) return Infinity;
    return Math.max(0, proj - Math.sqrt(rad * rad - d2));
  }

  /** Garis bidik (revisi 8): dari mulut naga ke bola target-lock (berhenti di tepi bola) atau ke titik bidik; digambar di BAWAH bola. */
  function computeGuide(r) {
    const sh = r.shooter, segs = []; sh.muzzle(tmpM);
    const tx = r.lock ? r.lock.x : sh.aimPt.x, ty = r.lock ? r.lock.y : sh.aimPt.y; let dx = tx - tmpM.x, dy = ty - tmpM.y, len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    if (r.lock) len = Math.max(0, len - r.R * 1.15);
    if (r.haz && r.haz.blind > 0.3) len = Math.min(len, 80);      // asap kutukan menutup garis bidik
    segs.push({ x0: tmpM.x, y0: tmpM.y, x1: tmpM.x + dx * len, y1: tmpM.y + dy * len, end: true });
    r.guide = segs;
  }

  function updateRun(dt) {
    const r = run, sh = r.shooter;
    r.time += dt;
    r.qm.t = r.time;
    // papan ketik
    if (state === 'playing') {
      if (keys.ArrowLeft || keys.a) sh.setAngle(sh.angle - 2.4 * dt);
      if (keys.ArrowRight || keys.d) sh.setAngle(sh.angle + 2.4 * dt);
      if (keys.ArrowUp || keys.w) { sh.aimDist = Math.min(760, sh.aimDist + 360 * dt); sh.setAngle(sh.angle); }      // papan ketik: ↑/↓ memperjauh / mendekatkan titik bidik
      if (keys.ArrowDown || keys.s) { sh.aimDist = Math.max(70, sh.aimDist - 360 * dt); sh.setAngle(sh.angle); }
    }
    sh.update(dt);
    if (r.boss) r.boss.update(dt);
    if (r.scoreShown !== r.score) r.scoreShown += (r.score - r.scoreShown) * Math.min(1, dt * 9) || 0;
    if (Math.abs(r.score - r.scoreShown) < 0.5) r.scoreShown = r.score;
    if (r.comboPulse > 0) r.comboPulse -= dt;
    if (r.qPop > 0) r.qPop -= dt;
    if (r.qTrans) { r.qTrans.t += dt; if (r.qTrans.t > 1.4) r.qTrans = null; }
    if (r.lifeLostT > 0) r.lifeLostT -= dt;
    if (r.info) { r.info.t -= dt; if (r.info.t <= 0) r.info = null; }
    if (r.qFlash > 0) r.qFlash -= dt;
    if (r.coach.length && state === 'playing') { r.coachT -= dt; if (r.coachT <= 0) { const c = r.coach.shift(); setInfo({ tone: 'coach', icon: c[0], text: T(c[1]), dur: 2.4 }); r.coachT = 2.6; } }
    r.slowT = r.chain ? Math.max(0, r.chain.slowT) : 0;

    if (state === 'playing') {
      const c = r.chain;
      c.update(dt); r.haz.update(dt); if (r.swap) r.swap.update(dt);
      for (let i = r.later.length - 1; i >= 0; i--) { const q = r.later[i]; q.t -= dt; if (q.t <= 0) { r.later.splice(i, 1); q.fn(); } }
      Bullets.update(dt, L.W, L.H, onBulletStep, onLobStep, onLobLand);
      if (state !== 'playing') return;

      if (r.boss) { const sp = r.boss.tick(dt); if (sp) castSpell(sp); }

      // bola sihir sampai ke sarang
      if (c.hcd > 0) c.hcd -= dt;
      else if (c.holeReached()) {
        const f = c.balls[0], hp = Path.holeXY(c.path);
        c.remove(f);
        FX.burst(hp.x, hp.y, ['#7a5cff', '#c9b6ff', '#fff'], 22);
        if (f.kind === 'num') {
          // bola target lolos: satu telur hilang, rantai mundur, tetapi progres soal TIDAK hilang — soalnya keluar lagi dari portal
          Audio.play('steal');
          c.requeue({ qid: f.qid, kind: 'num', reborn: true });      // bola yang sama muncul lagi dari portal; soal TIDAK berganti
          GA.Effects.pulse(1.0);
          c.retreat(r.gp.NEST_RETREAT_DIAMS * c.unit, r.gp.NEST_RETREAT_SPEED * c.unit); c.hold = r.gp.NEST_HOLD; c.hcd = 1.8;
          setInfo({ tone: 'bad', icon: 'egg', text: T('fb.hole') });
          loseEgg('Bola sihir sampai di sarang');
          if (state !== 'playing') return;
        } else c.hcd = 0.4;      // bola khusus yang lolos lenyap tanpa hukuman
        validateActive();
      }

      // sarang terancam: alarm berdenyut (dibatasi di audio.js)
      if (nestThreat(r) > 0.6) Audio.play('alarm', undefined, 0);

      // batas waktu soal (pola akhir boss)
      if (r.qTimeMax && r.q) {
        if (r.qExpire > 0) {      // efek + SFX tampil dulu (±0,5 dtk), baru soal berganti lewat TIMEOUT
          r.qExpire -= dt;
          if (r.qExpire <= 0) r.qm.advance('TIMEOUT');
        } else {
          r.qTime -= dt;
          if (r.qTime <= 0) {
            r.qTime = 0; r.wrong++; Audio.play('wrong');
            setInfo({ tone: 'bad', icon: 'clock', text: T('fb.time') });
            if (r.boss) { r.boss.attack(); Audio.play('bossAttack'); Audio.play('laugh'); FX.shake(10); }
            loseEgg('Waktu habis');
            if (state === 'playing') r.qExpire = 0.55;
          }
        }
      }
      r.ensureT -= dt;
      if (r.ensureT <= 0) { r.ensureT = 0.3; validateActive(); }
      if (r.ensureT === 0.3) r.ffOn = !!r.q && pendingVisible().length === 0 && c.spawnQ.length + c.balls.length > 0;
      c.ff = !!r.ffOn;   // belum ada bola target yang terlihat: percepat sampai ada (soal tetap)
      for (let i = r.beacons.length - 1; i >= 0; i--) {      // bola jawaban yang muncul lagi: cincin cahaya berulang
        const be = r.beacons[i]; be.t -= dt; be.n -= dt;
        if (be.t <= 0 || be.b.ch.balls.indexOf(be.b) < 0) { r.beacons.splice(i, 1); continue; }
        if (be.n <= 0 && be.b.ch.visible(be.b)) { be.n = 0.45; FX.ring(be.b.x, be.b.y, '#fff6a0', r.R * 2.3); }
      }

      updateLock(r, dt); computeGuide(r);
    } else if (state === 'clearing') {
      r.chain.update(dt);
      updateClearing(dt);
    } else if (state === 'dying') {
      r.dyingT += dt;
      if (r.dyingT > 1.0) afterGameOver();
    }
  }

  /* ================= gambar ================= */
  function drawGuide(sh, t, segs) {
    ctx.fillStyle = 'rgba(255,236,170,0.9)'; ctx.strokeStyle = 'rgba(60,20,10,0.5)'; ctx.lineWidth = 1.5;
    const off = (t * 40) % 22;
    segs.forEach(function (s) {
      const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0), dx = (s.x1 - s.x0) / (len || 1), dy = (s.y1 - s.y0) / (len || 1);
      for (let d = 18 + off; d < len - 8; d += 22) {
        ctx.beginPath(); ctx.arc(s.x0 + dx * d, s.y0 + dy * d, 3.2, 0, 6.283); ctx.fill(); ctx.stroke();
      }
    });
    const e = segs[segs.length - 1];
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x1, e.y1, 9, 0, 6.283); ctx.stroke();
  }

  /** Cincin target-lock: cincin di sekeliling bola terkunci (merah bila terhalang rintangan tinggi) + penanda kecil di atasnya (di bawah/samping bila dekat HUD); tanpa target: cincin putus-putus di titik bidik
   *  (tempat bola api akan padam). Hanya garis: angka bola tidak tertutup. Pada layar sentuh titik bidik digeser di atas jari, jadi cincin tetap terlihat. */
  function drawLock(sc) {
    if (state !== 'playing' || (sc.haz && sc.haz.blind > 0.3)) return;
    const R = sc.R, sh = sc.shooter, b = sc.lock, dark = 'rgba(12,4,34,0.9)', pulse = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.save(); ctx.lineCap = 'round';
    if (b) {
      const col = sc.lockBlocked ? '#ff6a5a' : '#fff2a0', rr = R * (1.22 + 0.05 * pulse);
      ctx.strokeStyle = dark; ctx.lineWidth = Math.max(5, R * 0.2); ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(2.5, R * 0.1); ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, 6.283); ctx.stroke();
      let my = b.y - R * 1.95; const down = my - R * 0.35 < L.hud + 4; if (down) my = b.y + R * 1.95;      // penanda kecil (panah ke bola) di atas bola
      const dir = down ? -1 : 1, s = R * 0.3;
      ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.x, my + dir * s * 1.25); ctx.lineTo(b.x - s, my - dir * s * 0.7); ctx.lineTo(b.x + s, my - dir * s * 0.7); ctx.closePath(); ctx.stroke(); ctx.fill();
    } else {
      const p = sh.aimPt; ctx.setLineDash([5, 5]); ctx.strokeStyle = dark; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.55, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,236,170,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.55, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /** ?debug=aim: garis bidik mentah (kuning), garis bidik hasil ray test (cyan), hitbox bola (merah, radius tumbukan peluru), titik portal (putih), dan angka. */
  function drawAimDebug(sc) {
    const sh = sc.shooter, c = sc.chain, rad = sc.R * 0.92 + Bullets.r; sh.muzzle(tmpM);
    ctx.save(); ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,230,0,0.9)'; ctx.beginPath(); ctx.moveTo(tmpM.x, tmpM.y); ctx.lineTo(tmpM.x + Math.cos(sh.aim) * 900, tmpM.y + Math.sin(sh.aim) * 900); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,60,60,0.8)';
    c.balls.forEach(function (b) { if (!c.visible(b)) return; ctx.beginPath(); ctx.arc(b.x, b.y, rad, 0, 6.283); ctx.stroke(); });
    const g = sc.guide && sc.guide[0], p = GA.Effects.portalPos();
    if (g) { ctx.strokeStyle = 'rgba(0,255,255,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x1, g.y1); ctx.stroke(); }
    if (p) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(p.x, p.y, sc.R * 1.3, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
    const ln = g ? Math.hypot(g.x1 - g.x0, g.y1 - g.y0) : NaN;
    ctx.font = '12px monospace'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.textAlign = 'left';
    const txt = 'aim ' + (sh.aim * 57.3).toFixed(1) + '°  garis ' + (isFinite(ln) ? ln.toFixed(0) : 'NaN') + 'px  bola terlihat ' + c.balls.filter(function (b) { return c.visible(b); }).length + '  peluru ' + Bullets.list.filter(function (b) { return b.on; }).length;
    ctx.strokeText(txt, 8, L.play.y + 14); ctx.fillText(txt, 8, L.play.y + 14);
    ctx.restore();
  }

  /** fase 1: peta, sarang, boss, rintangan, rantai. fase 2: garis bidik, naga, peluru, efek. Penutup depan peta digambar di antaranya. */
  function drawScene(sc, showGuide, phase) {
    const R = sc.R;
    const center = { x: L.play.x + L.play.w / 2, y: L.play.y + L.play.h / 2 };
    // Urutan lapisan TETAP (bawah → atas): 1 latar, 2 alur jalur, 3 dekorasi/objek depan (Scenery.drawFront, dijauhkan dari jalur), 4 dasar/glow portal,
    // 5 BOLA (tidak ada yang digambar di atasnya kecuali bola api/efek tembakan dan overlay penukaran), 6 bola api + efek, 7 overlay penukaran, 8 HUD/popup.
    if (phase === 2) {
      if (Gameplay.debug.chain && sc === run && sc.chain) sc.chain.drawDebug(ctx);      // ?debug=chain: celah merah
      sc.shooter.draw(ctx, t, L.px);
      if (sc === run) Bullets.draw(ctx, L.px, t);
      FX.draw(ctx);
      if (sc.swap) sc.swap.draw(ctx, t, sc.R);      // lapisan 7: indikator penukaran selalu di atas bola
      if (sc === run) drawLock(sc);      // lapisan 7: cincin target-lock
      if (GA.LayersDebug && sc === run) GA.LayersDebug.draw(ctx, sc, L, t);
      return;
    }
    GA.Scenery.drawAmbient(ctx, t, frameDt);
    GA.Effects.drawBirds(ctx, t, frameDt);
    FX.drawDecals(ctx, frameDt);
    GA.Effects.drawPortal(ctx, t, frameDt);
    if (showGuide && sc.guide && sc.guide.length) drawGuide(sc.shooter, t, sc.guide);      // garis bidik putus-putus tipis: DI BAWAH bola
    if (Gameplay.debug.aim && sc === run && sc.chain) drawAimDebug(sc);
    Path.drawNest(ctx, sc.path, R, t, sc === run ? sc.lives : 3, 3, sc.lifeLostT > 0 ? 1 : 0, nestThreat(sc));
    Path.drawMarkers(ctx, sc.path, R, t, center, L.portrait ? 16 : 15);      // label SARANG di atas sarang (tidak tertutup)
    if (sc.boss) {
      sc.boss.draw(ctx, t);
      if (L.portrait) { const bw = Math.min(L.W * 0.6, 340); sc.boss.drawHP(ctx, bossBarX(sc, bw, L.play.y + 26, 22, 24), L.play.y + 26, bw); }      // potret: di pita antara HUD dan jalur (digeser bila menimpa portal/sarang)
      else { const bw = Math.min(L.W * 0.36, 300); sc.boss.drawHP(ctx, bossBarX(sc, bw, L.play.y + 4, 4, 18), L.play.y + 4, bw, true); }     // lanskap: bar tipis di pita atas
    }
    if (sc.haz) { sc.haz.draw(ctx, t); sc.haz.drawOver(ctx, t, sc.shooter.aim); }      // asap/tangan penutup bidikan juga di bawah bola
    if (sc.chain) sc.chain.draw(ctx, t, L.px);      // lapisan 5: BOLA
    if (sc.chain) sc.chain.drawOver(ctx, t, L.px);      // bola di jendela jembatan (jalur lama): tetap bola terakhir yang digambar
  }

  /** Ancaman 0..1 pada sarang: bola terdepan rantai mendekat (kurang dari 14 jari-jari dari sarang). */
  function nestThreat(sc) {
    const c = sc.chain;
    return c && state === 'playing' ? Math.max(0, Math.min(1, 1 - (c.path.length - c.frontD()) / (sc.R * 14))) : 0;
  }

  function baseTransform() { ctx.setTransform(L.px, 0, 0, L.px, L.dpr * L.ox, L.dpr * L.oy); }

  function render() {
    GA.Scenery.drawBack(ctx, t);
    const sc = sceneRef();
    if (!sc) return;
    FX.shakeOffset(shk);
    GA.Scenery.drawFront(ctx, shk.x * L.px, shk.y * L.px, t);      // lapisan 3: dekorasi / objek depan DI BAWAH bola
    ctx.setTransform(L.px, 0, 0, L.px, L.dpr * (L.ox + shk.x * L.scale), L.dpr * (L.oy + shk.y * L.scale));
    // klip ke area logis supaya bola yang masuk dari luar tidak terlihat di pinggir letterbox
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, L.W, L.H); ctx.clip();
    cineZoom();
    drawScene(sc, run && state === 'playing', 1);
    ctx.restore();
    ctx.save(); ctx.setTransform(L.px, 0, 0, L.px, L.dpr * (L.ox + shk.x * L.scale), L.dpr * (L.oy + shk.y * L.scale));
    ctx.beginPath(); ctx.rect(0, 0, L.W, L.H); ctx.clip();
    cineZoom();
    drawScene(sc, run && state === 'playing', 2);
    if (GA.debug && sc.path) GA.Paths.drawDebug(ctx, sc.path, sc.R, t);
    ctx.restore();
    baseTransform();
    if (run) UI.drawHUD(ctx, run, L, t);
    drawCine();
    if (GA.debug) { ctx.save(); ctx.font = '12px monospace'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; const dt2 = 'fps ' + GA.Quality.fps.toFixed(0) + ' 00b7 grafik ' + GA.Quality.label() + ' 00b7 dpr ' + L.dpr; ctx.strokeText(dt2, 8, L.H - 8); ctx.fillText(dt2, 8, L.H - 8); ctx.restore(); }
    if (FX.flashA > 0.01) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(' + FX.flashCol + ',' + Math.min(0.6, FX.flashA).toFixed(3) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /** Satu langkah permainan: dt detik. Dipisah dari requestAnimationFrame agar bisa dijalankan manual (uji coba). */
  function tick(dt, noRender) {
    if (!(dt > 0)) dt = 0;      // selisih waktu negatif / NaN (jam mundur) tidak boleh memutar animasi ke belakang
    if (dt > Gameplay.DEFAULTS.MAX_DT) dt = Gameplay.DEFAULTS.MAX_DT;      // tab di-resume / FPS jatuh: satu langkah tidak pernah lebih dari MAX_DT
    frameDt = state === 'paused' ? 0 : dt;
    const hudOn = state === 'playing' || state === 'paused'; if (hudOn !== hudShown) { hudShown = hudOn; UI.setHudButton(hudOn); }
    if (state === 'paused') { if (!noRender) render(); return; } // jeda: tidak ada yang bergerak (rantai, rintangan, partikel, animasi)
    t += dt;
    if (run && (state === 'playing' || state === 'clearing' || state === 'dying')) updateRun(dt);
    else if (run && state === 'cine') updateCine(dt);
    else if (run) { if (run.boss) run.boss.update(dt); run.shooter.update(dt); }
    else if (attract) updateAttract(dt);
    FX.update(dt);
    if (!noRender) render();
  }

  function frame(now) {
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw || 0.016); last = now;
    GA.Quality.sample(raw, state === 'playing' && !document.hidden);
    tick(dt);
    if (running) rafId = requestAnimationFrame(frame);
  }

  /* ================= input ================= */
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - L.ox) / L.scale, y: (e.clientY - r.top - L.oy) / L.scale };
  }

  /** Titik bidik dari event pointer: mouse = posisi pointer; sentuh = digeser ke atas TOUCH_OFFSET_PX dari ujung jari supaya jari tidak menutupi bola target (cincin target-lock tetap di luar jari). */
  function aimPointOf(e, p) {
    ptr.type = e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'mouse';
    return ptr.type === 'touch' ? { x: p.x, y: p.y - run.gp.TOUCH_OFFSET_PX / L.scale } : p;
  }
  /** Pasang semua listener input + jendela (dicatat di `listeners` agar bisa dilepas saat kembali ke halaman awal). */
  function bindInput() {
  on(canvas, 'pointerdown', function (e) {
    e.preventDefault(); Audio.unlock();
    if (state === 'cine') { skipCine(); return; }
    if (state !== 'playing') return;
    const p = toLogical(e);
    if (UI.hitPause(p.x, p.y, L)) { pauseGame(); return; }
    ptr.down = true; ptr.id = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
    const q = aimPointOf(e, p); run.shooter.aimAt(q.x, q.y);
  });
  on(canvas, 'pointermove', function (e) {
    if (state !== 'playing') return;
    if (!(ptr.down || e.pointerType === 'mouse')) return;
    const q = aimPointOf(e, toLogical(e)); run.shooter.aimAt(q.x, q.y);
  });
  function release(e) {
    if (!ptr.down || (e.pointerId !== undefined && e.pointerId !== ptr.id)) return;
    ptr.down = false;
    if (state !== 'playing') return;
    const p = toLogical(e);
    const q = aimPointOf(e, p); run.shooter.aimAt(q.x, q.y); updateLock(run, 0);
    fire();
  }
  on(canvas, 'pointerup', function (e) { e.preventDefault(); release(e); });
  on(canvas, 'pointercancel', function () { ptr.down = false; });
  on(canvas, 'contextmenu', function (e) { e.preventDefault(); });

  on(window, 'keydown', function (e) {
    keys[e.key] = true;
    if (state === 'cine' && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); skipCine(); return; }
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (e.repeat) return;
      if (state === 'playing') pauseGame(); else if (state === 'paused' && !UI.pauseKey()) resumeGame();
      return;
    }
    if (state !== 'playing') return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); GA.lastFireKey = performance.now(); fire(); }
  });
  on(window, 'keyup', function (e) { keys[e.key] = false; });
  on(window, 'blur', function () { for (const k in keys) keys[k] = false; if (state === 'playing') pauseGame(); });
  on(document, 'visibilitychange', function () { if (document.hidden && state === 'playing') pauseGame(); });
  let rz = 0;
  function onResize() { cancelAnimationFrame(rz); rz = requestAnimationFrame(relayout); }
  on(window, 'resize', onResize);
  on(window, 'orientationchange', onResize);
  if (window.visualViewport) on(window.visualViewport, 'resize', onResize);
  // cegah zoom cubit / gestur yang tidak sengaja
  on(document, 'gesturestart', function (e) { e.preventDefault(); });
  on(document, 'touchmove', function (e) { if (e.target === canvas) e.preventDefault(); }, { passive: false });
  }

  /* ================= alur menu ================= */
  /** Teks lencana popup jeda: stage dan nama tempatnya. */
  function pauseBadge() { const c = run.cfg; return c.tag + ' · ' + c.place; }
  /** Progres stage hilang jika diulang/keluar? (untuk dialog konfirmasi) */
  function hasProgress() { return !!run && (run.score > run.scoreAtStart || run.correct > 0 || run.wrong > 0 || run.lives < run.maxLives) && state !== 'menu'; }

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

  const handlers = {
    start: function (sel, first) { startAdventure(sel, false, first || 0); },
    introGo: function () { state = 'countdown'; GA.Effects.openPortal(); Audio.play('portal'); UI.countdown(beginPlay); },
    resume: resumeGame,
    pause: pauseGame,
    hasProgress: hasProgress,
    // ulangi stage ini dari awal: telur kembali 3/3, skor seperti saat stage dimulai
    restart: function () { adv.score = adv.snap.score; startStep(adv.step, true); UI.hide(); },
    quit: exit,
    nextStep: function () { if (run && run.cfg.isBoss) finishAdventure(true); else startStep(adv.step + 1, false); },
    again: function () { startAdventure(adv.sel, true, adv.first || 0); },
    toggleSound: function () { const on = !Audio.isEnabled(); Audio.setEnabled(on); Storage.sound = on; UI.syncSound(); if (on) Audio.play('click'); }
  };

  /* ================= siklus hidup mesin: boot (Mulai Main) dan destroy (kembali ke halaman awal) ================= */
  // Mesin tidak berjalan di halaman awal. boot() membuat canvas + listener + loop; destroy() melepas semuanya (loop, canvas, listener, audio) agar halaman awal kembali ringan.
  let booted = false, running = false, rafId = 0, listeners = [], rmq = null, rmFn = null;
  function on(target, type, fn, opts) { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); }
  const slice = function () { return new Promise(function (r) { setTimeout(r, 0); }); };      // beri browser kesempatan menggambar di antara pekerjaan berat (time slicing; setTimeout agar jalan juga saat tab tersembunyi)

  /** Inisialisasi berat dipecah per bagian; progress(0..1) untuk bar layar pemuatan. */
  async function boot(progress) {
    if (booted) return; progress = progress || function () {};
    const cv = document.createElement('canvas'); cv.id = 'game'; cv.setAttribute('aria-label', 'Area permainan Naga Penjaga');
    document.getElementById('app').insertBefore(cv, document.getElementById('ui')); canvas = cv; ctx = cv.getContext('2d');
    GA.Dragon.Dragon.onFlap = function () { if (state === 'playing') Audio.play('flap'); };     // bunyi kepakan sinkron dengan animasi sayap
    Theme.loadSprites();
    GA.Assets.onReady = function () { GA.Background.invalidate(); renderBg(); };
    GA.Background.onArtReady = function () { renderBg(); };
    GA.Assets.load();
    // prefers-reduced-motion: kurangi getar, kilatan, goyangan dedaunan, dan efek atmosfer berat
    rmq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    rmFn = function () { const on2 = !!(rmq && rmq.matches); FX.reduce = on2; GA.Background.reduceMotion = on2; if (on2) GA.Effects.setQuality(Math.min(GA.Effects.quality, 1)); };
    rmFn(); if (rmq && rmq.addEventListener) rmq.addEventListener('change', rmFn);
    Audio.setEnabled(Storage.sound); Audio.setMusic(Storage.music);
    progress(0.2); await slice();
    UI.init(handlers); bindInput();
    GA.Quality.init(Storage.quality, function () { if (booted) { computeLayout(); GA.Background.invalidate(); renderBg(); } });
    progress(0.45); await slice();
    Theme.setScene('menu'); computeLayout(); state = 'menu'; t = 0; hudShown = false; booted = true;
    progress(0.65); await slice();
    buildAttract(); renderBg(); GA.Effects.resetPortal(true);      // adegan latar untuk cerita pembuka (bukan di halaman awal)
    progress(0.95); await slice();
    running = true; rafId = requestAnimationFrame(function (n) { last = n; frame(n); });
    progress(1);
  }

  /** Bongkar mesin: hentikan loop, lepas listener, UI permainan, audio, dan canvas. Skrip tetap ada di memori (tidak bisa dilepas), tetapi tidak ada yang berjalan. */
  function destroy() {
    if (!booted) return;
    booted = running = false; cancelAnimationFrame(rafId); rafId = 0;
    listeners.forEach(function (l) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) { /* abaikan */ } }); listeners = [];
    if (rmq && rmFn && rmq.removeEventListener) rmq.removeEventListener('change', rmFn); rmq = rmFn = null;
    GA.Quality.onChange = null; GA.Assets.onReady = null; GA.Background.onArtReady = null; GA.Dragon.Dragon.onFlap = null;
    UI.destroy(); Audio.shutdown(); Bullets.clear(); FX.reset();
    run = null; adv = null; attract = null; L = null; state = 'menu'; hudShown = false; ptr.down = false; for (const k in keys) keys[k] = false;
    if (canvas) { canvas.width = canvas.height = 1; if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }
    canvas = ctx = null;
  }

  /** Kembali ke halaman awal (Menu di Jeda / Game Over / hasil akhir). Mode dev (?test, ?debug, ?resp) mempertahankan mesin supaya alat uji tetap bisa memakainya. */
  function exit() {
    if (GA.keepEngine) {
      UI.cancelCountdown(); Audio.resume(); run = null; adv = null; state = 'menu'; Bullets.clear(); FX.reset();
      Theme.setScene('menu'); buildAttract(); renderBg(); GA.Effects.resetPortal(true); UI.hide(); GA.Start.show(); return;
    }
    destroy(); GA.Start.show();
  }

  GA.Game = { boot: boot, destroy: destroy, exit: exit, start: function (sel) { startAdventure(sel, false, 0); }, get booted() { return booted; } };


  // untuk uji coba / debugging
  GA.game = { bossBarX: bossBarX, stageR: stageR, lockTarget: function () { return run ? run.lock : null; }, pickTarget: function (x, y, m) { return pickTarget(x, y, m == null ? lockMult() : m); }, aimAtBall: function (b) { run.shooter.aimAt(b.x, b.y); updateLock(run, 0); return run.lock; }, aimAtPoint: function (x, y) { run.shooter.aimAt(x, y); updateLock(run, 0); return run.lock; }, setPointerType: function (k) { ptr.type = k; }, skipCountdown: function () { if (state === 'countdown' || state === 'intro') { UI.cancelCountdown(); UI.hide(); GA.Effects.openPortal(); beginPlay(); } }, get state() { return state; }, relayout: function () { relayout(); }, get run() { return run; }, get adv() { return adv; }, get layout() { return L; }, tick: tick, startAdventure: startAdventure, startStep: startStep, fire: fire, handlers: handlers, validateActive: validateActive, openLine: openLine, pendingVisible: pendingVisible, buildStream: buildStream, allBalls: allBalls, anySettling: anySettling, loseEgg: loseEgg, healEgg: healEgg, winStage: function () { if (state === 'playing') startClearing(!!run.cfg.isBoss); } };
})(window.GA = window.GA || {});
