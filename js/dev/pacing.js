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

  /** Satu putaran stage. Kembalikan { win, lost (telur hilang), causes, t, answered, wrongShots }. */
  function play(stage, diff, seed, o) {
    const G = GA.game, rnd = mulberry(seed * 2654435761 >>> 0), realRandom = Math.random; Math.random = rnd;
    try {
      G.startAdventure(SEL(diff), true, stage); G.startStep(stage, true); G.skipCountdown();
      const r = G.run, sh = r.shooter, B = GA.Shooter.Bullets, maxLives = r.maxLives, causes = {};
      let m = { x: 0, y: 0 }, t = 0, lastQ = -9, think = 0, wantWrong = false, lives = r.lives, wrongShots = 0, cool = 0;
      const maxT = o.maxT || 900;
      while (t < maxT) {
        if (G.state === 'paused') G.handlers.resume();
        const st = G.state; if (st !== 'playing' && st !== 'cine') break;
        G.tick(DT, true); t += DT; cool -= DT;
        if (r.lives < lives) { const k = r.reason || '?'; causes[k] = (causes[k] || 0) + (lives - r.lives); }
        lives = r.lives;
        if (G.state !== 'playing' || !r.q) continue;
        if (r.qid !== lastQ) { lastQ = r.qid; think = Math.max(o.minThink || 1.5, o.think[0] + o.think[1] * gauss(rnd)); wantWrong = rnd() >= o.acc; }
        think -= DT; if (think > 0 || cool > 0 || !sh.canFire() || G.anySettling() || r.chain.balls.some(function (b) { return b.sw; })) continue;
        let tgt = null;
        if (wantWrong) { const vis = G.pendingVisible().filter(function (b) { return b.kind === 'num' && b.qid !== r.qid && G.openLine(b); }); tgt = vis.length ? vis[Math.floor(rnd() * vis.length)] : null; }
        else tgt = G.allBalls().find(function (b) { return b.kind === 'num' && b.qid === r.qid && b.ch.visible(b); });
        if (!tgt) continue;
        m = sh.muzzle(m);
        for (let it = 0; it < 4; it++) { sh.setAngle(Math.atan2(tgt.y - m.y, tgt.x - m.x)); m = sh.muzzle(m); }
        if (!G.openLine(tgt)) continue;
        if (r.haz.blocksLine(m.x, m.y, tgt.x, tgt.y, Math.hypot(tgt.x - m.x, tgt.y - m.y) / B.speed + 0.15)) continue;
        let deflect = false; for (let k = 0; k < r.haz.list.length; k++) { const e = r.haz.list[k]; if (e.mech === 'deflect') { const vx = tgt.x - m.x, vy = tgt.y - m.y, l2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((e.x - m.x) * vx + (e.y - m.y) * vy) / l2)); if (Math.hypot(e.x - (m.x + u * vx), e.y - (m.y + u * vy)) < e.r + 24) deflect = true; } }
        if (deflect) continue;
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
  GA.Pace = { run: run, play: play, rows: [], sec: 0 };
})(window.GA = window.GA || {});
