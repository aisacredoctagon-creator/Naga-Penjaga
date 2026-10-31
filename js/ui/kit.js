/* kit.js — UI kit tunggal (revisi 11: tema gelap). SEMUA layar (halaman awal, cerita, pembuka stage, hasil, pengaturan, Jeda, konfirmasi, HUD) dibangun dari komponen ini;
 * gayanya ada di css/kit.css, token warna di Theme.ui (js/theme.js) → CSS variables (js/ui/skin.js; satu tile noise 128 px), ikon SVG di js/ui/icons.js, teks di js/strings.js.
 *
 * Komponen (mengembalikan string HTML, teks di-escape):
 *   Kit.panel({ title, back, right, body, cls })         panel batu bingkai tebal + isi slate gelap; judul = plakat slate yang menempel di tepi atas
 *   Kit.button({ label, icon, act, variant, size, data, aria, id, cls })   tombol bersegi delapan; variant: primary (hijau) | secondary (amber) | danger (merah) | blue | wood (slate, ikon)
 *   Kit.badge(text, { icon, tone })      Kit.chip(text, { icon, tone })      Kit.icon(name, cls)
 *   Kit.toggle({ act, label, icon, on, chip, sync })     sakelar (role=switch)
 *   Kit.slider({ act, id, label, icon, value })          penggeser 0–100 (input range, tombol ikon di kiri)
 *   Kit.segmented({ act, label, items:[{ id, label, icon, on, tone }] })     pilihan tunggal (role=radiogroup)
 *   Kit.progress({ value, max, kind, label })            bar progres pil gelap, isi datar
 *   Kit.card({ id, name, color, icon, ex, on, act })     kartu kategori (slate; terpilih = bingkai emas + centang)
 *   Kit.stars(n, total)   Kit.eggs(have, max)   Kit.record(value, label)
 *   Kit.tip(html, text)                                  tooltip (hover/fokus; di sentuh lewat fokus)
 * DOM (satu instans): Kit.toast(text, ms)   Kit.confirm({ title, text, yes, onYes}) */
(function (GA) {
  'use strict';
  const T = GA.T, I = function (n, c) { return GA.Icons.html(n, c); };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function attrs(o) {
    let a = '';
    if (o.id) a += ' id="' + o.id + '"';
    if (o.act) a += ' data-act="' + o.act + '"';
    if (o.aria) a += ' aria-label="' + esc(o.aria) + '"';
    if (o.disabled) a += ' disabled';
    if (o.data) Object.keys(o.data).forEach(function (k) { a += ' data-' + k + '="' + esc(o.data[k]) + '"'; });
    return a;
  }

  const Kit = {
    esc: esc,
    icon: I,

    panel: function (o) {
      const head = o.title || o.back || o.right
        ? '<header class="k-head">' + (o.back ? Kit.button({ act: o.back, icon: 'back', variant: 'wood', size: 'small', aria: T('common.back') }) : '') +
          (o.title ? '<h2 class="k-title">' + esc(o.title) + '</h2>' : '') + (o.right || '') + '</header>' : '';
      return '<section class="k-panel' + (head ? ' k-has-head' : '') + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + (o.role ? ' role="' + o.role + '" aria-modal="true"' : '') + '>' +
        head + '<div class="k-body">' + (o.body || '') + '</div></section>';
    },

    button: function (o) {
      const v = o.variant || 'primary';
      return '<button type="button" class="k-btn k-' + v + (o.size ? ' k-' + o.size : '') + (o.label ? '' : ' k-iconbtn') + (o.cls ? ' ' + o.cls : '') + '"' + attrs(o) + '><i class="k-gloss"></i>' +
        (o.icon ? I(o.icon) : '') + (o.label ? '<span>' + esc(o.label) + '</span>' : '') + '</button>';
    },

    badge: function (text, o) { o = o || {}; return '<span class="k-badge' + (o.tone ? ' k-tone-' + o.tone : '') + '">' + (o.icon ? I(o.icon) : '') + esc(text) + '</span>'; },
    chip: function (text, o) { o = o || {}; return '<span class="k-chip' + (o.tone ? ' k-tone-' + o.tone : '') + '">' + (o.icon ? I(o.icon) : '') + esc(text) + '</span>'; },

    toggle: function (o) {
      return '<button type="button" class="k-toggle' + (o.chip ? ' k-chip-toggle' : '') + (o.on ? ' on' : '') + '" role="switch" aria-checked="' + (o.on ? 'true' : 'false') + '"' + attrs(o) + (o.sync ? ' data-sync="' + o.sync + '"' : '') + '>' +
        '<span class="k-tl">' + (o.icon ? I(o.icon) : '') + '<span>' + esc(o.label) + '</span></span>' + (o.chip ? '' : '<span class="k-track"><i></i></span>') + '</button>';
    },

    /** Penggeser 0–100 untuk Atur (suara, musik): <input type=range> bawaan (papan ketik + sentuh), diberi gaya lewat CSS. */
    slider: function (o) {
      const v = Math.max(0, Math.min(100, Math.round(o.value == null ? 100 : o.value)));
      return '<label class="k-slider"><span class="k-sl-l">' + (o.icon ? I(o.icon) : '') + '<span>' + esc(o.label) + '</span></span>' +
        '<input type="range" min="0" max="100" step="5" value="' + v + '" id="' + o.id + '" data-act="' + o.act + '" aria-label="' + esc(o.label) + '" style="--v:' + v + '%"></label>';
    },

    segmented: function (o) {
      return '<div class="k-seg" role="radiogroup" aria-label="' + esc(o.label || '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '>' + o.items.map(function (it) {
        return '<button type="button" class="k-seg-i' + (it.tone ? ' k-tone-' + it.tone : '') + (it.on ? ' on' : '') + '" role="radio" aria-checked="' + (it.on ? 'true' : 'false') + '" tabindex="' + (it.on ? 0 : -1) + '" data-act="' + o.act + '" data-id="' + it.id + '">' +
          (it.icon ? I(it.icon) : '') + '<span>' + esc(it.label) + '</span></button>';
      }).join('') + '</div>';
    },

    progress: function (o) {
      const f = Math.max(0, Math.min(1, (o.value || 0) / (o.max || 1)));
      return '<div class="k-bar k-' + (o.kind || 'fire') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + (o.max || 1) + '" aria-valuenow="' + (o.value || 0) + '"><i style="width:' + (f * 100).toFixed(1) + '%"></i>' +
        (o.label ? '<span>' + esc(o.label) + '</span>' : '') + '</div>';
    },

    stars: function (n, total) {
      let s = '';
      for (let i = 0; i < (total || 3); i++) s += '<span class="star' + (i < n ? ' on' : '') + '" style="--i:' + i + '">' + I('star') + '</span>';
      return '<span class="k-stars" role="img" aria-label="' + n + '/' + (total || 3) + '">' + s + '</span>';
    },

    eggs: function (have, max) {
      let s = '';
      for (let i = 0; i < max; i++) s += '<span class="egg' + (i < have ? ' on' : '') + '" aria-hidden="true"></span>';
      return '<span class="k-eggs" role="img" aria-label="' + have + '/' + max + '">' + s + '</span>';
    },

    /** Chip rekor: ikon piala + angka (rekor skor tertinggi satu petualangan). */
    record: function (value, label) {
      return '<span class="k-rec" role="img" aria-label="' + esc(label + ' ' + value) + '">' + I('trophy') + '<b>' + esc(value) + '</b></span>';
    },

    /** Kartu kategori (pilihan tunggal, role=radio): ikon, nama, satu contoh soal kecil; yang terpilih = bingkai emas + ikon centang (bukan hanya warna). */
    card: function (o) {
      return '<button type="button" class="k-card k-cat' + (o.on ? ' on' : '') + '" role="radio" aria-checked="' + (o.on ? 'true' : 'false') + '" tabindex="' + (o.on ? 0 : -1) + '" data-act="' + o.act + '" data-id="' + o.id + '" style="--c:' + o.color + '"' + (o.disabled ? ' disabled' : '') + '>' +
        '<span class="k-tick" aria-hidden="true">' + I('check') + '</span>' +
        '<span class="k-medal">' + I(o.icon) + '</span><span class="k-cname">' + esc(o.name) + '</span><span class="k-cex">' + (o.ex || '') + '</span></button>';
    },

    tip: function (html, text) { return '<span class="k-tip" tabindex="0" data-tip="' + esc(text) + '">' + html + '</span>'; },

    /* ---------- DOM: toast, konfirmasi (coachmark pindah ke zona informasi HUD) ---------- */
    _toastT: 0,
    mount: function (root) {
      if (document.getElementById('k-modal')) return;      // satu instans (dipasang halaman awal; mesin game memakainya juga)
      this.root = root;
      root.insertAdjacentHTML('beforeend',
        '<div class="k-toast" id="k-toast" role="status" aria-live="polite"></div>' +
        '<div class="k-modal" id="k-modal" role="alertdialog" aria-modal="true" aria-labelledby="k-mt"><div class="k-panel k-small"><div class="k-body">' +
        '<h2 class="k-title" id="k-mt"></h2><p class="k-mx" id="k-mx"></p><div class="k-row">' + Kit.button({ id: 'k-mno', act: 'k-no', variant: 'secondary', label: T('common.no') }) + Kit.button({ id: 'k-myes', act: 'k-yes', variant: 'danger', label: T('common.yes') }) + '</div></div></div></div>');
      const self = this, m = document.getElementById('k-modal');
      m.addEventListener('click', function (e) {
        const b = e.target.closest('[data-act]');
        if (b && b.getAttribute('data-act') === 'k-yes') { const f = self._onYes; self.closeConfirm(); if (f) f(); }
        else if ((b && b.getAttribute('data-act') === 'k-no') || e.target === m) self.closeConfirm();
      });
      m.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); self.closeConfirm(); }
        if (e.key === 'Tab') { const f = m.querySelectorAll('button'), a = document.activeElement; if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } }
      });
    },
    toast: function (text, ms) {
      const t = document.getElementById('k-toast'); if (!t) return;
      t.textContent = text; t.classList.add('show'); clearTimeout(this._toastT);
      this._toastT = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
    },
    confirm: function (o) {
      document.getElementById('k-mt').textContent = o.title; document.getElementById('k-mx').textContent = o.text || '';
      document.querySelector('#k-myes span').textContent = o.yes || T('common.yes');
      this._onYes = o.onYes; this._opener = document.activeElement;
      document.getElementById('k-modal').classList.add('show'); document.getElementById('k-mno').focus({ preventScroll: true });
    },
    closeConfirm: function () {
      const m = document.getElementById('k-modal'); if (!m.classList.contains('show')) return;
      m.classList.remove('show'); this._onYes = null;
      if (this._opener && this._opener.focus) this._opener.focus({ preventScroll: true });
    },
    confirmOpen: function () { const m = document.getElementById('k-modal'); return !!m && m.classList.contains('show'); }
  };

  GA.Kit = Kit;
})(window.GA = window.GA || {});
