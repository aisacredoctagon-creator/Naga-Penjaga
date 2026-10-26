/* questions.js — generator soal matematika + pengecoh yang masuk akal.
 *
 * Satu "topik" = objek spesifikasi, mis. { type:'add', min:1, max:20 }.
 * Jenis (type): add, sub, mul, div, int, dec. Parameter bisa diubah bebas (lihat DEFAULTS).
 * Hasil: { text, note, answer, answerText, explain, hint, kind, choices:[{value,text}] }
 * Angka ditampilkan dengan format Indonesia (koma desimal, tanda minus "−").
 */
(function (GA) {
  'use strict';

  const MINUS = '−';
  const r4 = function (x) { return Math.round(x * 1e4) / 1e4; };
  const rnd = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  const pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /** Format angka: koma desimal, tanda minus matematis, tanpa nol di belakang. */
  function fmt(v) {
    v = r4(v);
    if (Object.is(v, -0)) v = 0;
    const s = String(Math.abs(v)).replace('.', ',');
    return v < 0 ? MINUS + s : s;
  }
  /** Operan di dalam ekspresi: negatif dibungkus kurung. */
  function opd(v) { return v < 0 ? '(' + fmt(v) + ')' : fmt(v); }

  function swapDigits(n) {
    const s = String(Math.abs(n));
    if (s.length < 2 || !Number.isInteger(n)) return n;
    const t = s[s.length - 1] + s.slice(1, -1) + s[0];
    return (n < 0 ? -1 : 1) * Number(t);
  }

  /* Parameter bawaan per jenis soal. */
  const DEFAULTS = {
    add: { min: 1, max: 20 },
    sub: { min: 1, max: 20 },
    mul: { aMin: 2, aMax: 9, bMin: 2, bMax: 9 },
    div: { bMin: 2, bMax: 9, qMin: 2, qMax: 9 },
    int: { op: 'any', min: 1, max: 12 },
    dec: { op: '+', places: 1, min: 1, max: 20, round: 0 },
    frac: { ops: ['+', '-'], mode: 'same', dmax: 6 }
  };

  function range(s) {
    if (s.digits) return { min: Math.pow(10, s.digits - 1), max: Math.pow(10, s.digits) - 1 };
    return { min: s.min, max: s.max };
  }

  /** Rakit objek soal: bersihkan pengecoh (unik, bukan jawaban, sesuai batas).
   * cands boleh berisi angka atau {text, value} (untuk pecahan, di mana teks menentukan identitas jawaban). */
  function make(o) {
    const ans = r4(o.answer), ansT = o.answerText || fmt(ans);
    const seen = {}; seen[ansT] = 1;
    const out = [];
    const take = function (c) {
      let t, v;
      if (c !== null && typeof c === 'object') { t = c.text; v = c.value; if (!t || seen[t]) return; }
      else {
        c = r4(c);
        if (!isFinite(c)) return;
        if (o.nonNeg && c < 0) return;
        if (o.integer && !Number.isInteger(c)) return;
        t = fmt(c); v = c;
        if (seen[t]) return;
      }
      seen[t] = 1; out.push({ value: v, text: t });
    };
    shuffle(o.cands.slice()).forEach(function (c) { if (out.length < 8) take(c); });
    const step = o.step || 1;
    if (o.fill) { for (let k = 1; out.length < 6 && k < 40; k++) o.fill(k).forEach(take); }
    else for (let k = 1; out.length < 6 && k < 60; k++) { take(ans + k * step); take(ans - k * step); }
    return {
      text: o.expr + ' = ?', note: o.note || '', expr: o.expr,
      answer: ans, answerText: ansT,
      explain: o.expr + ' = ' + ansT,
      hint: o.hint || '', kind: o.kind, choices: out
    };
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function fracText(n, d) { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : n + '/' + d; }
  function fracCand(n, d) { return (n > 0 && d > 0 && isFinite(n) && isFinite(d)) ? { text: fracText(n, d), value: n / d } : null; }
  function rawFrac(n, d) { return (n > 0 && d > 0) ? { text: n + '/' + d, value: n / d } : null; }   // tidak disederhanakan (pengecoh)

  const GEN = {
    add: function (s) {
      const R = range(s), a = rnd(R.min, R.max), b = rnd(R.min, R.max), ans = a + b;
      return make({
        kind: 'add', expr: a + ' + ' + b, answer: ans, nonNeg: true, integer: true,
        cands: [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, a - b, Math.abs(b - a) + 10, swapDigits(ans), a * b <= ans * 3 ? a * b : ans + 20],
        hint: 'Jumlahkan satuan dulu, lalu puluhan.'
      });
    },

    sub: function (s) {
      const R = range(s);
      let a = rnd(R.min, R.max), b = rnd(R.min, R.max);
      if (a < b) { const t = a; a = b; b = t; }
      if (a === b) a += 1;
      const ans = a - b;
      return make({
        kind: 'sub', expr: a + ' ' + MINUS + ' ' + b, answer: ans, nonNeg: true, integer: true,
        cands: [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, a + b, b - ans, swapDigits(ans)],
        hint: 'Pengurangan: bayangkan mundur dari bilangan pertama.'
      });
    },

    mul: function (s) {
      const a = rnd(s.aMin, s.aMax), b = rnd(s.bMin, s.bMax), ans = a * b;
      return make({
        kind: 'mul', expr: a + ' × ' + b, answer: ans, nonNeg: true, integer: true,
        cands: [ans + a, ans - a, ans + b, ans - b, a * (b + 1), (a + 1) * b, a + b, ans + 10, ans - 10, swapDigits(ans)],
        hint: 'Perkalian = penjumlahan berulang.'
      });
    },

    div: function (s) {
      const b = rnd(s.bMin, s.bMax), q = rnd(s.qMin, s.qMax), a = b * q;
      return make({
        kind: 'div', expr: a + ' ÷ ' + b, answer: q, nonNeg: true, integer: true,
        cands: [q + 1, q - 1, q + 2, q - 2, b, a - b, q * 2, b + q, swapDigits(q)],
        hint: 'Bagi = berapa kali ' + b + ' muat di ' + a + '?'
      });
    },

    int: function (s) {
      const R = range(s);
      const op = s.op === 'any' ? pick(['+', MINUS, '×', '÷']) : (s.op === '-' ? MINUS : (s.op === '*' || s.op === 'x' ? '×' : (s.op === '/' ? '÷' : s.op)));
      const sgn = function () { return Math.random() < 0.55 ? -1 : 1; };
      let a = rnd(R.min, R.max) * sgn(), b = rnd(R.min, R.max) * sgn();
      if (a > 0 && b > 0 && Math.random() < 0.85) { if (Math.random() < 0.5) a = -a; else b = -b; }
      let ans, hint, cands;
      if (op === '+') {
        ans = a + b; cands = [-ans, Math.abs(a) + Math.abs(b), a - b, -(a - b), ans + 2, ans - 2];
        hint = (a < 0) === (b < 0) ? 'Tanda sama: jumlahkan angkanya, tanda tetap.' : 'Tanda beda: kurangkan angkanya, tanda ikut angka yang lebih besar.';
      } else if (op === MINUS) {
        ans = a - b; cands = [-ans, a + b, b - a, Math.abs(a) - Math.abs(b), ans + 2, ans - 2];
        hint = b < 0 ? 'Mengurangi bilangan negatif sama dengan menambah.' : 'Kurangi biasa, hasilnya bisa negatif.';
      } else if (op === '×') {
        ans = a * b; cands = [-ans, a + b, ans + a, ans - b, a * (Math.abs(b) + 1) * Math.sign(b), Math.abs(ans)];
        hint = 'Tanda sama → positif. Tanda beda → negatif.';
      } else {
        const q = rnd(Math.max(1, R.min), R.max) * sgn(), d = b; a = q * d; ans = q;
        cands = [-ans, ans + 1, ans - 1, a - d, d, Math.abs(ans)];
        hint = 'Tanda sama → positif. Tanda beda → negatif.';
      }
      const star = op === '×' || op === '÷';
      const expr = (star ? opd(a) : fmt(a)) + ' ' + op + ' ' + opd(b);
      return make({ kind: 'int', expr: expr, answer: ans, integer: true, cands: cands, hint: hint });
    },

    frac: function (s) {
      // pecahan sejati; jawaban SELALU dalam bentuk paling sederhana. s: { ops, mode: 'same'|'rel'|'any', dmax }
      const ops = s.ops;
      const OP = { '+': '+', '-': '−', '×': '×', '*': '×', '÷': '÷', '/': '÷', '−': '−' };
      let o = OP[ops[Math.floor(Math.random() * ops.length)]], a, b, d1, d2, n, d, tries = 0;
      do {
        d1 = rnd(2, s.dmax);
        if (s.mode === 'same') d2 = d1;
        else if (s.mode === 'rel') d2 = pick([d1, d1, d1 * 2 <= 12 ? d1 * 2 : d1, d1 % 2 === 0 ? d1 / 2 : d1]);
        else { do { d2 = rnd(2, s.dmax); } while (d2 === d1); }
        a = rnd(1, d1 - 1); b = rnd(1, d2 - 1);
        if (o === '+') { n = a * d2 + b * d1; d = d1 * d2; }
        else if (o === '−') { n = a * d2 - b * d1; d = d1 * d2; if (n < 0) { const t1 = a, t2 = d1; a = b; d1 = d2; b = t1; d2 = t2; n = -n; } }
        else if (o === '×') { n = a * b; d = d1 * d2; }
        else { n = a * d2; d = d1 * b; }
        tries++;
      } while ((n <= 0 || (o === '−' && n === 0) || (s.mode === 'same' && o === '×' && false)) && tries < 40);
      const g = gcd(n, d), sn = n / g, sd = d / g, ans = n / d, ansT = fracText(n, d);
      const expr = a + '/' + d1 + ' ' + o + ' ' + b + '/' + d2;
      const cands = [];
      const add = function (c) { if (c) cands.push(c); };
      if (o === '+') { add(fracCand(a + b, d1 + d2)); add(fracCand(a + b, d1 === d2 ? d1 : d1 * d2)); add(fracCand(Math.abs(a * d2 - b * d1), d1 * d2)); }
      else if (o === '−') { add(fracCand(a - b > 0 ? a - b : 1, d1 === d2 ? d1 + d2 : Math.abs(d1 - d2) || d1)); add(fracCand(a * d2 + b * d1, d1 * d2)); }
      else if (o === '×') { add(fracCand(a * d2 + b * d1, d1 * d2)); add(fracCand(a * b, d1 + d2)); add(fracCand(a + b, d1 * d2)); }
      else { add(fracCand(a * b, d1 * d2)); add(fracCand(d1 * b, a * d2)); add(fracCand(a * d2 + b, d1 * d2)); }
      add(fracCand(sd, sn)); add(fracCand(sn + 1, sd)); add(fracCand(sn, sd + 1)); add(fracCand(sn + 2, sd)); add(fracCand(sn, sd + 2));
      if (sn > 1) add(fracCand(sn - 1, sd)); if (sd > 2) add(fracCand(sn, sd - 1));
      const q = make({
        kind: 'frac', expr: expr, answer: ans, answerText: ansT, cands: cands,
        hint: o === '+' || o === '−' ? 'Samakan penyebutnya dulu, lalu hitung pembilangnya. Sederhanakan hasilnya.' : (o === '×' ? 'Kalikan pembilang dengan pembilang dan penyebut dengan penyebut.' : 'Membagi pecahan = mengalikan dengan kebalikannya.'),
        fill: function (k) { return [fracCand(sn + k, sd + k), fracCand(sn + k, sd), fracCand(sn, sd + k)]; }
      });
      return q;
    },

    dec: function (s) {
      const k = s.places || 1, sc = Math.pow(10, k);
      const op = s.op === '-' ? MINUS : (s.op === '*' || s.op === 'x' ? '×' : (s.op === '/' ? '÷' : s.op));
      const ri = function (scale) {
        const lo = Math.round(s.min * scale), hi = Math.round(s.max * scale);
        let v; do { v = rnd(lo, hi); } while (v % scale === 0 && Math.random() < 0.85);
        return v;
      };
      const P10 = function (n) { return Math.pow(10, n); };
      const roundTo = function (x, n) { return Math.round(x * P10(n)) / P10(n); };
      const R = s.round || 0;
      const rnote = '(bulatkan ke ' + R + ' desimal)', rhint = 'Pembulatan: angka 5 ke atas dibulatkan naik.';
      const near = function (x) { return [roundTo(x, R) * 10, roundTo(x, R) / 10, Math.floor(x * P10(R)) / P10(R), Math.ceil(x * P10(R)) / P10(R), roundTo(x, R) + 1 / P10(R), roundTo(x, R) - 1 / P10(R)]; };
      let expr, ans, hint, note = '', cands, step = 1 / sc, tail = null;

      if (op === '+' || op === MINUS) {
        let A = ri(sc), B = ri(sc);
        if (op === MINUS) { if (A < B) { const t = A; A = B; B = t; } if (A === B) A += 1; }
        ans = (op === '+' ? A + B : A - B) / sc;
        expr = fmt(A / sc) + ' ' + op + ' ' + fmt(B / sc);
        hint = 'Sejajarkan koma, lalu hitung seperti bilangan bulat.';
        cands = [ans * 10, ans / 10, ans + 1, ans - 1, ans + 1 / sc, ans - 1 / sc, (op === '+' ? A - B : A + B) / sc];
      } else if (op === '×') {
        if (R) {
          let A = rnd(Math.round(s.min * 100), Math.round(s.max * 100));
          if (A % 10 === 0) A += 3;
          const B = rnd(11, 59), exact = (A * B) / 1000;
          ans = Math.round((A * B) / P10(3 - R)) / P10(R);
          expr = fmt(A / 100) + ' × ' + fmt(B / 10); note = rnote; hint = rhint;
          cands = near(exact); step = 1 / P10(R);
          tail = ' = ' + fmt(exact) + ' ≈ ';
        } else {
          const A = ri(10), B = rnd(12, 49);
          ans = (A * B) / 100;
          expr = fmt(A / 10) + ' × ' + fmt(B / 10);
          hint = 'Hitung tanpa koma, lalu kembalikan koma sesuai banyaknya angka di belakang koma.';
          cands = [ans * 10, ans / 10, ans * 100, ans + 1, ans - 1, ans + 0.1, ans - 0.1];
          step = 0.1;
        }
      } else if (R) { // pembagian dengan pembulatan
        let A, B, q, tries = 0;
        do {
          A = rnd(Math.round(s.min * 10), Math.round(s.max * 10)); B = pick([3, 6, 7, 9]); q = A / 10 / B; tries++;
        } while (tries < 40 && (Math.abs((q * P10(R + 1)) % 10 - 5) < 1e-6 || Math.abs(q * P10(R) - Math.round(q * P10(R))) < 1e-9));
        ans = roundTo(q, R);
        expr = fmt(A / 10) + ' ÷ ' + B; note = rnote; hint = rhint;
        cands = near(q); step = 1 / P10(R);
        tail = ' = ' + String(r4(q)).replace('.', ',') + '… ≈ ';
      } else { // pembagian tepat
        const Bi = rnd(4, 40), Qi = rnd(11, 60);
        ans = Qi / 10;
        expr = fmt((Bi * Qi) / 100) + ' ÷ ' + fmt(Bi / 10);
        hint = 'Geser koma pembagi dan yang dibagi sama banyak, lalu bagi.';
        cands = [ans * 10, ans / 10, ans + 1, ans - 1, ans + 0.1, ans - 0.1, Bi / 10];
        step = 0.1;
      }
      const q = make({ kind: 'dec', expr: expr, note: note, answer: ans, cands: cands, hint: hint, step: step });
      if (tail) q.explain = expr + tail + q.answerText;
      return q;
    }
  };

  /** Buat satu soal dari spesifikasi topik. */
  function generate(spec) {
    const f = GEN[spec.type];
    if (!f) throw new Error('Jenis soal tidak dikenal: ' + spec.type);
    return f(Object.assign({}, DEFAULTS[spec.type], spec));
  }

  /** Sesi soal: memilih topik acak (boleh berbobot), menghindari soal yang sama berturut-turut,
   * dan membatasi jumlah pengecoh (opts.maxChoices: Mudah 4, Sedang 6, Sulit 8). */
  class Session {
    constructor(topics, opts) { this.topics = topics; this.last = ''; this.count = 0; this.maxChoices = (opts && opts.maxChoices) || 8; }
    next() {
      let q, tries = 0;
      do {
        const total = this.topics.reduce(function (s, t) { return s + (t.weight || 1); }, 0);
        let r = Math.random() * total, spec = this.topics[0];
        for (const t of this.topics) { r -= (t.weight || 1); if (r <= 0) { spec = t; break; } }
        q = generate(spec);
      } while (q.text === this.last && ++tries < 12);
      if (q.choices.length > this.maxChoices) q.choices = q.choices.slice(0, this.maxChoices);
      this.last = q.text; this.count++;
      return q;
    }
  }

  /** Ringkasan untuk layar pembuka: contoh soal + rentang jawaban. */
  function describe(topics) {
    const s = new Session(topics);
    let lo = Infinity, hi = -Infinity, fr = true;
    for (let i = 0; i < 60; i++) { const q = s.next(); lo = Math.min(lo, q.answer); hi = Math.max(hi, q.answer); if (q.kind !== 'frac') fr = false; }
    const ex = new Session(topics).next();
    return { example: ex.explain, exampleText: ex.text, range: [lo, hi], rangeText: fr ? 'Jawaban berupa pecahan paling sederhana' : 'Jawaban sekitar ' + fmt(lo) + ' sampai ' + fmt(hi) };
  }

  /* ---------- kategori & tingkat kesulitan (Main Menu) ----------
   * Tiap kategori + kesulitan menghasilkan daftar topik untuk generator di atas.
   * Parameter: rentang angka (min/max), jumlah digit (digits), jenis operasi (op/ops), dan kerumitan (mode pecahan, desimal, pembulatan).
   * Untuk menambah kategori: tambahkan ke CATEGORIES dan isi TABLE-nya untuk tiga kesulitan. */
  const CATEGORIES = [
    { id: 'add', name: 'Penjumlahan', icon: '+', color: '#ff9a3c' },
    { id: 'sub', name: 'Pengurangan', icon: '−', color: '#ff6b8a' },
    { id: 'mul', name: 'Perkalian', icon: '×', color: '#8b5cf6' },
    { id: 'div', name: 'Pembagian', icon: '÷', color: '#3b82f6' },
    { id: 'int', name: 'Bilangan Bulat', icon: '±', color: '#14b8a6' },
    { id: 'frac', name: 'Pecahan', icon: '½', color: '#ec4899' },
    { id: 'dec', name: 'Desimal', icon: '0,5', color: '#22c55e' },
    { id: 'mix', name: 'Campuran', icon: '✦', color: '#eab308' }
  ];
  const INT = function (op, min, max) { return { type: 'int', op: op, min: min, max: max }; };
  const DEC = function (op, places, min, max, round) { return { type: 'dec', op: op, places: places, min: min, max: max, round: round || 0 }; };
  const TABLE = {
    add: { mudah: [{ type: 'add', min: 1, max: 10 }], sedang: [{ type: 'add', min: 10, max: 60 }], sulit: [{ type: 'add', min: 25, max: 250 }] },
    sub: { mudah: [{ type: 'sub', min: 1, max: 15 }], sedang: [{ type: 'sub', min: 10, max: 80 }], sulit: [{ type: 'sub', min: 30, max: 300 }] },
    mul: { mudah: [{ type: 'mul', aMin: 2, aMax: 5, bMin: 2, bMax: 9 }], sedang: [{ type: 'mul', aMin: 2, aMax: 9, bMin: 2, bMax: 12 }], sulit: [{ type: 'mul', aMin: 6, aMax: 15, bMin: 6, bMax: 15 }, { type: 'mul', aMin: 11, aMax: 30, bMin: 3, bMax: 9 }] },
    div: { mudah: [{ type: 'div', bMin: 2, bMax: 5, qMin: 2, qMax: 9 }], sedang: [{ type: 'div', bMin: 2, bMax: 9, qMin: 2, qMax: 12 }], sulit: [{ type: 'div', bMin: 3, bMax: 12, qMin: 5, qMax: 25 }] },
    int: { mudah: [INT('+', 1, 9), INT('-', 1, 9)], sedang: [INT('any', 1, 12)], sulit: [INT('+', 5, 40), INT('-', 5, 40), INT('*', 2, 15), INT('/', 2, 15)] },
    frac: { mudah: [{ type: 'frac', ops: ['+', '-'], mode: 'same', dmax: 6 }], sedang: [{ type: 'frac', ops: ['+', '-', '×'], mode: 'rel', dmax: 8 }], sulit: [{ type: 'frac', ops: ['+', '-', '×', '÷'], mode: 'any', dmax: 10 }] },
    dec: { mudah: [DEC('+', 1, 1, 10), DEC('-', 1, 1, 10)], sedang: [DEC('+', 1, 1, 30), DEC('-', 1, 1, 30), DEC('*', 1, 1, 9)], sulit: [DEC('+', 2, 1, 20), DEC('-', 2, 1, 20), DEC('*', 1, 1, 9, 1), DEC('/', 1, 1, 9)] }
  };
  const CHOICES = { mudah: 4, sedang: 6, sulit: 8 };

  function categoryById(id) { for (const c of CATEGORIES) if (c.id === id) return c; return CATEGORIES[0]; }

  /** Daftar topik untuk satu kategori dan kesulitan ('mix' = semua kategori). Boleh juga array kategori (campur beberapa slot). */
  function topicsFor(cat, diff) {
    diff = TABLE.add[diff] ? diff : 'sedang';
    if (Array.isArray(cat)) { const out = []; cat.forEach(function (c) { topicsFor(c, diff).forEach(function (t) { out.push(t); }); }); return out; }
    if (cat === 'mix') return topicsFor(['add', 'sub', 'mul', 'div', 'int', 'frac', 'dec'], diff);
    return (TABLE[cat] || TABLE.add)[diff].slice();
  }

  GA.Questions = { generate: generate, Session: Session, describe: describe, fmt: fmt, DEFAULTS: DEFAULTS, GEN: GEN, CATEGORIES: CATEGORIES, categoryById: categoryById, topicsFor: topicsFor, maxChoices: function (d) { return CHOICES[d] || 6; } };
})(window.GA = window.GA || {});
