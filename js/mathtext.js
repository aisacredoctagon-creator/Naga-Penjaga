/* mathtext.js — teks matematika dengan pecahan BERSUSUN (pembilang di atas penyebut).
 * Konvensi: token dipisah spasi; token "n/d" (boleh berawalan "−" atau "(") dianggap pecahan.
 *   contoh: "1/2 + 3/4 = ?"   "−5/6"   "(−3)"   "12,5"
 * Dipakai di HUD soal, bola (rantai & bola api), dan overlay (HTML). */
(function (GA) {
  'use strict';
  const FRAC = /^([(−-]*)(\d+)\/(\d+)([)]*)$/;

  function parse(text) {
    return String(text).split(' ').filter(Boolean).map(function (tok) {
      const m = FRAC.exec(tok);
      return m ? { frac: true, pre: m[1], n: m[2], d: m[3], post: m[4], raw: tok } : { frac: false, raw: tok };
    });
  }

  function setFont(ctx, size, fam) { ctx.font = '800 ' + size.toFixed(1) + 'px ' + (fam || GA.Theme.fonts.ui); }

  function tokenWidth(ctx, t, size) {
    if (!t.frac) { setFont(ctx, size); return ctx.measureText(t.raw).width; }
    setFont(ctx, size); const pw = ctx.measureText(t.pre + t.post).width;
    setFont(ctx, size * 0.66); const w = Math.max(ctx.measureText(t.n).width, ctx.measureText(t.d).width) + size * 0.24;
    return pw + w;
  }

  /** Ukuran {w, h} teks pada font `size` (h = tinggi tertinggi: pecahan ≈ 1,5 × size). */
  function measure(ctx, text, size) {
    const toks = parse(text); let w = 0, hasFrac = false;
    toks.forEach(function (t, i) { w += tokenWidth(ctx, t, size) + (i ? size * 0.3 : 0); if (t.frac) hasFrac = true; });
    return { w: w, h: hasFrac ? size * 1.55 : size * 1.1, frac: hasFrac };
  }

  /** Cari ukuran font terbesar (≤ size) agar muat dalam maxW × maxH. */
  function fit(ctx, text, maxW, maxH, size) {
    let s = size;
    for (let i = 0; i < 24 && s > 8; i++) { const m = measure(ctx, text, s); if (m.w <= maxW && m.h <= maxH) break; s *= 0.93; }
    return s;
  }

  /** Gambar teks rata tengah di (cx, cy). Garis pecahan berada di cy. stroke: warna kontur (atau null). */
  function draw(ctx, text, cx, cy, size, fill, stroke, strokeW) {
    const toks = parse(text), m = measure(ctx, text, size);
    let x = cx - m.w / 2;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const sw = strokeW == null ? Math.max(3, size * 0.2) : strokeW;
    function txt(s, tx, ty, sz) {
      setFont(ctx, sz); if (stroke) { ctx.lineWidth = sw; ctx.strokeStyle = stroke; ctx.strokeText(s, tx, ty); }
      ctx.fillStyle = fill; ctx.fillText(s, tx, ty);
    }
    toks.forEach(function (t, i) {
      if (i) x += size * 0.3;
      if (!t.frac) { txt(t.raw, x, cy + size * 0.04, size); setFont(ctx, size); x += ctx.measureText(t.raw).width; return; }
      setFont(ctx, size);
      const pw = t.pre ? ctx.measureText(t.pre).width : 0;
      if (t.pre) txt(t.pre, x, cy + size * 0.04, size);
      const fs = size * 0.66; setFont(ctx, fs);
      const fw = Math.max(ctx.measureText(t.n).width, ctx.measureText(t.d).width) + size * 0.24, fx = x + pw, mid = fx + fw / 2;
      const gap = size * 0.06, ty = cy - fs * 0.5 - gap, by = cy + fs * 0.5 + gap + size * 0.04;
      ctx.textAlign = 'center';
      txt(t.n, mid, ty, fs); txt(t.d, mid, by, fs);
      ctx.textAlign = 'left';
      if (stroke) { ctx.lineWidth = size * 0.1 + sw; ctx.strokeStyle = stroke; ctx.beginPath(); ctx.moveTo(fx + size * 0.04, cy); ctx.lineTo(fx + fw - size * 0.04, cy); ctx.stroke(); }
      ctx.lineWidth = Math.max(1.6, size * 0.08); ctx.strokeStyle = fill; ctx.beginPath(); ctx.moveTo(fx + size * 0.04, cy); ctx.lineTo(fx + fw - size * 0.04, cy); ctx.stroke();
      setFont(ctx, size);
      x = fx + fw;
      if (t.post) { txt(t.post, x, cy + size * 0.04, size); x += ctx.measureText(t.post).width; }
    });
  }

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  /** HTML untuk overlay: pecahan menjadi <span class="mfrac"><i>n</i><i>d</i></span>. */
  function html(text) {
    return parse(text).map(function (t) {
      return t.frac ? esc(t.pre) + '<span class="mfrac"><i>' + t.n + '</i><i>' + t.d + '</i></span>' + esc(t.post) : esc(t.raw);
    }).join(' ');
  }

  GA.MathText = { parse: parse, measure: measure, fit: fit, draw: draw, html: html, isFrac: function (s) { return FRAC.test(s); } };
})(window.GA = window.GA || {});
