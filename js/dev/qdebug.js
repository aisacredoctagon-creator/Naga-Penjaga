/* dev/qdebug.js — overlay ?debug=question: soal aktif, status, antrean, dan LOG semua perubahan soal (waktu, alasan, lama → baru).
 * Tidak mengubah apa pun; hanya membaca run.qm (QuestionManager). Perubahan soal tanpa advance() ditandai merah (dan melempar Error pada mode ketat). */
(function (GA) {
  'use strict';
  const el = document.createElement('pre');
  el.id = 'qdebug'; el.style.cssText = 'position:fixed;right:4px;bottom:4px;z-index:99998;max-width:46vw;margin:0;padding:6px 8px;background:rgba(0,0,0,.78);color:#dff;font:11px/1.35 monospace;pointer-events:none;white-space:pre-wrap;border:1px solid #6cf;border-radius:6px';
  document.body.appendChild(el);
  let lastId = -2, lastSerial = -1, rogue = 0, lastRun = null;
  function frame() {
    const G = GA.game, r = G && G.run, qm = r && r.qm;
    if (!qm) { el.textContent = '[?debug=question] tidak ada step berjalan'; requestAnimationFrame(frame); return; }
    if (r !== lastRun) { lastRun = r; lastId = qm.activeId; lastSerial = qm.serial; rogue = 0; }
    if (qm.activeId !== lastId && qm.serial === lastSerial) { rogue++; console.error('[soal] berubah tanpa advance(): ' + lastId + ' → ' + qm.activeId); }
    lastId = qm.activeId; lastSerial = qm.serial;
    const q = qm.active, L = [];
    L.push('SOAL AKTIF  step ' + r.stepNo + '  percobaan ' + r.attempt + '  seed ' + qm.seed);
    L.push(q ? 'id ' + q.id + '  [' + qm.state(q.id) + ']  ' + q.text + '  =  ' + q.answerText : '(tidak ada soal aktif)');
    const ab = q && G.allBalls().find(function (b) { return b.kind === 'num' && b.qid === q.id; });
    L.push('bola target: ' + (ab ? (ab.ch.visible(ab) ? 'terlihat' : 'di belakang portal') : (r.chains.some(function (c) { return c.spawnQ.some(function (s) { return s.qid === (q && q.id); }); }) ? 'antre di portal' : 'TIDAK ADA')) + '   terjawab ' + qm.solvedCount() + '/' + qm.total + '   serial ' + qm.serial);
    L.push('antrean: ' + qm.queue().slice(0, 8).join(' ') + (qm.remaining() > 8 ? ' …' : ''));
    L.push('pelanggaran: ' + qm.violations.length + '   perubahan tanpa advance: ' + rogue);
    L.push('— log (terbaru di bawah) —');
    qm.log.slice(-10).forEach(function (e) { L.push(e.t.toFixed(1).padStart(6) + 's  ' + e.reason.padEnd(16) + ' ' + e.from + ' → ' + e.to + (e.same ? ' (sama)' : '')); });
    el.textContent = L.join('\n'); el.style.borderColor = qm.violations.length || rogue ? '#f44' : '#6cf';
    requestAnimationFrame(frame);
  }
  frame();
  GA.QDebug = { el: el };
})(window.GA = window.GA || {});
