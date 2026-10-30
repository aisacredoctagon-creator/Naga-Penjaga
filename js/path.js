/* path.js — jalur lengkung (spline Catmull-Rom, di-resample per jarak tetap). */
(function (GA) {
  'use strict';

  const STEP = 2; // jarak antar sampel (px logis)

  /** Catmull-Rom sentripetal (alpha 0,5, algoritma Barry-Goldman): tidak melenceng/berputar pada titik kontrol yang jaraknya tidak merata. */
  function catmull(p0, p1, p2, p3, u) {
    const k = function (a, b) { return Math.max(1e-3, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]))); };
    const t0 = 0, t1 = t0 + k(p0, p1), t2 = t1 + k(p1, p2), t3 = t2 + k(p2, p3), t = t1 + (t2 - t1) * u, o = [0, 0];
    for (let c = 0; c < 2; c++) {
      const a1 = (t1 - t) / (t1 - t0) * p0[c] + (t - t0) / (t1 - t0) * p1[c], a2 = (t2 - t) / (t2 - t1) * p1[c] + (t - t1) / (t2 - t1) * p2[c], a3 = (t3 - t) / (t3 - t2) * p2[c] + (t - t2) / (t3 - t2) * p3[c];
      const b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2, b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3;
      o[c] = (t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2;
    }
    return o;
  }

  class Path {
    constructor(points) {
      // 1) sampel padat dari spline
      const dense = [];
      const n = points.length;
      for (let i = 0; i < n - 1; i++) {
        const p1 = points[i], p2 = points[i + 1];
        const p0 = i > 0 ? points[i - 1] : [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]], p3 = i + 2 < n ? points[i + 2] : [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
        const span = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const k = Math.max(4, Math.ceil(span / 6));
        for (let j = 0; j < k; j++) dense.push(catmull(p0, p1, p2, p3, j / k));
      }
      dense.push(points[n - 1].slice());

      // 2) resample dengan jarak tetap
      const xs = [dense[0][0]], ys = [dense[0][1]];
      let acc = 0, prev = dense[0];
      for (let i = 1; i < dense.length; i++) {
        let cur = dense[i];
        let seg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
        while (acc + seg >= STEP && seg > 0) {
          const f = (STEP - acc) / seg;
          const nx = prev[0] + (cur[0] - prev[0]) * f, ny = prev[1] + (cur[1] - prev[1]) * f;
          xs.push(nx); ys.push(ny);
          prev = [nx, ny];
          seg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
          acc = 0;
        }
        acc += seg;
        prev = cur;
      }
      this.xs = xs; this.ys = ys;
      this.step = STEP;
      this.length = (xs.length - 1) * STEP;
      this._poly = null;
    }

    /** Posisi & arah pada jarak d. Mengisi `out` agar tidak alokasi per frame. */
    at(d, out) {
      out = out || { x: 0, y: 0, a: 0 };
      const last = this.xs.length - 1;
      if (d <= 0) {
        const dx = this.xs[1] - this.xs[0], dy = this.ys[1] - this.ys[0], l = Math.hypot(dx, dy) || 1;
        out.x = this.xs[0] + dx / l * d; out.y = this.ys[0] + dy / l * d; out.a = Math.atan2(dy, dx);
        return out;
      }
      if (d >= this.length) {
        const dx = this.xs[last] - this.xs[last - 1], dy = this.ys[last] - this.ys[last - 1], l = Math.hypot(dx, dy) || 1;
        const e = d - this.length;
        out.x = this.xs[last] + dx / l * e; out.y = this.ys[last] + dy / l * e; out.a = Math.atan2(dy, dx);
        return out;
      }
      const f = d / STEP, i = Math.floor(f), t = f - i;
      out.x = this.xs[i] + (this.xs[i + 1] - this.xs[i]) * t;
      out.y = this.ys[i] + (this.ys[i + 1] - this.ys[i]) * t;
      const j = Math.min(last, i + 3), k = Math.max(0, i - 2);
      out.a = Math.atan2(this.ys[j] - this.ys[k], this.xs[j] - this.xs[k]);
      return out;
    }

    /** Path2D polyline (dicache) untuk menggambar alur. */
    poly() {
      if (this._poly) return this._poly;
      const p = new Path2D();
      p.moveTo(this.xs[0], this.ys[0]);
      for (let i = 4; i < this.xs.length; i += 4) p.lineTo(this.xs[i], this.ys[i]);
      p.lineTo(this.xs[this.xs.length - 1], this.ys[this.ys.length - 1]);
      this._poly = p;
      return p;
    }
  }

  /** Bangun jalur untuk layout tertentu. layout.play = {x,y,w,h}, layout.portrait */
  function forLayout(presetId, layout, R) {
    R = R || layout.ballR || 32;
    const def = GA.Paths.resolve(presetId, layout.portrait, layout, R) || GA.Paths.resolve('ular1', layout.portrait, layout, R);   // arketipe jalur (maps/paths.js): sudah dipilah potret/lanskap
    const pr = def;
    const pl = layout.play;
    const pad = layout.pad == null ? 40 : layout.pad; // jarak jalur dari tepi area main
    const padTop = GA.Paths.padTopFor(layout, R);      // margin atas lebih besar: jalur, portal, dan bola >= 1,5R di bawah zona HUD
    const iw = pl.w - pad * 2, ih = pl.h - padTop - pad;
    const map = function (p) {
      return [pl.x + pad + p[0] * iw, pl.y + padTop + p[1] * ih];
    };
    const path = new Path(pr.pts.map(map));
    const sh = pr.shooter ? map(pr.shooter) : [pl.x + pl.w / 2, pl.y + pl.h / 2];
    path.shooter = { x: sh[0], y: sh[1] };
    path.boss = pr.boss ? (function () { const b = map(pr.boss); return { x: b[0], y: b[1], R: pr.bossR || 0 }; })() : null;      // R boss (0 = ukuran standar)
    path.presetId = presetId; path.play = pl; path.star = !!pr.star;
    path.ctrl = (pr.ctrl || pr.pts).map(map);
    return GA.Paths.refine(path, R, layout, def);
  }

  /* ---------- gambar alur, lubang, START & FINISH ---------- */
  function drawTrack(ctx, path, r) {
    const C = GA.Theme.sceneColors().track, p = path.poly();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = r * 2 + 30;
    ctx.save(); ctx.translate(0, 4); ctx.stroke(p); ctx.restore();
    ctx.strokeStyle = C[0]; ctx.lineWidth = r * 2 + 24; ctx.stroke(p);
    ctx.strokeStyle = C[1]; ctx.lineWidth = r * 2 + 14; ctx.stroke(p);
    ctx.strokeStyle = C[2]; ctx.lineWidth = r * 2 - 4; ctx.stroke(p);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3; ctx.setLineDash([2, 16]); ctx.stroke(p); ctx.setLineDash([]);
  }

  function holeXY(path) {
    return { x: path.xs[path.xs.length - 1], y: path.ys[path.ys.length - 1] };
  }

  /** Sarang di ujung jalur (js/render/eggs.js): cincin batu, ranting, telur bersisik, cahaya. threat 0..1 = bola sihir mendekat. */
  function drawNest(ctx, path, r, t, eggs, maxEggs, shake, threat) { GA.Nest.draw(ctx, holeXY(path), r, t, eggs, maxEggs, shake, threat); }
  function drawHole(ctx, path, r, t) { drawNest(ctx, path, r, t, null, 5, 0); }   // kompatibilitas lama

  function pill(ctx, text, x, y, bg, fg, size) {
    ctx.font = '800 ' + size + 'px ' + GA.Theme.fonts.ui;
    const w = ctx.measureText(text).width + 22, h = size + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, x - w / 2, y - h / 2 + 3, w, h, h / 2); ctx.fill();
    ctx.fillStyle = bg; roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /** Pilih sisi paling lapang di sekitar titik (px,py) untuk label: jauh dari jalur (di luar bagian dekat titik itu) dan dari penembak. */
  function labelSpot(path, key, px, py, dist, skipFrom, skipTo) {
    const cache = path._lab || (path._lab = {});
    if (cache[key]) return cache[key];
    const pl = path.play, xs = path.xs, ys = path.ys;
    let best = null, bs = -1e9;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, x = px + Math.cos(a) * dist, y = py + Math.sin(a) * dist;
      if (pl && (x < pl.x + 55 || x > pl.x + pl.w - 55 || y < pl.y + 16 || y > pl.y + pl.h - 16)) continue;
      let m = Math.hypot(x - path.shooter.x, y - path.shooter.y) - 80;
      for (let i = 0; i < xs.length; i += 4) {
        const d = i * STEP; if (d >= skipFrom && d <= skipTo) continue;
        const dd = Math.hypot(xs[i] - x, ys[i] - y); if (dd < m) m = dd;
      }
      if (m > bs) { bs = m; best = [x, y]; }
    }
    return (cache[key] = best || [px, py + dist]);
  }

  /** Letak label SARANG (revisi 10): di sekitar sprite sarang (tepat di luar cincin batu), pilih posisi yang jarak persegi labelnya ke garis tengah jalur terjauh (>= R, jadi tidak menutupi bola mana pun),
   *  di dalam area bermain dan di luar lingkaran sayap naga. Dicache per jalur (tergantung ukuran font). */
  function nestLabelSpot(ctx, path, r, size) {
    const key = 'nest' + size, cache = path._lab || (path._lab = {}); if (cache[key]) return cache[key];
    ctx.font = '800 ' + size + 'px ' + GA.Theme.fonts.ui;
    const h = holeXY(path), pl = path.play, xs = path.xs, ys = path.ys, w = ctx.measureText('🥚 SARANG').width + 22, hh = size + 12, wing = GA.Paths.wingNeed(r) - r - 2;
    let best = null, bs = -1e9;
    for (let a = 0; a < 24; a++) for (let k = 0; k < 4; k++) {
      const ang = a * Math.PI / 12, d = r * (2.5 + k * 0.45) + hh / 2, x = h.x + Math.cos(ang) * d * (w / hh > 3 ? 1.45 : 1.2), y = h.y + Math.sin(ang) * d;
      if (x - w / 2 < pl.x + 6 || x + w / 2 > pl.x + pl.w - 6 || y - hh / 2 < pl.y + 4 || y + hh / 2 > pl.y + pl.h - 4) continue;
      if (Math.hypot(x - path.shooter.x, y - path.shooter.y) < wing + hh) continue;
      let m = 1e9;
      for (let i = 0; i < xs.length; i += 3) { const dx = Math.max(Math.abs(xs[i] - x) - w / 2, 0), dy = Math.max(Math.abs(ys[i] - y) - hh / 2, 0), dd = Math.hypot(dx, dy); if (dd < m) m = dd; }
      const sc = Math.min(m, r * 1.6) - k * 0.5;      // cukup lapang (>= 1,6R) lebih baik daripada makin jauh; hindari jarak besar dari sarang
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    return (cache[key] = best || [h.x, h.y + r * 3.2]);
  }

  /** Penanda START (di awal alur yang terlihat) dan FINISH (di lubang). */
  function drawMarkers(ctx, path, r, t, center, size) {
    const tmp = { x: 0, y: 0, a: 0 };
    size = size || 16;
    // START: panah bergerak sepanjang jalur + label di sisi yang lapang (dilewati bila ada portal: portal sendiri jadi penandanya)
    const hasPortal = !!(GA.Effects && GA.Effects.portalPos());
    const d0 = r * 2.6;
    for (let i = 0; i < 3 && !hasPortal; i++) {
      const d = d0 + ((t * 70 + i * 40) % 120);
      path.at(d, tmp);
      ctx.save(); ctx.translate(tmp.x, tmp.y); ctx.rotate(tmp.a);
      ctx.globalAlpha = 0.9 - i * 0.2;
      ctx.fillStyle = '#b69cff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(8, 0); ctx.lineTo(-8, 12); ctx.lineTo(-3, 0); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (!hasPortal) {
      path.at(d0 + 30, tmp);
      const s = labelSpot(path, 'start', tmp.x, tmp.y, r + 38, 0, d0 + 420);
      pill(ctx, 'MUNCUL', s[0], s[1], '#7a4ad8', '#fff', size);
    }

    // FINISH: label bendera di sisi lubang yang lapang
    const h = holeXY(path); let f;
    if (path.star) f = nestLabelSpot(ctx, path, r, size);      // rute grid (revisi 10): label SARANG di sisi sarang yang paling lapang, tidak menutupi bola mana pun
    else f = labelSpot(path, 'finish', h.x, h.y, r * 2.9, path.length - 420, path.length);
    pill(ctx, '🥚 SARANG', f[0], f[1], '#e0932a', '#fff', size);
  }

  GA.Path = { Path: Path, forLayout: forLayout, STEP: STEP, drawTrack: drawTrack, drawHole: drawHole, drawNest: drawNest, drawMarkers: drawMarkers, roundRect: roundRect, pill: pill, holeXY: holeXY };
})(window.GA = window.GA || {});
