/* ui.js — layar (DOM) dan HUD (digambar di canvas). Menu pilih kategori ada di menu.js, cerita di story.js.
 * Teks antarmuka: Bahasa Indonesia. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, Storage = GA.Storage, MT = GA.MathText;

  let root = null, H = null, countdownTimer = null, hudBtn = null, pauseOpen = false, toastTimer = 0, mascotRaf = 0;
  const screens = {};

  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function starsHTML(n, total) {
    let s = '';
    for (let i = 0; i < (total || 3); i++) s += '<span class="star' + (i < n ? ' on' : '') + '" style="--i:' + i + '">★</span>';
    return s;
  }

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

  /* ---------- template layar ---------- */
  const TPL = {
    title:
      '<section class="screen" id="s-title"><div class="menu-card">' +
      '<div class="logo"><span class="l1">Naga</span><span class="l2">Penjaga</span></div>' +
      '<p class="tagline">Semburkan bola api berangka, selamatkan telur-telur naga dari Penyihir Jahat!</p>' +
      '<button class="btn btn-primary btn-big" data-act="play">▶ Mulai Petualangan</button>' +
      '<div class="row"><button class="btn btn-small" data-act="howto">❓ Cara Bermain</button>' +
      '<button class="btn btn-small" data-act="settings">⚙️ Pengaturan</button></div>' +
      '<p class="stat">Skor tertinggi <b id="t-hi">0</b> · ★ <b id="t-stars">0</b></p>' +
      '</div></section>',

    settings:
      '<section class="screen dim" id="s-settings"><div class="panel">' +
      '<h2>Pengaturan</h2>' +
      '<button class="btn" data-act="sound"><span data-sound-label></span></button>' +
      '<button class="btn" data-act="music"><span data-music-label></span></button>' +
      '<button class="btn" data-act="replay-story">📖 Lihat Cerita Lagi</button>' +
      '<button class="btn btn-danger" data-act="reset" id="btn-reset">Hapus Semua Progres</button>' +
      '<button class="btn btn-primary" data-act="back">← Kembali</button>' +
      '</div></section>',

    howto:
      '<section class="screen scroll dim" id="s-howto"><div class="panel wide"><h2>Cara Bermain</h2>' +
      '<ul class="howto">' +
      '<li><b>🐉 Tujuan</b> Soal tampil di atas layar. Semburkan bola api ke <b>bola sihir yang berisi jawaban yang benar</b>. Ada 3 step; step terakhir melawan Penyihir Jahat.</li>' +
      '<li><b>👆 Membidik</b> Mouse: arahkan lalu klik. Layar sentuh: geser untuk membidik, lepas untuk menembak. Papan ketik: ← → membidik, Spasi menembak, Q menukar, P jeda.</li>' +
      '<li><b>🔄 Tukar bola api</b> Ketuk naga (atau bola kecil di dadanya) untuk menukar. Angka <b>×1 ×2 ×3</b> adalah pengali skor.</li>' +
      '<li><b>🥚 Telur</b> Kamu punya 5 telur. Satu telur hilang jika jawaban salah, peluru kena rintangan, atau bola sihir sampai ke sarang. Telur emas menambah satu telur!</li>' +
      '<li class="legend"><span data-icon="curse"></span><span><b>Bola kutukan</b> jangan ditembak!</span></li>' +
      '<li class="legend"><span data-icon="frost"></span><span><b>Bola beku</b> memperlambat rantai.</span></li>' +
      '<li class="legend"><span data-icon="egg"></span><span><b>Telur emas</b> menyembuhkan satu telur.</span></li>' +
      '<li><b>🌿 Rintangan</b> Step 1: akar berduri, kabut sihir. Step 2: kristal pemantul, lahar &amp; petir, kelelawar penukar angka, dan naga bisa beku sejenak.</li>' +
      '<li><b>🧙 Boss</b> Penyihir Jahat punya 3 fase dengan mantra kabut, es, dan tukar angka. Fase 3 mencampur semua kategori dan ada batas waktu.</li>' +
      '</ul><button class="btn btn-primary" data-act="back">← Kembali</button></div></section>',

    story:
      '<section class="screen dim scroll" id="s-story"><div class="panel story" role="dialog" aria-modal="true" aria-labelledby="st-title">' +
      '<canvas id="st-art" class="st-art" width="480" height="300" aria-hidden="true"></canvas>' +
      '<h2 id="st-title"></h2><p class="st-text" id="st-text"></p>' +
      '<div class="st-dots" id="st-dots" aria-hidden="true"></div>' +
      '<div class="row"><button class="btn btn-small" data-act="story-skip" id="st-skip">Lewati</button>' +
      '<button class="btn btn-primary" data-act="story-next" id="st-next">Lanjut ▶</button></div>' +
      '</div></section>',

    intro: '<section class="screen dim scroll" id="s-intro"><div class="panel intro" id="intro-card"></div></section>',

    pause: pauseHTML(),

    result: '<section class="screen dim scroll" id="s-result"><div class="panel" id="result-card"></div></section>'
  };

  /* ---------- API UI (DOM) ---------- */
  const UI = {
    init: function (handlers) {
      H = handlers;
      root = document.getElementById('ui');
      Object.keys(TPL).forEach(function (k) { const n = el(TPL[k]); root.appendChild(n); screens[k] = n; });
      root.appendChild(el('<div id="countdown" class="countdown" aria-live="assertive"></div>'));
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
        GA.Audio.unlock(); GA.Audio.play('click');
        UI.act(b.getAttribute('data-act'), b);
      });
      // ikon bola khusus di halaman "Cara Bermain"
      root.querySelectorAll('[data-icon]').forEach(function (n) { n.appendChild(UI.specialIcon(n.getAttribute('data-icon'), 44)); });
      this.syncSound();
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
        case 'settings': this.resetArm(false); this.show('settings'); break;
        case 'howto': this.show('howto'); break;
        case 'back': this.refreshTitle(); this.show('title'); break;
        case 'sound': H.toggleSound(); break;
        case 'music': H.toggleMusic(); break;
        case 'replay-story': H.replayStory(); break;
        case 'reset':
          if (!b.dataset.armed) { this.resetArm(true); } else { Storage.reset(); this.resetArm(false); this.refreshTitle(); b.textContent = 'Progres dihapus ✓'; }
          break;
        case 'story-next': this.storyNext(); break;
        case 'story-skip': this.storyEnd(); break;
        case 'go': H.introGo(); break;
        case 'p-resume': H.resume(); break;
        case 'p-sound': H.toggleSound(); break;
        case 'p-booster': this.onBoosterClick(); break;
        case 'p-restart': this.confirmOr('Ulangi step ini?', 'Progres step ini akan hilang dan kamu mulai lagi dari awal step.', 'Ya, ulangi', H.restart, b); break;
        case 'p-quit': this.confirmOr('Kembali ke menu?', 'Progres petualangan ini akan hilang.', 'Ya, ke menu', H.quit, b); break;
        case 'c-no': this.closeConfirm(true); break;
        case 'c-yes': { const fn = this._confirmFn; this.closeConfirm(false); if (fn) fn(); break; }
        case 'next-step': H.nextStep(); break;
        case 'again': H.again(); break;
        case 'to-menu': H.toMenu(); break;
        case 'quit': H.quit(); break;
        default: if (this.extra) this.extra(a, b);
      }
    },

    resetArm: function (on) {
      const b = document.getElementById('btn-reset'); if (!b) return;
      if (on) { b.dataset.armed = '1'; b.textContent = 'Yakin? Ketuk lagi untuk menghapus'; }
      else { delete b.dataset.armed; b.textContent = 'Hapus Semua Progres'; }
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
      const on = GA.Audio.isEnabled(), mu = GA.Audio.isMusic();
      root.querySelectorAll('[data-sound-label]').forEach(function (n) { n.textContent = on ? '🔊 Efek Suara: Nyala' : '🔇 Efek Suara: Mati'; });
      root.querySelectorAll('[data-music-label]').forEach(function (n) { n.textContent = mu ? '🎵 Musik: Nyala' : '🎵 Musik: Mati'; });
      const sw = root.querySelector('.pz-toggle');
      if (sw) { sw.setAttribute('aria-checked', on ? 'true' : 'false'); document.getElementById('pz-state').textContent = on ? 'NYALA' : 'MATI'; }
    },

    refreshTitle: function () {
      document.getElementById('t-hi').textContent = Storage.data.highScore;
      document.getElementById('t-stars').textContent = Storage.totalStars();
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
      document.getElementById('st-next').textContent = s.i >= s.list.length - 1 ? 'Mulai ▶' : 'Lanjut ▶';
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

    /** Layar pembuka step. info: { tag, place, story, catName, catIcon, exampleHtml, rangeText, notes[], specials[], diffName } */
    showIntro: function (info) {
      const sp = info.specials || [];
      const legend = { curse: ['Bola kutukan', 'jangan ditembak!'], frost: ['Bola beku', 'rantai melambat'], egg: ['Telur emas', '+1 telur'] };
      let lg = '';
      sp.forEach(function (k) { if (legend[k]) lg += '<li><span data-icon="' + k + '"></span><span><b>' + legend[k][0] + '</b> ' + legend[k][1] + '</span></li>'; });
      const notes = (info.notes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
      const card = document.getElementById('intro-card');
      card.innerHTML =
        '<p class="eyebrow">' + esc(info.tag) + ' · ' + esc(info.diffName) + '</p>' +
        '<h2>' + esc(info.place) + '</h2>' +
        '<p class="hintline">' + esc(info.story) + '</p>' +
        '<p class="chip">' + esc(info.catIcon) + ' ' + esc(info.catName) + '</p>' +
        '<div class="example"><span class="ex-label">Contoh soal</span><span class="ex-text">' + info.exampleHtml + '</span></div>' +
        '<p class="hintline">💡 ' + esc(info.rangeText) + '.</p>' +
        (notes ? '<ul class="obst-list">' + notes + '</ul>' : '') +
        (lg ? '<ul class="legend-list">' + lg + '</ul>' : '') +
        '<p class="startnote">🟣 <b>MUNCUL</b>: bola sihir masuk di sini · 🥚 <b>SARANG</b>: jangan sampai bola sampai ke sini!</p>' +
        '<button class="btn btn-primary btn-big" data-act="go">Mulai! ▶</button>';
      card.querySelectorAll('[data-icon]').forEach(function (n) { n.appendChild(UI.specialIcon(n.getAttribute('data-icon'), 34)); });
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
      const s = Math.max(0.78, Math.min(1.3, (body.clientWidth - 32) / 350, (body.clientHeight - 36) / 640));
      fit.style.width = (350 * s) + 'px'; fit.style.height = (640 * s) + 'px';
      document.getElementById('pz-stage').style.setProperty('--pz-s', s);
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

    /** Selesai satu step (bukan terakhir). r: { title, subtitle, stars, score, detail, bonus, eggs, maxEggs, nextLabel } */
    showStepDone: function (r) {
      document.getElementById('result-card').innerHTML =
        '<p class="eyebrow">' + esc(r.eyebrow || '') + '</p>' +
        '<h2 class="good">' + esc(r.title) + '</h2>' +
        (r.subtitle ? '<p class="stat">' + esc(r.subtitle) + '</p>' : '') +
        '<div class="stars">' + starsHTML(r.stars) + '</div>' +
        '<p class="big-score">Skor <b>' + r.score + '</b></p>' +
        '<p class="eggrow" aria-label="Telur tersisa ' + r.eggs + ' dari ' + r.maxEggs + '">' + eggsHTML(r.eggs, r.maxEggs) + (r.bonus ? ' <b class="good">+1 telur!</b>' : '') + '</p>' +
        '<p class="stat">' + esc(r.detail || '') + '</p>' +
        '<button class="btn btn-primary btn-big" data-act="next-step">' + esc(r.nextLabel || 'Lanjut') + ' ▶</button>' +
        '<button class="btn btn-small" data-act="quit">🏠 Menu Utama</button>';
      this.show('result');
    },

    /** Hasil akhir. r: { win, title, subtitle, steps:[{name,stars}], score, newBest, high, eggs, maxEggs, detail } */
    showResult: function (r) {
      const steps = (r.steps || []).map(function (s) { return '<li><span>' + esc(s.name) + '</span><span class="stars sm">' + starsHTML(s.stars) + '</span></li>'; }).join('');
      document.getElementById('result-card').innerHTML =
        '<h2 class="' + (r.win ? 'good' : 'bad') + '">' + esc(r.title) + '</h2>' +
        (r.subtitle ? '<p class="stat">' + esc(r.subtitle) + '</p>' : '') +
        (steps ? '<ul class="step-stars">' + steps + '</ul>' : '') +
        '<p class="big-score">Skor <b>' + r.score + '</b></p>' +
        '<p class="stat">Skor tertinggi <b>' + r.high + '</b>' + (r.newBest ? ' · <b class="good">Rekor baru!</b>' : '') + '</p>' +
        '<p class="eggrow" aria-label="Telur tersisa ' + r.eggs + ' dari ' + r.maxEggs + '">' + eggsHTML(r.eggs, r.maxEggs) + '</p>' +
        '<p class="stat">' + esc(r.detail || '') + '</p>' +
        '<button class="btn btn-primary btn-big" data-act="again">↻ Main Lagi</button>' +
        '<div class="row"><button class="btn btn-small" data-act="to-menu">🎯 Ganti Kategori</button><button class="btn btn-small" data-act="quit">🏠 Menu Utama</button></div>';
      this.show('result');
    },

    /* ---------- HUD (canvas) ---------- */
    hudMetrics: function (L) {
      const btn = Math.min(76, Math.max(56, 48 / L.scale));
      if (L.portrait) return { h: 150, btn: btn, pause: { x: L.W - 12 - btn, y: 8, w: btn, h: btn } };
      return { h: 84, btn: btn, pause: { x: L.W - 12 - btn, y: (84 - btn) / 2, w: btn, h: btn } };
    },

    hitPause: function (x, y, L) {
      const m = this.hudMetrics(L).pause, pad = 6;
      return x >= m.x - pad && x <= m.x + m.w + pad && y >= m.y - pad && y <= m.y + m.h + pad;
    },

    /** Telur di HUD: s = lebar kira-kira; filled = ada, kosong = redup dengan retakan. */
    drawEggIcon: function (ctx, x, y, s, filled, t, tint) {
      ctx.save(); ctx.translate(x, y);
      if (!filled) ctx.globalAlpha = 0.3;
      const w = s * 0.34, h = s * 0.46;
      const g = ctx.createRadialGradient(-w * 0.3, -h * 0.35, 1, 0, 0, h * 1.1);
      if (filled) { g.addColorStop(0, '#fff'); g.addColorStop(0.4, tint[0]); g.addColorStop(1, tint[1]); } else { g.addColorStop(0, '#d9d2c4'); g.addColorStop(1, '#8a8478'); }
      ctx.fillStyle = g; ctx.strokeStyle = filled ? '#fff' : '#cfc8ba'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      GA.Chain.eggPath(ctx, 0, 0, w, h); ctx.fill(); ctx.stroke();
      if (filled) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-w * 0.3, -h * 0.35, w * 0.16, h * 0.22, -0.4, 0, 6.283); ctx.fill(); }
      ctx.restore();
    },

    fit: function (ctx, text, maxW, size, weight) {
      let s = size;
      ctx.font = (weight || '800') + ' ' + s + 'px ' + Theme.fonts.ui;
      while (ctx.measureText(text).width > maxW && s > 12) { s -= 2; ctx.font = (weight || '800') + ' ' + s + 'px ' + Theme.fonts.ui; }
      return s;
    },

    /** Gambar HUD. run: lihat main.js. L: layout. */
    drawHUD: function (ctx, run, L, t) {
      const m = this.hudMetrics(L), W = L.W, por = L.portrait;
      // panel (batu malam kebiruan, sesuai tema fantasi)
      const g = ctx.createLinearGradient(0, 0, 0, m.h);
      g.addColorStop(0, '#2a1d5e'); g.addColorStop(1, '#1a1240');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, m.h);
      ctx.fillStyle = 'rgba(255,214,140,0.35)'; ctx.fillRect(0, m.h - 3, W, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, m.h, W, 5);

      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      // skor
      ctx.fillStyle = '#c9b6ff'; ctx.font = '700 13px ' + Theme.fonts.ui; ctx.fillText('SKOR', 14, por ? 22 : 24);
      ctx.fillStyle = '#ffd23f'; ctx.font = '800 ' + (por ? 30 : 32) + 'px ' + Theme.fonts.ui;
      ctx.fillText(String(Math.round(run.scoreShown)), 14, por ? 54 : 56);
      // progres step: tiga titik + nama
      // potret: sejajar dengan label SKOR (panel soal ada di bawahnya); lanskap: di bawah skor
      const dy = por ? 17 : 72, dx0 = por ? 64 : 20;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < run.stepNo - 1 ? '#7ee26f' : (i === run.stepNo - 1 ? '#ffd23f' : 'rgba(255,255,255,0.25)');
        ctx.beginPath(); ctx.arc(dx0 + i * 16, dy, 5, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = '#e6dcff'; ctx.font = '700 13px ' + Theme.fonts.ui; ctx.fillText(run.stepNo + '/3', dx0 + 3 * 16 - 4, dy + 5);
      // tombol jeda
      const p = m.pause;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; GA.Path.roundRect(ctx, p.x, p.y + 3, p.w, p.h, 16); ctx.fill();
      const bg = ctx.createLinearGradient(0, p.y, 0, p.y + p.h); bg.addColorStop(0, '#ffd23f'); bg.addColorStop(1, '#ff9a1f');
      ctx.fillStyle = bg; GA.Path.roundRect(ctx, p.x, p.y, p.w, p.h, 16); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#1b2a49';
      const bw = p.w * 0.14, bh = p.h * 0.42, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      GA.Path.roundRect(ctx, cx - bw * 1.6, cy - bh / 2, bw, bh, 3); ctx.fill();
      GA.Path.roundRect(ctx, cx + bw * 0.6, cy - bh / 2, bw, bh, 3); ctx.fill();
      // telur (nyawa)
      const es = por ? 34 : 38, lx1 = p.x - 12, n = run.maxLives, TINTS = [['#fff3c4', '#f2c75c'], ['#ffd6ea', '#e88ab8'], ['#d2f3ff', '#6cc3ea'], ['#e2ffd2', '#7dcf5a'], ['#e8d9ff', '#a98af0'], ['#ffe1c4', '#f08a4a']];
      for (let i = 0; i < n; i++) {
        const x = lx1 - (n - i - 0.5) * (es * 0.72) + es * 0.2;
        const lost = run.lifeLostT > 0 && i === run.lives; // telur yang baru hilang bergetar
        this.drawEggIcon(ctx, x + (lost ? Math.sin(t * 60) * 3 : 0), (por ? 32 : 40) + (lost ? -4 : 0), es, i < run.lives, t, TINTS[i % TINTS.length]);
      }

      // panel soal
      let qx, qy, qw, qh;
      if (por) { qx = 12; qy = 74; qw = W - 24; qh = 60; } else { qx = 190; qy = 6; qw = W - 190 - 300; qh = 62; }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; GA.Path.roundRect(ctx, qx, qy + 3, qw, qh, 18); ctx.fill();
      ctx.fillStyle = '#fffaf0'; GA.Path.roundRect(ctx, qx, qy, qw, qh, 18); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
      const q = run.q;
      if (q) {
        const pop = run.qPop > 0 ? 1 + run.qPop * 0.3 : 1;
        const hasNote = !!q.note, inner = qh - (hasNote ? 22 : 12);
        ctx.save(); ctx.translate(qx + qw / 2, qy + qh / 2 + (hasNote ? -7 : 1)); ctx.scale(pop, pop);
        const size = MT.fit(ctx, q.text, qw - 30, inner, por ? 44 : 42);
        MT.draw(ctx, q.text, 0, 0, size, '#1b2a49', null);
        ctx.restore();
        if (hasNote) { ctx.font = '700 14px ' + Theme.fonts.ui; ctx.fillStyle = '#c2410c'; ctx.textAlign = 'center'; ctx.fillText(q.note, qx + qw / 2, qy + qh - 9); }
      }
      // batas waktu soal
      if (run.qTimeMax) {
        const f = Math.max(0, run.qTime / run.qTimeMax), tw = qw - 28;
        ctx.fillStyle = 'rgba(27,42,73,0.15)'; GA.Path.roundRect(ctx, qx + 14, qy + qh - 9, tw, 6, 3); ctx.fill();
        ctx.fillStyle = f > 0.5 ? '#2fbf71' : (f > 0.25 ? '#ffb02e' : '#ff4d5e');
        GA.Path.roundRect(ctx, qx + 14, qy + qh - 9, Math.max(6, tw * f), 6, 3); ctx.fill();
      }
      // progres step / boss
      const py = qy + qh + 6, pw = qw - 40;
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; GA.Path.roundRect(ctx, qx + 20, py, pw, 8, 4); ctx.fill();
      const pf = Math.min(1, run.progress);
      if (pf > 0) { ctx.fillStyle = run.boss ? '#c9a0ff' : '#7ee26f'; GA.Path.roundRect(ctx, qx + 20, py, Math.max(8, pw * pf), 8, 4); ctx.fill(); }

      // di bawah HUD: kombo, status, umpan balik
      const by = m.h + 12;
      if (run.combo >= 2) {
        const k = 1 + (run.comboPulse > 0 ? run.comboPulse * 0.6 : 0);
        ctx.save(); ctx.translate(16, by + 18); ctx.scale(k, k);
        ctx.font = '800 22px ' + Theme.fonts.ui; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(20,10,50,0.9)'; ctx.lineJoin = 'round';
        const ct = '🔥 KOMBO ×' + run.combo; ctx.strokeText(ct, 0, 0); ctx.fillStyle = '#ffd23f'; ctx.fillText(ct, 0, 0); ctx.restore();
      }
      let sy = by + 18;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      // potret: chip di tengah (sisi kiri/kanan ditempati label MUNCUL & SARANG); lanskap: di kanan
      const chip = function (txt, col) {
        ctx.font = '800 16px ' + Theme.fonts.ui; const w = ctx.measureText(txt).width + 20, x1 = por ? W / 2 + w / 2 : W - 14;
        ctx.fillStyle = col; GA.Path.roundRect(ctx, x1 - w, sy - 14, w, 28, 14); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillText(txt, x1 - 10, sy + 1); sy += 34;
      };
      if (run.slowT > 0) chip('❄ Lambat ' + Math.ceil(run.slowT) + 'd', '#2a9ad8');
      if (run.shooter && run.shooter.frozen) chip('🧊 Naga beku', '#4a7ad8');

      if (run.feedback && run.feedback.t > 0) {
        const f = run.feedback, a = Math.min(1, f.t * 3);
        ctx.globalAlpha = a;
        const sz = 26;
        let w = MT.measure(ctx, f.text, sz).w;
        ctx.font = '700 16px ' + Theme.fonts.ui;
        if (f.hint) w = Math.max(w, ctx.measureText(f.hint).width);
        w = Math.min(W - 24, w + 40);
        const h = f.hint ? 68 : 46, fy = por ? m.h + 56 : m.h + 12;
        const fx = W / 2 - w / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; GA.Path.roundRect(ctx, fx, fy + 3, w, h, 16); ctx.fill();
        ctx.fillStyle = f.good ? '#1f9d5c' : '#d92d44'; GA.Path.roundRect(ctx, fx, fy, w, h, 16); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        const fs = MT.fit(ctx, f.text, w - 24, f.hint ? 34 : h - 12, sz);
        MT.draw(ctx, f.text, W / 2, fy + (f.hint ? 21 : h / 2), fs, '#fff', null);
        if (f.hint) { ctx.font = '700 15px ' + Theme.fonts.ui; ctx.fillStyle = '#ffe9ec'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(f.hint, W / 2, fy + 48, w - 20); }
        ctx.globalAlpha = 1;
      }
    }
  };

  /** Deretan telur (HTML kecil) untuk layar hasil. */
  function eggsHTML(have, max) {
    let s = '';
    for (let i = 0; i < max; i++) s += '<span class="egg' + (i < have ? ' on' : '') + '" aria-hidden="true"></span>';
    return s;
  }

  UI.starsHTML = starsHTML; UI.esc = esc; UI.el = el;
  GA.UI = UI;
})(window.GA = window.GA || {});
