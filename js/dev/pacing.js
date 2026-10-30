/* dev/pacing.js — bot kecepatan permainan (revisi 7 tahap c). Dimuat dengan ?debug=pace; GA.Pace.run({ stages, diffs, seeds, think, acc }) → tabel hasil.
 *
 * Pemain buatan memakai game yang sama (GA.game.tick(dt, true), tanpa render): untuk tiap soal aktif ia "berpikir" selama waktu ~ N(rata-rata 6 dtk, SD 2 dtk),
 * lalu menembak bola jawaban soal aktif bila garis tembak terbuka dan tidak terhalang rintangan; dengan peluang (1 − akurasi) ia menembak bola angka LAIN (jawaban salah).
 * Math.random diganti PRNG ber-seed selama satu putaran, sehingga setiap seed bisa diulang persis. Dilaporkan per stage & kesulitan: persentase menang, rata-rata telur hilang
 * (3 bila kalah), penyebab telur hilang (jawaban salah / bola sampai sarang / rintangan / waktu habis), lama stage. Mekanik tidak diubah oleh bot. */
(function (GA) {
  'use strict';
  const DT = 1 / 30, SEL = function (diff) { return { slots: ['add', 'sub', 'mul'], same: false, random: false, diff: diff }; };
  const mulberry = function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const gauss = function (rnd) { let u = 0, v = 0; while (!u) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /** Posisi bola jawaban soal yang BARU aktif: % indeks di antara bola yang terlihat (0 = depan/dekat sarang, 100 = ekor/dekat portal), % jarak jalur, dan belum keluar dari portal. */
  function record(st, r, G) {
    const b = G.allBalls().find(function (x) { return x.kind === 'num' && x.qid === r.qid; });
    { const k = r.correct, nv = G.allBalls().filter(function (x) { return x.kind === 'num' && x.ch.visible(x); }).length; if (k < 20) { (st.emitSum || (st.emitSum = [])); st.emitSum[k] = (st.emitSum[k] || 0) + nv + k; st.emitN = st.emitN || []; st.emitN[k] = (st.emitN[k] || 0) + 1; } }
    if (st.trace) st.trace(r, G, b);
    st.n++; if (!b || !b.ch.visible(b)) { st.hidden++; return; }
    const vis = G.allBalls().filter(function (x) { return x.ch.visible(x); }), i = vis.indexOf(b), cp = 100 * (i + 0.5) / vis.length, pp = 100 * b.d / r.path.length;
    st.chain[Math.min(2, Math.floor(cp / (100 / 3)))]++; { const bk = (st.byK || (st.byK = [])), kk = Math.min(19, r.correct); (bk[kk] || (bk[kk] = [0, 0, 0, 0, 0]))[Math.min(2, Math.floor(cp / (100 / 3)))]++; bk[kk][3] += vis.length; bk[kk][4]++; } st.path[Math.min(2, Math.floor(pp / (100 / 3)))]++; { const va = vis.filter(function (x) { return x.kind === 'num' && x.qid != null && !r.qm.isSolved(x.qid); }), ia = va.indexOf(b), ca = 100 * (ia + 0.5) / va.length; (st.chainA || (st.chainA = [0, 0, 0]))[Math.min(2, Math.floor(ca / (100 / 3)))]++; st.extra = (st.extra || 0) + vis.length - va.length; }
    if (pp > 88) st.endGuard++; st.pathMax = Math.max(st.pathMax, pp);
  }

  /** Satu putaran stage. Kembalikan { win, lost (telur hilang), causes, t, answered, wrongShots }. */
  function play(stage, diff, seed, o) {
    const G = GA.game, rnd = mulberry(seed * 2654435761 >>> 0), realRandom = Math.random; Math.random = rnd;
    try {
      G.startAdventure(SEL(diff), true, stage); G.startStep(stage, true); G.skipCountdown();
      const r = G.run, sh = r.shooter, B = GA.Shooter.Bullets, maxLives = r.maxLives, causes = {};
      let m = { x: 0, y: 0 }, qStart = 0, t = 0, lastQ = -9, think = 0, wantWrong = false, lives = r.lives, wrongShots = 0, cool = 0;
      const maxT = o.maxT || 900;
      while (t < maxT) {
        if (G.state === 'paused') G.handlers.resume();
        const st = G.state; if (st !== 'playing' && st !== 'cine') break;
        G.tick(DT, true); t += DT; cool -= DT;
        if (r.lives < lives) { const k = r.reason || '?'; causes[k] = (causes[k] || 0) + (lives - r.lives); if (o.log) o.log.push({ t: +t.toFixed(1), reason: k, qid: r.qid, solved: r.correct, think: +think.toFixed(1), wantWrong: wantWrong, since: +(t - qStart).toFixed(1), nballs: r.chain.balls.length, canFire: sh.canFire() }); }
        lives = r.lives;
        if (G.state !== 'playing' || !r.q) continue;
        if (r.qid !== lastQ) { lastQ = r.qid; qStart = t; if (o.stat) record(o.stat, r, G); think = Math.max(o.minThink || 1.5, o.think[0] + o.think[1] * gauss(rnd)); wantWrong = rnd() >= o.acc; }
        think -= DT; if (think > 0 || cool > 0 || !sh.canFire() || G.anySettling() || r.chain.balls.some(function (b) { return b.sw; })) continue;
        // bidik titik pusat bola (target-lock memilih bola itu) lalu uji garis lurus naga → target dari rintangan tinggi
        const tryAim = function (b) { return G.aimAtBall(b) === b && G.openLine(b); };
        let aimed = false;
        if (wantWrong) { const vis = G.pendingVisible().filter(function (b) { return b.kind === 'num' && b.qid !== r.qid; }); for (let i = vis.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), x = vis[i]; vis[i] = vis[j]; vis[j] = x; } for (let i = 0; i < vis.length && !aimed; i++) aimed = tryAim(vis[i]); }
        else { const tgt = G.allBalls().find(function (b) { return b.kind === 'num' && b.qid === r.qid && b.ch.visible(b); }); aimed = !!tgt && tryAim(tgt); }
        if (!aimed) continue;
        if (wantWrong) { wrongShots++; wantWrong = false; think = 0.8; } else think = 1.2;      // setelah salah: menembak benar lagi hampir langsung; setelah benar: soal berganti
        G.fire(); cool = 0.35;
      }
      const win = G.state === 'clearing' || G.state === 'stepdone';
      const res = { win: win, lost: win ? maxLives - r.lives : maxLives, causes: causes, t: t, answered: r.correct, wrongShots: wrongShots, timeout: t >= maxT };
      G.handlers.quit();
      return res;
    } finally { Math.random = realRandom; }
  }

  /** o: { stages: [0,1,2], diffs: ['mudah','sedang','sulit'], seeds: N, seed0, think: [6, 2], acc: 0.9, maxT } */
  function run(o) {
    o = Object.assign({ stages: [0, 1, 2], diffs: ['sedang'], seeds: 100, seed0: 1, think: [6, 2], acc: 0.9, maxT: 900 }, o || {});
    const rows = [], t0 = performance.now();
    o.stages.forEach(function (stage) {
      o.diffs.forEach(function (diff) {
        let wins = 0, lost = 0, tsum = 0, timeouts = 0; const causes = {};
        for (let s = 0; s < o.seeds; s++) {
          const x = play(stage, diff, o.seed0 + s, o);
          if (x.win) wins++; lost += x.lost; tsum += x.t; if (x.timeout) timeouts++;
          for (const k in x.causes) causes[k] = (causes[k] || 0) + x.causes[k];
        }
        rows.push({ stage: stage + 1, diff: diff, seeds: o.seeds, win: +(100 * wins / o.seeds).toFixed(1), eggsLost: +(lost / o.seeds).toFixed(2), avgSec: +(tsum / o.seeds).toFixed(0), timeouts: timeouts, causes: causes });
      });
    });
    GA.Pace.rows = rows; GA.Pace.sec = (performance.now() - t0) / 1000;
    return rows;
  }
  GA.Pace = { run: run, play: play, newStat: function () { return { n: 0, hidden: 0, chain: [0, 0, 0], path: [0, 0, 0], endGuard: 0, pathMax: 0 }; }, rows: [], sec: 0 };
})(window.GA = window.GA || {});
