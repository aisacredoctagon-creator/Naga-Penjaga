/* swap.js — PENUKARAN bola sihir: dua bola jawaban bertukar TEMPAT di rantai. Satu modul untuk SEMUA sumber (kelelawar di Stage 2, penyihir di Stage 3, penukar anti-macet).
 *
 * Aturan:
 *  - Hanya POSISI yang bertukar (Chain.swapPositions); soal aktif dan jawabannya tidak berubah (QuestionManager tidak disentuh), jarak antar-bola tetap rapat,
 *    kecepatan rantai tidak berubah.
 *  - Indikator (telegraph) Gameplay.SWAP_TELEGRAPH detik sebelum menukar: kedua bola berdenyut dengan cincin cahaya, dihubungkan busur energi melengkung bertanda
 *    ikon ⇄ dengan cincin hitung mundur kecil. Menempel pada bola (mengikuti gerak rantai), ukuran mengikuti radius bola (bukan piksel), bentuk ikon wajib ada (bukan hanya warna).
 *  - Eksekusi: gerak melengkung halus Gameplay.SWAP_ANIM detik (satu melintas di atas, satu di bawah) + percikan, tanpa celah di rantai.
 *  - Pasangan dipilih ACAK ber-seed: dua bola jawaban yang terlihat, jarak di rantai bervariasi, teks berbeda, bukan pasangan yang sama dua kali berturut-turut.
 *    Dikecualikan: bola yang sedang keluar dari portal, sedang hancur/disisipi/bergeser, sudah terjawab, atau di SWAP_END_GUARD (10%) terakhir jalur menuju sarang.
 *    Jeda antar-penukaran juga acak dalam rentang. Bila salah satu bola hancur / jadi terlarang saat indikator, pasangan itu batal ("fizzle").
 *  - Jeda/rotasi layar: hanya update() yang menghitung waktu (dipanggil hanya saat state 'playing'), posisi diambil dari bola tiap frame. */
(function (GA) {
  'use strict';
  const TAU = Math.PI * 2;

  /** Bola layak ditukar? (dipakai saat memilih DAN saat indikator berjalan). */
  function eligible(chain, b, gp, qm) {
    if (!b || b.kind !== 'num' || b.qid == null || b.sw) return false;
    if (chain.balls.indexOf(b) < 0) return false;
    if (!chain.visible(b) || !b.out || b.emT < gp.EMERGE_ANIM_TIME || b.vo !== 0 || b.lag > 1.5) return false;      // keluar portal / disisipi / menutup celah
    if (b.d > chain.path.length * (1 - gp.SWAP_END_GUARD)) return false;                                            // 10% terakhir menuju sarang
    if (qm && qm.isSolved(b.qid)) return false;
    return true;
  }

  /** Pilih sampai `n` pasangan acak (saling lepas). Mengembalikan [[a, b], ...]. last = {kunci: 1} pasangan penukaran sebelumnya ("idA|idB" terurut) agar tidak berulang. */
  function pickPairs(chain, rng, n, gp, qm, last) {
    const pool = chain.balls.filter(function (b) { return eligible(chain, b, gp, qm); }), out = [], used = {};
    for (let k = 0; k < n; k++) {
      const free = pool.filter(function (b) { return !used[b.id]; });
      if (free.length < 2) break;
      let pair = null;
      for (let tries = 0; tries < 24 && !pair; tries++) {
        const a = free[Math.floor(rng() * free.length)], b = free[Math.floor(rng() * free.length)];
        if (a === b || a.text === b.text) continue;
        const key = Math.min(a.id, b.id) + '|' + Math.max(a.id, b.id);
        if (last[key]) continue;      // tidak pernah pasangan yang sama dengan penukaran sebelumnya (bila hanya itu pilihannya, tunda)
        pair = [a, b];
      }
      if (!pair) break;
      used[pair[0].id] = used[pair[1].id] = 1; out.push(pair);
    }
    return out;
  }

  class SwapManager {
    /** o: { chain, rng, every: [min, maks] detik | null, pairs() → jumlah pasangan, gp, qm?, actor: 'bat' | 'wizard' | null, hooks: { warn(pairs), go(pairs), fizzle(ball), done() } } */
    constructor(o) {
      this.o = o; this.chain = o.chain; this.rng = o.rng; this.gp = o.gp; this.every = o.every;
      this.timer = this.every ? this.next() * 0.8 : 1e9;      // penukaran pertama sedikit lebih awal dari jeda penuh
      this.pend = null; this.last = {}; this.actor = null; this.stats = { telegraphs: 0, executed: 0, fizzled: 0, picked: [] };
    }
    next() { const e = this.every; return e[0] + this.rng() * (e[1] - e[0]); }
    setEvery(e) { this.every = e; if (!e) this.timer = 1e9; }
    get active() { return !!this.pend; }

    update(dt) {
      const gp = this.gp, ch = this.chain, o = this.o;
      if (this.actor) this.actor.t += dt;
      if (this.pend) {
        const p = this.pend; p.t += dt;
        p.pairs = p.pairs.filter(function (pr) {      // salah satu bola hancur / jadi terlarang selama indikator: batal dengan efek kecil
          const bad = !eligible(ch, pr[0], gp, o.qm) || !eligible(ch, pr[1], gp, o.qm);
          if (bad) { this.stats.fizzled++; if (o.hooks && o.hooks.fizzle) o.hooks.fizzle(pr); }
          return !bad;
        }, this);
        if (!p.pairs.length) { this.finish(); return; }
        if (p.t >= p.dur) {
          if (o.hooks && o.hooks.before) o.hooks.before(p.pairs);
          p.pairs.forEach(function (pr) { ch.swapPositions(pr[0], pr[1], gp.SWAP_ANIM); }); this.stats.executed += p.pairs.length;
          this.last = {}; p.pairs.forEach(function (pr) { this.last[Math.min(pr[0].id, pr[1].id) + '|' + Math.max(pr[0].id, pr[1].id)] = 1; }, this);
          if (o.hooks && o.hooks.go) o.hooks.go(p.pairs);
          this.finish(true);
        }
        return;
      }
      if (!this.every) return;
      this.timer -= dt;
      if (this.timer > 0) return;
      const pairs = pickPairs(ch, this.rng, Math.max(1, o.pairs ? o.pairs() : 1), gp, o.qm, this.last);
      if (!pairs.length) { this.timer = 1.0; return; }       // belum ada dua bola yang layak: coba lagi sebentar lagi
      this.pend = { pairs: pairs, t: 0, dur: gp.SWAP_TELEGRAPH }; this.stats.telegraphs++;
      pairs.forEach(function (pr) { this.stats.picked.push([pr[0].id, pr[1].id]); }, this);
      if (o.actor) this.actor = { kind: o.actor, t: 0, phase: 'in', a: pairs[0][0], sx: 0, sy: 0 };
      if (o.hooks && o.hooks.warn) o.hooks.warn(pairs);
    }
    finish(executed) {
      this.pend = null; this.timer = this.next();
      if (this.actor) { if (executed) { this.actor.phase = 'out'; this.actor.t = 0; } else this.actor = null; }
      if (this.o.hooks && this.o.hooks.done) this.o.hooks.done();
    }

    /** 0..1 kemajuan indikator (untuk hitung mundur kecil dan aksi pelaku boss). */
    progress() { return this.pend ? Math.min(1, this.pend.t / this.pend.dur) : 0; }

    /* ---------- gambar (digambar di atas bola, di bawah naga) ---------- */
    draw(ctx, t, R) {
      if (this.pend) this.pend.pairs.forEach(function (pr) { this.drawPair(ctx, pr[0], pr[1], t, R); }, this);
      if (this.actor && this.actor.kind === 'bat') this.drawBat(ctx, t, R);
    }

    drawPair(ctx, a, b, t, R) {
      const k = this.progress(), pulse = 0.5 + 0.5 * Math.sin(t * (9 + 10 * k)), warn = '#c9a0ff', hot = '#ffe27a';
      // cincin berdenyut di kedua bola (makin cepat mendekati penukaran)
      [a, b].forEach(function (q) {
        ctx.save(); ctx.lineWidth = Math.max(2.5, R * 0.12); ctx.strokeStyle = k > 0.75 ? hot : warn; ctx.globalAlpha = 0.65 + 0.35 * pulse;
        ctx.beginPath(); ctx.arc(q.x, q.y, R * (1.12 + 0.12 * pulse), 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.35 * (1 - pulse); ctx.beginPath(); ctx.arc(q.x, q.y, R * (1.35 + 0.35 * pulse), 0, TAU); ctx.stroke(); ctx.restore();
      });
      // busur energi melengkung (menonjol tegak lurus), dua lapis + garis putus mengalir
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      const bulge = Math.min(len * 0.35, R * 3) + R * 0.8, cx = mx + nx * bulge, cy = my + ny * bulge, bx = (a.x + 2 * cx + b.x) / 4, by = (a.y + 2 * cy + b.y) / 4;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(201,160,255,0.35)'; ctx.lineWidth = R * 0.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx, cy, b.x, b.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(2, R * 0.12); ctx.setLineDash([R * 0.5, R * 0.35]); ctx.lineDashOffset = -t * R * 2.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(cx, cy, b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
      // lencana ⇄ dengan cincin hitung mundur (arc yang menyusut)
      const r = R * 0.62;
      ctx.fillStyle = 'rgba(30,14,60,0.92)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
      ctx.lineWidth = Math.max(2.5, R * 0.13); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = k > 0.75 ? hot : warn; ctx.beginPath(); ctx.arc(bx, by, r, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - k)); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, R * 0.1); ctx.lineJoin = 'round';
      const s = r * 0.5; ctx.beginPath();                      // ikon panah-tukar ⇄
      ctx.moveTo(bx - s, by - s * 0.34); ctx.lineTo(bx + s, by - s * 0.34); ctx.moveTo(bx + s * 0.45, by - s * 0.8); ctx.lineTo(bx + s, by - s * 0.34); ctx.lineTo(bx + s * 0.45, by + s * 0.12);
      ctx.moveTo(bx + s, by + s * 0.4); ctx.lineTo(bx - s, by + s * 0.4); ctx.moveTo(bx - s * 0.45, by - s * 0.06); ctx.lineTo(bx - s, by + s * 0.4); ctx.lineTo(bx - s * 0.45, by + s * 0.86); ctx.stroke();
      ctx.restore();
    }

    /** Kelelawar: terbang dari tepi layar mendekati bola pertama pasangan selama indikator, lalu pergi setelah menukar. */
    drawBat(ctx, t, R) {
      const A = this.actor, W = (GA.view && GA.view.W) || 960, a = A.a; if (!a) return;
      const dur = this.gp.SWAP_TELEGRAPH, ax = a.x, ay = a.y - R * 1.7, fromLeft = ax > W / 2, sx = fromLeft ? W + 60 : -60, sy = Math.max(70, ay - R * 3);
      let x, y;
      if (A.phase === 'in') { const u = Math.min(1, A.t / dur), e = u * u * (3 - 2 * u); x = sx + (ax - sx) * e; y = sy + (ay - sy) * e + Math.sin(u * 9) * R * 0.3; }
      else { const u = Math.min(1, A.t / 0.7), e = u * u * (3 - 2 * u); x = ax + ((fromLeft ? -80 : W + 80) - ax) * e; y = ay - e * R * 2 + Math.sin(u * 9) * R * 0.3; if (u >= 1) { this.actor = null; return; } }
      GA.Swap.drawBat(ctx, x, y, t, R * 0.8);
    }
  }

  /** Gambar kelelawar penyihir (kode murni). s = skala (≈ radius bola). */
  function drawBat(ctx, x, y, t, s) {
    const flap = Math.sin(t * 22) * 0.6;
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20); s = 20;
    ctx.fillStyle = '#2a1650'; ctx.strokeStyle = '#120a28'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    for (let sd = -1; sd <= 1; sd += 2) {
      ctx.beginPath(); ctx.moveTo(sd * 4, 0);
      ctx.quadraticCurveTo(sd * s * 0.8, -s * (0.9 + flap), sd * s * 1.5, -s * (0.1 + flap * 0.4));
      ctx.quadraticCurveTo(sd * s * 1.1, s * 0.15, sd * s * 0.75, s * 0.05); ctx.quadraticCurveTo(sd * s * 0.5, s * 0.5, sd * 4, s * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.32, s * 0.45, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.26, -s * 0.2); ctx.lineTo(-s * 0.2, -s * 0.55); ctx.lineTo(-s * 0.04, -s * 0.28); ctx.moveTo(s * 0.26, -s * 0.2); ctx.lineTo(s * 0.2, -s * 0.55); ctx.lineTo(s * 0.04, -s * 0.28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5ad2'; ctx.beginPath(); ctx.arc(-s * 0.12, -s * 0.02, s * 0.07, 0, TAU); ctx.arc(s * 0.12, -s * 0.02, s * 0.07, 0, TAU); ctx.fill();
    ctx.restore();
  }

  GA.Swap = { SwapManager: SwapManager, pickPairs: pickPairs, eligible: eligible, drawBat: drawBat };
})(window.GA = window.GA || {});
