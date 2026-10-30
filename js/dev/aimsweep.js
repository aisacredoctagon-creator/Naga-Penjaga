/* dev/aimsweep.js — uji bidik TARGET-LOCK dan tembakan LONTAR (revisi 8; GA.AimSweep.run). Dimuat dengan ?debug=aim dan dipanggil dari ?test=1. Tanpa render (GA.game.tick(dt, true)).
 *
 * Untuk tiap stage × jalur × ukuran layar (390×844, 844×390, 1440×900), pada empat saat (portal baru terbuka, bola keluar cepat, bola sudah banyak, rantai penuh):
 *   1. INV-5 empiris: untuk SETIAP bola terlihat, titik bidik tepat di pusat dan 8 titik pada 0,9R dari pusat memilih bola itu sendiri; titik yang jauh (≥ 1,35R dari semua bola) tidak memilih apa pun
 *      (mouse 1,0R / sentuh 1,25R); pilihan stabil (dihitung dua kali sama), tidak pernah NaN;
 *   2. tembakan lontar ke bola terpilih: peluru mendarat dalam LOB_TIME (+ toleransi), tidak ada peluru tersangkut, tumbukan dievaluasi pada bola TARGET (benar / salah / khusus / rintangan tinggi),
 *      bola lain di sepanjang jalan tidak terkena; tembakan ke titik kosong: padam tanpa hukuman (telur, salah, benar tidak berubah);
 *   3. mouse (pointermove + klik) dan sentuh (geser lalu lepas, titik bidik digeser di atas jari) lewat PointerEvent: target-lock sesuai dan peluru lontar terbang ke bola itu;
 * dan tidak ada galat di console. */
(function (GA) {
  'use strict';
  const results = [];
  let fails = 0;
  function ok(name, cond, info) { results.push((cond ? 'PASS  ' : 'FAIL  ') + name + (info ? '  — ' + info : '')); if (!cond) fails++; return cond; }
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const VIEWS = [[390, 844], [844, 390], [1440, 900]];
  const SEL = { cat: 'add', diff: 'sedang' };
  const fin = function (v) { return typeof v === 'number' && isFinite(v); };

  /** Satu skenario: kembalikan daftar masalah (string). */
  async function scenario(G, stage, pathId, mapId, view, st) {
    const bad = [], tag = 'S' + (stage + 1) + '/' + pathId + '/' + view.join('×');
    GA.devViewport = { w: view[0], h: view[1] }; G.relayout();
    G.startAdventure(SEL, true, stage); G.adv.picks[stage] = { path: pathId, map: mapId }; G.startStep(stage, true); G.skipCountdown();
    if (G.state !== 'playing') return [tag + ': tidak masuk playing (' + G.state + ')'];
    const r = G.run, sh = r.shooter, B = GA.Shooter.Bullets, R = r.R, gp = r.gp;
    const wait = function (sec) { for (let t = 0; t < sec; t += 1 / 60) { r.lives = Math.max(r.lives, 2); G.tick(1 / 60, true); } };
    const vis = function () { return G.allBalls().filter(function (b) { return b.ch.visible(b); }); };
    const snaps = [0.4, 1.6, 6, 40]; let simT = 0;
    for (const T of snaps) {
      while (simT < T) { r.lives = 3; G.tick(1 / 60, true); simT += 1 / 60; if (G.state !== 'playing') return bad.concat([tag + ': state ' + G.state]); }
      const vs = vis();
      if (G.allBalls().some(function (b) { return b.sw; })) { st.skippedSw++; continue; }      // saat dua bola bertukar tempat (gerak melengkung 0,5 dtk) bola sesaat saling mendekat: pilihan tetap bola terdekat
      for (const type of ['mouse', 'touch']) {
        G.setPointerType(type); const lr = (type === 'mouse' ? gp.LOCK_RADIUS : gp.LOCK_RADIUS_TOUCH);
        for (const b of vs) {
          st.balls++;
          if (G.aimAtPoint(b.x, b.y) !== b) { bad.push(tag + ' ' + type + ' @' + T + 's: pusat bola ' + b.ch.balls.indexOf(b) + ' tidak memilih bola itu'); continue; }
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, q = G.aimAtPoint(b.x + Math.cos(a) * 0.9 * R, b.y + Math.sin(a) * 0.9 * R); st.pts++; if (q !== b) { bad.push(tag + ' ' + type + ' @' + T + 's: titik 0,9R (' + k + ') bola ' + b.ch.balls.indexOf(b) + ' memilih ' + (q ? q.ch.balls.indexOf(q) : 'tidak ada')); break; } }
          const q1 = G.aimAtPoint(b.x, b.y), q2 = G.aimAtPoint(b.x, b.y); if (q1 !== q2) bad.push(tag + ' pilihan tidak stabil');
        }
        // titik jauh dari semua bola: tidak memilih apa pun
        for (let k = 0; k < 40; k++) {
          const px = r.path.shooter.x + (Math.random() - 0.5) * 2 * R * 2.6, py = r.path.shooter.y + (Math.random() - 0.5) * 2 * R * 2.6; let far = Math.hypot(px - r.path.shooter.x, py - r.path.shooter.y) >= 30;      // titik < 20 px dari pusat naga diabaikan oleh aimAt
          for (const b of vs) if (Math.hypot(b.x - px, b.y - py) < (lr + 0.1) * R) { far = false; break; }
          if (far) { st.far++; if (G.aimAtPoint(px, py)) bad.push(tag + ' ' + type + ': titik kosong memilih bola'); }
        }
      }
      G.setPointerType('mouse');
    }
    // tembakan lontar: bola target dievaluasi; bola di sepanjang jalan tidak terkena
    wait(1);
    for (let shot = 0; shot < 4 && G.state === 'playing'; shot++) {
      for (let i = 0; i < 90 && G.allBalls().some(function (b) { return b.sw; }); i++) wait(1 / 60);      // tunggu penukaran selesai
      r.lives = 3; sh.reload = 0; wait(0.3);      // dulu: rantai bergerak dan bola bisa berpindah / mulai bertukar sebelum dibidik
      const cand = vis().filter(function (b) { return b.kind === 'num' && !b.sw && G.openLine(b); }); if (!cand.length) { wait(1); continue; }
      const tgt = cand[Math.floor(Math.random() * cand.length)], before = { c: r.correct, w: r.wrong, l: r.lives, n: G.allBalls().length, q: r.qid };
      if (G.aimAtBall(tgt) !== tgt) { bad.push(tag + ': bidik bola tembak gagal'); continue; }
      const ids = G.allBalls().map(function (b) { return b.id; }); G.fire(); st.shots++;
      const bl = B.list.filter(function (b) { return b.on; })[0]; if (!bl || !bl.lob || bl.tgt !== tgt) { bad.push(tag + ': peluru bukan lontaran ke target'); continue; }
      let t = 0, maxH = 0, sawGrow = false; for (; t < gp.LOB_TIME + 0.3 && B.list.some(function (b) { return b.on; }); t += 1 / 60) { G.tick(1 / 60, true); maxH = Math.max(maxH, bl.hgt); if (bl.scl > 1.1) sawGrow = true; }
      if (B.list.some(function (b) { return b.on; })) bad.push(tag + ': peluru lontar tersangkut');
      if (t < gp.LOB_TIME - 0.08 || t > gp.LOB_TIME + 0.1) bad.push(tag + ': durasi lontar ' + t.toFixed(2) + ' dtk (harus ≈ ' + gp.LOB_TIME + ')');
      if (maxH < R * 0.5 || !sawGrow) bad.push(tag + ': lontaran tanpa ketinggian / pembesaran');
      // dampak hanya pada target: bola lain (nilai angka) tetap ada kecuali yang memang pecah; target benar → jawaban bertambah, salah → salah bertambah
      const after = G.allBalls().map(function (b) { return b.id; }), lost = ids.filter(function (id) { return after.indexOf(id) < 0; });
      if (lost.length > 1 || (lost.length === 1 && lost[0] !== tgt.id)) bad.push(tag + ': bola selain target hilang saat lontaran (' + lost.length + ')');
      const eff = (r.correct - before.c) + (r.wrong - before.w) + (r.lives - before.l !== 0 ? 1 : 0);
      if (eff === 0 && lost.length === 0) bad.push(tag + ': lontaran ke bola target tanpa efek');
    }
    // tembakan ke titik kosong: padam tanpa hukuman
    { const vs = vis(); let px = r.path.shooter.x + R * 1.8, py = r.path.shooter.y - R * 1.5, tries = 0; while (tries++ < 40 && vs.some(function (b) { return Math.hypot(b.x - px, b.y - py) < 1.5 * R; })) { px += R * 0.7; py -= R * 0.4; }
      r.lives = 3; sh.reload = 0; wait(0.3); G.setPointerType('mouse');
      if (G.aimAtPoint(px, py)) bad.push(tag + ': titik uji kosong memilih bola');
      else { const b0 = { c: r.correct, w: r.wrong, l: r.lives, wt: r.wrongTally }; G.fire(); st.empty++; wait(gp.LOB_TIME + 0.3); if (B.list.some(function (b) { return b.on; })) bad.push(tag + ': tembakan kosong tersangkut'); if (r.correct !== b0.c || r.wrong !== b0.w || r.lives < b0.l || r.wrongTally !== b0.wt) bad.push(tag + ': tembakan ke titik kosong dihukum'); } }
    // rintangan TINGGI memblokir lontaran (kristal diserap tanpa hukuman, stalaktit menghancurkan + telur hilang), rintangan RENDAH (semak berduri) dilewati
    wait(2.5);      // rantai selesai mundur setelah jawaban benar sebelumnya (hanya diam yang dinilai)
    { const far = vis().filter(function (b) { return b.kind === 'num' && b.qid !== r.qid && Math.hypot(b.x - sh.x, b.y - sh.y) > 150; });      // bukan bola soal aktif: anti-macet menyingkirkan rintangan yang menghalangi bola AKTIF > 1 dtk
      if (far.length) {
        const tgt = far[0], m = { x: 0, y: 0 };
        const plant = function (kind, mech, rad) { r.haz.clearAll(); G.aimAtBall(tgt); sh.muzzle(m); r.haz.list.push({ id: r.haz.nid++, kind: kind, mech: mech, r: rad, x: m.x + (tgt.x - m.x) * 0.35, y: m.y + (tgt.y - m.y) * 0.35, t: 2, warn: 1, dur: 30, dir: 1, rot: 0, lane: false, fired: false, bounced: 0 }); G.aimAtBall(tgt); };
        const shoot = function () { r.lives = 3; r.wrongTally = 0; sh.reload = 0; G.aimAtBall(tgt); const b0 = { c: r.correct, w: r.wrong, l: r.lives, has: G.allBalls().indexOf(tgt) >= 0 }; G.fire(); for (let t = 0; t < gp.LOB_TIME + 0.3; t += 1 / 60) G.tick(1 / 60, true); return { dc: r.correct - b0.c, dw: r.wrong - b0.w, dl: r.lives - b0.l, gone: b0.has && G.allBalls().indexOf(tgt) < 0 }; };
        plant('crystal', 'reflect', 24); if (!r.lockBlocked) bad.push(tag + ': cincin target tidak menandai terhalang kristal'); let e = shoot();
        if (e.dc || e.dw || e.dl || e.gone) bad.push(tag + ': lontaran ke kristal harus diserap tanpa dampak (' + JSON.stringify(e) + ')');
        plant('stalactite', 'strike', 24); e = shoot(); if (e.dl !== -1 || e.gone || e.dc || e.dw) bad.push(tag + ': lontaran ke stalaktit harus hancur + telur hilang tanpa mengenai bola (' + JSON.stringify(e) + ')');
        plant('thorn', 'slow', 28); if (r.lockBlocked) bad.push(tag + ': semak berduri (rendah) tidak boleh memblokir'); e = shoot(); if (!(e.dc || e.dw || e.gone || e.dl)) bad.push(tag + ': lontaran melewati rintangan rendah harus mengenai target');
        r.haz.clearAll(); st.tall++;
      } }
    // mouse dan sentuh lewat PointerEvent: target-lock + lontaran ke bola itu
    { const cv = document.getElementById('game'), L = G.layout, rect = cv.getBoundingClientRect(), toClient = function (x, y) { return { x: rect.left + L.ox + x * L.scale, y: rect.top + L.oy + y * L.scale }; };
      const ev = function (type, p, pt) { cv.dispatchEvent(new PointerEvent(type, { clientX: p.x, clientY: p.y, pointerId: pt === 'touch' ? 7 : 1, pointerType: pt, isPrimary: true, bubbles: true })); };
      for (const pt of ['mouse', 'touch']) {
        const cand = vis().filter(function (b) { return Math.hypot(b.x - r.path.shooter.x, b.y - r.path.shooter.y) > 140; }); if (!cand.length) continue;
        const tgt = cand[Math.floor(cand.length / 2)]; r.lives = 3; sh.reload = 0; wait(0.4); if (!vis().includes(tgt)) continue;
        const off = pt === 'touch' ? gp.TOUCH_OFFSET_PX / L.scale : 0, fp = toClient(tgt.x, tgt.y + off);      // jari di bawah bola; titik bidik digeser ke atas dan tepat di bola
        const bw = [r.correct, r.wrong, r.lives];
        const nx = toClient(L.W * 0.5, L.H * 0.93);      // sentuhan mulai di tempat netral (di dalam badan naga = ketuk-tukar, bukan bidik), lalu bergeser ke titik bidik
        if (pt === 'mouse') { ev('pointermove', fp, pt); G.tick(1 / 60, true); if (G.lockTarget() !== tgt) bad.push(tag + ' mouse: hover tidak mengunci bola'); ev('pointerdown', fp, pt); ev('pointerup', fp, pt); }
        else { ev('pointerdown', nx, pt); ev('pointermove', fp, pt); G.tick(1 / 60, true); if (G.lockTarget() !== tgt) bad.push(tag + ' sentuh: titik bidik (di atas jari) tidak mengunci bola'); ev('pointerup', fp, pt); }
        const bl = B.list.filter(function (b) { return b.on; })[0]; st.ptr++;
        if (!bl || !bl.lob || bl.tgt !== tgt) bad.push(tag + ' ' + pt + ': peluru lontar tidak menuju bola terkunci'); else wait(gp.LOB_TIME + 0.2);
        if (B.list.some(function (b) { return b.on; })) bad.push(tag + ' ' + pt + ': peluru tersangkut');
        void bw;
      }
    }
    G.handlers.quit();
    return bad;
  }

  async function run(opts) {
    opts = opts || {};
    results.length = 0; fails = 0;
    const G = GA.game, t0 = performance.now(), errs = [], oErr = console.error, st = { tall: 0, skippedSw: 0, balls: 0, pts: 0, far: 0, shots: 0, empty: 0, ptr: 0 };
    console.error = function () { errs.push(Array.prototype.join.call(arguments, ' ').slice(0, 160)); return oErr.apply(console, arguments); };
    window.addEventListener('error', function onErr(e) { errs.push('window: ' + e.message + ' @ ' + String(e.error && e.error.stack || '').split(String.fromCharCode(10)).slice(1, 4).join(' <- ').slice(0, 260)); });
    let n = 0, problems = [];
    const stages = opts.stages || [0, 1, 2];
    for (const view of (opts.views || VIEWS)) {
      for (const sg of stages) {
        const pool = GA.Levels.STAGES[sg].pool;
        for (let i = 0; i < pool.paths.length; i++) {
          if (opts.maxPaths && i >= opts.maxPaths) break;
          try { const b = await scenario(G, sg, pool.paths[i], pool.maps[i % pool.maps.length], view, st); n++; problems = problems.concat(b); }
          catch (e) { problems.push('S' + (sg + 1) + '/' + pool.paths[i] + ': galat ' + e.message); try { G.handlers.quit(); } catch (e2) { /* abaikan */ } }
          await sleep(0);
        }
      }
    }
    GA.devViewport = null; G.relayout(); G.setPointerType('mouse');
    console.error = oErr;
    ok('target-lock + lontaran: pusat dan titik 0,9R memilih bola itu sendiri, titik kosong tidak memilih; lontaran mendarat ≈ LOB_TIME pada bola target saja; tembakan kosong tanpa hukuman; mouse dan sentuh (offset di atas jari) mengunci dan menembak bola yang benar', problems.length === 0,
      n + ' skenario (stage × jalur × 3 layar), ' + st.balls + ' bola × 2 mode, ' + st.pts + ' titik 0,9R, ' + st.far + ' titik kosong, ' + st.shots + ' tembakan target, ' + st.empty + ' tembakan kosong, ' + st.tall + ' uji rintangan tinggi/rendah, ' + st.ptr + ' uji pointer' + (problems.length ? ' | ' + problems.slice(0, 3).join(' | ') : ''));
    ok('uji bidik: tidak ada galat di console', errs.length === 0, errs.slice(0, 2).join(' | '));
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
