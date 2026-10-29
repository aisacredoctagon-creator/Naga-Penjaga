/* dev/tune.js — panel penyetelan gameplay. Hanya dimuat dengan ?debug=tune (index.html); pemain biasa tidak pernah melihatnya.
 *
 * Slider mengubah nilai GA.Gameplay (config/gameplay.js) dan berlaku LANGSUNG pada stage yang sedang berjalan. "Salin nilai" menyalin JSON
 * (nilai efektif + yang diubah); "Reset" menghapus semua perubahan. Nilai yang diubah disimpan di localStorage (hanya saat ?debug=tune).
 * Tambahan URL: &go=3 (langsung mulai Stage 3), &diff=sulit (kesulitan), contoh: ?debug=tune&unlock=1&go=1&diff=sedang
 * Angka hidup di bagian atas: fase masuk, kecepatan (diameter/dtk), bola keluar, kerapatan (rasio jarak/diameter), celah. */
(function (GA) {
  'use strict';
  const GP = GA.Gameplay, G = function () { return GA.game; };
  const q = new URLSearchParams(location.search);

  const css = document.createElement('style');
  css.textContent = '#tune{position:fixed;right:6px;top:6px;z-index:99990;width:272px;max-height:92vh;display:flex;flex-direction:column;background:rgba(14,10,30,.88);color:#eee;font:11px/1.35 ui-monospace,Consolas,monospace;border:1px solid #7a5cff;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.5)}' +
    '#tune.min #tune-body{display:none}#tune-head{display:flex;align-items:center;gap:6px;padding:5px 8px;cursor:pointer;font-weight:700;background:#2a1d5e;border-radius:7px 7px 0 0}' +
    '#tune-body{overflow:auto;padding:6px 8px 8px}#tune-live{white-space:pre;padding:4px 6px;margin-bottom:6px;background:#000;border-radius:4px;color:#9fe0a0}' +
    '#tune .row{display:grid;grid-template-columns:1fr 54px;gap:0 6px;align-items:center;margin:0 0 3px}#tune .row label{grid-column:1/3;color:#c9b6ff}#tune .row.chg label{color:#ffd27a}' +
    '#tune .row input[type=range]{width:100%;margin:0}#tune .row input[type=number]{width:54px;font:inherit;background:#111;color:#fff;border:1px solid #555;border-radius:3px;padding:1px 2px}' +
    '#tune button,#tune select{font:inherit;margin:2px 4px 2px 0;padding:3px 7px;background:#3a2a80;color:#fff;border:1px solid #7a5cff;border-radius:4px;cursor:pointer}#tune button:hover{background:#5238b8}' +
    '#tune hr{border:0;border-top:1px solid #444;margin:6px 0}#tune .note{color:#999}';
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'tune';
  if (window.innerWidth < 700) root.className = 'min';
  root.innerHTML = '<div id="tune-head"><span>⚙ Tune gameplay</span><span id="tune-tog" style="margin-left:auto">▾</span></div><div id="tune-body"><div id="tune-live">menunggu stage…</div>' +
    '<div><select id="tune-step"><option value="0">Stage 1</option><option value="1">Stage 2</option><option value="2">Stage 3</option></select>' +
    '<select id="tune-diff"><option>mudah</option><option selected>sedang</option><option>sulit</option></select><button id="tune-go">Mulai</button><button id="tune-redo">Ulangi stage</button></div>' +
    '<div><button id="tune-copy">Salin nilai</button><button id="tune-reset">Reset</button></div><hr><div id="tune-rows"></div>' +
    '<div class="note">Kuning = diubah. Perubahan berlaku langsung; "Ulangi stage" untuk melihat ulang fase masuk. Rintangan: tahap berikutnya.</div></div>';
  document.body.appendChild(root);
  ['keydown', 'keyup', 'pointerdown', 'pointerup'].forEach(function (ev) { root.addEventListener(ev, function (e) { e.stopPropagation(); }); });
  root.querySelector('#tune-head').addEventListener('click', function () { root.classList.toggle('min'); root.querySelector('#tune-tog').textContent = root.classList.contains('min') ? '▸' : '▾'; });

  const rowsEl = root.querySelector('#tune-rows'), liveEl = root.querySelector('#tune-live'), rows = {};
  GP.TUNABLE.forEach(function (k) {
    const m = GP.META[k], row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<label>' + k + ' <span class="note">(' + m[3] + ')</span></label><input type="range" min="' + m[0] + '" max="' + m[1] + '" step="' + m[2] + '"><input type="number" min="' + m[0] + '" max="' + m[1] + '" step="' + m[2] + '">';
    const rg = row.querySelector('[type=range]'), nm = row.querySelector('[type=number]');
    function apply(v) { v = Math.max(m[0], Math.min(m[1], +v)); if (!isFinite(v)) return; GP.set(k, v); rg.value = nm.value = fmt(v); row.classList.add('chg'); }
    rg.addEventListener('input', function () { apply(rg.value); });
    nm.addEventListener('change', function () { apply(nm.value); });
    rg.addEventListener('change', function () { rg.blur(); });      // jangan biarkan fokus slider menangkap Spasi/panah (tembak/bidik)
    rowsEl.appendChild(row); rows[k] = { row: row, rg: rg, nm: nm };
  });
  function fmt(v) { return String(Math.round(v * 1000) / 1000); }

  let seen = null;
  function syncRows() {
    const snap = GP.snapshot();
    GP.TUNABLE.forEach(function (k) { const r = rows[k]; if (document.activeElement !== r.nm) r.nm.value = fmt(snap[k]); r.rg.value = snap[k]; r.row.classList.toggle('chg', k in GP.overrides); });
  }

  root.querySelector('#tune-copy').addEventListener('click', function () {
    const txt = JSON.stringify({ diff: G() && G().run ? G().run.cfg.diff : null, step: G() && G().run ? G().run.cfg.step + 1 : null, changed: GP.overrides, effective: GP.snapshot() }, null, 2);
    function done(ok) { const b = root.querySelector('#tune-copy'); b.textContent = ok ? 'Tersalin ✓' : 'Gagal (lihat console)'; if (!ok) console.log(txt); setTimeout(function () { b.textContent = 'Salin nilai'; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { fallback(); });
    else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* abaikan */ } ta.remove(); done(ok); }
  });
  root.querySelector('#tune-reset').addEventListener('click', function () { GP.reset(); syncRows(); });
  root.querySelector('#tune-redo').addEventListener('click', function () { if (G() && G().adv) G().handlers.restart(); });
  function startFromPanel() {
    const step = +root.querySelector('#tune-step').value, diff = root.querySelector('#tune-diff').value;
    G().startAdventure({ slots: ['add', 'sub', 'mul'], same: false, random: false, diff: diff }, true, step);
    G().handlers.introGo();
  }
  root.querySelector('#tune-go').addEventListener('click', startFromPanel);

  /* ---------- angka hidup ---------- */
  const spc = { min: 9, max: 0, n: 0, gaps: 0 };
  function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
  function live() {
    const g = G(), run = g && g.run;
    if (!run || !run.chain) { liveEl.textContent = 'tidak ada stage berjalan\n(pilih Stage/kesulitan lalu "Mulai")'; return; }
    if (seen !== GP.current()) { seen = GP.current(); syncRows(); }
    const out = [];
    [run.chain].forEach(function (c) {
      const unit = c.unit, e = c.entry, st = c.stats, bs = c.balls, nOut = bs.filter(function (b) { return b.out; }).length, nAll = bs.length + c.spawnQ.length;
      c.spacing(spc);
      const headPct = bs.length ? Math.round(bs[0].d / c.path.length * 100) : 0;
      out.push('fase ' + pad(e.phase, 4) + '  v ' + (c.vNow / unit).toFixed(2) + ' d/dtk  (dasar ' + (c.speed / unit).toFixed(2) + ')');
      out.push('  keluar ' + nOut + '/' + nAll + '  kepala ' + headPct + '%  tekanan ' + c.pressure.toFixed(2));
      out.push('  waktu isi: ' + (st.allOut >= 0 ? st.allOut.toFixed(1) + ' dtk' : c.clock.toFixed(1) + '…') + (st.fastEnd >= 0 ? '  masuk-cepat ' + st.fastEnd.toFixed(1) + ' dtk' : ''));
      out.push('  jarak/diam  min ' + (spc.n ? spc.min.toFixed(3) : '-') + '  maks ' + (spc.n ? spc.max.toFixed(3) : '-') + '  celah ' + spc.gaps);
    });
    out.push('jalur ' + run.cfg.pathId + ' ' + Math.round(run.path.length / (run.R * 2)) + ' d · R ' + Math.round(run.R) + ' · ' + run.cfg.diff);
    liveEl.textContent = out.join('\n');
  }
  setInterval(live, 200);
  syncRows();

  /* ---------- &go=N&diff=... : mulai otomatis ---------- */
  if (q.has('go')) {
    if (q.get('diff')) root.querySelector('#tune-diff').value = q.get('diff');
    root.querySelector('#tune-step').value = String(Math.max(0, Math.min(2, (+q.get('go') || 1) - 1)));
    setTimeout(function () { try { startFromPanel(); } catch (e) { console.error(e); } }, 900);
  }

  GA.Tune = { sync: syncRows, live: live };
})(window.GA = window.GA || {});
