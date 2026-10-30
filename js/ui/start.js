/* ui/start.js — HALAMAN AWAL: satu layar berisi logo, rekor, kartu kategori, kesulitan, dan tombol "Mulai Main"; plus dialog Cara Main (?) dan Atur (gerigi).
 * Dibangun dari UI kit (js/ui/kit.js). Dimuat TANPA mesin game: tidak ada canvas, loop animasi, atau audio di sini. "Mulai Main" memanggil GA.Boot.play(pilihan)
 * (js/boot.js) yang memuat mesin game dan memulai Stage 1. Pilihan terakhir disimpan di Storage.pick ({ cat, diff }) dan otomatis terpilih lagi.
 * Papan ketik: panah memindah pilihan (radiogroup), Enter/Spasi memilih, Enter pada "Mulai Main" memulai; Esc menutup dialog. */
(function (GA) {
  'use strict';
  const T = GA.T, K = GA.Kit, C = GA.Categories, Storage = GA.Storage, MT = GA.MathText;
  const I = function (n, c) { return GA.Icons.html(n, c); };

  const screens = {};
  let root = null, pick = null, shown = 'start', opener = null, busy = false, inited = false;

  function $(id) { return document.getElementById(id); }
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function fmt(n) { return String(Math.max(0, Math.floor(+n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }      // 28975 → "28.975" (pemisah ribuan Indonesia)

  /* ---------- templat ---------- */
  function startHTML() {
    const cats = C.LIST.map(function (c) { return K.card({ act: 'st-cat', id: c.id, name: c.name, color: c.color, icon: GA.Icons.cat[c.id], ex: MT.html(c.ex), on: c.id === pick.cat }); }).join('');
    const diff = K.segmented({ act: 'st-diff', label: T('start.diff'), items: C.DIFFS.map(function (d) { return { id: d, label: T('diff.' + d), tone: d, on: d === pick.diff }; }) });
    return '<section class="screen st" id="s-start" aria-labelledby="st-h">' + K.panel({ cls: 'st-board', body:
      '<div class="st-corner l">' + K.button({ act: 'st-howto', icon: 'help', variant: 'wood', size: 'small', aria: T('start.howto'), id: 'st-howto' }) + '</div>' +
      '<div class="st-corner r">' + K.button({ act: 'st-settings', icon: 'gear', variant: 'wood', size: 'small', aria: T('start.settings'), id: 'st-settings' }) + '</div>' +
      '<div class="st-head"><h1 class="k-logo" id="st-h" aria-label="' + K.esc(T('game.title')) + '"><span class="l1">Naga</span><span class="l2">Penjaga</span></h1>' +
        '<div class="st-rec" id="st-rec">' + K.record(fmt(Storage.highScore), T('start.rec')) + '</div></div>' +
      '<div class="st-catwrap"><p class="k-eyebrow">' + T('start.cat') + '</p><div class="k-cats st-cats" id="st-cats" role="radiogroup" aria-label="' + K.esc(T('start.cat')) + '">' + cats + '</div></div>' +
      '<div class="st-diff" id="st-diff">' + diff + '</div>' +
      '<div class="st-go">' + K.button({ act: 'st-play', id: 'st-play', icon: 'play', label: T('start.play'), size: 'big' }) + '</div>' }) + '</section>';
  }

  function howtoHTML() {
    return '<section class="screen scroll dim" id="s-howto" role="dialog" aria-modal="true" aria-label="' + K.esc(T('how.title')) + '">' + K.panel({ title: T('how.title'), back: 'st-back', cls: 'k-wide', body:
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
      '<div class="k-legend"><span class="k-leg"><span class="k-lico frost">' + I('snow') + '</span>' + T('sp.frost') + '</span><span class="k-leg"><span class="k-lico gold">' + I('egg') + '</span>' + T('sp.egg') + '</span></div>' }) + '</section>';
  }

  function settingsHTML() {
    return '<section class="screen dim scroll" id="s-settings" role="dialog" aria-modal="true" aria-label="' + K.esc(T('set.title')) + '">' + K.panel({ title: T('set.title'), back: 'st-back', body:
      K.toggle({ act: 'st-sound', icon: 'sound', label: T('set.sound'), sync: 'sound' }) +
      K.toggle({ act: 'st-music', icon: 'music', label: T('set.music'), sync: 'music' }) +
      '<p class="k-eyebrow">' + T('set.quality') + '</p><div id="q-seg"></div>' +
      K.button({ act: 'st-story', icon: 'book', label: T('set.story'), variant: 'secondary' }) +
      K.button({ act: 'st-reset', icon: 'restart', label: T('set.reset'), variant: 'danger', size: 'small' }) }) + '</section>';
  }


  /** Layar pemuatan statis: bar progres saja (tanpa partikel/animasi). Gagal → pesan + "Coba lagi". */
  function loadingHTML() {
    return '<section class="screen dim" id="s-loading" role="status" aria-live="polite">' + K.panel({ cls: 'k-small', peek: false, body:
      '<p class="k-text" id="ld-text">' + T('start.loading') + '</p>' + K.progress({ value: 0, max: 1, kind: 'fire', label: '' }) +
      '<div id="ld-retry" hidden>' + K.button({ act: 'st-retry', icon: 'restart', label: T('start.retry'), variant: 'secondary' }) + '</div>' }) + '</section>';
  }
  /* ---------- tampilan ---------- */
  function showScreen(name) {
    shown = name;
    Object.keys(screens).forEach(function (k) { screens[k].classList.toggle('show', k === name); });
    const s = screens[name]; if (s) s.scrollTop = 0;
    document.body.classList.toggle('st-on', name !== null);
  }

  function syncSettings() {
    const on = Storage.sound, mu = Storage.music;
    [['sound', on], ['music', mu]].forEach(function (p) {
      root.querySelectorAll('#s-settings [data-sync="' + p[0] + '"]').forEach(function (n) { n.classList.toggle('on', p[1]); n.setAttribute('aria-checked', p[1] ? 'true' : 'false'); });
    });
    const seg = $('q-seg');
    if (seg) seg.innerHTML = K.segmented({ act: 'st-quality', label: T('set.quality'), items: ['auto', 'tinggi', 'sedang', 'rendah'].map(function (m) {
      return { id: m, label: T({ auto: 'set.auto', tinggi: 'set.high', sedang: 'set.mid', rendah: 'set.low' }[m]), on: GA.Quality.mode === m };
    }) });
  }

  /** Tandai pilihan di DOM tanpa membangun ulang (fokus papan ketik tidak hilang). */
  function applyPick() {
    root.querySelectorAll('#st-cats .k-cat').forEach(function (c) { const on = c.dataset.id === pick.cat; c.classList.toggle('on', on); c.setAttribute('aria-checked', on ? 'true' : 'false'); c.tabIndex = on ? 0 : -1; });
    root.querySelectorAll('#st-diff .k-seg-i').forEach(function (c) { const on = c.dataset.id === pick.diff; c.classList.toggle('on', on); c.setAttribute('aria-checked', on ? 'true' : 'false'); c.tabIndex = on ? 0 : -1; });
  }
  function refreshRecord() { const r = $('st-rec'); if (r) r.innerHTML = K.record(fmt(Storage.highScore), T('start.rec')); }

  function choose(kind, id) {
    if (kind === 'cat' && C.has(id)) pick.cat = id; else if (kind === 'diff' && C.DIFFS.indexOf(id) >= 0) pick.diff = id; else return;
    Storage.pick = pick; applyPick();
  }

  /** Panah / Home / End memindah pilihan di grup radio (kartu kategori atau kesulitan); pilihan ikut berpindah (semantik radio). */
  function arrows(e) {
    const g = e.target.closest('[role="radiogroup"]'); if (!g) return;
    const items = Array.prototype.slice.call(g.querySelectorAll('[role="radio"]')), i = items.indexOf(e.target); if (i < 0) return;
    const cols = g.id === 'st-cats' ? getComputedStyle(g).gridTemplateColumns.split(' ').length : items.length;
    let n = i;
    switch (e.key) {
      case 'ArrowRight': n = (i + 1) % items.length; break;
      case 'ArrowLeft': n = (i - 1 + items.length) % items.length; break;
      case 'ArrowDown': n = i + cols < items.length ? i + cols : i; if (g.id !== 'st-cats') n = (i + 1) % items.length; break;
      case 'ArrowUp': n = i - cols >= 0 ? i - cols : i; if (g.id !== 'st-cats') n = (i - 1 + items.length) % items.length; break;
      case 'Home': n = 0; break;
      case 'End': n = items.length - 1; break;
      default: return;
    }
    e.preventDefault(); const t = items[n], id = t.dataset.id;
    if (g.id === 'st-cats') { choose('cat', id); t.focus(); }
    else if (g.closest('#st-diff')) { choose('diff', id); t.focus(); }
    else { t.click(); const nt = $('q-seg').querySelector('[data-id="' + id + '"]'); if (nt) nt.focus(); }      // grup lain (grafik di Atur): pilihan dibangun ulang, fokus dikembalikan
  }

  /** Tombol Mulai Main: simpan pilihan, minta Boot memuat mesin game dan memulai Stage 1. Ketukan ganda diabaikan selama memuat. */
  function play() {
    if (busy) return; busy = true;
    Storage.pick = pick;
    GA.Boot.play({ cat: pick.cat, diff: pick.diff }).then(function () { busy = false; }, function () { busy = false; });
  }

  function open(name, from) { opener = from || document.activeElement; showScreen(name); if (name === 'settings') syncSettings(); const b = screens[name].querySelector('.k-btn'); if (b) b.focus({ preventScroll: true }); }
  function back() {
    showScreen('start'); refreshRecord();
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  function act(a, b) {
    switch (a) {
      case 'st-cat': choose('cat', b.dataset.id); break;
      case 'st-diff': choose('diff', b.dataset.id); break;
      case 'st-play': case 'st-retry': play(); break;
      case 'st-howto': open('howto', b); break;
      case 'st-settings': open('settings', b); break;
      case 'st-back': back(); break;
      case 'st-sound': Storage.sound = !Storage.sound; if (GA.Audio) GA.Audio.setEnabled(Storage.sound); syncSettings(); break;
      case 'st-music': Storage.music = !Storage.music; if (GA.Audio) GA.Audio.setMusic(Storage.music); syncSettings(); break;
      case 'st-quality': GA.Quality.setMode(b.dataset.id); Storage.quality = GA.Quality.mode; syncSettings(); break;
      case 'st-story': Storage.introSeen = false; K.toast(T('set.storyok')); break;
      case 'st-reset': K.confirm({ title: T('set.resetq'), text: T('set.resetx'), yes: T('set.resetyes'), onYes: function () { Storage.reset(); refreshRecord(); K.toast(T('set.resetdone')); } }); break;
    }
  }

  /** Splash art = assets/splash/*.webp (<picture> di index.html). Bila berkasnya tidak ada, js/splash-art.js menggambar cadangan SEKALI lewat Canvas (tanpa loop). */
  function splashFallback() {
    const img = $('splash-img'); if (!img) return;
    let tried = false;
    const bad = function () {
      if (tried) return; tried = true;
      const s = document.createElement('script'); s.src = 'js/splash-art.js'; s.onload = function () { GA.SplashArt.apply(img); }; document.body.appendChild(s);
    };
    img.addEventListener('error', bad);
    if (img.complete && img.naturalWidth === 0) bad();
  }

  const Start = {
    init: function () {
      if (inited) return; inited = true;
      root = $('ui'); GA.Skin.apply(); GA.Quality.setMode(Storage.quality, true);
      pick = Storage.pick;
      screens.start = el(startHTML()); screens.howto = el(howtoHTML()); screens.settings = el(settingsHTML()); screens.loading = el(loadingHTML());
      Object.keys(screens).forEach(function (k) { root.appendChild(screens[k]); });
      K.mount(root);
      root.addEventListener('click', function (e) {
        const b = e.target.closest('[data-act^="st-"]'); if (!b || b.disabled) return;
        act(b.getAttribute('data-act'), b);
      });
      root.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && shown !== 'start' && shown !== null && !K.confirmOpen()) { e.preventDefault(); back(); return; }
        if (shown === 'start' || shown === 'settings') arrows(e);
      });
      applyPick();
      splashFallback();
    },
    /** Tampilkan halaman awal (mis. kembali dari permainan). */
    show: function () { this.init(); pick = Storage.pick; applyPick(); refreshRecord(); busy = false; showScreen('start'); },
    /** Layar pemuatan (p = 0..1): dipakai Boot saat mesin diunduh + diinisialisasi. */
    loading: function (p) {
      this.init(); const ld = screens.loading, bar = ld.querySelector('.k-bar i');
      if (shown !== 'loading') { ld.querySelector('#ld-retry').hidden = true; $('ld-text').textContent = T('start.loading'); showScreen('loading'); }
      bar.style.width = (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%';
      ld.querySelector('.k-bar').setAttribute('aria-valuenow', p.toFixed(2));
    },
    loadFail: function () {
      this.init(); showScreen('loading'); $('ld-text').textContent = T('start.fail'); const r = $('ld-retry'); r.hidden = false; const b = r.querySelector('button'); if (b) b.focus({ preventScroll: true });
    },
    /** Sembunyikan semua layar halaman awal (permainan dimulai). */
    hide: function () { showScreen(null); },
    isShown: function () { return shown !== null; },
    get pick() { return { cat: pick.cat, diff: pick.diff }; },
    choose: choose, refreshRecord: refreshRecord, play: play
  };

  GA.Start = Start;
})(window.GA = window.GA || {});
