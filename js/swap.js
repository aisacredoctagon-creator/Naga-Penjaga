/* swap.js — PENUKARAN bola sihir: dua bola jawaban bertukar TEMPAT di rantai. Satu modul untuk SEMUA sumber (kelelawar di Stage 2, penyihir di Stage 3, penukar anti-macet).
 *
 * Aturan:
 *  - Hanya POSISI yang bertukar (Chain.swapPositions); soal aktif dan jawabannya tidak berubah (QuestionManager tidak disentuh), jarak antar-bola tetap rapat,
 *    kecepatan rantai tidak berubah.
 *  - TIDAK MENDADAK: dari peringatan sampai mulai menukar Gameplay.SWAP_TELEGRAPH_MS (default 2500 ms, batas bawah 2000) dalam tiga fase:
 *      1. PERINGATAN (±0,8 dtk, SWAP_WARN_MS): ikon ⇄ di zona informasi HUD, SFX peringatan, pelaku (kelelawar / penyihir) mulai beraksi, cincin samar muncul di kedua bola;
 *      2. SOROT (sisanya, ±1,7 dtk): cincin berdenyut kontras di kedua bola, ikon ⇄ melayang di atas tiap bola (bentuk, bukan hanya warna), busur energi putus-putus,
 *         cincin hitung mundur yang mengisi, SFX naik nada; semuanya menempel pada bola (mengikuti rantai) dan digambar di lapisan 7 (tidak pernah tertutup);
 *      3. TUKAR (SWAP_ANIM, 0,5 dtk): gerak melengkung halus tanpa celah; SESUDAHNYA cincin memudar 1 dtk (SWAP_AFTER) di posisi BARU.
 *    prefers-reduced-motion: cincin statis (tanpa denyut / gelombang / goyang), tetapi jeda waktunya tetap sama.
 *  - Aturan: tidak ada penukaran dalam SWAP_MIN_START (4) dtk pertama stage atau SWAP_AFTER_QUESTION (3) dtk setelah soal aktif berganti (penukaran manual ?debug=swap melewati
 *    penjaga ini); eksekusi DITAHAN selama ada peluru terbang (indikator tetap tampil; jeda hanya bisa lebih lama, tidak pernah lebih pendek); bola hancur / terjawab / hilang selama
 *    telegraf membatalkan pasangan itu dengan efek kecil; jeda layar membekukan hitung mundur (update() hanya jalan saat 'playing'); rotasi layar tidak mengulang / memotong hitung mundur
 *    (waktu dihitung di sini, posisi diambil dari bola tiap frame); satu penukaran pada satu waktu (kecuali Stage 3 fase 2: dua pasangan, warna dan ikon berbeda).
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

  /** Selama indikator: pasangan batal hanya bila bola hancur / terjawab / hilang dari layar / masuk 10% terakhir (celah yang menutup di tempat lain tidak membatalkan). */
  function stillOk(chain, b, gp, qm) {
    if (!b || b.kind !== 'num' || chain.balls.indexOf(b) < 0 || !chain.visible(b)) return false;
    if (b.d > chain.path.length * (1 - gp.SWAP_END_GUARD)) return false;
    return !(qm && b.qid != null && qm.isSolved(b.qid));
  }

  /** Pilih sampai `n` pasangan acak (saling lepas). Mengembalikan [[a, b], ...]. last = {kunci: 1} pasangan penukaran sebelumnya ("idA|idB" terurut) agar tidak berulang.
   *  Jarak pasangan di rantai DIVARIASIKAN: jarak target acak 2..maks (maks = min(9, bola layak − 1)); bola kedua dipilih yang jaraknya paling dekat dengan target,
   *  jadi bukan hanya bertetangga. */
  function pickPairs(chain, rng, n, gp, qm, last) {
    const pool = chain.balls.filter(function (b) { return eligible(chain, b, gp, qm); }), out = [], used = {};
    const idx = function (b) { return chain.balls.indexOf(b); };
    for (let k = 0; k < n; k++) {
      const free = pool.filter(function (b) { return !used[b.id]; });
      if (free.length < 2) break;
      let pair = null;
      for (let tries = 0; tries < 30 && !pair; tries++) {
        const a = free[Math.floor(rng() * free.length)], ia = idx(a), maxGap = Math.max(2, Math.min(9, free.length - 1)), want = 2 + Math.floor(rng() * (maxGap - 1));
        let best = null, bd = 1e9;
        free.forEach(function (b) {
          if (b === a || a.text === b.text) return;
          const key = Math.min(a.id, b.id) + '|' + Math.max(a.id, b.id); if (last[key]) return;      // tidak pernah pasangan yang sama dengan penukaran sebelumnya
          const gap = Math.abs(idx(b) - ia), d = Math.abs(gap - want) + (gap < 2 ? 4 : 0) + rng() * 0.5;      // tetangga hanya bila terpaksa
          if (d < bd) { bd = d; best = b; }
        });
        if (best) pair = [a, best];
      }
      if (!pair) break;
      used[pair[0].id] = used[pair[1].id] = 1; out.push(pair);
    }
    return out;
  }

  const REDUCED = function () { return GA.Swap && GA.Swap.reduced != null ? !!GA.Swap.reduced : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  /** Warna per pasangan: pasangan ke-2 (Stage 3 fase 2) berwarna dan berikon lain: [dasar, akhir, ikon 'h' ⇄ | 'v' ⇅]. */
  const PAIR_STYLE = [['#4de8ff', '#ffd23f', 'h'], ['#ff7ae0', '#ff9a3a', 'v']];

  class SwapManager {
    /** o: { chain, rng, every: [min, maks] detik | null, pairs() → jumlah pasangan, gp, qm?, actor: 'bat' | 'wizard' | null, hooks: { warn(pairs), go(pairs), fizzle(pair), busy() → peluru terbang?, done() } } */
    constructor(o) {
      this.o = o; this.chain = o.chain; this.rng = o.rng; this.gp = o.gp; this.every = o.every;
      this.timer = this.every ? this.next() * 0.8 : 1e9;      // penukaran pertama sedikit lebih awal dari jeda penuh
      this.pend = null; this.post = null; this.last = {}; this.actor = null; this.clock = 0; this.qT = 1e9; this.qSerial = o.qm ? o.qm.serial : 0;
      this.stats = { telegraphs: 0, executed: 0, fizzled: 0, held: 0, picked: [], intervals: [], starts: [], blockedStart: 0 };
    }
    next() { const e = this.every; return e[0] + this.rng() * (e[1] - e[0]); }
    setEvery(e) { this.every = e; if (!e) this.timer = 1e9; }
    get active() { return !!this.pend; }
    /** Lama peringatan → mulai menukar (dtk), selalu >= 2 dtk. */
    get dur() { return Math.max(2, this.gp.SWAP_TELEGRAPH || 2.5); }
    get warnDur() { return Math.min(this.gp.SWAP_WARN || 0.8, this.dur * 0.5); }
    /** Penjaga waktu penukaran terjadwal. */
    guardOk() { return this.clock >= this.gp.SWAP_MIN_START && this.qT >= this.gp.SWAP_AFTER_QUESTION; }

    update(dt) {
      const gp = this.gp, ch = this.chain, o = this.o;
      this.clock += dt;
      if (o.qm) { if (o.qm.serial !== this.qSerial) { this.qSerial = o.qm.serial; this.qT = 0; } else this.qT += dt; }
      if (this.actor) this.actor.t += dt;
      if (this.post) { this.post.t += dt; if (this.post.t >= gp.SWAP_ANIM + gp.SWAP_AFTER) this.post = null; }
      if (this.pend) {
        const p = this.pend; p.t += dt;
        p.pairs = p.pairs.filter(function (pr) {      // salah satu bola hancur / jadi terlarang selama indikator: batal dengan efek kecil
          const bad = !stillOk(ch, pr[0], gp, o.qm) || !stillOk(ch, pr[1], gp, o.qm);
          if (bad) { this.stats.fizzled++; if (o.hooks && o.hooks.fizzle) o.hooks.fizzle(pr); }
          return !bad;
        }, this);
        if (!p.pairs.length) { this.finish(); return; }
        if (p.t >= p.dur) {
          if (o.hooks && o.hooks.busy && o.hooks.busy()) { if (!p.held) { p.held = true; this.stats.held++; } return; }      // peluru terbang: tahan (indikator tetap tampil)
          if (o.hooks && o.hooks.before) o.hooks.before(p.pairs);
          p.pairs.forEach(function (pr) { ch.swapPositions(pr[0], pr[1], gp.SWAP_ANIM); }); this.stats.executed += p.pairs.length; this.stats.intervals.push(+p.t.toFixed(3));
          this.last = {}; p.pairs.forEach(function (pr) { this.last[Math.min(pr[0].id, pr[1].id) + '|' + Math.max(pr[0].id, pr[1].id)] = 1; }, this);
          this.post = { pairs: p.pairs, t: 0 };
          if (o.hooks && o.hooks.go) o.hooks.go(p.pairs);
          this.finish(true);
        }
        return;
      }
      if (!this.every) return;
      this.timer -= dt;
      if (this.timer > 0) return;
      if (!this.guardOk()) { this.stats.blockedStart++; this.timer = 0.4; return; }      // terlalu dekat awal stage / pergantian soal: tunda
      if (!this.start(true)) this.timer = 1.0;       // belum ada dua bola yang layak: coba lagi sebentar lagi
    }
    /** Mulai indikator sekarang (timer dan penjaga waktu diabaikan: dipakai jadwal setelah lolos guardOk dan penukaran manual ?debug=swap). false bila tidak ada pasangan layak atau indikator berjalan. */
    start(scheduled) {
      if (this.pend) return false;
      const gp = this.gp, ch = this.chain, o = this.o, pairs = pickPairs(ch, this.rng, Math.max(1, o.pairs ? o.pairs() : 1), gp, o.qm, this.last);
      if (!pairs.length) return false;
      this.pend = { pairs: pairs, t: 0, dur: this.dur, held: false }; this.post = null; this.stats.telegraphs++;
      this.stats.starts.push({ clock: +this.clock.toFixed(2), qT: +Math.min(this.qT, 999).toFixed(2), manual: !scheduled });
      pairs.forEach(function (pr) { this.stats.picked.push([pr[0].id, pr[1].id]); }, this);
      if (o.actor) this.actor = { kind: o.actor, t: 0, phase: 'in', a: pairs[0][0], sx: 0, sy: 0 };
      if (o.hooks && o.hooks.warn) o.hooks.warn(pairs);
      return true;
    }
    finish(executed) {
      this.pend = null; this.timer = this.every ? this.next() : 1e9;
      if (this.actor) { if (executed) { this.actor.phase = 'out'; this.actor.t = 0; } else this.actor = null; }
      if (this.o.hooks && this.o.hooks.done) this.o.hooks.done();
    }

    /** 0..1 kemajuan seluruh telegraf (aksi pelaku boss). */
    progress() { return this.pend ? Math.min(1, this.pend.t / this.pend.dur) : 0; }
    /** Fase sekarang: 'warn' | 'hi' | 'swap' | 'after' | null, dan kemajuan sorot 0..1 (hitung mundur). */
    phase() {
      if (this.pend) { const w = this.warnDur; return this.pend.t < w ? 'warn' : 'hi'; }
      if (this.post) return this.post.t < this.gp.SWAP_ANIM ? 'swap' : 'after';
      return null;
    }
    highlightProgress() { if (!this.pend) return 1; const w = this.warnDur; return Math.max(0, Math.min(1, (this.pend.t - w) / Math.max(0.01, this.pend.dur - w))); }

    /* ---------- gambar (digambar di atas bola, di bawah naga) ---------- */
    draw(ctx, t, R) {
      if (this.pend) this.pend.pairs.forEach(function (pr, i) { this.drawPair(ctx, pr[0], pr[1], t, R, i); }, this);
      else if (this.post) this.drawAfter(ctx, t, R);
      if (this.actor && this.actor.kind === 'bat') this.drawBat(ctx, t, R);
    }

    /** Posisi lencana ⇄ di atas bola q (melayang); bila terlalu dekat HUD/tepi, dipindah ke bawah/samping. Dipakai gambar dan uji keterlihatan. */
    static badgePos(q, R, t, out) {
      const V = GA.view || { W: 960, hud: 90 }, r = R * 0.62, bob = REDUCED() ? 0 : Math.sin(t * 5 + q.id) * R * 0.1;
      let y = q.y - R * 1.7 + bob; if (y - r < (V.hud || 0) + 4) y = q.y + R * 1.7 - bob;
      const x = Math.max(r + 4, Math.min(V.W - r - 4, q.x));
      out.x = x; out.y = y; out.r = r; return out;
    }

    /** Cincin kontras pada satu bola (garis luar gelap agar terbaca di bola gelap maupun terang). a = alfa, pulse 0..1 (bergelombang), expand = cincin gelombang keluar. */
    static drawRing(ctx, q, R, col, hot, pulse, k, t, a, still) {
      const dark = 'rgba(12,4,34,0.9)', w = Math.max(3, R * 0.14), rr = R * (1.16 + 0.08 * pulse);
      ctx.globalAlpha = a; ctx.strokeStyle = dark; ctx.lineWidth = w + 3.5; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, TAU); ctx.stroke();
      if (!still) for (let i = 0; i < 2; i++) { const u = (t * (1.1 + 1.4 * k) + i * 0.5) % 1; ctx.globalAlpha = a * (1 - u) * 0.85; ctx.strokeStyle = hot; ctx.lineWidth = Math.max(2, R * 0.09); ctx.beginPath(); ctx.arc(q.x, q.y, R * (1.2 + 0.9 * u), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    drawPair(ctx, a, b, t, R, idx) {
      const st = PAIR_STYLE[idx % PAIR_STYLE.length], still = REDUCED(), ph = this.phase(), w = this.warnDur, dark = 'rgba(12,4,34,0.9)';
      if (ph === 'warn') {      // peringatan: cincin samar yang makin jelas (utama: ikon ⇄ di zona informasi HUD + SFX)
        const u = this.pend.t / Math.max(0.01, w);
        ctx.save(); ctx.setLineDash([R * 0.5, R * 0.34]); ctx.lineCap = 'round';
        [a, b].forEach(function (q) { ctx.globalAlpha = 0.25 + 0.55 * u; ctx.strokeStyle = dark; ctx.lineWidth = Math.max(5, R * 0.22); ctx.beginPath(); ctx.arc(q.x, q.y, R * 1.16, 0, TAU); ctx.stroke(); ctx.strokeStyle = st[0]; ctx.lineWidth = Math.max(2.5, R * 0.12); ctx.lineDashOffset = still ? 0 : -t * R * 2; ctx.beginPath(); ctx.arc(q.x, q.y, R * 1.16, 0, TAU); ctx.stroke(); });
        ctx.restore(); return;
      }
      const k = this.highlightProgress(), pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * (9 + 11 * k)), late = k > 0.6, col = late ? st[1] : st[0], hot = st[1];
      const bp = [{ x: 0, y: 0, r: 0 }, { x: 0, y: 0, r: 0 }];
      [a, b].forEach(function (q, i) { SwapManager.badgePos(q, R, t, bp[i]); });
      // busur energi putus-putus yang menghubungkan kedua bola (menonjol ke sisi atas; cukup besar walau bertetangga)
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1; let nx = -dy / len, ny = dx / len; if (ny > 0) { nx = -nx; ny = -ny; }
      const bulge = Math.max(R * 1.9, Math.min(len * 0.3, R * 3)) + R * 0.4, cx = mx + nx * bulge * 2, cy = my + ny * bulge * 2;
      const edge = function (p, ex, ey) { const ux = ex - p.x, uy = ey - p.y, l = Math.hypot(ux, uy) || 1; return [p.x + ux / l * R * 1.22, p.y + uy / l * R * 1.22]; }, sa = edge(a, cx, cy), sb = edge(b, cx, cy);      // busur mulai dari tepi cincin: tidak menutupi angka bola
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = dark; ctx.lineWidth = Math.max(5, R * 0.26); ctx.beginPath(); ctx.moveTo(sa[0], sa[1]); ctx.quadraticCurveTo(cx, cy, sb[0], sb[1]); ctx.stroke();
      ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(2.5, R * 0.13); ctx.setLineDash([R * 0.42, R * 0.3]); ctx.lineDashOffset = still ? 0 : -t * R * 2.4; ctx.beginPath(); ctx.moveTo(sa[0], sa[1]); ctx.quadraticCurveTo(cx, cy, sb[0], sb[1]); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      [a, b].forEach(function (q) { SwapManager.drawRing(ctx, q, R, col, hot, pulse, k, t, 1, still); });
      // lencana ⇄ melayang di atas tiap bola + cincin hitung mundur yang mengisi
      [a, b].forEach(function (q, i) {
        const p = bp[i], r = p.r;
        ctx.strokeStyle = dark; ctx.lineWidth = Math.max(3, R * 0.12); ctx.beginPath(); ctx.moveTo(q.x, q.y + (p.y < q.y ? -R * 1.05 : R * 1.05)); ctx.lineTo(p.x, p.y + (p.y < q.y ? r : -r)); ctx.stroke();      // tangkai ke bola
        ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(p.x, p.y, r + 2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(54,26,110,0.96)'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        ctx.lineWidth = Math.max(3, R * 0.16); ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.86, 0, TAU); ctx.stroke();
        ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.86, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();      // terisi seiring waktu
        SwapManager.drawArrows(ctx, p.x, p.y, r * 0.5, st[2]);
      });
      ctx.restore();
    }

    /** Sesudah menukar: cincin (dan lencana yang memudar) menempel pada bola di posisi BARU selama gerak tukar, lalu memudar 1 dtk. */
    drawAfter(ctx, t, R) {
      const P = this.post, gp = this.gp, still = REDUCED(), u = Math.max(0, (P.t - gp.SWAP_ANIM) / Math.max(0.01, gp.SWAP_AFTER)), alpha = 1 - u, ch = this.chain;
      ctx.save();
      P.pairs.forEach(function (pr, i) {
        const st = PAIR_STYLE[i % PAIR_STYLE.length];
        [pr[0], pr[1]].forEach(function (q) { if (ch.balls.indexOf(q) < 0 || !ch.visible(q)) return; SwapManager.drawRing(ctx, q, R, st[1], st[1], still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 10), 1, t, alpha, true); });
      });
      ctx.restore();
    }

    /** Ikon panah-tukar ⇄ (bentuk wajib ada: tidak mengandalkan warna). */
    static drawArrows(ctx, x, y, s, kind) {
      ctx.save(); if (kind === 'v') { ctx.translate(x, y); ctx.rotate(Math.PI / 2); ctx.translate(-x, -y); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2.2, s * 0.34); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.moveTo(x - s, y - s * 0.4); ctx.lineTo(x + s, y - s * 0.4); ctx.moveTo(x + s * 0.4, y - s * 0.95); ctx.lineTo(x + s, y - s * 0.4); ctx.lineTo(x + s * 0.4, y + s * 0.15);
      ctx.moveTo(x + s, y + s * 0.45); ctx.lineTo(x - s, y + s * 0.45); ctx.moveTo(x - s * 0.4, y - s * 0.1); ctx.lineTo(x - s, y + s * 0.45); ctx.lineTo(x - s * 0.4, y + s * 1.0); ctx.stroke(); ctx.restore();
    }

    /** Kelelawar: terbang dari tepi layar mendekati bola pertama pasangan selama indikator, lalu pergi setelah menukar. */
    drawBat(ctx, t, R) {
      const A = this.actor, W = (GA.view && GA.view.W) || 960, a = A.a; if (!a) return;
      const dur = this.dur, V = GA.view || { hud: 90 }, ax = a.x, ay = Math.max((V.hud || 0) + R * 1.3, a.y - R * 3.5), fromLeft = ax > W / 2, sx = fromLeft ? W + 60 : -60, sy = Math.max(70, ay - R * 3);
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

  GA.Swap = { reduced: null, PAIR_STYLE: PAIR_STYLE, SwapManager: SwapManager, pickPairs: pickPairs, eligible: eligible, drawBat: drawBat };
})(window.GA = window.GA || {});
