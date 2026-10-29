/* dev/layers.js — ?debug=layers: menandai MERAH setiap bola yang bertumpang tindih dengan elemen lain.
 * Penyebab ditulis di samping bola: HUD (bola masuk zona cadangan HUD = 1,5R di bawah panel), DEPAN (objek depan peta), SARANG, BOSS, NAGA (zona sayap/penembak), RINTANGAN (rintangan statis / zona). Ringkasan di pojok.
 * Urutan lapisan tetap (bawah → atas): 1 latar, 2 alur, 3 dekorasi/objek depan, 4 dasar/glow portal, 5 BOLA, 6 bola api + efek, 7 overlay penukaran, 8 HUD. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;

  /** Daftar penyebab tumpang tindih untuk satu bola (dipakai juga oleh uji). */
  function causes(b, sc, L) {
    const R = sc.R, out = [], ch = b.ch;
    if (!ch.visible(b)) return out;
    if (b.y - R < L.hud + 1.5 * R - 0.5) out.push('HUD');
    if (GA.Background && GA.Background.frontCover(b.x, b.y, R) > 0.12) out.push('DEPAN');
    const pp = GA.Effects && GA.Effects.portalPos ? GA.Effects.portalPos() : null;
    const hole = GA.Path.holeXY(sc.path);
    if (Math.hypot(b.x - hole.x, b.y - hole.y) < R * 1.1 && b.d < sc.path.length - R * 2) out.push('SARANG');
    if (sc.boss && Math.hypot(b.x - sc.boss.x, b.y - sc.boss.y) < sc.boss.R * 1.2 + R) out.push('BOSS');
    const dr = GA.Theme.dragon.radiusRatio * R;
    if (Math.hypot(b.x - sc.shooter.x, b.y - sc.shooter.y) < dr * 1.5 + R * 0.9) out.push('NAGA');
    if (sc.obst && sc.obst.collide && sc.obst.collide(b.x, b.y, R * 0.8)) out.push('RINTANGAN');
    return out;
  }

  function draw(ctx, sc, L, t) {
    if (!sc || !sc.chain) return;
    let n = 0; const txt = [];
    ctx.save(); ctx.lineWidth = 3; ctx.font = '700 11px monospace'; ctx.textBaseline = 'middle';
    (sc.chains || [sc.chain]).forEach(function (c) {
      c.balls.forEach(function (b) {
        const cs = causes(b, sc, L); if (!cs.length) return;
        n++; ctx.strokeStyle = 'rgba(255,40,40,' + (0.7 + 0.3 * Math.sin(t * 10)).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(b.x, b.y, sc.R * 1.15, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; const s = cs.join('+'); ctx.strokeText(s, b.x + sc.R * 1.2, b.y); ctx.fillText(s, b.x + sc.R * 1.2, b.y); ctx.lineWidth = 3;
      });
    });
    // zona cadangan HUD (garis hijau putus-putus) + ringkasan
    const y = L.hud + 1.5 * sc.R; ctx.strokeStyle = 'rgba(80,255,120,0.8)'; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L.W, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = n ? '#ff6a6a' : '#7dff9a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; const msg = '?debug=layers  bola tumpang tindih: ' + n; ctx.strokeText(msg, 30, y + 12); ctx.fillText(msg, 30, y + 12);
    ctx.restore();
    GA.LayersDebug.last = n;
  }

  GA.LayersDebug = { draw: draw, causes: causes, last: 0 };
})(window.GA = window.GA || {});
