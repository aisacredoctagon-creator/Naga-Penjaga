/* story.js — cerita petualangan: panel pembuka (bisa dilewati, tampil sekali) dan akhir menang/kalah.
 * Nama tokoh dan teks mudah diganti di `names` dan `intro`/`win`/`lose` (pakai {dragon}, {dragonName}, {wizard}, {wizardName}, {place}).
 * Ilustrasi digambar lewat kode (placeholder) pada kanvas kecil di tiap panel. */
(function (GA) {
  'use strict';
  const PI2 = Math.PI * 2;

  const names = { dragon: 'Naga Penjaga', dragonName: 'Draka', wizard: 'Penyihir Jahat', wizardName: 'Morvax', place: 'Lembah Telur' };

  const intro = [
    { art: 'sleep', title: 'story.1.t', text: 'story.1' },
    { art: 'wizard', title: 'story.2.t', text: 'story.2' },
    { art: 'steal', title: 'story.3.t', text: 'story.3' },
    { art: 'hero', title: 'story.4.t', text: 'story.4' }
  ];

  const win = { art: 'win', title: 'story.win.t', text: 'story.win' };
  const lose = { art: 'lose', title: 'story.lose.t', text: 'story.lose' };

  function fmt(s) { s = GA.T(s); return String(s).replace(/\{(\w+)\}/g, function (m, k) { return names[k] != null ? names[k] : m; }); }

  function sky(ctx, w, h, a, b) {
    ctx.fillStyle = a; ctx.fillRect(0, 0, w, h * 0.58); ctx.fillStyle = b; ctx.fillRect(0, h * 0.58, w, h * 0.42);      // datar 2 nada (revisi 11)
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [[0.14, 0.16, 1.4], [0.33, 0.09, 1], [0.7, 0.14, 1.2], [0.88, 0.3, 1], [0.2, 0.38, 0.9], [0.56, 0.06, 0.9]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0] * w, s[1] * h, s[2], 0, PI2); ctx.fill(); });
  }
  function ground(ctx, w, h) { ctx.fillStyle = '#2d6a4a'; ctx.beginPath(); ctx.ellipse(w / 2, h * 1.02, w * 0.75, h * 0.22, 0, 0, PI2); ctx.fill(); }
  function orb(ctx, x, y, r, ci) { GA.Chain.drawBall(ctx, x, y, r, ci, '', 1); }
  function egg(ctx, x, y, w, h, tint) {
    ctx.fillStyle = tint; ctx.strokeStyle = '#12101f'; ctx.lineWidth = 1.5; GA.Chain.eggPath(ctx, x, y, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - w * 0.3, y - h * 0.4, w * 0.2, h * 0.14, -0.5, 0, PI2); ctx.fill();
  }
  function wizard(ctx, x, y, R, t, mood) { if (GA.Bosses && GA.Bosses.drawFigure) GA.Bosses.drawFigure(ctx, x, y, R, t, mood); }
  function dragon(ctx, x, y, R, t, mood, aim) {
    const d = ctx._dragon || (ctx._dragon = new GA.Dragon.Dragon());
    d.setAim(aim == null ? -Math.PI / 2 : aim); if (mood) d.react(mood); d.update(0.016, true);
    d.draw(ctx, x, y, R, null);
  }

  /** Gambar ilustrasi panel pada kanvas berukuran w×h (piksel logis). */
  function drawArt(ctx, kind, w, h, t) {
    ctx.save();
    if (kind === 'sleep') {
      sky(ctx, w, h, '#1a1550', '#4a3a96'); ground(ctx, w, h);
      ctx.translate((w - h) / 2, 0); GA.Dragon.drawSleeping(ctx, h, h, t); ctx.restore(); return;
    }
    if (kind === 'wizard') {
      sky(ctx, w, h, '#0e0a2e', '#3a1f7a'); ground(ctx, w, h);
      ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.2, h * 0.09, 0, PI2); ctx.fill();
      wizard(ctx, w * 0.5, h * 0.55, h * 0.26, t, 'idle');
      for (let i = 0; i < 5; i++) { const a = t * 1.2 + i * PI2 / 5; orb(ctx, w * 0.5 + Math.cos(a) * w * 0.38, h * 0.52 + Math.sin(a) * h * 0.2, h * 0.07, i * 2); }
    } else if (kind === 'steal') {
      sky(ctx, w, h, '#1a1150', '#6a2f8f'); ground(ctx, w, h);
      wizard(ctx, w * 0.78, h * 0.5, h * 0.2, t, 'laugh');
      [['#ffe9a8', 0.18], ['#ffd2e8', 0.36], ['#c9f0ff', 0.52]].forEach(function (e, i) {
        const x = w * e[1], y = h * (0.62 - ((t * 0.12 + i * 0.3) % 1) * 0.4);
        ctx.fillStyle = 'rgba(170,130,255,0.35)'; ctx.beginPath(); ctx.arc(x, y, h * 0.1, 0, PI2); ctx.fill();
        egg(ctx, x, y, h * 0.055, h * 0.075, e[0]);
      });
      orb(ctx, w * 0.62, h * 0.7, h * 0.06, 3); orb(ctx, w * 0.7, h * 0.74, h * 0.06, 0);
    } else if (kind === 'hero') {
      sky(ctx, w, h, '#2d1f78', '#d4562a'); ground(ctx, w, h);
      dragon(ctx, w * 0.3, h * 0.66, h * 0.2, t, null, -0.35);
      orb(ctx, w * 0.78, h * 0.28, h * 0.08, 2); orb(ctx, w * 0.9, h * 0.4, h * 0.08, 5);
      const k = (t * 0.9) % 1; GA.Shooter.drawAmmo(ctx, w * (0.42 + 0.36 * k), h * (0.58 - 0.3 * k), h * 0.07, { mult: 1, ci: -1 }, 1, t, -0.6);
    } else if (kind === 'win') {
      sky(ctx, w, h, '#2d7d6a', '#ffe08a'); ground(ctx, w, h);
      dragon(ctx, w * 0.5, h * 0.66, h * 0.22, t, 'cheer', -Math.PI / 2);
      [['#ffe9a8', 0.18], ['#ffd2e8', 0.3], ['#c9f0ff', 0.7], ['#e2ffd2', 0.82]].forEach(function (e, i) { egg(ctx, w * e[1], h * 0.86 + Math.sin(t * 2 + i) * 1.5, h * 0.05, h * 0.07, e[0]); });
      ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 12; i++) { const a = i * 0.9 + t, x = (i * 37 % 100) / 100 * w, y = ((t * 0.2 + i * 0.13) % 1) * h; ctx.fillRect(x, y, 3, 5); }
    } else {
      sky(ctx, w, h, '#150f3d', '#3a1f5a'); ground(ctx, w, h);
      dragon(ctx, w * 0.28, h * 0.68, h * 0.2, t, 'sad', -0.2);
      wizard(ctx, w * 0.74, h * 0.48, h * 0.24, t, 'laugh');
    }
    ctx.restore();
  }

  const Story = {
    names: names, intro: intro, win: win, lose: lose,
    fmt: fmt, drawArt: drawArt,
    /** Panel ke-i: { art, title, text } dengan nama sudah terisi. */
    panel: function (list, i) { const p = list[i]; return { art: p.art, title: fmt(p.title), text: fmt(p.text) }; }
  };

  GA.Story = Story;
})(window.GA = window.GA || {});
