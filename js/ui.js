/* ui.js — layar (DOM) dan HUD (digambar di canvas). Menu pilih kategori ada di menu.js, cerita di story.js.
 * Teks antarmuka: Bahasa Indonesia. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, Storage = GA.Storage, MT = GA.MathText, T = GA.T;

  const I = function (n, c) { return GA.Icons.html(n, c); };
  let root = null, H = null, countdownTimer = null, hudBtn = null, pauseOpen = false, toastTimer = 0, mascotRaf = 0;
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
    const play = '<span class="pz-ico play" aria-hidden="true"><img src="assets/icon-play.svg" alt=""></span>';
    const restart = '<span class="pz-ico restart" aria-hidden="true"><img src="assets/icon-restart.svg" alt=""></span>';
    const home = '<span class="pz-ico home" aria-hidden="true"><img src="assets/icon-home.svg" alt=""></span>';
    const spk = '<svg class="on" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3.5v11L5 10H2z" fill="#451a03"/><path d="M11 5.2a4 4 0 0 1 0 5.6M12.8 3.4a6.6 6.6 0 0 1 0 9.2" fill="none" stroke="#451a03" stroke-width="1.5" stroke-linecap="round"/></svg>' +
      '<svg class="off" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3.5v11L5 10H2z" fill="#451a03"/><path d="M11 6l4 4M15 6l-4 4" fill="none" stroke="#451a03" stroke-width="1.6" stroke-linecap="round"/></svg>';
    return '<section class="screen pz" id="s-pause" role="dialog" aria-modal="true" aria-labelledby="pz-title" aria-describedby="pz-sub">' +
      '<header class="pz-top">' +
        '<button type="button" class="pz-status" data-act="p-resume" aria-label="Permainan dijeda. Tekan untuk lanjut"><span class="pz-bars" aria-hidden="true"><i></i><i></i></span></button>' +
        '<p class="pz-badge" id="pz-badge"></p>' +
      '</header>' +
      '<div class="pz-body"><div class="pz-fit" id="pz-fit"><div class="pz-stage" id="pz-stage"><div class="pz-sway">' +
        '<div class="pz-board">' +
          '<i class="pz-bolt tl"></i><i class="pz-bolt tr"></i><i class="pz-bolt bl"></i><i class="pz-bolt br"></i>' +
          '<div class="pz-plank">' +
            '<div class="pz-plaque"><h2 id="pz-title">JEDA</h2><span class="pz-strip"></span></div>' +
            '<p class="pz-sub" id="pz-sub"><span id="pz-q1"></span><span id="pz-q2"></span></p>' +
            '<hr class="pz-divider">' +
            '<div class="pz-buttons">' +
              '<button type="button" class="pz-btn pz-green" id="pz-first" data-act="p-resume">' + play + '<span>LANJUT</span><i class="pz-gloss"></i></button>' +
              '<div class="pz-row">' +
                '<button type="button" class="pz-btn pz-orange" data-act="p-restart"><i class="pz-gloss"></i>' + restart + '<span>Ulangi</span></button>' +
                '<button type="button" class="pz-btn pz-orange" data-act="p-quit"><i class="pz-gloss"></i>' + home + '<span>Menu</span></button>' +
              '</div>' +
              '<button type="button" class="pz-toggle" role="switch" aria-checked="true" aria-label="Suara Permainan" data-act="p-sound">' +
                '<span class="pz-tl"><span class="pz-speaker">' + spk + '</span><span class="pz-tt">Suara<br>Permainan</span></span>' +
                '<span class="pz-tr"><span class="pz-state" id="pz-state">NYALA</span><span class="pz-track"></span></span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pz-banner">' +
          '<div class="pz-ropes" aria-hidden="true"><span class="pz-rope"><b></b><i></i></span><span class="pz-rope"><b></b><i></i></span></div>' +
          '<button type="button" class="pz-booster" data-act="p-booster" aria-label="Booster gratis. Klaim sekarang. Iklan">' +
            '<span class="pz-bicons" aria-hidden="true"><span class="pz-capsule">✚</span><span class="pz-kit"><span><em>✚</em></span></span></span>' +
            '<span class="pz-btxt"><strong>Booster Gratis</strong><span>Klaim Sekarang</span></span>' +
            '<span class="pz-ad" aria-hidden="true">AD</span><span class="pz-ribbon" aria-hidden="true">GRATIS</span>' +
          '</button>' +
        '</div>' +
        '<div class="pz-mascot"><canvas id="pz-mascot-cv" width="272" height="272" role="img" aria-label="Naga penjaga sedang tidur nyenyak di samping sarangnya"></canvas></div>' +
      '</div></div></div></div>' +
      '<div class="pz-confirm" id="pz-confirm" role="alertdialog" aria-modal="true" aria-labelledby="pzc-title" aria-describedby="pzc-text">' +
        '<div class="pz-ccard"><h3 id="pzc-title"></h3><p id="pzc-text"></p>' +
          '<div class="pz-row"><button type="button" class="pz-btn pz-orange" id="pzc-no" data-act="c-no"><i class="pz-gloss"></i><span>Batal</span></button>' +
          '<button type="button" class="pz-btn pz-green" id="pzc-yes" data-act="c-yes"><i class="pz-gloss"></i><span></span></button></div></div>' +
      '</div>' +
      '<div class="pz-toast" id="pz-toast" role="status" aria-live="polite"></div>' +
    '</section>';
  }

  /* ---------- template layar (dibangun dari UI kit: js/ui/kit.js) ---------- */
  const K = GA.Kit;
  const TPL = {
    title: '<section class="screen" id="s-title">' + K.panel({ cls: 'k-titlecard', body:
      '<div class="k-logo"><span class="l1">Naga</span><span class="l2">Penjaga</span></div>' +
      '<p class="k-text">' + T('title.tag') + '</p>' +
      K.button({ act: 'play', icon: 'play', label: T('title.play'), size: 'big' }) +
      '<div class="k-row">' + K.button({ act: 'howto', icon: 'help', label: T('title.howto'), variant: 'secondary', size: 'small' }) +
      K.button({ act: 'settings', icon: 'gear', label: T('title.settings'), variant: 'secondary', size: 'small' }) + '</div>' +
      '<div id="t-res" style="display:flex;justify-content:center"></div>' }) + '</section>',

    settings: '<section class="screen dim scroll" id="s-settings">' + K.panel({ title: T('set.title'), back: 'back', body:
      K.toggle({ act: 'sound', icon: 'sound', label: T('set.sound'), sync: 'sound' }) +
      K.toggle({ act: 'music', icon: 'music', label: T('set.music'), sync: 'music' }) +
      '<p class="k-eyebrow">' + T('set.quality') + '</p><div id="q-seg"></div>' +
      K.button({ act: 'replay-story', icon: 'book', label: T('set.story'), variant: 'secondary' }) +
      K.button({ act: 'reset', icon: 'restart', label: T('set.reset'), variant: 'danger', size: 'small' }) }) + '</section>',

    howto: '<section class="screen scroll dim" id="s-howto">' + K.panel({ title: T('how.title'), back: 'back', cls: 'k-wide', body:
      '<div class="k-how">' +
        '<div class="k-howc"><span class="k-pic">' + I('target') + '</span><div><b>' + T('how.aim') + '</b><br><small>' + T('how.aim2') + '</small></div></div>' +
        '<div class="k-howc"><span class="k-pic">' + I('flame') + '</span><div><b>' + T('how.hit') + '</b><br><small>' + T('how.hit2') + '</small></div></div>' +
        '<div class="k-howc"><span class="k-pic">' + I('egg') + '</span><div><b>' + T('how.egg') + '</b><br><small>' + T('how.egg2') + '</small></div></div>' +
      '</div>' +
      '<div class="k-fmts">' +
        '<div class="k-fmtc"><b>' + T('how.f1') + '</b><span class="k-extext">' + MT.html('2 + 1 = ▢') + '</span></div>' +
        '<div class="k-fmtc"><b>' + T('how.f2') + '</b><span class="k-extext">' + MT.html('▢ + 3 = 18') + '</span></div>' +
        '<div class="k-fmtc"><b>' + T('how.f3') + '</b><span class="k-extext">' + MT.html('2 + 1 = ▢') + ' <i>+</i> ' + MT.html('▢ + 3 = 18') + '</span></div>' +
      '</div>' +
      '<div class="k-chips">' + K.chip(T('how.goal'), { icon: 'target' }) + '</div>' +
      '<div class="k-legend"><span class="k-leg"><span data-icon="frost"></span>' + T('sp.frost') + '</span><span class="k-leg"><span data-icon="egg"></span>' + T('sp.egg') + '</span></div>' }) + '</section>',

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
      H = handlers; if (GA.Skin) GA.Skin.apply();
      root = document.getElementById('ui');
      Object.keys(TPL).forEach(function (k) { const n = el(TPL[k]); root.appendChild(n); screens[k] = n; });
      root.appendChild(el('<div id="countdown" class="countdown" aria-live="assertive"></div>'));
      GA.Kit.mount(root);
      // tombol jeda sungguhan (fokus & papan ketik) di atas tombol yang digambar di canvas HUD
      hudBtn = el('<button type="button" id="pause-hud" aria-label="Jeda permainan"></button>');
      root.appendChild(hudBtn);
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
      root.addEventListener('click', function (e) {
        const b = e.target.closest('[data-act]');
        if (!b || b.disabled) return;
        const act = b.getAttribute('data-act');
        GA.Audio.unlock(); GA.Audio.play(uiSound(act));
        UI.act(act, b);
      });
      // ikon bola khusus di halaman "Cara Bermain"
      root.querySelectorAll('[data-icon]').forEach(function (n) { n.appendChild(UI.specialIcon(n.getAttribute('data-icon'), 44)); });
      this.syncSound(); this.refreshTitle();
    },

    /** Daftarkan layar tambahan (mis. menu pilih kategori dari menu.js). */
    addScreen: function (name, node) { root.appendChild(node); screens[name] = node; },
    /** Penangan tindakan data-act yang tidak dikenal UI (diisi menu.js). */
    extra: null,

    specialIcon: function (kind, size) {
      const c = document.createElement('canvas'), d = window.devicePixelRatio || 1;
      c.width = c.height = size * d; c.style.width = c.style.height = size + 'px';
      const g = c.getContext('2d'); g.scale(d, d);
      GA.Chain.drawSpecial(g, kind, size / 2, size / 2 + 1, size / 2 - 5, 0);
      return c;
    },

    act: function (a, b) {
      switch (a) {
        case 'play': GA.Menu.open(); break;
        case 'settings': this.syncSound(); this.show('settings'); break;
        case 'howto': this.show('howto'); break;
        case 'back': this.refreshTitle(); this.show('title'); break;
        case 'sound': H.toggleSound(); break;
        case 'music': H.toggleMusic(); break;
        case 'quality-set': H.setQuality(b.dataset.id); break;
        case 'replay-story': H.replayStory(); break;
        case 'reset': GA.Kit.confirm({ title: T('set.resetq'), text: T('set.resetx'), yes: T('set.resetyes'), onYes: function () { Storage.reset(); UI.refreshTitle(); GA.Kit.toast(T('set.resetdone')); } }); break;
        case 'story-next': this.storyNext(); break;
        case 'story-skip': this.storyEnd(); break;
        case 'go': H.introGo(); break;
        case 'p-resume': H.resume(); break;
        case 'p-sound': H.toggleSound(); break;
        case 'p-booster': this.onBoosterClick(); break;
        case 'p-restart': this.confirmOr('Ulangi stage?', 'Progres stage hilang.', 'Ya, ulangi', H.restart, b); break;
        case 'p-quit': this.confirmOr('Ke menu?', 'Progres hilang.', 'Ya, ke menu', H.quit, b); break;
        case 'c-no': this.closeConfirm(true); break;
        case 'c-yes': { const fn = this._confirmFn; this.closeConfirm(false); if (fn) fn(); break; }
        case 'ov-next': case 'next-step': H.nextStep(); break;
        case 'ov-retry': H.restart(); break;
        case 'ov-menu': H.quit(); break;
        case 'ov-back': GA.Menu.openSteps(); break;
        case 'ov-chip': this.ovCard(+b.dataset.i); break;
        case 'again': H.again(); break;
        case 'to-menu': H.toMenu(); break;
        case 'quit': H.quit(); break;
        default: if (this.extra) this.extra(a, b);
      }
    },

    show: function (name) {
      if (pauseOpen && name !== 'pause') this.leavePause(false);
      if (name !== 'story') this.stopStoryAnim();
      Object.keys(screens).forEach(function (k) { screens[k].classList.toggle('show', k === name); });
      const s = screens[name]; if (s) s.scrollTop = 0;
    },
    hide: function () {
      if (pauseOpen) this.leavePause(false);
      this.stopStoryAnim();
      Object.keys(screens).forEach(function (k) { screens[k].classList.remove('show'); });
    },
    isOpen: function () { return Object.keys(screens).some(function (k) { return screens[k].classList.contains('show'); }); },
    syncSound: function () {
      const on = GA.Audio.isEnabled(), mu = GA.Audio.isMusic(), K = GA.Kit;
      [['sound', on], ['music', mu]].forEach(function (p) {
        root.querySelectorAll('[data-sync="' + p[0] + '"]').forEach(function (n) { n.classList.toggle('on', p[1]); n.setAttribute('aria-checked', p[1] ? 'true' : 'false'); });
      });
      const seg = document.getElementById('q-seg');
      if (seg) seg.innerHTML = K.segmented({ act: 'quality-set', label: T('set.quality'), items: ['auto', 'tinggi', 'sedang', 'rendah'].map(function (m) {
        return { id: m, label: T({ auto: 'set.auto', tinggi: 'set.high', sedang: 'set.mid', rendah: 'set.low' }[m]), on: GA.Quality.mode === m };
      }) });
      const sw = root.querySelector('.pz-toggle');
      if (sw) { sw.setAttribute('aria-checked', on ? 'true' : 'false'); document.getElementById('pz-state').textContent = on ? 'NYALA' : 'MATI'; }
    },

    refreshTitle: function () {
      const el2 = document.getElementById('t-res');
      if (el2) el2.innerHTML = GA.Kit.resbar({ eggs: GA.Gameplay.DEFAULTS.EGGS_MAX, stars: Storage.totalStars(), score: Storage.data.highScore });
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

    /** Placeholder: sambungkan ke iklan/reward sungguhan nanti. Belum ada SDK iklan apa pun. */
    onBoosterClick: function () { this.toast('Segera hadir'); },

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
      this.fitPause();
      document.getElementById('game').inert = true; hudBtn.inert = true;
      window.addEventListener('resize', this._onPauseResize);
      // naga tidur bernapas pelan (animasi DOM; permainan di belakang tetap beku)
      const t0 = performance.now(), self = this;
      cancelAnimationFrame(mascotRaf);
      const loop = function (now) { if (!pauseOpen) return; self.drawMascot((now - t0) / 1000); mascotRaf = requestAnimationFrame(loop); };
      mascotRaf = requestAnimationFrame(loop);
      document.getElementById('pz-first').focus({ preventScroll: true });
    },

    /** Tutup popup dan kembalikan fokus ke tombol jeda. */
    hidePause: function () { if (pauseOpen) { this.leavePause(true); screens.pause.classList.remove('show'); } },

    leavePause: function (focusBack) {
      pauseOpen = false; cancelAnimationFrame(mascotRaf);
      this.closeConfirm(false);
      clearTimeout(toastTimer); document.getElementById('pz-toast').classList.remove('show');
      window.removeEventListener('resize', this._onPauseResize);
      document.getElementById('game').inert = false; hudBtn.inert = false;
      if (focusBack) {
        const t = hudBtn.classList.contains('on') ? hudBtn : this._opener;
        if (t && t.focus) t.focus({ preventScroll: true });
      }
    },

    _onPauseResize: function () { UI.fitPause(); },

    /** Skalakan popup (didesain 350×640) agar pas di layar; discroll bila terlalu pendek. */
    fitPause: function () {
      const body = screens.pause.querySelector('.pz-body'), fit = document.getElementById('pz-fit');
      // layar pendek (HP landscape): banner booster disembunyikan, tinggi desain 530 dan skala minimum lebih kecil agar tombol Lanjut tetap terjangkau
      const short = body.clientHeight < 440, H = short ? 530 : 640, stage = document.getElementById('pz-stage');
      const s = Math.max(short ? 0.44 : 0.78, Math.min(1.3, (body.clientWidth - 32) / 350, (body.clientHeight - 36) / H));
      stage.classList.toggle('pz-compact', short);
      fit.style.width = (350 * s) + 'px'; fit.style.height = (H * s) + 'px';
      stage.style.setProperty('--pz-s', s);
    },

    confirmOpen: function () { return document.getElementById('pz-confirm').classList.contains('show'); },

    /** Konfirmasi ringan hanya jika progres akan hilang; selain itu langsung jalan. */
    confirmOr: function (title, text, yes, fn, opener) {
      if (!(H.hasProgress && H.hasProgress())) { fn(); return; }
      this._confirmFn = fn; this._confirmOpener = opener || null;
      document.getElementById('pzc-title').textContent = title;
      document.getElementById('pzc-text').textContent = text;
      document.querySelector('#pzc-yes span').textContent = yes;
      screens.pause.querySelector('.pz-top').inert = true; screens.pause.querySelector('.pz-body').inert = true;
      document.getElementById('pz-confirm').classList.add('show');
      document.getElementById('pzc-no').focus({ preventScroll: true });
    },
    closeConfirm: function (focusBack) {
      const c = document.getElementById('pz-confirm');
      if (!c.classList.contains('show')) return;
      c.classList.remove('show');
      screens.pause.querySelector('.pz-top').inert = false; screens.pause.querySelector('.pz-body').inert = false;
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
      hudBtn.style.left = (L.ox + (m.x - pad) * L.scale) + 'px'; hudBtn.style.top = (L.oy + (m.y - pad) * L.scale) + 'px';
      hudBtn.style.width = ((m.w + 2 * pad) * L.scale) + 'px'; hudBtn.style.height = ((m.h + 2 * pad) * L.scale) + 'px';
    },
    setHudButton: function (on) { hudBtn.classList.toggle('on', !!on); },

    /** Overview jawaban sebuah stage (menang maupun Game Over). r = hasil stageResult() (main.js) / Storage.lastResult.
     * opts: { next: tombol Lanjut, from: 'steps' = dibuka dari layar Pilih Stage (tombol kembali, tanpa Ulangi) }.
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
        '<div class="ov-btns">' + (opts.from === 'steps' ? K.button({ act: 'ov-back', icon: 'back', label: T('common.back'), variant: 'wood', size: 'small' })
          : K.button({ act: 'ov-retry', icon: 'restart', label: T('common.retry'), variant: 'secondary', size: 'small' }) +
            (opts.next ? K.button({ act: 'ov-next', icon: 'play', label: T('common.next'), size: 'big' }) : '') +
            K.button({ act: 'ov-menu', icon: 'home', label: T('common.menu'), variant: 'wood', size: 'small' })) + '</div>' });
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
        '<div class="k-row">' + K.button({ act: 'to-menu', icon: 'mix', label: T('menu.cat'), variant: 'secondary', size: 'small' }) + K.button({ act: 'quit', icon: 'home', label: T('common.menu'), variant: 'wood', size: 'small' }) + '</div>' });
      this.show('result');
    },


    /* ---------- HUD (canvas) ---------- */
    hudMetrics: function (L) { return GA.HUD.metrics(L); },

    hitPause: function (x, y, L) {
      const m = this.hudMetrics(L).pause, pad = 6;
      return x >= m.x - pad && x <= m.x + m.w + pad && y >= m.y - pad && y <= m.y + m.h + pad;
    },

    /** HUD canvas: lihat js/ui/hud.js */
    drawHUD: function (ctx, run, L, t) { GA.HUD.draw(ctx, run, L, t); }
  };

  /** Bunyi UI menurut jenis tindakan: pilih (kartu/slot/kesulitan), kembali, konfirmasi (mulai/lanjut), klik biasa. */
  function uiSound(a) {
    if (a === 'back' || a === 'm-back' || a === 's-back' || a === 'c-no' || a === 'story-skip' || a === 'ov-back') return 'back';
    if (a === 's-go') return 'confirm';
    if (a === 'm-cat' || a === 'm-slot' || a === 'm-diff' || a === 'm-same' || a === 'm-random' || a === 'sound' || a === 'music' || a === 'quality' || a === 'p-sound') return 'select';
    if (a === 'play' || a === 'm-start' || a === 'go' || a === 'next-step' || a === 'ov-next' || a === 'again' || a === 'c-yes' || a === 'p-resume') return 'confirm';
    return 'click';
  }

  UI.esc = esc; UI.el = el;
  GA.UI = UI;
})(window.GA = window.GA || {});
