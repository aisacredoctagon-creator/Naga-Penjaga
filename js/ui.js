/* ui.js — menu & overlay (DOM) dan HUD (digambar di canvas).
 * Teks antarmuka: Bahasa Indonesia. */
(function (GA) {
  'use strict';
  const Theme = GA.Theme, Storage = GA.Storage;

  let root = null, H = null, countdownTimer = null, hudBtn = null, pauseOpen = false, toastTimer = 0;
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
    ['Tertidur menghitung domba?', 'Saatnya kembali bermain!'],
    ['Capek berhitung?', 'Tarik napas, lalu lanjutkan!'],
    ['Kodok sedang istirahat.', 'Siap lanjut berpetualang?'],
    ['Angka-angkanya menunggu, lho!', 'Yuk, lanjutkan permainan!']
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
        '<div class="pz-mascot"><img src="assets/frog-sleeping.jpg" alt="Kodok maskot sedang tidur nyenyak" width="136" height="136"></div>' +
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
      '<div class="logo"><span class="l1">Zuma</span><span class="l2">Matematika</span></div>' +
      '<p class="tagline">Tembak bola yang berisi jawaban yang benar!</p>' +
      '<button class="btn btn-primary btn-big" data-act="play">▶ Main</button>' +
      '<button class="btn" data-act="levels">🗺️ Pilih Level</button>' +
      '<div class="row"><button class="btn btn-small" data-act="settings">⚙️ Pengaturan</button>' +
      '<button class="btn btn-small" data-act="howto">❓ Cara Bermain</button></div>' +
      '<p class="stat">Skor tertinggi <b id="t-hi">0</b> · ★ <b id="t-stars">0</b></p>' +
      '</div></section>',

    levels:
      '<section class="screen scroll dim" id="s-levels"><div class="panel wide">' +
      '<div class="panel-head"><button class="btn btn-small" data-act="back">← Kembali</button><h2>Pilih Level</h2><span class="stat">★ <b id="l-stars">0</b></span></div>' +
      '<div id="level-grid"></div></div></section>',

    settings:
      '<section class="screen dim" id="s-settings"><div class="panel">' +
      '<h2>Pengaturan</h2>' +
      '<button class="btn" data-act="sound"><span data-sound-label></span></button>' +
      '<button class="btn btn-danger" data-act="reset" id="btn-reset">Hapus Semua Progres</button>' +
      '<button class="btn btn-primary" data-act="back">← Kembali</button>' +
      '</div></section>',

    howto:
      '<section class="screen scroll dim" id="s-howto"><div class="panel wide"><h2>Cara Bermain</h2>' +
      '<ul class="howto">' +
      '<li><b>🎯 Tujuan</b> Soal tampil di atas layar. Tembak bola yang berisi <b>jawaban yang benar</b>.</li>' +
      '<li><b>👆 Membidik</b> Mouse: arahkan lalu klik. Layar sentuh: geser untuk membidik, lepas untuk menembak.</li>' +
      '<li><b>🔄 Tukar bola</b> Ketuk katak (atau bola kecil di sampingnya) untuk menukar. Angka <b>×1 ×2 ×3</b> pada bola tembak adalah pengali skor.</li>' +
      '<li><b>♟️ Nyawa</b> Ada 5 pion. Nyawa berkurang jika jawaban salah, peluru mengenai rintangan, atau rantai masuk lubang <b>FINISH</b>.</li>' +
      '<li><b>🪨 Rintangan</b> Batu menghalangi peluru; rintangan bergerak harus ditunggu waktunya.</li>' +
      '<li class="legend"><span data-icon="bomb"></span><span><b>Bom</b> jangan ditembak!</span></li>' +
      '<li class="legend"><span data-icon="ice"></span><span><b>Es</b> memperlambat rantai.</span></li>' +
      '<li class="legend"><span data-icon="bolt"></span><span><b>Petir</b> mempercepat rantai, hindari!</span></li>' +
      '<li class="legend"><span data-icon="life"></span><span><b>Hati</b> menambah satu nyawa.</span></li>' +
      '<li><b>👑 Boss</b> Setiap level ditutup oleh Raja Angka. Jawab benar untuk melukainya!</li>' +
      '<li><b>⌨️ Papan ketik</b> ← → membidik, Spasi menembak, Q menukar, P jeda.</li>' +
      '</ul><button class="btn btn-primary" data-act="back">← Kembali</button></div></section>',

    intro: '<section class="screen dim scroll" id="s-intro"><div class="panel intro" id="intro-card"></div></section>',

    pause: pauseHTML(),

    over: '<section class="screen dim" id="s-over"><div class="panel" id="over-card"></div></section>',
    clear: '<section class="screen dim scroll" id="s-clear"><div class="panel" id="clear-card"></div></section>'
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

    specialIcon: function (kind, size) {
      const c = document.createElement('canvas'), d = window.devicePixelRatio || 1;
      c.width = c.height = size * d; c.style.width = c.style.height = size + 'px';
      const g = c.getContext('2d'); g.scale(d, d);
      GA.Chain.drawSpecial(g, kind, size / 2, size / 2 + 1, size / 2 - 5, 0);
      return c;
    },

    act: function (a, b) {
      switch (a) {
        case 'play': { const o = GA.Levels.firstOpen(); H.stage(o.l, o.s); break; }
        case 'levels': this.buildLevels(); this.show('levels'); break;
        case 'settings': this.resetArm(false); this.show('settings'); break;
        case 'howto': this.show('howto'); break;
        case 'back': this.refreshTitle(); this.show('title'); break;
        case 'sound': H.toggleSound(); break;
        case 'reset':
          if (!b.dataset.armed) { this.resetArm(true); } else { Storage.reset(); this.resetArm(false); this.refreshTitle(); b.textContent = 'Progres dihapus ✓'; }
          break;
        case 'stage': H.stage(+b.dataset.l, +b.dataset.s); break;
        case 'go': H.introGo(); break;
        case 'p-resume': H.resume(); break;
        case 'p-sound': H.toggleSound(); break;
        case 'p-booster': this.onBoosterClick(); break;
        case 'p-restart': this.confirmOr('Ulangi stage?', 'Progres stage ini akan hilang dan kamu mulai dari awal.', 'Ya, ulangi', H.restart, b); break;
        case 'p-quit': this.confirmOr('Kembali ke menu?', 'Progres stage ini akan hilang.', 'Ya, ke menu', H.quit, b); break;
        case 'c-no': this.closeConfirm(true); break;
        case 'c-yes': { const fn = this._confirmFn; this.closeConfirm(false); if (fn) fn(); break; }
        case 'restart': H.restart(); break;
        case 'quit': H.quit(); break;
        case 'next': H.next(); break;
      }
    },

    resetArm: function (on) {
      const b = document.getElementById('btn-reset'); if (!b) return;
      if (on) { b.dataset.armed = '1'; b.textContent = 'Yakin? Ketuk lagi untuk menghapus'; }
      else { delete b.dataset.armed; b.textContent = 'Hapus Semua Progres'; }
    },

    show: function (name) {
      if (pauseOpen && name !== 'pause') this.leavePause(false);
      Object.keys(screens).forEach(function (k) { screens[k].classList.toggle('show', k === name); });
      const s = screens[name]; if (s) s.scrollTop = 0;
    },
    hide: function () {
      if (pauseOpen) this.leavePause(false);
      Object.keys(screens).forEach(function (k) { screens[k].classList.remove('show'); });
    },
    isOpen: function () { return Object.keys(screens).some(function (k) { return screens[k].classList.contains('show'); }); },

    syncSound: function () {
      const on = GA.Audio.isEnabled();
      root.querySelectorAll('[data-sound-label]').forEach(function (n) { n.textContent = on ? '🔊 Suara: Nyala' : '🔇 Suara: Mati'; });
      const sw = root.querySelector('.pz-toggle');
      if (sw) { sw.setAttribute('aria-checked', on ? 'true' : 'false'); document.getElementById('pz-state').textContent = on ? 'NYALA' : 'MATI'; }
    },

    refreshTitle: function () {
      document.getElementById('t-hi').textContent = Storage.data.highScore;
      document.getElementById('t-stars').textContent = Storage.totalStars();
    },

    buildLevels: function () {
      const grid = document.getElementById('level-grid');
      document.getElementById('l-stars').textContent = Storage.totalStars();
      let html = '';
      GA.Levels.list.forEach(function (lv, l) {
        const n = GA.Levels.stageCount(l);
        let btns = '';
        for (let s = 0; s < n; s++) {
          const id = GA.Levels.id(l, s), st = Storage.stage(id), open = GA.Levels.isUnlocked(l, s), boss = s === n - 1;
          btns += '<button class="stage-btn' + (boss ? ' boss' : '') + (st.done ? ' done' : '') + '" data-act="stage" data-l="' + l + '" data-s="' + s + '"' + (open ? '' : ' disabled') +
            ' aria-label="' + (boss ? 'Boss level ' : 'Level ') + (l + 1) + (boss ? '' : ' stage ' + (s + 1)) + (open ? '' : ' (terkunci)') + '">' +
            '<span class="sb-main">' + (open ? (boss ? '👑' : (s + 1)) : '🔒') + '</span>' +
            '<span class="sb-stars">' + starsHTML(st.stars) + '</span></button>';
        }
        html += '<div class="level-card" style="--c:' + lv.color + '"><div class="lc-head"><span class="lc-num">' + (l + 1) + '</span><div><h3>' + esc(lv.name) + '</h3><p>' + esc(lv.subtitle) + '</p></div></div><div class="stage-row">' + btns + '</div></div>';
      });
      grid.innerHTML = html;
    },

    /** Layar pembuka stage. info: { heading, name, label, example, rangeText, specials[], boss } */
    showIntro: function (info) {
      const sp = info.specials || [];
      const legend = { bomb: ['Bom', 'jangan ditembak!'], ice: ['Es', 'rantai melambat'], bolt: ['Petir', 'rantai ngebut, hindari!'], life: ['Hati', '+1 nyawa'] };
      let lg = '';
      sp.forEach(function (k) { lg += '<li><span data-icon="' + k + '"></span><span><b>' + legend[k][0] + '</b> ' + legend[k][1] + '</span></li>'; });
      const card = document.getElementById('intro-card');
      card.innerHTML =
        '<p class="eyebrow">' + esc(info.heading) + '</p>' +
        '<h2>' + esc(info.name) + '</h2>' +
        '<p class="chip">Materi: ' + esc(info.label) + '</p>' +
        '<div class="example"><span class="ex-label">Contoh soal</span><span class="ex-text">' + esc(info.example) + '</span></div>' +
        '<p class="hintline">💡 ' + esc(info.rangeText) + '. ' + esc(info.tip || '') + '</p>' +
        (info.extra ? '<p class="hintline">' + esc(info.extra) + '</p>' : '') +
        (lg ? '<ul class="legend-list">' + lg + '</ul>' : '') +
        '<p class="startnote">🟢 <b>START</b>: bola muncul di sini · 🏁 <b>FINISH</b>: lubang akhir, jangan sampai kena!</p>' +
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
      document.getElementById('pz-first').focus({ preventScroll: true });
    },

    /** Tutup popup dan kembalikan fokus ke tombol jeda. */
    hidePause: function () { if (pauseOpen) { this.leavePause(true); screens.pause.classList.remove('show'); } },

    leavePause: function (focusBack) {
      pauseOpen = false;
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

    /** Konfirmasi ringan hanya jika progres stage akan hilang; selain itu langsung jalan. */
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

    showOver: function (r) {
      document.getElementById('over-card').innerHTML =
        '<h2 class="bad">Yah, nyawa habis!</h2>' +
        '<p class="big-score">Skor <b>' + r.score + '</b></p>' +
        '<p class="stat">' + esc(r.reason || '') + '</p>' +
        '<button class="btn btn-primary btn-big" data-act="restart">↻ Coba Lagi</button>' +
        '<button class="btn" data-act="quit">🏠 Menu Utama</button>';
      this.show('over');
    },

    /** r: { title, subtitle, stars, score, accuracy, newBest, canNext, nextLabel, final } */
    showClear: function (r) {
      document.getElementById('clear-card').innerHTML =
        '<p class="eyebrow">' + esc(r.eyebrow || '') + '</p>' +
        '<h2 class="good">' + esc(r.title) + '</h2>' +
        (r.subtitle ? '<p class="stat">' + esc(r.subtitle) + '</p>' : '') +
        '<div class="stars">' + starsHTML(r.stars) + '</div>' +
        '<p class="big-score">Skor <b>' + r.score + '</b></p>' +
        '<p class="stat">' + esc(r.detail || '') + (r.newBest ? ' · <b class="good">Rekor baru!</b>' : '') + '</p>' +
        (r.canNext ? '<button class="btn btn-primary btn-big" data-act="next">' + esc(r.nextLabel || 'Lanjut') + ' ▶</button>' : '') +
        '<button class="btn" data-act="restart">↻ Ulangi</button>' +
        '<button class="btn" data-act="quit">🏠 Menu Utama</button>';
      this.show('clear');
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

    drawPawn: function (ctx, x, y, s, filled, t) {
      ctx.save(); ctx.translate(x, y);
      if (!filled) ctx.globalAlpha = 0.35;
      const g = ctx.createLinearGradient(-s * 0.4, -s * 0.6, s * 0.4, s * 0.5);
      if (filled) { g.addColorStop(0, '#ff9ab0'); g.addColorStop(1, '#e11d48'); } else { g.addColorStop(0, '#b7c2dd'); g.addColorStop(1, '#6b7a9c'); }
      ctx.fillStyle = g; ctx.strokeStyle = filled ? '#fff' : '#cfd8ee'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.arc(0, -s * 0.52, s * 0.27, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.15, -s * 0.28); ctx.lineTo(s * 0.15, -s * 0.28); ctx.lineTo(s * 0.34, s * 0.3); ctx.lineTo(-s * 0.34, s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
      GA.Path.roundRect(ctx, -s * 0.44, s * 0.28, s * 0.88, s * 0.2, s * 0.08); ctx.fill(); ctx.stroke();
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
      // panel
      const g = ctx.createLinearGradient(0, 0, 0, m.h);
      g.addColorStop(0, '#1d4f9a'); g.addColorStop(1, '#16386f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, m.h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, m.h - 3, W, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, m.h, W, 5);

      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      // skor
      ctx.fillStyle = '#9fc2ff'; ctx.font = '700 13px ' + Theme.fonts.ui; ctx.fillText('SKOR', 14, por ? 22 : 24);
      ctx.fillStyle = '#ffd23f'; ctx.font = '800 ' + (por ? 30 : 32) + 'px ' + Theme.fonts.ui;
      ctx.fillText(String(Math.round(run.scoreShown)), 14, por ? 54 : 56);
      ctx.fillStyle = '#cfe0ff'; ctx.font = '700 13px ' + Theme.fonts.ui;
      ctx.fillText(run.stageTag, 14, por ? 70 : 76);
      // tombol menu
      const p = m.pause;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; GA.Path.roundRect(ctx, p.x, p.y + 3, p.w, p.h, 16); ctx.fill();
      const bg = ctx.createLinearGradient(0, p.y, 0, p.y + p.h); bg.addColorStop(0, '#ffd23f'); bg.addColorStop(1, '#ff9a1f');
      ctx.fillStyle = bg; GA.Path.roundRect(ctx, p.x, p.y, p.w, p.h, 16); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#1b2a49';
      const bw = p.w * 0.14, bh = p.h * 0.42, cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      GA.Path.roundRect(ctx, cx - bw * 1.6, cy - bh / 2, bw, bh, 3); ctx.fill();
      GA.Path.roundRect(ctx, cx + bw * 0.6, cy - bh / 2, bw, bh, 3); ctx.fill();
      // nyawa (pion)
      const ps = por ? 30 : 34, lx1 = p.x - 14, n = run.maxLives;
      for (let i = 0; i < n; i++) {
        const x = lx1 - (n - i - 0.5) * (ps + 4) + 2;
        const lost = run.lifeLostT > 0 && i === run.lives; // pion yang baru hilang bergetar
        this.drawPawn(ctx, x + (lost ? Math.sin(t * 60) * 3 : 0), (por ? 32 : 42) + (lost ? -4 : 0), ps, i < run.lives, t);
      }

      // panel soal
      let qx, qy, qw, qh;
      if (por) { qx = 12; qy = 74; qw = W - 24; qh = 60; } else { qx = 190; qy = 6; qw = W - 190 - 300; qh = 62; }
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; GA.Path.roundRect(ctx, qx, qy + 3, qw, qh, 18); ctx.fill();
      ctx.fillStyle = '#fff'; GA.Path.roundRect(ctx, qx, qy, qw, qh, 18); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
      const q = run.q;
      if (q) {
        const pop = run.qPop > 0 ? 1 + run.qPop * 0.3 : 1;
        ctx.save(); ctx.translate(qx + qw / 2, qy + qh / 2 + (q.note ? -7 : 1)); ctx.scale(pop, pop);
        const size = this.fit(ctx, q.text, qw - 30, por ? 44 : 42);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1b2a49';
        ctx.fillText(q.text, 0, 0); ctx.restore();
        if (q.note) { ctx.font = '700 14px ' + Theme.fonts.ui; ctx.fillStyle = '#c2410c'; ctx.textAlign = 'center'; ctx.fillText(q.note, qx + qw / 2, qy + qh - 9); }
      }
      // batas waktu soal
      if (run.qTimeMax) {
        const f = Math.max(0, run.qTime / run.qTimeMax), tw = qw - 28;
        ctx.fillStyle = 'rgba(27,42,73,0.15)'; GA.Path.roundRect(ctx, qx + 14, qy + qh - 9, tw, 6, 3); ctx.fill();
        ctx.fillStyle = f > 0.5 ? '#2fbf71' : (f > 0.25 ? '#ffb02e' : '#ff4d5e');
        GA.Path.roundRect(ctx, qx + 14, qy + qh - 9, Math.max(6, tw * f), 6, 3); ctx.fill();
      }
      // progres stage / boss
      const py = qy + qh + 6, pw = qw - 40;
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; GA.Path.roundRect(ctx, qx + 20, py, pw, 8, 4); ctx.fill();
      const pf = Math.min(1, run.progress);
      if (pf > 0) { ctx.fillStyle = '#7ee26f'; GA.Path.roundRect(ctx, qx + 20, py, Math.max(8, pw * pf), 8, 4); ctx.fill(); }

      // di bawah HUD: kombo, status, umpan balik
      const by = m.h + 12;
      if (run.combo >= 2) {
        const k = 1 + (run.comboPulse > 0 ? run.comboPulse * 0.6 : 0);
        ctx.save(); ctx.translate(16, by + 18); ctx.scale(k, k);
        ctx.font = '800 22px ' + Theme.fonts.ui; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(20,30,70,0.9)'; ctx.lineJoin = 'round';
        const ct = '🔥 KOMBO ×' + run.combo; ctx.strokeText(ct, 0, 0); ctx.fillStyle = '#ffd23f'; ctx.fillText(ct, 0, 0); ctx.restore();
      }
      let sy = by + 18;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const chip = function (txt, col) {
        ctx.font = '800 16px ' + Theme.fonts.ui; const w = ctx.measureText(txt).width + 20;
        ctx.fillStyle = col; GA.Path.roundRect(ctx, W - 14 - w, sy - 14, w, 28, 14); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillText(txt, W - 24, sy + 1); sy += 34;
      };
      if (run.slowT > 0) chip('❄ Lambat ' + Math.ceil(run.slowT) + 'd', '#2a9ad8');
      if (run.fastT > 0) chip('⚡ Cepat ' + Math.ceil(run.fastT) + 'd', '#e8590c');

      if (run.feedback && run.feedback.t > 0) {
        const f = run.feedback, a = Math.min(1, f.t * 3);
        const lines = f.hint ? [f.text, f.hint] : [f.text];
        ctx.globalAlpha = a;
        const sz = por ? 26 : 26;
        ctx.font = '800 ' + sz + 'px ' + Theme.fonts.ui;
        let w = ctx.measureText(f.text).width;
        ctx.font = '700 16px ' + Theme.fonts.ui;
        if (f.hint) w = Math.max(w, ctx.measureText(f.hint).width);
        w = Math.min(W - 24, w + 40);
        const h = f.hint ? 68 : 46, fy = por ? m.h + 56 : m.h + 12;
        const fx = W / 2 - w / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; GA.Path.roundRect(ctx, fx, fy + 3, w, h, 16); ctx.fill();
        ctx.fillStyle = f.good ? '#1f9d5c' : '#d92d44'; GA.Path.roundRect(ctx, fx, fy, w, h, 16); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '800 ' + this.fit(ctx, f.text, w - 24, sz) + 'px ' + Theme.fonts.ui;
        ctx.fillText(f.text, W / 2, fy + (f.hint ? 22 : h / 2 + 1));
        if (f.hint) { ctx.font = '700 15px ' + Theme.fonts.ui; ctx.fillStyle = '#ffe9ec'; ctx.fillText(f.hint, W / 2, fy + 48, w - 20); }
        ctx.globalAlpha = 1;
      }
    }
  };

  GA.UI = UI;
})(window.GA = window.GA || {});
