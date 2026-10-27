/* menu.js — Main Menu (kategori + kesulitan) dan Pilih Step (peta petualangan 5 simpul). Dibangun dari UI kit (js/ui/kit.js).
 * Pilihan terakhir disimpan di localStorage (Storage.sel). Kategori & tabel kesulitan ada di questions.js, step di levels.js. */
(function (GA) {
  'use strict';
  const Q = GA.Questions, Storage = GA.Storage, MT = GA.MathText, K = GA.Kit, T = GA.T;

  const I = function (n, c) { return GA.Icons.html(n, c); };
  const EXAMPLES = { add: '7 + 5', sub: '15 − 8', mul: '6 × 7', div: '48 ÷ 6', int: '(−4) + 9', frac: '1/2 + 1/4', dec: '0,5 + 1,2', mix: '✦' };
  const NODE_ICO = ['dragon', 'wave', 'flame', 'snow', 'wizard'];

  let H = null, sel = null, active = 0;

  function $(id) { return document.getElementById(id); }

  function buildScreens() {
    GA.UI.addScreen('menu', GA.UI.el('<section class="screen scroll dim" id="s-menu">' + K.panel({ title: T('menu.title'), back: 'm-back', cls: 'k-wide', body:
      '<div id="m-res" style="display:flex;justify-content:center"></div>' +
      '<div class="k-chips" id="m-opts"></div>' +
      '<div id="m-slots"></div>' +
      '<div class="k-cats" id="m-cats" role="radiogroup" aria-label="' + T('menu.cat') + '"></div>' +
      '<div id="m-diff"></div>' +
      K.button({ act: 'm-start', icon: 'flame', label: T('menu.pick'), size: 'big' }) }) + '</section>'));
    GA.UI.addScreen('steps', GA.UI.el('<section class="screen scroll dim" id="s-steps">' + K.panel({ title: T('steps.title'), back: 's-back', cls: 'k-wide', body:
      '<div id="s-res" style="display:flex;justify-content:center"></div><ol class="k-steps" id="s-map" aria-label="' + T('steps.title') + '"></ol>' }) + '</section>'));
  }

  function currentCat() { return sel.same ? sel.slots[0] : sel.slots[active]; }
  function catOf(i) { return sel.random ? null : Q.categoryById(sel.same ? sel.slots[0] : sel.slots[i]); }

  function renderMenu() {
    const LV = GA.Levels, steps = LV.STEPS;
    $('m-res').innerHTML = K.resbar({ eggs: LV.START_EGGS, stars: Storage.totalStars(), score: Storage.data.highScore });
    $('m-opts').innerHTML = K.toggle({ act: 'm-same', icon: 'mix', label: T('menu.same'), on: sel.same, chip: true }) + K.toggle({ act: 'm-random', icon: 'dice', label: T('menu.random'), on: sel.random, chip: true });
    // tab step hanya saat memilih per step
    $('m-slots').innerHTML = (sel.same || sel.random) ? '' : K.segmented({ act: 'm-slot', label: T('common.step'), items: steps.map(function (s, i) {
      return { id: i, label: i === steps.length - 1 ? T('common.boss') : String(i + 1), icon: NODE_ICO[i], on: i === active };
    }) });
    const cur = currentCat();
    $('m-cats').innerHTML = Q.CATEGORIES.map(function (c) {
      return K.card({ kind: 'cat', act: 'm-cat', id: c.id, name: c.name, color: c.color, icon: GA.Icons.cat[c.id], ex: MT.html(EXAMPLES[c.id]), on: !sel.random && c.id === cur, disabled: sel.random });
    }).join('');
    $('m-diff').innerHTML = K.segmented({ act: 'm-diff', label: T('menu.diff'), items: LV.DIFFS.map(function (d) { return { id: d, label: T('diff.' + d), tone: d, on: d === sel.diff }; }) });
  }

  function renderSteps() {
    const LV = GA.Levels, steps = LV.STEPS, diff = sel.diff, p = Storage.prog(diff), open = Storage.unlocked(diff);
    $('s-res').innerHTML = K.resbar({ eggs: LV.START_EGGS, stars: Storage.totalStars(), score: Storage.data.highScore });
    $('s-map').innerHTML = steps.map(function (s, i) {
      const cat = catOf(i), locked = i >= open, cleared = p.stars[i] > 0;
      return K.card({ kind: 'step', act: 's-go', i: i, n: i + 1, tag: s.boss ? T('common.boss') : T('common.step') + ' ' + (i + 1), name: s.place, icon: NODE_ICO[i],
        meta: cat ? cat.name : T('menu.random'), stars: p.stars[i], best: p.best[i], locked: locked, done: cleared, cur: i === open - 1 && !cleared, boss: !!s.boss });
    }).join('');
  }

  const Menu = {
    init: function (handlers) {
      H = handlers; buildScreens();
      GA.UI.extra = function (a, b) { Menu.act(a, b); };
    },

    open: function () { sel = Storage.sel; active = 0; renderMenu(); GA.UI.show('menu'); },
    openSteps: function () { renderSteps(); GA.UI.show('steps'); },

    /** Pilihan saat ini: { slots:[5], same, random, diff } */
    selection: function () { return { slots: sel.slots.slice(), same: sel.same, random: sel.random, diff: sel.diff }; },

    act: function (a, b) {
      switch (a) {
        case 'm-back': GA.UI.refreshTitle(); GA.UI.show('title'); return;
        case 'm-slot': active = +b.dataset.id; renderMenu(); return;
        case 'm-same': sel.same = !sel.same; if (sel.same) sel.slots = sel.slots.map(function () { return sel.slots[active]; }); renderMenu(); return;
        case 'm-random': sel.random = !sel.random; renderMenu(); return;
        case 'm-cat': if (sel.same) sel.slots = sel.slots.map(function () { return b.dataset.id; }); else sel.slots[active] = b.dataset.id; renderMenu(); return;
        case 'm-diff': sel.diff = b.dataset.id; renderMenu(); return;
        case 'm-start': Storage.sel = sel; Menu.openSteps(); return;
        case 's-back': Menu.open(); return;
        case 's-go': H.start(Menu.selection(), +b.dataset.i); return;
      }
    }
  };

  GA.Menu = Menu;
})(window.GA = window.GA || {});
