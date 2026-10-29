/* kit.js — UI kit tunggal. SEMUA layar (judul, menu, pilih step, cerita, pembuka step, hasil, pengaturan, konfirmasi) dibangun dari komponen ini;
 * gayanya ada di css/kit.css, token warna/tekstur di Theme.ui (js/theme.js) → CSS variables (js/ui/skin.js), tekstur di js/render/textures.js,
 * ikon SVG di js/ui/icons.js, teks di js/strings.js. Popup Jeda (Figma) tetap di css/pause.css dengan warna yang selaras.
 *
 * Komponen (mengembalikan string HTML, teks di-escape):
 *   Kit.panel({ title, back, right, body, cls, peek })   papan kayu + perkamen, paku emas, kepala naga mengintip
 *   Kit.button({ label, icon, act, variant, size, data, aria, id })   variant: primary (hijau) | secondary (oranye) | danger (merah) | wood
 *   Kit.badge(text, { icon, tone })      Kit.chip(text, { icon, tone })      Kit.icon(name, cls)
 *   Kit.toggle({ act, label, icon, on, chip, sync })     sakelar (role=switch)
 *   Kit.segmented({ act, label, items:[{ id, label, icon, on, tone }] })     pilihan tunggal (role=radiogroup)
 *   Kit.progress({ value, max, kind, label })            bilah api / energi
 *   Kit.card({ kind:'cat'|'step', ... })                 kartu kategori (warna per kategori) & kartu stage
 *   Kit.stars(n, total)   Kit.eggs(have, max)   Kit.resbar({ eggs, stars, score })
 *   Kit.tip(html, text)                                  tooltip (hover/fokus; di sentuh lewat fokus)
 * DOM (satu instans): Kit.toast(text, ms)   Kit.confirm({ title, text, yes, onYes })   Kit.coach(text, ms) */
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

  /* Kepala naga (ORIGINAL, SVG) yang mengintip dari tepi atas papan. */
  const PEEK = '<svg viewBox="0 0 120 64" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="kpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe06a"/><stop offset="1" stop-color="#2f8a3c"/></linearGradient></defs>' +
    '<path d="M30 32C20 18 14 10 6 6c2 14 8 26 16 34z" fill="#e8c874" stroke="#3a1e08" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M90 32c10-14 16-22 24-26-2 14-8 26-16 34z" fill="#e8c874" stroke="#3a1e08" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 64C16 36 36 22 60 22s44 14 46 42z" fill="url(#kpg)" stroke="#3a1e08" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="48" rx="24" ry="13" fill="#b6f08a" stroke="#3a1e08" stroke-width="2.5"/>' +
    '<circle cx="51" cy="46" r="2.6" fill="#2a4a14"/><circle cx="69" cy="46" r="2.6" fill="#2a4a14"/>' +
    '<ellipse cx="38" cy="36" rx="8" ry="6.5" fill="#fff6b0" stroke="#3a1e08" stroke-width="2.5"/><ellipse cx="82" cy="36" rx="8" ry="6.5" fill="#fff6b0" stroke="#3a1e08" stroke-width="2.5"/>' +
    '<ellipse cx="39" cy="36.5" rx="2.2" ry="5" fill="#2a1030"/><ellipse cx="81" cy="36.5" rx="2.2" ry="5" fill="#2a1030"/>' +
    '<path d="M28 27q8-6 16-3M92 27q-8-6-16-3" fill="none" stroke="#3a1e08" stroke-width="3" stroke-linecap="round"/></svg>';

  const Kit = {
    esc: esc,
    icon: I,

    panel: function (o) {
      const head = o.title || o.back || o.right
        ? '<header class="k-head">' + (o.back ? Kit.button({ act: o.back, icon: 'back', variant: 'wood', size: 'small', aria: T('common.back') }) : '') +
          (o.title ? '<h2 class="k-title">' + esc(o.title) + '</h2>' : '') + (o.right || '') + '</header>' : '';
      return '<section class="k-panel' + (o.cls ? ' ' + o.cls : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + (o.role ? ' role="' + o.role + '" aria-modal="true"' : '') + '>' +
        (o.peek === false ? '' : '<span class="k-peek">' + PEEK + '</span>') + head + '<div class="k-body">' + (o.body || '') + '</div></section>';
    },

    button: function (o) {
      const v = o.variant || 'primary';
      return '<button type="button" class="k-btn k-' + v + (o.size ? ' k-' + o.size : '') + (o.cls ? ' ' + o.cls : '') + '"' + attrs(o) + '><i class="k-gloss"></i>' +
        (o.icon ? I(o.icon) : '') + (o.label ? '<span>' + esc(o.label) + '</span>' : '') + '</button>';
    },

    badge: function (text, o) { o = o || {}; return '<span class="k-badge' + (o.tone ? ' k-tone-' + o.tone : '') + '">' + (o.icon ? I(o.icon) : '') + esc(text) + '</span>'; },
    chip: function (text, o) { o = o || {}; return '<span class="k-chip' + (o.tone ? ' k-tone-' + o.tone : '') + '">' + (o.icon ? I(o.icon) : '') + esc(text) + '</span>'; },

    toggle: function (o) {
      return '<button type="button" class="k-toggle' + (o.chip ? ' k-chip-toggle' : '') + (o.on ? ' on' : '') + '" role="switch" aria-checked="' + (o.on ? 'true' : 'false') + '"' + attrs(o) + (o.sync ? ' data-sync="' + o.sync + '"' : '') + '>' +
        '<span class="k-tl">' + (o.icon ? I(o.icon) : '') + '<span>' + esc(o.label) + '</span></span>' + (o.chip ? '' : '<span class="k-track"><i></i></span>') + '</button>';
    },

    segmented: function (o) {
      return '<div class="k-seg" role="radiogroup" aria-label="' + esc(o.label || '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '>' + o.items.map(function (it) {
        return '<button type="button" class="k-seg-i' + (it.tone ? ' k-tone-' + it.tone : '') + (it.on ? ' on' : '') + '" role="radio" aria-checked="' + (it.on ? 'true' : 'false') + '" data-act="' + o.act + '" data-id="' + it.id + '">' +
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
      for (let i = 0; i < (total || 3); i++) s += '<span class="star' + (i < n ? ' on' : '') + '" style="--i:' + i + '">★</span>';
      return '<span class="k-stars" role="img" aria-label="' + n + '/' + (total || 3) + '">' + s + '</span>';
    },

    eggs: function (have, max) {
      let s = '';
      for (let i = 0; i < max; i++) s += '<span class="egg' + (i < have ? ' on' : '') + '" aria-hidden="true"></span>';
      return '<span class="k-eggs" role="img" aria-label="' + have + '/' + max + '">' + s + '</span>';
    },

    /** Bilah sumber daya berikon (telur awal, bintang, rekor) di atas layar menu/pilih step. */
    resbar: function (o) {
      const it = function (ic, v, tone) { return '<span class="k-res-i k-tone-' + tone + '">' + I(ic) + '<b>' + esc(v) + '</b></span>'; };
      return '<div class="k-res">' + it('egg', o.eggs, 'egg') + it('star', o.stars, 'star') + it('flame', o.score, 'fire') + '</div>';
    },

    card: function (o) {
      if (o.kind === 'cat') {
        return '<button type="button" class="k-card k-cat' + (o.on ? ' on' : '') + '" role="radio" aria-checked="' + (o.on ? 'true' : 'false') + '" data-act="' + o.act + '" data-id="' + o.id + '" style="--c:' + o.color + '"' + (o.disabled ? ' disabled' : '') + '>' +
          '<span class="k-medal">' + I(o.icon) + '</span><span class="k-cname">' + esc(o.name) + '</span><span class="k-cex">' + (o.ex || '') + '</span></button>';
      }
      // kartu step
      const cls = 'k-card k-step' + (o.locked ? ' locked' : '') + (o.done ? ' done' : '') + (o.cur ? ' cur' : '') + (o.boss ? ' boss' : '');
      return '<li class="k-step-li">' + (o.hasResult ? '<button type="button" class="k-resbtn" data-act="s-result" data-i="' + o.i + '" aria-label="' + esc(T('steps.result')) + '">' + I('list') + '</button>' : '') + '<button type="button" class="' + cls + '" data-act="' + o.act + '" data-i="' + o.i + '"' + (o.locked ? ' disabled aria-label="' + esc(T('steps.locked')) + '"' : '') + '>' +
        '<span class="k-num">' + (o.locked ? I('lock') : o.n) + '</span>' +
        '<span class="k-sbody"><span class="k-stag">' + esc(o.tag) + '</span><b class="k-sname">' + esc(o.name) + '</b>' +
        '<span class="k-smeta">' + I(o.icon, 'ic-inline') + ' ' + esc(o.meta) + '</span>' + Kit.stars(o.stars, 3) + (o.best ? '<span class="k-sbest">' + I('star', 'ic-inline') + ' ' + o.best + '</span>' : '') + '</span></button></li>';
    },

    tip: function (html, text) { return '<span class="k-tip" tabindex="0" data-tip="' + esc(text) + '">' + html + '</span>'; },

    /* ---------- DOM: toast, konfirmasi, coachmark ---------- */
    _toastT: 0, _coachT: 0,
    mount: function (root) {
      this.root = root;
      root.insertAdjacentHTML('beforeend',
        '<div class="k-toast" id="k-toast" role="status" aria-live="polite"></div><div class="k-coach" id="k-coach" role="status" aria-live="polite"></div>' +
        '<div class="k-modal" id="k-modal" role="alertdialog" aria-modal="true" aria-labelledby="k-mt"><div class="k-panel k-small"><span class="k-peek">' + PEEK + '</span><div class="k-body">' +
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
    /** Coachmark pendek (≤ 6 kata) di atas arena; muncul hanya pertama kali. */
    coach: function (text, ms) {
      const t = document.getElementById('k-coach'); if (!t) return;
      t.textContent = text; t.classList.add('show'); clearTimeout(this._coachT);
      this._coachT = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
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
