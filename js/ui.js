/* ui.js — layar (DOM) dan HUD (digambar di canvas). Halaman awal (kategori + kesulitan + Mulai Main) ada di ui/start.js, cerita di story.js.
 * Teks antarmuka: Bahasa Indonesia. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, MT = GA.MathText, T = GA.T;

  const I = function (n, c) { return GA.Icons.html(n, c); };
  let root = null, H = null, rootClick = null, countdownTimer = null, hudBtn = null, pauseOpen = false, toastTimer = 0;
  const screens = {};

  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- popup JEDA (desain Figma 123:122; gaya di css/pause.css) ---------- */
  // Teks sub-judul humor: [baris 1, baris 2]. Satu dipilih acak tiap popup dibuka. Silakan ganti/tambah.
  const PAUSE_QUOTES = [
    ['Naga sedang tidur siang.', 'Telur-telur aman, untuk sementara!'],
    ['Api naga perlu diisi ulang?', 'Tarik napas, lalu semburkan lagi!'],
    ['Penyihir lagi minum teh.', 'Cepat, lanjutkan sebelum ia kembali!'],
    ['Angka-angkanya menunggu, lho!', 'Yuk, lanjutkan petualangan!']
  ];

  function pauseHTML() {
    const K = GA.Kit;
    return '<section class="screen dim pz" id="s-pause" role="dialog" aria-modal="true" aria-label="' + esc(T('pause.title')) + '" aria-describedby="pz-sub">' +
      K.panel({ title: T('pause.title'), cls: 'k-small pz-panel', body:
        '<canvas id="pz-mascot-cv" class="pz-mascot" width="136" height="136" role="img" aria-label="Naga penjaga tidur di samping sarangnya"></canvas>' +
        '<p class="pz-badge" id="pz-badge"></p><p class="pz-sub" id="pz-sub"><span id="pz-q1"></span> <span id="pz-q2"></span></p>' +
        K.button({ act: 'p-resume', id: 'pz-first', icon: 'play', label: T('pause.resume'), size: 'big' }) +
        '<div class="k-row">' + K.button({ act: 'p-restart', icon: 'restart', label: T('common.retry'), variant: 'secondary', size: 'small' }) + K.button({ act: 'p-quit', icon: 'home', label: T('common.menu'), variant: 'secondary', size: 'small' }) + '</div>' +
        K.toggle({ act: 'p-sound', icon: 'sound', label: T('set.sound'), sync: 'psound' }) }) +
      '<div class="pz-confirm" id="pz-confirm" role="alertdialog" aria-modal="true" aria-labelledby="pzc-title" aria-describedby="pzc-text">' +
        '<div class="k-panel k-small"><div class="k-body"><h3 class="k-title" id="pzc-title"></h3><p class="k-mx" id="pzc-text"></p>' +
          '<div class="k-row">' + K.button({ id: 'pzc-no', act: 'c-no', label: T('common.no'), variant: 'secondary' }) + K.button({ id: 'pzc-yes', act: 'c-yes', label: T('common.yes'), variant: 'danger' }) + '</div></div></div>' +
      '</div>' +
      '<div class="pz-toast" id="pz-toast" role="status" aria-live="polite"></div>' +
    '</section>';
  }

  /* ---------- template layar (dibangun dari UI kit: js/ui/kit.js) ---------- */
  const K = GA.Kit;
  const TPL = {
    story: '<section class="screen dim scroll" id="s-story">' + K.panel({ cls: 'k-story', role: 'dialog', body:
      '<canvas id="st-art" class="k-story-art" width="480" height="300" aria-hidden="true"></canvas>' +
      '<h2 class="k-title" id="st-title"></h2><p class="k-text k-story-text" id="st-text"></p><div class="k-dots" id="st-dots" aria-hidden="true"></div>' +
      '<div class="k-row">' + K.button({ act: 'story-skip', id: 'st-skip', label: T('common.skip'), variant: 'wood', size: 'small' }) +
      K.button({ act: 'story-next', id: 'st-next', icon: 'play', label: T('common.next') }) + '</div>' }) + '</section>',

    intro: '<section class="screen dim scroll" id="s-intro"></section>',

    pause: pauseHTML(),

    result: '<section class="screen dim scroll" id="s-result"></section>'
  };

  /* ---------- API UI (DOM) ---------- */
  const UI = {
    init: function (handlers) {
      H = handlers;
      root = document.getElementById('ui');
      Object.keys(TPL).forEach(function (k) { const n = el(TPL[k]); root.appendChild(n); screens[k] = n; });
      root.appendChild(el('<div id="countdown" class="countdown" aria-live="assertive"></div>'));
      GA.Kit.mount(root);      // sudah dipasang halaman awal (idempoten)
      // tombol jeda sungguhan (fokus & papan ketik) di atas tombol yang digambar di canvas HUD
      hudBtn = el(GA.Kit.button({ id: 'pause-hud', icon: 'pause', variant: 'secondary', aria: 'Jeda permainan' }));
      root.insertBefore(hudBtn, root.firstChild);      // di bawah layar/popup (urutan DOM): popup Jeda menutup HUD dan tombolnya
      hudBtn.addEventListener('click', function (e) {
        // klik sintetis dari tombol Spasi/Enter (tombol tembak) jangan membuka jeda
        if (e.detail === 0 && performance.now() - (GA.lastFireKey || 0) < 800) return;
        GA.Audio.unlock(); GA.Audio.play('click'); H.pause();
      });
      // jebakan fokus di dalam popup jeda
      screens.pause.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        const scope = UI.confirmOpen() ? document.getElementById('pz-confirm') : screens.pause;
        const f = Array.prototype.filter.call(scope.querySelectorAll('button:not([disabled])'), function (b) { return b.offsetParent !== null && !b.closest('[inert]'); });
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1], a = document.activeElement;
        if (!scope.contains(a)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
      });
      rootClick = function (e) {
        const b = e.target.closest('[data-act]');
        if (!b || b.disabled) return;
        const act = b.getAttribute('data-act');
        GA.Audio.unlock(); GA.Audio.play(uiSound(act));
        UI.act(act, b);
      }; root.addEventListener('click', rootClick);
      this.syncSound();
    },

    /** Bongkar layar permainan (story, intro, jeda, hasil), tombol jeda HUD, hitung mundur, dan listener — dipanggil saat kembali ke halaman awal. */
    destroy: function () {
      clearTimeout(countdownTimer); clearTimeout(toastTimer); this.stopStoryAnim();
      pauseOpen = false; this._story = null; this._ov = null; this._confirmFn = null; this._opener = null; this._confirmOpener = null;
      if (root && rootClick) root.removeEventListener('click', rootClick); rootClick = null;
      Object.keys(screens).forEach(function (k) { if (screens[k].parentNode) screens[k].parentNode.removeChild(screens[k]); delete screens[k]; });
      const cd = document.getElementById('countdown'); if (cd && cd.parentNode) cd.parentNode.removeChild(cd);
      if (hudBtn && hudBtn.parentNode) hudBtn.parentNode.removeChild(hudBtn); hudBtn = null; H = null; GA.HUD.destroy();
    },

    act: function (a, b) {
      switch (a) {
        case 'story-next': this.storyNext(); break;
        case 'story-skip': this.storyEnd(); break;
        case 'go': H.introGo(); break;
        case 'p-resume': H.resume(); break;
        case 'p-sound': H.toggleSound(); break;
        case 'p-restart': this.confirmOr('Ulangi stage?', 'Progres stage hilang.', 'Ya, ulangi', H.restart, b); break;
        case 'p-quit': this.confirmOr('Ke menu?', 'Progres hilang.', 'Ya, ke menu', H.quit, b); break;
        case 'c-no': this.closeConfirm(true); break;
        case 'c-yes': { const fn = this._confirmFn; this.closeConfirm(false); if (fn) fn(); break; }
        case 'ov-next': case 'next-step': H.nextStep(); break;
        case 'ov-retry': H.restart(); break;
        case 'ov-menu': H.quit(); break;
        case 'ov-chip': this.ovCard(+b.dataset.i); break;
        case 'again': H.again(); break;
        case 'quit': H.quit(); break;
      }
    },

    show: function (name) {
      if (pauseOpen && name !== 'pause') this.leavePause(false);
      if (name !== 'story') this.stopStoryAnim();
      Object.keys(screens).forEach(function (k) { screens[k].classList.toggle('show', k === name); });
      const s = screens[name]; if (s) s.scrollTop = 0;
      if (GA.Start && GA.Start.isShown()) GA.Start.hide();      // layar permainan tampil = halaman awal (dan layar pemuatan) tersembunyi
    },
    hide: function () {
      if (pauseOpen) this.leavePause(false);
      this.stopStoryAnim();
      Object.keys(screens).forEach(function (k) { screens[k].classList.remove('show'); });
    },
    isOpen: function () { return Object.keys(screens).some(function (k) { return screens[k].classList.contains('show'); }); },
    /** Sakelar suara di popup Jeda mengikuti keadaan audio. */
    syncSound: function () {
      const on = GA.Audio.isEnabled();
      root.querySelectorAll('[data-sync="psound"]').forEach(function (n) { n.classList.toggle('on', on); n.setAttribute('aria-checked', on ? 'true' : 'false'); });
    },

    /* ---------- cerita (panel bergambar) ---------- */
    /** list: Story.intro / win / lose. opts: { onDone, skippable }. */
    showStory: function (list, opts) {
      this._story = { list: list, i: 0, onDone: (opts && opts.onDone) || null, skippable: !(opts && opts.skippable === false) };
      document.getElementById('st-skip').style.display = this._story.skippable ? '' : 'none';
      this.drawStoryPanel();
      this.show('story');
      this.startStoryAnim();
    },
    drawStoryPanel: function () {
      const s = this._story, p = GA.Story.panel(s.list, s.i);
      s.art = p.art;
      document.getElementById('st-title').textContent = p.title;
      document.getElementById('st-text').textContent = p.text;
      let dots = ''; for (let i = 0; i < s.list.length; i++) dots += '<i' + (i === s.i ? ' class="on"' : '') + '></i>';
      document.getElementById('st-dots').innerHTML = dots;
      document.getElementById('st-next').innerHTML = '<i class="k-gloss"></i>' + I('play') + '<span>' + (s.i >= s.list.length - 1 ? T('common.go') : T('common.next')) + '</span>';
    },
    storyNext: function () {
      const s = this._story; if (!s) return;
      if (s.i >= s.list.length - 1) { this.storyEnd(); return; }
      s.i++; this.drawStoryPanel();
    },
    storyEnd: function () {
      const s = this._story; this._story = null; this.stopStoryAnim();
      if (s && s.onDone) s.onDone();
    },
    startStoryAnim: function () {
      const cv = document.getElementById('st-art'), g = cv.getContext('2d'), self = this; let t0 = performance.now();
      this.stopStoryAnim();
      const frame = function (now) {
        const s = self._story; if (!s) return;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
        g.save(); g.scale(cv.width / 240, cv.height / 150);
        GA.Story.drawArt(g, s.art, 240, 150, (now - t0) / 1000);
        g.restore();
        self._storyRaf = requestAnimationFrame(frame);
      };
      this._storyRaf = requestAnimationFrame(frame);
    },
    stopStoryAnim: function () { cancelAnimationFrame(this._storyRaf); this._storyRaf = 0; },

    /** Layar pembuka stage: nama + ikon stage, CONTOH SOAL bergambar sesuai format stage (kotak kosong berkedip), lalu tombol mulai → hitung mundur 3-2-1.
     * info: { stageNo, tag, place, icon, story, boss, format, catName, catIcon, examplesHtml[], diffName, total } */
    showIntro: function (info) {
      const K = GA.Kit;
      screens.intro.innerHTML = K.panel({ title: info.place, body:
        '<p class="k-eyebrow">' + esc(info.tag) + ' · ' + esc(info.diffName) + '</p>' +
        '<div class="k-stage-ic' + (info.boss ? ' boss' : '') + '">' + I(info.icon) + '</div>' +
        '<p class="k-text">' + esc(info.story) + '</p>' +
        '<div class="k-chips">' + K.chip(info.catName, { icon: info.catIcon }) + K.chip(info.total + ' ' + T('common.questions'), { icon: 'target' }) + '</div>' +
        '<div class="k-example"><span class="k-eyebrow">' + T('common.example') + ' · ' + esc(T('fmt.' + info.format)) + '</span>' + info.examplesHtml.map(function (h) { return '<span class="k-extext">' + h + '</span>'; }).join('') + '<small class="k-fmt2">' + esc(T('fmt.' + info.format + '2')) + '</small></div>' +
        K.button({ act: 'go', icon: 'play', label: T('common.go'), size: 'big' }) });
      this.show('intro');
    },

    /** Hitung mundur 3-2-1 lalu panggil done(). */
    countdown: function (done) {
      this.hide();
      const c = document.getElementById('countdown'), seq = ['3', '2', '1', 'Mulai!'];
      let i = 0;
      clearTimeout(countdownTimer);
      const step = function () {
        c.textContent = seq[i];
        GA.Audio.play(i < 3 ? 'tick' : 'go');
        c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); c.classList.add('on');
        i++;
        countdownTimer = setTimeout(function () {
          if (i >= seq.length) { c.classList.remove('on'); done(); } else step();
        }, i >= seq.length ? 650 : 800);
      };
      step();
    },
    cancelCountdown: function () { clearTimeout(countdownTimer); const c = document.getElementById('countdown'); if (c) c.classList.remove('on'); },

    /* ---------- popup JEDA ---------- */
    pauseQuotes: PAUSE_QUOTES,

    drawMascot: function (t) {
      const cv = document.getElementById('pz-mascot-cv'); if (!cv) return;
      const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      GA.Dragon.drawSleeping(g, cv.width, cv.height, t);
    },

    showPause: function (info) {
      info = info || {};
      const q = PAUSE_QUOTES[Math.floor(Math.random() * PAUSE_QUOTES.length)];
      document.getElementById('pz-badge').textContent = info.badge || '';
      document.getElementById('pz-q1').textContent = q[0];
      document.getElementById('pz-q2').textContent = q[1];
      this.syncSound();
      this._opener = document.activeElement;
      this.show('pause'); pauseOpen = true;
      const cvx = document.getElementById('game'); if (cvx) cvx.inert = true; hudBtn.inert = true;
      this.drawMascot(0);      // naga tidur: gambar statis, digambar sekali (tanpa loop rAF)
      document.getElementById('pz-first').focus({ preventScroll: true });
    },

    /** Tutup popup dan kembalikan fokus ke tombol jeda. */
    hidePause: function () { if (pauseOpen) { this.leavePause(true); screens.pause.classList.remove('show'); } },

    leavePause: function (focusBack) {
      pauseOpen = false;
      this.closeConfirm(false);
      clearTimeout(toastTimer); document.getElementById('pz-toast').classList.remove('show');
      const cvy = document.getElementById('game'); if (cvy) cvy.inert = false; if (hudBtn) hudBtn.inert = false;
      if (focusBack) {
        const t = hudBtn.classList.contains('on') ? hudBtn : this._opener;
        if (t && t.focus) t.focus({ preventScroll: true });
      }
    },


    confirmOpen: function () { return document.getElementById('pz-confirm').classList.contains('show'); },

    /** Konfirmasi ringan hanya jika progres akan hilang; selain itu langsung jalan. */
    confirmOr: function (title, text, yes, fn, opener) {
      if (!(H.hasProgress && H.hasProgress())) { fn(); return; }
      this._confirmFn = fn; this._confirmOpener = opener || null;
      document.getElementById('pzc-title').textContent = title;
      document.getElementById('pzc-text').textContent = text;
      document.querySelector('#pzc-yes span').textContent = yes;
      screens.pause.querySelector('.pz-panel').inert = true;
      document.getElementById('pz-confirm').classList.add('show');
      document.getElementById('pzc-no').focus({ preventScroll: true });
    },
    closeConfirm: function (focusBack) {
      const c = document.getElementById('pz-confirm');
      if (!c.classList.contains('show')) return;
      c.classList.remove('show');
      screens.pause.querySelector('.pz-panel').inert = false;
      if (focusBack && this._confirmOpener) this._confirmOpener.focus({ preventScroll: true });
      this._confirmFn = null;
    },

    /** Esc/P saat jeda: tutup konfirmasi dulu bila terbuka. true = tombol sudah dipakai. */
    pauseKey: function () { if (this.confirmOpen()) { this.closeConfirm(true); return true; } return false; },

    toast: function (text, ms) {
      const t = document.getElementById('pz-toast'); if (!t) return;
      t.textContent = text; t.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
    },

    /** Tombol jeda HUD (DOM) mengikuti posisi tombol yang digambar di canvas. */
    placeHudButton: function (L) {
      const m = this.hudMetrics(L).pause, pad = 6;
      GA.HUD.layout(L);
      hudBtn.style.left = (L.ox + (m.x - pad) * L.scale) + 'px'; hudBtn.style.top = (L.oy + (m.y - pad) * L.scale) + 'px';
      hudBtn.style.width = ((m.w + 2 * pad) * L.scale) + 'px'; hudBtn.style.height = ((m.h + 2 * pad) * L.scale) + 'px';
    },
    setHudButton: function (on) { if (hudBtn) hudBtn.classList.toggle('on', !!on); },

    /** Overview jawaban sebuah stage (menang maupun Game Over). r = hasil stageResult() (main.js); r.newBest = "Rekor baru!" (Game Over yang melampaui rekor).
     * opts: { next: tombol Lanjut }.
     * Grid 20 chip bernomor: benar langsung (✓, lingkaran), benar setelah salah (✓ + titik, kotak), belum terjawab (strip, garis putus). Ketuk chip = kartu soal. */
    showOverview: function (r, opts) {
      opts = opts || {}; const K = GA.Kit;
      this._ov = { r: r, opts: opts, sel: -1 };
      const kind = function (it) { return !it.solved ? 'none' : (it.wrong ? 'redo' : 'ok'); };
      const chips = r.items.map(function (it, i) {
        const k = kind(it);
        return '<button type="button" class="ov-chip ov-' + k + '" data-act="ov-chip" data-i="' + i + '" aria-label="' + (i + 1) + ': ' + esc(T(k === 'ok' ? 'ov.first' : (k === 'redo' ? 'ov.wrong' : 'ov.unanswered'))) + '">' +
          '<i class="ov-n">' + (i + 1) + '</i>' + I(k === 'ok' ? 'check' : (k === 'redo' ? 'checkdot' : 'dash')) + '</button>';
      }).join('');
      screens.result.innerHTML = K.panel({ title: r.win ? T('step.done', { n: r.stage + 1 }) : T('ov.lose'), cls: 'k-wide', body:
        '<p class="k-eyebrow">' + esc(r.tag + ' · ' + r.place) + '</p>' +
        '<div class="ov-top"><span class="ov-eggs" title="' + esc(T('ov.eggs')) + '">' + K.eggs(r.eggs, r.maxEggs) + '</span>' +
          '<span class="ov-pct" title="' + esc(T('ov.first')) + '">' + I('check') + '<b>' + Math.round(r.pct * 100) + '%</b></span>' + (r.win ? K.stars(r.stars, 3) : '') + '</div>' +
        '<div class="ov-grid" role="group" aria-label="' + esc(T('res.stats', { c: r.items.filter(function (i) { return i.solved; }).length, w: r.wrong, k: r.combo })) + '">' + chips + '</div>' +
        '<div class="ov-card" id="ov-card" aria-live="polite"><span class="ov-hint">' + esc(T('ov.tap')) + '</span></div>' +
        (r.newBest ? '<div class="ov-best">' + K.badge(T('res.best'), { tone: 'buff', icon: 'trophy' }) + '</div>' : '') +
        '<div class="ov-btns">' + K.button({ act: 'ov-retry', icon: 'restart', label: T('common.retry'), variant: 'secondary', size: 'small' }) +
          (opts.next ? K.button({ act: 'ov-next', icon: 'play', label: T('common.next'), size: 'big' }) : '') +
          K.button({ act: 'ov-menu', icon: 'home', label: T('common.menu'), variant: 'wood', size: 'small' }) + '</div>' });
      this.show('result');
    },

    /** Kartu kecil untuk soal ke-i di overview: soal lengkap + jawaban benar, jumlah salah, dan nilai yang sempat salah ditembak. */
    ovCard: function (i) {
      const o = this._ov; if (!o) return; const it = o.r.items[i], card = document.getElementById('ov-card'); if (!it || !card) return;
      o.sel = i;
      document.querySelectorAll('#s-result .ov-chip').forEach(function (c) { c.classList.toggle('sel', +c.getAttribute('data-i') === i); });
      card.innerHTML = '<span class="ov-q"><b>' + (i + 1) + '</b>' + MT.html(it.text) + '<i class="ov-arrow">' + I('play') + '</i><em>' + MT.html(it.answerText) + '</em></span>' +
        '<span class="ov-w">' + I('cross') + '<b>' + it.wrong + '</b>' + (it.wrongVals.length ? '<span class="ov-wv">' + it.wrongVals.map(function (v) { return '<s>' + MT.html(v) + '</s>'; }).join(' ') + '</span>' : '') + '</span>';
    },

    /** Ringkasan petualangan setelah Stage 3. r: { win, steps:[{name,stars}], score, newBest, high, correct, wrong, combo } */
    showResult: function (r) {
      const K = GA.Kit;
      const steps = (r.steps || []).map(function (s) { return '<li><span>' + esc(s.name) + '</span>' + K.stars(s.stars, 3) + '</li>'; }).join('');
      screens.result.innerHTML = K.panel({ title: r.win ? T('res.win') : T('res.lose'), body:
        (steps ? '<ul class="k-sum">' + steps + '</ul>' : '') +
        '<p class="k-big-score">' + T('common.score') + ' <b>' + r.score + '</b></p>' +
        '<p class="k-stat">' + T('res.hi') + ' <b>' + r.high + '</b></p>' + (r.newBest ? '<div style="text-align:center">' + K.badge(T('res.best'), { tone: 'buff', icon: 'star' }) + '</div>' : '') +
        '<p class="k-stat">' + esc(T('res.stats', { c: r.correct, w: r.wrong, k: r.combo })) + '</p>' +
        K.button({ act: 'again', icon: 'restart', label: T('common.again'), size: 'big' }) +
        '<div class="k-row">' + K.button({ act: 'quit', icon: 'home', label: T('common.menu'), variant: 'wood', size: 'small' }) + '</div>' });
      this.show('result');
    },


    /* ---------- HUD (canvas) ---------- */
    hudMetrics: function (L) { return GA.HUD.metrics(L); },

    hitPause: function (x, y, L) {
      const m = this.hudMetrics(L).pause, pad = 6;
      return x >= m.x - pad && x <= m.x + m.w + pad && y >= m.y - pad && y <= m.y + m.h + pad;
    },

    /** HUD canvas: lihat js/ui/hud.js */
    /** HUD (DOM): perbarui isi hanya bila berubah (js/ui/hud.js). */
    drawHUD: function (ctx, run, L, t) { GA.HUD.update(run, L); },
    hideHUD: function () { GA.HUD.hide(); }
  };

  /** Bunyi UI menurut jenis tindakan: pilih (kartu/slot/kesulitan), kembali, konfirmasi (mulai/lanjut), klik biasa. */
  function uiSound(a) {
    if (a === 'c-no' || a === 'story-skip') return 'back';
    if (a === 'st-cat' || a === 'st-diff' || a === 'st-sound' || a === 'st-music' || a === 'st-quality' || a === 'p-sound') return 'select';
    if (a === 'st-play' || a === 'go' || a === 'next-step' || a === 'ov-next' || a === 'again' || a === 'c-yes' || a === 'p-resume') return 'confirm';
    return 'click';
  }

  UI.esc = esc; UI.el = el;
  GA.UI = UI;
})(window.GA = window.GA || {});
