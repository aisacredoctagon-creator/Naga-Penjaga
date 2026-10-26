/* obstacles.js — rintangan yang bisa dikonfigurasi per stage.
 *
 * cfg = {
 *   rocks:  [{ a: -60, dist: 100, r: 20 }, ...]       // batu statis: sudut (derajat, 0=kanan, -90=atas), jarak dari penembak
 *   movers: [
 *     { type:'sweep', offset:-95, range:170, speed:1.3, r:16 },       // bolak-balik (sumbu panjang layar)
 *     { type:'orbit', radius:92, speed:1.6, count:1, r:14 }            // berputar mengelilingi penembak
 *   ]
 * }
 * Peluru yang mengenai rintangan hilang dan nyawa berkurang (diurus main.js).
 */
(function (GA) {
  'use strict';
  const Theme = GA.Theme;

  class ObstacleSet {
    constructor(cfg, shooter, portrait, opts) {
      cfg = cfg || {}; opts = opts || {};
      this.cx = shooter.x; this.cy = shooter.y; this.portrait = !!portrait;
      const clear = opts.clear || function () { return 1e9; };          // jarak titik ke tepi alur
      const frogR = opts.frogR || 40, K = 1 + ((opts.unit || 1) - 1) * 0.6; // rintangan ikut membesar sedikit
      const cx = this.cx, cy = this.cy;
      // batu: geser mendekati katak sampai tidak menimpa alur
      this.rocks = (cfg.rocks || []).map(function (r, i) {
        const a = r.a * Math.PI / 180, rr = (r.r || 20) * K, pts = [];
        for (let k = 0; k < 9; k++) pts.push(0.82 + ((Math.sin(i * 7.7 + k * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.3);
        const lo = frogR + rr + 10; let d = Math.max(r.dist * K, lo), best = d, bc = -1e9;
        for (; d >= lo; d -= 3) { const c = clear(cx + Math.cos(a) * d, cy + Math.sin(a) * d); if (c > bc) { bc = c; best = d; } if (c >= rr + 4) { best = d; break; } }
        return { x: cx + Math.cos(a) * best, y: cy + Math.sin(a) * best, r: rr, pts: pts, rot: i * 1.3, flash: 0 };
      });
      this.movers = [];
      (cfg.movers || []).forEach(function (m) {
        const mr = (m.r || 15) * K, lo = frogR + mr + 8;
        if (m.type === 'orbit') {
          let rad = Math.max(m.radius * K, lo);
          for (; rad > lo; rad -= 3) { let ok = true; for (let k = 0; k < 16 && ok; k++) { const a = k * 0.3927; ok = clear(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad) >= mr + 2; } if (ok) break; }
          const n = m.count || 1;
          for (let i = 0; i < n; i++) this.movers.push({ type: 'orbit', radius: rad, speed: m.speed, phase: (m.phase || 0) + i * 6.283 / n, r: mr, x: 0, y: 0, flash: 0 });
        } else {
          const sgn = (m.offset || 0) < 0 ? -1 : 1;
          let off = Math.max(Math.abs(m.offset || 0) * K, lo), range = m.range || 150;
          const free = function (o, rg) { // seluruh jalur sapuan harus di luar alur
            for (let k = -4; k <= 4; k++) { const s = k / 4 * rg, x = portrait ? cx + sgn * o : cx + s, y = portrait ? cy + s : cy + sgn * o; if (clear(x, y) < mr + 2) return false; }
            return true;
          };
          for (; range >= 70; range -= 10) { let o = off; for (; o >= lo; o -= 4) if (free(o, range)) break; if (o >= lo) { off = o; break; } if (range <= 80) { off = lo; break; } }
          this.movers.push({ type: 'sweep', offset: sgn * off, range: range, speed: m.speed || 1.2, phase: m.phase || 0, r: mr, x: 0, y: 0, flash: 0 });
        }
      }, this);
      this.on = true;      // pengendali (boss): rintangan bergerak aktif atau tidak
      this.alpha = 1;
      this.t = 0;
      this.update(0);
    }

    setMovers(on) { this.on = !!on; }
    get hasMovers() { return this.movers.length > 0; }

    update(dt) {
      this.t += dt;
      const target = this.on ? 1 : 0;
      this.alpha += (target - this.alpha) * Math.min(1, dt * 4);
      for (const m of this.movers) {
        if (m.flash > 0) m.flash -= dt;
        if (m.type === 'orbit') {
          const a = m.phase + this.t * m.speed;
          m.x = this.cx + Math.cos(a) * m.radius; m.y = this.cy + Math.sin(a) * m.radius;
        } else {
          const s = Math.sin(m.phase + this.t * m.speed) * m.range;
          if (this.portrait) { m.x = this.cx + m.offset; m.y = this.cy + s; } else { m.x = this.cx + s; m.y = this.cy + m.offset; }
        }
      }
      for (const r of this.rocks) if (r.flash > 0) r.flash -= dt;
    }

    /** Kembalikan rintangan yang bersentuhan dengan lingkaran (x,y,r), atau null. */
    collide(x, y, r) {
      for (const o of this.rocks) { const rr = o.r * 0.92 + r; if ((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < rr * rr) return o; }
      if (this.alpha > 0.5) for (const o of this.movers) { const rr = o.r + r * 0.55; if ((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < rr * rr) return o; }
      return null;
    }

    /** Jarak ke rintangan pertama sepanjang sinar (untuk garis bidik). Infinity jika tidak ada. */
    rayDist(x, y, dx, dy) {
      let best = Infinity;
      const test = function (o, rad) {
        const fx = o.x - x, fy = o.y - y, proj = fx * dx + fy * dy;
        if (proj < 0) return;
        const d2 = fx * fx + fy * fy - proj * proj;
        if (d2 > rad * rad) return;
        const t = proj - Math.sqrt(rad * rad - d2);
        if (t > 0 && t < best) best = t;
      };
      for (const o of this.rocks) test(o, o.r * 0.92 + 10);
      if (this.alpha > 0.5) for (const o of this.movers) test(o, o.r + 10);
      return best;
    }

    hitFlash(o) { o.flash = 0.3; }

    draw(ctx, t) {
      // jalur orbit (petunjuk visual)
      for (const m of this.movers) {
        if (m.type === 'orbit' && this.alpha > 0.05) {
          ctx.globalAlpha = 0.18 * this.alpha; ctx.strokeStyle = '#6b3fd0'; ctx.lineWidth = 3; ctx.setLineDash([6, 10]);
          ctx.beginPath(); ctx.arc(this.cx, this.cy, m.radius, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
          break;
        }
      }
      const rockImg = Theme.sprite('rock');
      for (const o of this.rocks) {
        if (rockImg) { ctx.drawImage(rockImg, o.x - o.r * 1.15, o.y - o.r * 1.15, o.r * 2.3, o.r * 2.3); continue; }
        ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(o.x + 2, o.y + o.r * 0.55, o.r * 1.0, o.r * 0.55, 0, 0, 6.283); ctx.fill();
        ctx.beginPath();
        const n = o.pts.length;
        for (let i = 0; i < n; i++) {
          const a = o.rot + i / n * 6.283, rr = o.r * o.pts[i];
          const px = o.x + Math.cos(a) * rr, py = o.y + Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(o.x - o.r * 0.3, o.y - o.r * 0.4, 2, o.x, o.y, o.r * 1.1);
        g.addColorStop(0, '#d7dce6'); g.addColorStop(0.6, '#98a1b3'); g.addColorStop(1, '#5d667a');
        ctx.fillStyle = g; ctx.fill();
        ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#444c5e'; ctx.stroke();
        ctx.fillStyle = 'rgba(86,170,70,0.75)'; ctx.beginPath(); ctx.ellipse(o.x + o.r * 0.25, o.y - o.r * 0.55, o.r * 0.38, o.r * 0.14, 0.3, 0, 6.283); ctx.fill();
        if (o.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (o.flash / 0.3).toFixed(2) + ')'; ctx.fill(); }
      }

      if (this.alpha < 0.03) return;
      const mvImg = Theme.sprite('mover');
      ctx.globalAlpha = this.alpha;
      for (const m of this.movers) {
        const sc = 0.6 + 0.4 * this.alpha, r = m.r * sc;
        if (mvImg) { ctx.drawImage(mvImg, m.x - r * 1.3, m.y - r * 1.3, r * 2.6, r * 2.6); continue; }
        const orbit = m.type === 'orbit';
        const c1 = orbit ? '#a778ff' : '#ff9d3c', c2 = orbit ? '#5b2bd0' : '#d9531e';
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(t * (orbit ? 3 : -2));
        ctx.fillStyle = c2;
        for (let i = 0; i < 8; i++) { // duri
          const a = i * 0.7854;
          ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.2) * r, Math.sin(a - 0.2) * r); ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); ctx.lineTo(Math.cos(a + 0.2) * r, Math.sin(a + 0.2) * r); ctx.fill();
        }
        ctx.restore();
        const g = ctx.createRadialGradient(m.x - r * 0.3, m.y - r * 0.3, 1, m.x, m.y, r);
        g.addColorStop(0, '#fff'); g.addColorStop(0.25, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, 6.283); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(40,10,40,0.7)'; ctx.stroke();
        // mata marah
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(m.x - r * 0.32, m.y - r * 0.1, r * 0.26, 0, 6.283); ctx.arc(m.x + r * 0.32, m.y - r * 0.1, r * 0.26, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(m.x - r * 0.28, m.y - r * 0.05, r * 0.12, 0, 6.283); ctx.arc(m.x + r * 0.28, m.y - r * 0.05, r * 0.12, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.moveTo(m.x - r * 0.6, m.y - r * 0.5); ctx.lineTo(m.x - r * 0.1, m.y - r * 0.28); ctx.moveTo(m.x + r * 0.6, m.y - r * 0.5); ctx.lineTo(m.x + r * 0.1, m.y - r * 0.28); ctx.stroke();
        if (m.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (m.flash / 0.3).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
  }

  GA.Obstacles = { create: function (cfg, shooter, portrait, opts) { return new ObstacleSet(cfg, shooter, portrait, opts); }, ObstacleSet: ObstacleSet };
})(window.GA = window.GA || {});
