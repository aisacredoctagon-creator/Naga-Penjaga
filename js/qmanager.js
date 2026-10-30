/* qmanager.js — SATU sumber kebenaran untuk soal aktif.
 *
 * - 20 soal sebuah step dibangkitkan SEKALI (PRNG ber-seed: seed per petualangan × step × percobaan) dan diurutkan di awal; urutan tidak berubah
 *   kecuali soal yang kehabisan waktu / hilang target dipindah ke ujung antrean.
 * - Soal = objek beku (Object.freeze): id, text, answer, answerText, distractors, hint, explain, ... Semua modul hanya MEMBACA.
 * - Status soal: PENDING → ACTIVE → SOLVED. Soal aktif = elemen terdepan antrean yang belum selesai; TIDAK bergantung pada posisi/urutan bola.
 * - Perpindahan hanya lewat advance(reason) dengan reason dari enum tertutup REASONS (satu-satunya pemicu yang sah):
 *     STEP_START / STEP_RESTART   step dimulai atau diulang
 *     ANSWERED_CORRECT            pemain menembak bola jawaban yang benar
 *     TIMEOUT                     batas waktu soal habis (fase akhir boss); soal dipindah ke ujung antrean
 *     LOST_TARGET                 cadangan bila bola target tak bisa dimunculkan lagi; soal dipindah ke ujung antrean (tidak dipakai game saat ini:
 *                                 bola yang dicuri/hilang dimunculkan lagi dari portal sehingga soal tetap)
 * - Pelanggaran (kode lain mengubah soal tanpa advance) dicatat di `violations`; pada mode ketat (?debug=question, ?test=1, ?debug=sim) melempar Error.
 * Bola target sebuah soal adalah bola yang `qid`-nya sama dengan id soal (penukaran angka antar bola ikut memindahkan qid).
 */
(function (GA) {
  'use strict';
  const REASONS = Object.freeze({ STEP_START: 'STEP_START', STEP_RESTART: 'STEP_RESTART', ANSWERED_CORRECT: 'ANSWERED_CORRECT', TIMEOUT: 'TIMEOUT', LOST_TARGET: 'LOST_TARGET' });
  const STATE = Object.freeze({ PENDING: 'PENDING', ACTIVE: 'ACTIVE', SOLVED: 'SOLVED' });

  /** PRNG mulberry32. */
  function prng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /** Seed per petualangan × step × percobaan. */
  function seedFor(base, step, attempt) { let h = (base >>> 0) ^ Math.imul(step + 1, 0x9E3779B1) ^ Math.imul(attempt + 1, 0x85EBCA6B); h = Math.imul(h ^ (h >>> 16), 0x45D9F3B); return (h ^ (h >>> 16)) >>> 0; }
  function shuffle(a, rng) { const o = a.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = o[i]; o[i] = o[j]; o[j] = t; } return o; }
  function deepFreeze(o) { Object.keys(o).forEach(function (k) { const v = o[k]; if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); }); return Object.freeze(o); }

  /** Pola format urutan MAIN untuk Stage 3 (gabungan): setengah 'result' setengah 'missing', diacak ber-seed, tidak lebih dari 3 berturut-turut sama. */
  function mixedPattern(n, rng) {
    const base = []; for (let i = 0; i < n; i++) base.push(i < Math.ceil(n / 2) ? 'result' : 'missing');
    for (let tries = 0; tries < 400; tries++) {
      const p = shuffle(base, rng); let run = 1, ok = true;
      for (let i = 1; i < n && ok; i++) { run = p[i] === p[i - 1] ? run + 1 : 1; if (run > 3) ok = false; }
      if (ok) return p;
    }
    return base.map(function (_, i) { return i % 2 ? 'missing' : 'result'; });      // cadangan pasti valid: selang-seling
  }

  /** Banyak bola yang sudah keluar dari portal saat soal ke-k (urutan main) menjadi aktif, model nominal pemain ±6–7 dtk/jawaban (diukur dengan bot ?debug=pace):
   *  E(0) = 1 (hanya bola pertama), 3, 5, 6, lalu k + lead (lead = 4; batas bawah konservatif untuk semua stage dan kesulitan). */
  function emitted(k, n, o, mean) {
    const head = (mean ? o && o.tEmit : o && o.emit) || (o && o.emit) || [1, 3, 5, 6], lead = mean ? (o && o.tLead != null ? o.tLead : (o && o.lead != null ? o.lead : 4)) : (o && o.lead != null ? o.lead : 4);
    return Math.min(n, k < head.length ? head[k] : k + lead);
  }
  /** Sepertiga panjang rantai (0 = depan/dekat sarang, 1 = tengah, 2 = ekor/dekat portal) tempat bola ke-i (dari depan) di antara m bola berada: setiap bola menempati 1/m panjang rantai,
   *  jadi posisinya di tengah selnya, (i + 0,5) / m; bola pertama dan terakhir tidak dipaksa ke 0% / 100%. */
  function thirdOf(i, m) { return Math.min(2, Math.floor(3 * (i + 0.5) / Math.max(1, m))); }

  /** URUTAN POSISI BOLA JAWABAN di rantai (BUKAN urutan soal; antrean soal tidak disentuh). Mengembalikan perm: perm[p] = indeks soal (urutan antrean) untuk bola ke-p yang keluar dari portal.
   *  Pengacakan ber-seed gaya Fisher-Yates (undian tanpa pengembalian) ke seluruh rantai, dengan batas keadilan (o: first, maxRun, emit, lead):
   *   - jawaban soal pertama = bola pertama yang keluar (`first` = 1): terlihat begitu hitung mundur selesai;
   *   - jawaban soal ke-k hanya boleh di antara bola yang SUDAH keluar saat soal itu aktif (model emitted(k)): tidak menunggu keluar dari portal, tidak macet;
   *   - tiap soal diundi ke sepertiga rantai (depan / tengah / ekor) menurut daftar seimbang yang diacak ber-seed, jadi posisi jawaban soal aktif tersebar merata (bukan menumpuk di depan);
   *   - paling banyak `maxRun` jawaban BERURUTAN (menurut urutan soal) yang bertetangga di rantai (pola mudah ditebak).
   *  Diulang (aliran acak berlanjut) sampai semua batas terpenuhi. */
  function arrange(n, rng, o) {
    o = o || {}; const maxRun = o.maxRun == null ? 2 : o.maxRun, mix = o.mix || [1 / 3, 1 / 3, 1 / 3];      // bagian sasaran depan/tengah/ekor (sama rata)
    let best = null;
    for (let attempt = 0; attempt < 600; attempt++) {
      const pos = new Array(n), used = new Array(n).fill(false), cnt = [0, 1, 0];      // soal pertama (satu-satunya bola) dihitung sebagai "tengah"
      pos[0] = Math.min(n - 1, Math.max(0, Math.floor(rng() * Math.max(1, o.first == null ? 1 : o.first)))); used[pos[0]] = true;
      for (let k = 1; k < n; k++) {
        const Et = Math.max(emitted(k, n, o), emitted(k, n, o, true)), Ev = Math.max(k + 1, Et - (rng() < (o.cons == null ? 0.5 : o.cons) ? 1 : 0)), ex = [];      // sebagian soal (cons) hanya di bola yang PASTI sudah keluar (satu lebih sedikit)
         for (let p = 0; p < Et; p++) if (!used[p]) ex.push(p);       // bola yang ada saat soal k aktif (rata-rata; soal < k sudah dijawab)
        const m = ex.length, feas = m === 1 ? [1] : (m === 2 ? [0, 2] : [0, 1, 2]);
        const w = feas.map(function (t) { return Math.max(0.2, (k + 1) * mix[t] - cnt[t] + 1); });      // sepertiga yang masih kurang lebih mungkin dipilih (menjaga sebaran seimbang per stage)
        let r = rng() * w.reduce(function (a, b) { return a + b; }, 0), tier = feas[feas.length - 1]; for (let i = 0; i < feas.length; i++) { r -= w[i]; if (r <= 0) { tier = feas[i]; break; } }
        let cand = ex.filter(function (p, i) { return p < Ev && thirdOf(i, m) === tier; });
        if (!cand.length) cand = ex.filter(function (p) { return p < Ev; });
        const p = cand[Math.floor(rng() * cand.length)]; pos[k] = p; used[p] = true; cnt[thirdOf(ex.indexOf(p), m)]++;
      }
      const perm = new Array(n); for (let k = 0; k < n; k++) perm[pos[k]] = k;
      let ok = true, runA = 1, runD = 1;
      for (let k = 1; k < n && ok; k++) {
        runA = pos[k] === pos[k - 1] + 1 ? runA + 1 : 1; runD = pos[k] === pos[k - 1] - 1 ? runD + 1 : 1;
        if (runA > maxRun || runD > maxRun) ok = false;
      }
      best = perm; if (ok) break;
    }
    return best;
  }

  class QuestionManager {

    /** opts: { topics, total, seed, format, onChange(ev) }. format: 'result' | 'missing' | 'mixed' (Stage 3). Urutan main ditentukan lebih dulu, lalu format
     * tiap soal menurut posisinya (jadi pola campuran berlaku pada URUTAN soal yang dilihat pemain), lalu GA.Questions.deck membangkitkan 20 soal sekali. */
    constructor(opts) {
      this.seed = opts.seed >>> 0; this.onChange = opts.onChange || null;
      this._rng = prng(this.seed);
      const n = opts.total, ids = []; for (let i = 0; i < n; i++) ids.push(i);
      this.order = Object.freeze(shuffle(ids, this._rng));
      let fmts = opts.format || 'result';
      if (fmts === 'mixed') { const pat = mixedPattern(n, this._rng); fmts = []; this.order.forEach(function (id, pos) { fmts[id] = pat[pos]; }); }
      this.format = opts.format || 'result';
      const raw = GA.Questions.deck(opts.topics, n, this._rng, fmts);
      const answers = raw.map(function (q) { return q.answerText; });
      this.questions = Object.freeze(raw.map(function (q, i) {
        const o = {}; Object.keys(q).forEach(function (k) { if (k !== 'done') o[k] = q[k]; });
        o.id = i; o.distractors = answers.filter(function (_, j) { return j !== i; });
        return deepFreeze(o);
      }));
      this._state = this.questions.map(function () { return STATE.PENDING; });
      this._stats = this.questions.map(function () { return { wrong: 0, vals: [] }; });
      this._queue = [];            // id yang belum selesai; elemen pertama = soal aktif
      this._cur = -1; this.serial = 0; this.started = false;
      this.log = []; this.violations = []; this.t = 0;
    }

    /** Generator acak ber-seed milik stage ini (acak urutan bola dsb.; JANGAN dipakai di loop update/render). */
    rand() { return this._rng(); }

    /** Catatan untuk overview jawaban: jumlah tembakan salah dan nilai yang salah ditembak. Hanya mencatat; tidak mengubah soal atau antrean. */
    noteWrong(id, text) { const s = this._stats[id]; s.wrong++; if (s.vals.indexOf(text) < 0) s.vals.push(text); }
    stats(id) { return this._stats[id]; }

    get active() { return this._cur >= 0 ? this.questions[this._cur] : null; }
    get activeId() { return this._cur; }
    get total() { return this.questions.length; }
    state(id) { return this._state[id]; }
    isSolved(id) { return this._state[id] === STATE.SOLVED; }
    solvedCount() { let n = 0; for (const s of this._state) if (s === STATE.SOLVED) n++; return n; }
    remaining() { return this._queue.length; }
    /** Urutan antrean saat ini (soal aktif di depan). */
    queue() { return this._queue.slice(); }

    /** Satu-satunya cara mengubah soal aktif. Mengembalikan { from, to, reason }. */
    advance(reason) {
      if (!REASONS[reason]) throw new Error('QuestionManager.advance: alasan tidak sah "' + reason + '"');
      const from = this._cur;
      if (reason === REASONS.STEP_START || reason === REASONS.STEP_RESTART) {
        if (this.started) throw new Error('QuestionManager.advance(' + reason + '): step sudah dimulai (buat QuestionManager baru untuk step/percobaan baru)');
        this.started = true; this._queue = this.order.slice();
      } else {
        if (from < 0) throw new Error('QuestionManager.advance(' + reason + '): tidak ada soal aktif');
        if (reason === REASONS.ANSWERED_CORRECT) { this._state[from] = STATE.SOLVED; this._queue.shift(); }
        else { this._queue.shift(); this._queue.push(from); this._state[from] = STATE.PENDING; }       // TIMEOUT / LOST_TARGET: kembali ke ujung antrean, tidak dihitung terjawab
      }
      const to = this._queue.length ? this._queue[0] : -1;
      if (to >= 0) this._state[to] = STATE.ACTIVE;
      this._cur = to; this.serial++;
      const ev = { t: this.t, reason: reason, from: from, to: to, same: from === to, solved: this.solvedCount() };
      this.log.push(ev); if (this.log.length > 400) this.log.shift();
      if (GA.QM.verbose && typeof console !== 'undefined') console.info('[soal] ' + reason + ' ' + from + ' → ' + to + (ev.same ? ' (sama)' : ''));
      if (this.onChange) this.onChange(ev, from >= 0 ? this.questions[from] : null, to >= 0 ? this.questions[to] : null);
      return ev;
    }

    /** Dicatat bila kode lain mencoba menimpa soal aktif di luar advance(). */
    violation(what) {
      const msg = 'Soal aktif diubah di luar QuestionManager.advance(): ' + what;
      this.violations.push({ t: this.t, what: what });
      if (typeof console !== 'undefined') console.error(msg);
      if (GA.QM.strict) throw new Error(msg);
    }

    /** Untuk pemulihan (mis. localStorage): seed + urutan antrean + soal selesai. Soal dibangkitkan ulang dari seed. */
    snapshot() { return { seed: this.seed, queue: this._queue.slice(), solved: this._state.map(function (s, i) { return s === STATE.SOLVED ? i : -1; }).filter(function (i) { return i >= 0; }) }; }
    /** Terapkan snapshot ke QuestionManager baru (dengan seed/topics sama): soal & urutan identik. Tanpa mengirim onChange. */
    restore(snap) {
      if (snap.seed >>> 0 !== this.seed) throw new Error('QuestionManager.restore: seed berbeda');
      this.started = true; this._queue = snap.queue.slice();
      this._state = this.questions.map(function () { return STATE.PENDING; }); snap.solved.forEach(function (i) { this._state[i] = STATE.SOLVED; }, this);
      this._cur = this._queue.length ? this._queue[0] : -1; if (this._cur >= 0) this._state[this._cur] = STATE.ACTIVE;
    }
  }

  GA.QM = { arrange: arrange, emitted: emitted, thirdOf: thirdOf, Manager: QuestionManager, REASONS: REASONS, STATE: STATE, prng: prng, seedFor: seedFor, shuffle: shuffle, strict: /[?&]test(=|&|$)/.test(location.search) || /debug=[^&]*(question|sim)/.test(location.search), verbose: /debug=[^&]*question/.test(location.search) };
})(window.GA = window.GA || {});
