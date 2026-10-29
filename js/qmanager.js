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

  class QuestionManager {
    /** opts: { topics, total, seed, onChange(ev) }. Pembangkit dek dari GA.Questions.deck(topics, total, rng). */
    constructor(opts) {
      this.seed = opts.seed >>> 0; this.onChange = opts.onChange || null;
      this._rng = prng(this.seed);
      const raw = GA.Questions.deck(opts.topics, opts.total, this._rng);
      const answers = raw.map(function (q) { return q.answerText; });
      this.questions = Object.freeze(raw.map(function (q, i) {
        const o = {}; Object.keys(q).forEach(function (k) { if (k !== 'done') o[k] = q[k]; });
        o.id = i; o.distractors = answers.filter(function (_, j) { return j !== i; });
        return deepFreeze(o);
      }));
      this.order = Object.freeze(shuffle(this.questions.map(function (q) { return q.id; }), this._rng));
      this._state = this.questions.map(function () { return STATE.PENDING; });
      this._queue = [];            // id yang belum selesai; elemen pertama = soal aktif
      this._cur = -1; this.serial = 0; this.started = false;
      this.log = []; this.violations = []; this.t = 0;
    }

    /** Generator acak ber-seed milik step ini (untuk pembagian rantai Step 5 dsb.; JANGAN dipakai di loop update/render). */
    rand() { return this._rng(); }

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

  GA.QM = { Manager: QuestionManager, REASONS: REASONS, STATE: STATE, prng: prng, seedFor: seedFor, shuffle: shuffle, strict: /[?&]test(=|&|$)/.test(location.search) || /debug=[^&]*(question|sim)/.test(location.search), verbose: /debug=[^&]*question/.test(location.search) };
})(window.GA = window.GA || {});
