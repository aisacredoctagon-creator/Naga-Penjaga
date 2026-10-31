/* hud.js — HUD in-game sebagai DOM/CSS (revisi 11; menggantikan HUD kanvas yang digambar ulang tiap frame). Kotak HUD berukuran logis (540×… potret / 960×… lanskap) dan diskalakan dengan
 * transform seperti kanvas, jadi geometri `metrics()` / `geo()` (dipakai tata letak jalur, tes, dan tombol Jeda) TIDAK berubah.
 * Isi diperbarui HANYA bila nilainya berubah (skor, soal, telur, progres, pesan): `update(run)` per frame hanya membandingkan beberapa angka.
 * Elemen: plakat skor, plakat stage (3 permata), 3 telur, plakat SOAL besar kontras (+ "n/20", sumbu batas waktu, ikon alasan), bar progres, zona informasi (kombo, pesan singkat, status).
 * Animasi hanya transform/opacity (CSS, sekali per soal baru). Gaya: css/hud.css (dimuat bersama mesin). Token warna: Theme.ui lewat CSS variables. */
(function (GA) {
  'use strict';
  const MT = GA.MathText, T = GA.T, I = function (n, c) { return GA.Icons.html(n, c); };
  const HUD_H = { portrait: 192, landscape: 114 };
  let root = null, E = null, last = null, scratch = null;

  function metrics(L) {
    const btn = Math.min(76, Math.max(56, 48 / L.scale));
    if (L.portrait) return { h: HUD_H.portrait, btn: btn, pause: { x: L.W - 12 - btn, y: 8, w: btn, h: btn } };
    return { h: HUD_H.landscape, btn: btn, pause: { x: L.W - 12 - btn, y: (84 - btn) / 2, w: btn, h: btn } };
  }

  /** Susunan plakat (koordinat logis) untuk potret / lanskap. `info` = zona informasi: kiri kombo, tengah pesan, kanan status. */
  function geo(L) {
    const m = metrics(L), W = L.W, p = m.pause;
    if (L.portrait) {
      const ex = 300; return { m: m, score: { x: 10, y: 8, w: 184, h: 58 }, step: { x: 200, y: 8, w: 92, h: 58 }, eggs: { x: ex, y: 8, w: p.x - 8 - ex, h: 58 },
        q: { x: 10, y: 74, w: W - 20, h: 58 }, prog: { x: 24, y: 137, w: W - 48, h: 8 }, info: { x: 10, y: 152, w: W - 20, h: 30 } };
    }
    const q = { x: 272, y: 6, w: W - 272 - 252, h: 56 }, ex = W - 244;
    return { m: m, score: { x: 10, y: 10, w: 178, h: 64 }, step: { x: 194, y: 10, w: 72, h: 64 }, eggs: { x: ex, y: 10, w: p.x - 8 - ex, h: 64 }, q: q, prog: { x: q.x + 16, y: q.y + q.h + 5, w: q.w - 32, h: 8 },
      info: { x: 10, y: 80, w: W - 20, h: 26 } };
  }

  const place = function (n, r) { n.style.left = r.x + 'px'; n.style.top = r.y + 'px'; n.style.width = r.w + 'px'; n.style.height = r.h + 'px'; };

  function build() {
    if (root) return;
    const host = document.getElementById('ui'); if (!host) return;
    root = document.createElement('div'); root.id = 'hud'; root.hidden = true; root.setAttribute('aria-label', 'Status permainan');
    root.innerHTML =
      '<div class="hud-bar"></div>' +
      '<div class="hud-pill hud-score"><small>SKOR</small><b id="h-score">000000</b></div>' +
      '<div class="hud-pill hud-step"><small>STAGE</small><span class="hud-gems"><i></i><i></i><i></i></span><em id="h-step">1/3</em></div>' +
      '<div class="hud-pill hud-eggs" id="h-eggs" role="img"><span class="hud-egg"></span><span class="hud-egg"></span><span class="hud-egg"></span></div>' +
      '<div class="hud-pill hud-q" id="h-q"><span class="hud-n"><i class="hud-orb"></i><b id="h-n">0/20</b></span><span class="hud-qt" id="h-qt" aria-live="polite"></span><span class="hud-note" id="h-note"></span>' +
        '<span class="hud-reason" id="h-reason"></span><span class="hud-time" id="h-time"><i></i></span></div>' +
      '<div class="hud-prog" id="h-prog" role="progressbar" aria-valuemin="0" aria-valuemax="20"><i></i></div>' +
      '<div class="hud-info" id="h-info"><span class="hud-combo" id="h-combo"></span><span class="hud-msg" id="h-msg"></span><span class="hud-chips" id="h-chips"></span></div>';
    host.insertBefore(root, host.firstChild);
    E = { score: root.querySelector('#h-score'), step: root.querySelector('#h-step'), gems: root.querySelectorAll('.hud-gems i'), eggs: root.querySelector('#h-eggs'), egg: root.querySelectorAll('.hud-egg'), q: root.querySelector('#h-q'),
      n: root.querySelector('#h-n'), qt: root.querySelector('#h-qt'), note: root.querySelector('#h-note'), reason: root.querySelector('#h-reason'), time: root.querySelector('#h-time'), timeI: root.querySelector('#h-time i'),
      prog: root.querySelector('#h-prog'), progI: root.querySelector('#h-prog i'), combo: root.querySelector('#h-combo'), msg: root.querySelector('#h-msg'), chips: root.querySelector('#h-chips'),
      bar: root.querySelector('.hud-bar'), parts: { score: root.querySelector('.hud-score'), step: root.querySelector('.hud-step'), eggs: root.querySelector('.hud-eggs'), q: root.querySelector('.hud-q'), prog: root.querySelector('.hud-prog'), info: root.querySelector('.hud-info') } };
    last = {};
  }

  /** Letakkan HUD untuk layout L (dipanggil saat ukuran/orientasi berubah). */
  function layout(L) {
    build(); if (!root) return;
    const G = geo(L);
    root.style.width = L.W + 'px'; root.style.height = (G.m.h + 8) + 'px'; root.style.transform = 'translate(' + L.ox + 'px,' + L.oy + 'px) scale(' + L.scale + ')';
    root.classList.toggle('portrait', !!L.portrait);
    E.bar.style.height = G.m.h + 'px';
    Object.keys(E.parts).forEach(function (k) { place(E.parts[k], G[k]); });
    last = {}; fitCache = {};
  }

  let fitCache = {};
  /** Ukuran font plakat soal: terbesar yang muat (memakai pengukur MathText di kanvas kecil sekali pakai; hasil di-cache per teks+lebar). */
  function fitSize(text, maxW, maxH, start) {
    const k = text + '|' + maxW + '|' + maxH; if (fitCache[k]) return fitCache[k];
    scratch = scratch || document.createElement('canvas').getContext('2d');
    return (fitCache[k] = MT.fit(scratch, text, maxW, maxH, start));
  }

  const ICON = { cross: 'cross', check: 'check', warn: 'warn', egg: 'egg', clock: 'clock', swap: 'swap', target: 'target', flame: 'flame' };
  const REASON = { ANSWERED_CORRECT: ['ok', 'check'], TIMEOUT: ['time', 'clock'], LOST_TARGET: ['lost', 'target'] };
  const pad = function (n, len) { let s = String(n); while (s.length < len) s = '0' + s; return s; };

  /** Perbarui isi HUD dari state `run` (hanya menulis DOM bila ada yang berubah). */
  function update(run, L) {
    if (!root || !run) return;
    if (root.hidden) root.hidden = false;
    const G = geo(L), q = G.q, por = L.portrait;
    // skor
    const sc = Math.max(0, Math.round(run.scoreShown));
    if (last.score !== sc) { last.score = sc; const s = String(sc), n = Math.max(6, s.length); E.score.innerHTML = '<span class="dim">' + pad('', n - s.length).replace(/./g, '0') + '</span>' + s; }
    // stage
    if (last.step !== run.stepNo) { last.step = run.stepNo; E.step.textContent = run.stepNo + '/3'; E.gems.forEach(function (g, i) { g.className = i < run.stepNo - 1 ? 'done' : (i === run.stepNo - 1 ? 'cur' : ''); }); }
    // telur (nyawa)
    const lost = run.lifeLostT > 0 ? run.lives : -1;
    if (last.lives !== run.lives || last.lost !== lost) {
      last.lives = run.lives; last.lost = lost; E.eggs.setAttribute('aria-label', 'Telur ' + run.lives + ' dari ' + run.maxLives);
      E.egg.forEach(function (n, i) { n.className = 'hud-egg' + (i < run.lives ? ' on' : '') + (i === lost ? ' lost' : ''); });
    }
    // soal aktif
    const qt = run.q, key = qt ? qt.id + ':' + run.qSerial : '-';
    if (last.q !== key) {
      last.q = key;
      if (qt) {
        const size = fitSize(qt.text, q.w - 140, q.h - (qt.note ? 30 : 20), por ? 44 : 42);
        E.qt.innerHTML = MT.html(qt.text); E.qt.style.fontSize = size.toFixed(1) + 'px'; E.qt.className = 'hud-qt'; void E.qt.offsetWidth; E.qt.className = 'hud-qt pop';
        E.note.textContent = qt.note || ''; E.q.classList.toggle('has-note', !!qt.note);
      } else { E.qt.innerHTML = '<i class="hud-wait"></i><i class="hud-wait"></i><i class="hud-wait"></i>'; E.qt.className = 'hud-qt'; E.note.textContent = ''; }
    }
    const nTxt = run.correct + '/' + run.total; if (last.n !== nTxt) { last.n = nTxt; E.n.textContent = nTxt; E.prog.setAttribute('aria-valuenow', run.correct); E.prog.setAttribute('aria-valuemax', run.total); }
    // ikon alasan perubahan soal
    const tr = run.qTrans, rs = tr && tr.reason && REASON[tr.reason] && tr.t < (tr.solved ? 0.6 : 1.3) ? tr.reason : '';
    if (last.reason !== rs) { last.reason = rs; E.reason.className = 'hud-reason' + (rs ? ' show ' + REASON[rs][0] : ''); E.reason.innerHTML = rs ? I(REASON[rs][1]) : ''; }
    const fl = run.qFlash > 0 ? 1 : 0, ex = run.qExpire > 0 ? 1 : 0; if (last.fl !== fl || last.ex !== ex) { last.fl = fl; last.ex = ex; E.q.classList.toggle('flash', !!fl); E.q.classList.toggle('expire', !!ex); }
    // sumbu batas waktu (pola akhir boss)
    if (run.qTimeMax) {
      const f = Math.max(0, Math.min(1, run.qTime / run.qTimeMax)), pct = Math.round(f * 100), tone = f > 0.5 ? 'ok' : (f > 0.25 ? 'mid' : 'low');
      if (last.tp !== pct || last.tt !== tone) { last.tp = pct; last.tt = tone; E.time.hidden = false; E.timeI.style.width = pct + '%'; E.time.className = 'hud-time ' + tone; }
    } else if (last.tp !== -1) { last.tp = -1; E.time.hidden = true; }
    // progres
    const pf = Math.round(Math.min(1, run.progress) * 1000) / 10, boss = !!run.boss;
    if (last.pf !== pf || last.boss !== boss) { last.pf = pf; last.boss = boss; E.progI.style.width = pf + '%'; E.prog.classList.toggle('boss', boss); }
    // zona informasi: kombo (kiri), pesan (tengah), status (kanan)
    const cb = run.combo >= 2 ? run.combo : 0, cp = cb && run.comboPulse > 0 ? 1 : 0;
    if (last.cb !== cb || last.cp !== cp) { last.cb = cb; last.cp = cp; E.combo.textContent = cb ? '×' + cb : ''; E.combo.className = 'hud-combo' + (cb ? ' show' : '') + (cp ? ' pulse' : ''); }
    const f = run.info && run.info.t > 0 ? run.info : null;
    if (last.msg !== f) {
      last.msg = f;
      if (f) { E.msg.className = 'hud-msg show ' + (f.tone || 'info'); E.msg.innerHTML = I(ICON[f.icon] || 'target') + (f.math ? '<span class="hud-mm">' + MT.html(f.math) + '</span>' : '<span>' + GA.UI.esc(f.text) + '</span>'); }
      else { E.msg.className = 'hud-msg'; E.msg.innerHTML = ''; }
    }
    const chips = (run.slowT > 0 ? '<b class="slow">Lambat ' + Math.ceil(run.slowT) + 'd</b>' : '') + (run.shooter && run.shooter.frozen ? '<b class="frozen">Naga beku</b>' : '');
    if (last.chips !== chips) { last.chips = chips; E.chips.innerHTML = chips; }
  }

  function hide() { if (root) { root.hidden = true; last = {}; } }
  function destroy() { if (root && root.parentNode) root.parentNode.removeChild(root); root = null; E = null; last = null; fitCache = {}; }

  GA.HUD = { metrics: metrics, geo: geo, layout: layout, update: update, hide: hide, destroy: destroy, draw: function (ctx, run, L) { update(run, L); }, invalidate: function () { if (last) last = {}; fitCache = {}; } };
})(window.GA = window.GA || {});
