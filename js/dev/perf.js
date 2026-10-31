/* dev/perf.js — profil performa (revisi 11; dimuat dengan ?debug=perf). `await GA.Perf.run({ stage: 0, secs: 40 })` memainkan satu stage dengan bot sederhana
 * (membidik + menembak bola jawaban soal aktif, telur dijaga 3) pada ukuran jendela SEKARANG, lalu melaporkan:
 *   - waktu kerja per frame (ms): tick+gambar penuh, dan tick saja (logika) → p50 / rata-rata / p95 / p99 / maks, FPS ekuivalen, frame > 33 ms berturut-turut;
 *   - operasi kanvas per frame (drawImage, fill/stroke, teks, gradient, getImageData, ...) dan jumlah set shadowBlur / filter / globalCompositeOperation ≠ source-over;
 *   - partikel + teks aktif, bola, memori JS (heap), ukuran JS/CSS/aset yang dimuat.
 * Catatan: panel preview tidak punya CPU throttling dan rasterisasi GPU tidak terukur dari JS; angka "@4×" = waktu kerja JS × 4 (perkiraan). */
(function (GA) {
  'use strict';
  const DT = 1 / 60;
  const pct = function (a, p) { return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; };
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /** Pasang penghitung pada CanvasRenderingContext2D (hanya selama satu putaran penghitungan). Mengembalikan fungsi pelepas + objek hitungan. */
  function instrument() {
    const P = CanvasRenderingContext2D.prototype, C = { frames: 0 }, saved = [];
    const M = ['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'clearRect', 'clip', 'createRadialGradient', 'createLinearGradient', 'createPattern', 'getImageData', 'putImageData', 'setTransform', 'save', 'beginPath'];
    M.forEach(function (k) { const o = P[k]; saved.push([k, o]); C[k] = 0; P[k] = function () { C[k]++; return o.apply(this, arguments); }; });
    const prop = function (name, test) {
      const d = Object.getOwnPropertyDescriptor(P, name); if (!d || !d.set) return; saved.push([name, null, d]); C[name] = 0;
      Object.defineProperty(P, name, { configurable: true, enumerable: d.enumerable, get: d.get, set: function (v) { if (test(v)) C[name]++; d.set.call(this, v); } });
    };
    prop('shadowBlur', function (v) { return v > 0; }); prop('filter', function (v) { return v && v !== 'none'; }); prop('globalCompositeOperation', function (v) { return v !== 'source-over'; });
    return { C: C, off: function () { saved.forEach(function (s) { if (s[2]) Object.defineProperty(P, s[0], s[2]); else P[s[0]] = s[1]; }); } };
  }

  function start(stage, diff) {
    const G = GA.game; G.startAdventure({ cat: 'add', diff: diff || 'sedang' }, true, stage); G.startStep(stage, true); G.skipCountdown();
    return G.run;
  }

  /** Satu putaran: frames bingkai. render=false → logika saja. Mengembalikan daftar waktu per frame (ms) + hitungan. */
  function pass(stage, diff, frames, render, count) {
    const G = GA.game, r = start(stage, diff), sh = r.shooter, ms = [], ins = count ? instrument() : null;
    let cool = 0, think = 0, lastQ = -9, longRun = 0, maxLongRun = 0, ballsMax = 0, partsMax = 0, textsMax = 0;
    for (let i = 0; i < frames; i++) {
      if (G.state === 'paused') G.handlers.resume();
      if (G.state !== 'playing' && G.state !== 'cine') break;
      r.lives = 3; r.wrongTally = 0; cool -= DT;
      if (G.state === 'playing' && r.q) {
        if (r.qid !== lastQ) { lastQ = r.qid; think = 1.2; }
        think -= DT;
        if (think <= 0 && cool <= 0 && sh.canFire() && !G.anySettling()) {
          const tgt = G.allBalls().find(function (b) { return b.kind === 'num' && b.qid === r.qid && b.ch.visible(b); });
          if (tgt && G.aimAtBall(tgt) === tgt && G.openLine(tgt)) { G.fire(); cool = 0.4; think = 1; }
        }
      }
      const t0 = performance.now(); G.tick(DT, !render); const d = performance.now() - t0; ms.push(d);
      if (d > 33) { longRun++; maxLongRun = Math.max(maxLongRun, longRun); } else longRun = 0;
      if (ins) ins.C.frames++;
      if (i % 30 === 0) { const c = GA.FX.count ? GA.FX.count() : { parts: 0, texts: 0 }; ballsMax = Math.max(ballsMax, G.allBalls().length); partsMax = Math.max(partsMax, c.parts); textsMax = Math.max(textsMax, c.texts); }
    }
    const res = { ms: ms, maxLongRun: maxLongRun, ballsMax: ballsMax, partsMax: partsMax, textsMax: textsMax, solved: r.correct, state: G.state };
    if (ins) { ins.off(); res.ops = ins.C; }
    GA.keepEngine = true; G.handlers.quit();
    return res;
  }

  function summary(a) {
    const s = a.slice().sort(function (x, y) { return x - y; }), avg = a.reduce(function (x, y) { return x + y; }, 0) / (a.length || 1);
    return { n: a.length, avg: +avg.toFixed(2), p50: +pct(s, 0.5).toFixed(2), p95: +pct(s, 0.95).toFixed(2), p99: +pct(s, 0.99).toFixed(2), max: +(s[s.length - 1] || 0).toFixed(1) };
  }

  const Perf = {
    /** o: { stage 0..2, secs (waktu game, default 40), diff } */
    run: async function (o) {
      o = o || {}; const stage = o.stage || 0, frames = Math.round((o.secs || 40) / DT), G = GA.game;
      await sleep(50);
      const heap0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const full = pass(stage, o.diff, frames, true, false); await sleep(30);
      const logic = pass(stage, o.diff, frames, false, false); await sleep(30);
      const ops = pass(stage, o.diff, Math.min(frames, 600), true, true);
      const heap1 = performance.memory ? performance.memory.usedJSHeapSize : 0, L = G.layout || {}, WARM = 120, f = summary(full.ms.slice(WARM)), lg = summary(logic.ms.slice(WARM)), n = ops.ops.frames || 1, warmMax = +Math.max.apply(null, full.ms.slice(0, WARM)).toFixed(0);
      const per = function (k) { return +((ops.ops[k] || 0) / n).toFixed(1); };
      const res = {
        viewport: innerWidth + 'x' + innerHeight + ' dpr' + devicePixelRatio, stage: stage + 1, frames: f.n, warmupMaxMs: warmMax,
        frameMs: f, logicMs: lg, renderMsAvg: +(f.avg - lg.avg).toFixed(2), fpsCap: +(1000 / f.avg).toFixed(0), fpsCap4x: +(1000 / (f.avg * 4)).toFixed(0), p95x4: +(f.p95 * 4).toFixed(1),
        over33run: full.maxLongRun, drawCalls: +(per('drawImage') + per('fill') + per('stroke') + per('fillRect') + per('strokeRect') + per('fillText') + per('strokeText')).toFixed(1),
        opsPerFrame: { drawImage: per('drawImage'), fill: per('fill'), stroke: per('stroke'), fillRect: per('fillRect'), text: +(per('fillText') + per('strokeText')).toFixed(1), gradients: +(per('createRadialGradient') + per('createLinearGradient')).toFixed(1), pattern: per('createPattern'), imageData: +(per('getImageData') + per('putImageData')).toFixed(2), clip: per('clip'), setTransform: per('setTransform') },
        shadowBlurPerFrame: per('shadowBlur'), filterPerFrame: per('filter'), compositeNonDefaultPerFrame: per('globalCompositeOperation'),
        objects: { balls: full.ballsMax, particlesMax: full.partsMax, floatTextsMax: full.textsMax }, heapMB: performance.memory ? +((heap1 - heap0) / 1048576).toFixed(1) : null, solved: full.solved
      };
      const rs = performance.getEntriesByType('resource'), by = { js: 0, css: 0, img: 0 }; rs.forEach(function (r) { if (r.name.indexOf(location.origin) !== 0) return; const e = (r.name.match(/\.(\w+)(\?|$)/) || [0, ''])[1]; if (e === 'js') by.js += r.encodedBodySize; else if (e === 'css') by.css += r.encodedBodySize; else if (/webp|png|jpg|svg/.test(e)) by.img += r.encodedBodySize; });
      res.loadedKB = { js: Math.round(by.js / 1024), css: Math.round(by.css / 1024), img: Math.round(by.img / 1024) };
      Perf.last = res; return res;
    }
  };

  /** Rincian waktu gambar per modul (ms per frame, rata-rata): membungkus fungsi gambar utama selama satu putaran. Mengembalikan { modul: ms }. */
  Perf.breakdown = async function (o) {
    o = o || {}; const T = {}, undo = [];
    const wrap = function (name, obj, key) { if (!obj || typeof obj[key] !== 'function') return; const f = obj[key]; T[name] = 0; obj[key] = function () { const t0 = performance.now(); const r = f.apply(this, arguments); T[name] += performance.now() - t0; return r; }; undo.push(function () { obj[key] = f; }); };
    wrap('latar (Scenery.drawBack)', GA.Scenery, 'drawBack'); wrap('objek depan (Scenery.drawFront)', GA.Scenery, 'drawFront'); wrap('ambient (kunang-kunang/bara)', GA.Scenery, 'drawAmbient');
    wrap('burung/kelelawar', GA.Effects, 'drawBirds'); wrap('portal', GA.Effects, 'drawPortal'); wrap('bekas/decal FX', GA.FX, 'drawDecals'); wrap('partikel+teks FX.draw', GA.FX, 'draw');
    wrap('sarang+telur', GA.Path, 'drawNest'); wrap('penanda (label)', GA.Path, 'drawMarkers'); wrap('HUD canvas', GA.UI, 'drawHUD');
    wrap('rantai bola (draw)', GA.Chain.Chain.prototype, 'draw'); wrap('rantai bola (drawOver)', GA.Chain.Chain.prototype, 'drawOver'); wrap('naga+bola api (Shooter.draw)', GA.Shooter.Shooter.prototype, 'draw');
    wrap('peluru', GA.Shooter.Bullets, 'draw'); wrap('indikator tukar', GA.Swap.SwapManager.prototype, 'draw');
    const frames = Math.round((o.secs || 20) / DT), r = pass(o.stage || 0, o.diff, frames + 120, true, false); undo.forEach(function (u) { u(); });
    const n = r.ms.length, out = {}; Object.keys(T).forEach(function (k) { out[k] = +(T[k] / n).toFixed(3); });
    out['TOTAL frame (ms)'] = +(r.ms.reduce(function (a, b) { return a + b; }, 0) / n).toFixed(2); return out;
  };
  GA.Perf = Perf;
})(window.GA = window.GA || {});
