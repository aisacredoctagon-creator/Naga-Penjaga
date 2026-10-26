/* menu.js — Main Menu: pilih kategori soal untuk tiap step (Step 1, Step 2, Boss), tingkat kesulitan, lalu mulai.
 * Pilihan terakhir disimpan di localStorage (Storage.sel). Kategori & tabel kesulitan ada di questions.js. */
(function (GA) {
  'use strict';
  const Q = GA.Questions, Storage = GA.Storage, MT = GA.MathText;

  const I = function (n, c) { return GA.Icons.html(n, c); };
  const EXAMPLES = {
    add: '7 + 5', sub: '15 − 8', mul: '6 × 7', div: '48 ÷ 6', int: '(−4) + 9', frac: '1/2 + 1/4', dec: '0,5 + 1,2', mix: 'Semua jenis'
  };
  const SLOT_LABEL = ['Step 1', 'Step 2', 'Boss'];

  let H = null, root = null, sel = null, active = 0;

  function esc(s) { return GA.UI.esc(s); }
  function $(id) { return document.getElementById(id); }

  function build() {
    root = GA.UI.el(
      '<section class="screen scroll dim" id="s-menu"><div class="panel wide menu-panel">' +
      '<div class="panel-head"><button class="btn btn-small" data-act="m-back">' + I('back') + ' Kembali</button><h2>Siapkan Petualangan</h2><span class="stat">★ <b id="m-stars">0</b></span></div>' +
      '<p class="m-help" id="m-help"></p>' +
      '<div class="m-slots" id="m-slots" role="tablist" aria-label="Pilih step"></div>' +
      '<div class="m-opts">' +
        '<button type="button" class="chip-btn" id="m-same" role="switch" data-act="m-same">Satu kategori untuk semua</button>' +
        '<button type="button" class="chip-btn" id="m-random" role="switch" data-act="m-random">' + I('dice') + ' Acak</button>' +
      '</div>' +
      '<div class="cat-grid" id="m-cats" role="radiogroup" aria-label="Kategori soal"></div>' +
      '<div class="m-diff" id="m-diff" role="radiogroup" aria-label="Tingkat kesulitan"></div>' +
      '<p class="m-diffnote" id="m-diffnote"></p>' +
      '<div class="m-summary" id="m-summary"></div>' +
      '<button class="btn btn-primary btn-big" data-act="m-start">' + I('flame') + ' Mulai Petualangan</button>' +
      '</div></section>');
    GA.UI.addScreen('menu', root);
  }

  /** Kategori yang sedang dipilih untuk slot aktif (atau semua bila "satu kategori"). */
  function currentCat() { return sel.same ? sel.slots[0] : sel.slots[active]; }

  function render() {
    const steps = GA.Levels.STEPS;
    $('m-stars').textContent = Storage.totalStars();
    $('m-help').textContent = sel.random
      ? 'Mode acak: kategori tiap step dipilih secara acak saat petualangan dimulai.'
      : (sel.same ? 'Satu kategori dipakai untuk semua step. Matikan pilihan itu untuk memilih per step.' : 'Pilih step, lalu pilih kategori soalnya.');

    // slot
    let sl = '';
    for (let i = 0; i < 3; i++) {
      const cat = sel.random ? null : Q.categoryById(sel.same ? sel.slots[0] : sel.slots[i]);
      const on = !sel.same && !sel.random && i === active;
      sl += '<button type="button" class="slot' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-act="m-slot" data-i="' + i + '"' + (sel.same || sel.random ? ' aria-disabled="true"' : '') + '>' +
        '<span class="sl-tag">' + SLOT_LABEL[i] + '</span><span class="sl-place">' + esc(steps[i].place) + '</span>' +
        '<span class="sl-cat">' + (cat ? I(GA.Icons.cat[cat.id], 'ic-inline') + ' ' + esc(cat.name) : I('dice', 'ic-inline') + ' Acak') + '</span></button>';
    }
    $('m-slots').innerHTML = sl;
    setSwitch($('m-same'), sel.same); setSwitch($('m-random'), sel.random);

    // kategori
    const cur = currentCat();
    let cg = '';
    Q.CATEGORIES.forEach(function (c) {
      const on = !sel.random && c.id === cur;
      cg += '<button type="button" class="cat' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="m-cat" data-id="' + c.id + '" style="--c:' + c.color + '"' + (sel.random ? ' disabled' : '') + '>' +
        '<span class="cat-ico">' + I(GA.Icons.cat[c.id]) + '</span><span class="cat-name">' + esc(c.name) + '</span><span class="cat-ex">' + MT.html(EXAMPLES[c.id]) + '</span></button>';
    });
    $('m-cats').innerHTML = cg;

    // kesulitan
    let dg = '';
    GA.Levels.DIFFS.forEach(function (d) {
      const on = d === sel.diff;
      dg += '<button type="button" class="diff d-' + d + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="m-diff" data-id="' + d + '">' + GA.Levels.DIFF_NAMES[d] + '</button>';
    });
    $('m-diff').innerHTML = dg;
    $('m-diffnote').textContent = GA.Levels.DIFF_NOTES[sel.diff];

    // ringkasan
    const names = sel.random ? ['Acak', 'Acak', 'Acak'] : [0, 1, 2].map(function (i) { return Q.categoryById(sel.same ? sel.slots[0] : sel.slots[i]).name; });
    let sum = '<li><b>Step 1</b> ' + esc(steps[0].place) + ': ' + esc(names[0]) + '</li>' +
      '<li><b>Step 2</b> ' + esc(steps[1].place) + ': ' + esc(names[1]) + '</li>' +
      '<li><b>Boss</b> ' + esc(steps[2].place) + ': ' + esc(names[2]) + ' (fase 3 campur semua kategori di atas)</li>' +
      '<li><b>Kesulitan</b> ' + GA.Levels.DIFF_NAMES[sel.diff] + '</li>';
    if (!sel.random) {
      const rec = Storage.run(Storage.runKey(sel.same ? [sel.slots[0], sel.slots[0], sel.slots[0]] : sel.slots, sel.diff));
      sum += '<li><b>Bintang terbaik</b> ' + rec.stars.map(function (n) { return GA.UI.starsHTML(n, 3).replace(/ style="[^"]*"/g, ''); }).join(' · ') + (rec.best ? ' · Rekor ' + rec.best : '') + '</li>';
    }
    $('m-summary').innerHTML = '<ul>' + sum + '</ul>';
  }

  function setSwitch(btn, on) { btn.classList.toggle('on', !!on); btn.setAttribute('aria-checked', on ? 'true' : 'false'); }

  const Menu = {
    init: function (handlers) {
      H = handlers; build();
      GA.UI.extra = function (a, b) { Menu.act(a, b); };
    },

    open: function () {
      sel = Storage.sel; active = 0;
      render(); GA.UI.show('menu');
    },

    /** Pilihan saat ini: { slots:[3], same, random, diff } */
    selection: function () { return { slots: sel.slots.slice(), same: sel.same, random: sel.random, diff: sel.diff }; },

    act: function (a, b) {
      switch (a) {
        case 'm-back': GA.UI.refreshTitle(); GA.UI.show('title'); return;
        case 'm-slot': if (!sel.same && !sel.random) { active = +b.dataset.i; render(); } return;
        case 'm-same':
          sel.same = !sel.same; if (sel.same) sel.slots = [sel.slots[active], sel.slots[active], sel.slots[active]];
          render(); return;
        case 'm-random': sel.random = !sel.random; render(); return;
        case 'm-cat':
          if (sel.same) sel.slots = [b.dataset.id, b.dataset.id, b.dataset.id]; else sel.slots[active] = b.dataset.id;
          render(); return;
        case 'm-diff': sel.diff = b.dataset.id; render(); return;
        case 'm-start':
          Storage.sel = sel;
          H.start(Menu.selection());
          return;
      }
    }
  };

  GA.Menu = Menu;
})(window.GA = window.GA || {});
