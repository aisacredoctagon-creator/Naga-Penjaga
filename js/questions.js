/* questions.js — generator soal matematika + pengecoh yang masuk akal.
 *
 * Satu "topik" = objek spesifikasi, mis. { type:'add', min:1, max:20 }.
 * Jenis (type): add, sub, mul, div, int, dec. Parameter bisa diubah bebas (lihat DEFAULTS).
 * Hasil: { text, note, answer, answerText, explain, hint, kind, format, eq, choices:[{value,text}] }
 *   format: "result" (a op b = ▢, jawaban = hasil) | "missing" (▢ op b = c atau a op ▢ = c, jawaban = angka yang hilang). `eq` = bagian persamaan (dipakai pembuat soal hilang).
 * Angka ditampilkan dengan format Indonesia (koma desimal, tanda minus "−").
 */
(function (GA) {
  'use strict';

  /** Sumber acak generator soal. Untuk dek langkah (buildDeck) diganti sementara dengan PRNG ber-seed supaya soal bisa direproduksi. */
  let RND = Math.random;
  const MINUS = '−';
  /** Kotak kosong bagian yang dicari (digambar sebagai kotak bergaris yang berkedip oleh MathText). */
  const BLANK = '▢';
  const r4 = function (x) { return Math.round(x * 1e4) / 1e4; };
  const rnd = function (a, b) { return a + Math.floor(RND() * (b - a + 1)); };
  const pick = function (arr) { return arr[Math.floor(RND() * arr.length)]; };
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(RND() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
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
      text: o.text || (o.expr + ' = ' + BLANK), note: o.note || '', expr: o.expr, format: o.format || 'result', eq: o.eq || null,
      answer: ans, answerText: ansT,
      explain: o.explain || (o.expr + ' = ' + ansT),
      hint: o.hint || '', kind: o.kind, choices: out
    };
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function fracText(n, d) { const g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : n + '/' + d; }
  function fracCand(n, d) { return (n > 0 && d > 0 && isFinite(n) && isFinite(d)) ? { text: fracText(n, d), value: n / d } : null; }
  function rawFrac(n, d) { return (n > 0 && d > 0) ? { text: n + '/' + d, value: n / d } : null; }   // tidak disederhanakan (pengecoh)

  /** Persamaan a op b = c untuk pembuat soal "angka hilang": v = nilai, t = teks jawaban (paling sederhana), s = teks yang ditampilkan bila tidak disembunyikan. */
  function EQ(a, op, b, c, o) {
    return { a: { v: a, t: fmt(a), s: (o && o.as) || fmt(a) }, op: op, b: { v: b, t: fmt(b), s: (o && o.bs) || fmt(b) }, c: { v: c, t: fmt(c), s: fmt(c) } };
  }
  function EQF(a, d1, op, b, d2, n, d) {
    const part = function (x, y) { const g = gcd(x, y); return { v: x / y, t: fracText(x, y), s: x + '/' + y, n: x / g, d: y / g }; };
    return { a: part(a, d1), op: op, b: part(b, d2), c: part(n, d), frac: true };
  }

  const GEN = {
    add: function (s) {
      const R = range(s), a = rnd(R.min, R.max), b = rnd(R.min, R.max), ans = a + b;
      return make({
        kind: 'add', expr: a + ' + ' + b, answer: ans, nonNeg: true, integer: true, eq: EQ(a, '+', b, ans),
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
        kind: 'sub', expr: a + ' ' + MINUS + ' ' + b, answer: ans, nonNeg: true, integer: true, eq: EQ(a, MINUS, b, ans),
        cands: [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, a + b, b - ans, swapDigits(ans)],
        hint: 'Pengurangan: bayangkan mundur dari bilangan pertama.'
      });
    },

    mul: function (s) {
      const a = rnd(s.aMin, s.aMax), b = rnd(s.bMin, s.bMax), ans = a * b;
      return make({
        kind: 'mul', expr: a + ' × ' + b, answer: ans, nonNeg: true, integer: true, eq: EQ(a, '×', b, ans),
        cands: [ans + a, ans - a, ans + b, ans - b, a * (b + 1), (a + 1) * b, a + b, ans + 10, ans - 10, swapDigits(ans)],
        hint: 'Perkalian = penjumlahan berulang.'
      });
    },

    div: function (s) {
      const b = rnd(s.bMin, s.bMax), q = rnd(s.qMin, s.qMax), a = b * q;
      return make({
        kind: 'div', expr: a + ' ÷ ' + b, answer: q, nonNeg: true, integer: true, eq: EQ(a, '÷', b, q),
        cands: [q + 1, q - 1, q + 2, q - 2, b, a - b, q * 2, b + q, swapDigits(q)],
        hint: 'Bagi = berapa kali ' + b + ' muat di ' + a + '?'
      });
    },

    int: function (s) {
      const R = range(s);
      const op = s.op === 'any' ? pick(['+', MINUS, '×', '÷']) : (s.op === '-' ? MINUS : (s.op === '*' || s.op === 'x' ? '×' : (s.op === '/' ? '÷' : s.op)));
      const sgn = function () { return RND() < 0.55 ? -1 : 1; };
      let a = rnd(R.min, R.max) * sgn(), b = rnd(R.min, R.max) * sgn();
      if (a > 0 && b > 0 && RND() < 0.85) { if (RND() < 0.5) a = -a; else b = -b; }
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
      return make({ kind: 'int', expr: expr, answer: ans, integer: true, cands: cands, hint: hint, eq: EQ(a, op, b, ans, { as: star ? opd(a) : fmt(a), bs: opd(b) }) });
    },

    frac: function (s) {
      // pecahan sejati; jawaban SELALU dalam bentuk paling sederhana. s: { ops, mode: 'same'|'rel'|'any', dmax }
      const ops = s.ops;
      const OP = { '+': '+', '-': '−', '×': '×', '*': '×', '÷': '÷', '/': '÷', '−': '−' };
      let o = OP[ops[Math.floor(RND() * ops.length)]], a, b, d1, d2, n, d, tries = 0;
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
        kind: 'frac', expr: expr, answer: ans, answerText: ansT, cands: cands, eq: EQF(a, d1, o, b, d2, n, d),
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
        let v; do { v = rnd(lo, hi); } while (v % scale === 0 && RND() < 0.85);
        return v;
      };
      const P10 = function (n) { return Math.pow(10, n); };
      const roundTo = function (x, n) { return Math.round(x * P10(n)) / P10(n); };
      const R = s.round || 0;
      const rnote = '(bulatkan ke ' + R + ' desimal)', rhint = 'Pembulatan: angka 5 ke atas dibulatkan naik.';
      const near = function (x) { return [roundTo(x, R) * 10, roundTo(x, R) / 10, Math.floor(x * P10(R)) / P10(R), Math.ceil(x * P10(R)) / P10(R), roundTo(x, R) + 1 / P10(R), roundTo(x, R) - 1 / P10(R)]; };
      let expr, ans, hint, note = '', cands, step = 1 / sc, tail = null, eqd = null;

      if (op === '+' || op === MINUS) {
        let A = ri(sc), B = ri(sc);
        if (op === MINUS) { if (A < B) { const t = A; A = B; B = t; } if (A === B) A += 1; }
        ans = (op === '+' ? A + B : A - B) / sc;
        expr = fmt(A / sc) + ' ' + op + ' ' + fmt(B / sc); eqd = EQ(A / sc, op, B / sc, ans);
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
          expr = fmt(A / 10) + ' × ' + fmt(B / 10); eqd = EQ(A / 10, '×', B / 10, ans);
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
        expr = fmt((Bi * Qi) / 100) + ' ÷ ' + fmt(Bi / 10); eqd = EQ((Bi * Qi) / 100, '÷', Bi / 10, ans);
        hint = 'Geser koma pembagi dan yang dibagi sama banyak, lalu bagi.';
        cands = [ans * 10, ans / 10, ans + 1, ans - 1, ans + 0.1, ans - 0.1, Bi / 10];
        step = 0.1;
      }
      const q = make({ kind: 'dec', expr: expr, note: note, answer: ans, cands: cands, hint: hint, step: step, eq: eqd });
      if (tail) q.explain = expr + tail + q.answerText;
      return q;
    }
  };

  /** Ubah soal "hitung hasil" menjadi "angka hilang": sembunyikan operan kiri atau kanan dan jadikan hasilnya diketahui.
   * Solusi selalu terdefinisi: tidak ada pembagian dengan nol; pembagian dengan operan hilang menghasilkan nilai pas (soal dibangun dari a = b × hasil);
   * pecahan hilang selalu dalam bentuk paling sederhana; negatif tampil jelas dengan kurung; desimal paling banyak 2 angka di belakang koma. */
  function toMissing(q) {
    const e = q.eq, op = e.op, side = RND() < 0.5 ? 'a' : 'b', hide = e[side], other = side === 'a' ? e.b : e.a;
    const aT = side === 'a' ? BLANK : e.a.s, bT = side === 'b' ? BLANK : e.b.s;
    const text = aT + ' ' + op + ' ' + bT + ' = ' + e.c.t;
    const full = e.a.s + ' ' + op + ' ' + e.b.s + ' = ' + e.c.t;
    const A = e.a.v, B = e.b.v, C = e.c.v, O = other.v;
    // kesalahan umum: memakai operasi yang salah (mis. ▢ + 3 = 18 → 21, menambah bukan mengurangi)
    let wrong;
    if (op === '+') wrong = [C + O, O - C];
    else if (op === MINUS) wrong = side === 'a' ? [C - B, B - C] : [A + C, C - A];
    else if (op === '×') wrong = [C * O, C - O, C + O];
    else wrong = side === 'a' ? [C / B, C + B] : [A * C, C / A, A - C];
    const hints = {
      '+': 'Hilang = hasil dikurangi angka lain.', '×': 'Hilang = hasil dibagi angka lain.',
      '÷': side === 'a' ? 'Hilang = hasil dikali pembagi.' : 'Hilang = yang dibagi, dibagi hasil.'
    };
    hints[MINUS] = side === 'a' ? 'Hilang = hasil ditambah angka lain.' : 'Hilang = angka pertama dikurangi hasil.';
    let cands;
    if (e.frac) {
      const n = hide.n, d = hide.d, add = function (c) { if (c) cands.push(c); };
      cands = [];
      add(fracCand(n + 1, d)); add(fracCand(n, d + 1)); add(fracCand(d, n)); add(fracCand(n + 2, d)); add(fracCand(n, d + 2)); add(fracCand(other.n, other.d)); add(fracCand(e.c.n, e.c.d));
      if (n > 1) add(fracCand(n - 1, d)); if (d > 2) add(fracCand(n, d - 1));
      const fill = function (k) { return [fracCand(n + k, d + k), fracCand(n + k, d), fracCand(n, d + k)]; };
      return make({ kind: q.kind, expr: full, text: text, explain: full, format: 'missing', eq: e, answer: hide.v, answerText: hide.t, cands: cands, fill: fill, hint: 'Balikkan operasinya, lalu sederhanakan.' });
    }
    if (q.kind === 'dec') cands = wrong.concat([hide.v * 10, hide.v / 10, hide.v + 0.1, hide.v - 0.1, hide.v + 1, hide.v - 1]);
    else cands = wrong.concat([hide.v + 1, hide.v - 1, hide.v + 2, hide.v - 2, hide.v + 10, hide.v - 10, swapDigits(hide.v)]);
    return make({ kind: q.kind, expr: full, text: text, explain: full, format: 'missing', eq: e, answer: hide.v, answerText: hide.t, cands: cands, step: q.kind === 'dec' ? 0.1 : 1, hint: hints[op],
      nonNeg: q.kind !== 'int' && q.kind !== 'dec', integer: q.kind !== 'dec' });
  }

  /** Buat satu soal dari spesifikasi topik. format: 'result' (bawaan) | 'missing'. */
  function generate(spec, format) {
    const f = GEN[spec.type];
    if (!f) throw new Error('Jenis soal tidak dikenal: ' + spec.type);
    const s = Object.assign({}, DEFAULTS[spec.type], spec);
    if (format === 'missing' && s.type === 'dec') s.round = 0;       // pembulatan tidak cocok untuk persamaan: pakai versi pas
    const q = f(s);
    return format === 'missing' && q.eq ? toMissing(q) : q;
  }

  /** Sesi soal: memilih topik acak (boleh berbobot), menghindari soal yang sama berturut-turut,
   * dan membatasi jumlah pengecoh (opts.maxChoices: Mudah 4, Sedang 6, Sulit 8). */
  class Session {
    constructor(topics, opts) { this.topics = topics; this.last = ''; this.count = 0; this.maxChoices = (opts && opts.maxChoices) || 8; this.format = (opts && opts.format) || 'result'; }
    next() {
      let q, tries = 0;
      do {
        const total = this.topics.reduce(function (s, t) { return s + (t.weight || 1); }, 0);
        let r = RND() * total, spec = this.topics[0];
        for (const t of this.topics) { r -= (t.weight || 1); if (r <= 0) { spec = t; break; } }
        q = generate(spec, this.format);
      } while (q.text === this.last && ++tries < 12);
      if (q.choices.length > this.maxChoices) q.choices = q.choices.slice(0, this.maxChoices);
      this.last = q.text; this.count++;
      return q;
    }
  }

  /** Lebarkan rentang satu topik sedikit (dipakai Deck bila rentang terlalu sempit untuk 20 jawaban berbeda). */
  function widen(spec) {
    const s = Object.assign({}, spec);
    switch (s.type) {
      case 'add': case 'sub': if (s.digits) break; s.max = Math.round(s.max * 1.3) + 2; break;
      case 'mul': s.aMax = (s.aMax || 9) + 2; s.bMax = (s.bMax || 9) + 2; break;
      case 'div': s.qMax = (s.qMax || 9) + 3; break;
      case 'int': s.max = (s.max || 12) + 4; break;
      case 'dec': s.max = (s.max || 20) + 5; break;
      case 'frac': s.dmax = (s.dmax || 6) + 1; break;
    }
    return s;
  }

  /** Soal cadangan yang AMAN (jawaban belum terpakai, tanpa pembagian nol, bilangan bulat kecil) bila generator kehabisan variasi. */
  function safeQuestion(format, usedA, idx) {
    for (let n = 2 + idx; n < 400; n++) {
      if (usedA[String(n)] || usedA[String(n - 1)]) continue;
      const q = format === 'missing'
        ? make({ kind: 'add', expr: (n - 1) + ' + 1 = ' + n, text: BLANK + ' + 1 = ' + n, explain: (n - 1) + ' + 1 = ' + n, format: 'missing', answer: n - 1, cands: [n, n + 1, n - 2], nonNeg: true, integer: true, hint: 'Hilang = hasil dikurangi angka lain.' })
        : make({ kind: 'add', expr: (n - 1) + ' + 1', answer: n, cands: [n + 1, n - 1, n + 2], nonNeg: true, integer: true, hint: 'Tambah satu.' });
      if (!usedA[q.answerText]) return q;
    }
    return null;
  }

  /** Dek soal satu stage: `n` soal dengan JAWABAN UNIK (tidak ada dua bola bernilai sama) dan teks unik. fmts = 'result' | 'missing' atau array per-id
   * (format tiap soal; Stage 3 = campuran). Bila rentang topik terlalu sempit, topik dilebarkan; bila tetap gagal setelah batas percobaan, soal cadangan yang aman. */
  function buildDeck(topics, n, rng, fmts) {
    const prev = RND; if (rng) RND = rng;
    try { return buildDeckInner(topics, n, fmts); } finally { RND = prev; }
  }
  function buildDeckInner(topics, n, fmts) {
    const local = topics.map(function (t) { return Object.assign({}, t); }), usedA = {}, usedE = {}, out = [];
    const fmtOf = function (i) { return Array.isArray(fmts) ? fmts[i] : (fmts || 'result'); };
    let guard = 0;
    while (out.length < n && guard++ < 6000) {
      const total = local.reduce(function (s, t) { return s + (t.weight || 1); }, 0);
      let r = RND() * total, idx = 0;
      for (let i = 0; i < local.length; i++) { r -= (local[i].weight || 1); if (r <= 0) { idx = i; break; } }
      const q = generate(local[idx], fmtOf(out.length));
      if (!usedA[q.answerText] && !usedE[q.text]) { usedA[q.answerText] = 1; usedE[q.text] = 1; q.id = out.length; q.done = false; out.push(q); }
      else if (guard % 30 === 0) local[idx] = widen(local[idx]);
    }
    while (out.length < n) {      // cadangan aman
      const q = safeQuestion(fmtOf(out.length), usedA, out.length); if (!q) break;
      usedA[q.answerText] = 1; usedE[q.text] = 1; q.id = out.length; q.done = false; out.push(q);
    }
    return out;
  }

  /** Contoh soal untuk layar pembuka (satu contoh; Stage 3 = dua: hasil + angka hilang). Mengembalikan daftar teks soal. */
  function examples(topics, format) {
    const fm = format === 'mixed' ? ['result', 'missing'] : [format || 'result'], spec = topics[Math.floor(Math.random() * topics.length)];
    return fm.map(function (f) { return generate(spec, f).text; });
  }

  /* ---------- kategori & tingkat kesulitan (Main Menu) ----------
   * Tiap kategori + kesulitan menghasilkan daftar topik untuk generator di atas.
   * Parameter: rentang angka (min/max), jumlah digit (digits), jenis operasi (op/ops), dan kerumitan (mode pecahan, desimal, pembulatan).
   * Untuk menambah kategori: tambahkan ke GA.Categories.LIST (config/categories.js) dan isi TABLE-nya untuk tiga kesulitan. */
  const CATEGORIES = GA.Categories.LIST;      // daftar kategori ada di config/categories.js (dimuat di halaman awal)
  const INT = function (op, min, max) { return { type: 'int', op: op, min: min, max: max }; };
  const DEC = function (op, places, min, max, round) { return { type: 'dec', op: op, places: places, min: min, max: max, round: round || 0 }; };
  const TABLE = {
    add: { mudah: [{ type: 'add', min: 1, max: 12 }], sedang: [{ type: 'add', min: 10, max: 60 }], sulit: [{ type: 'add', min: 25, max: 250 }] },
    sub: { mudah: [{ type: 'sub', min: 1, max: 25 }], sedang: [{ type: 'sub', min: 10, max: 80 }], sulit: [{ type: 'sub', min: 30, max: 300 }] },
    mul: { mudah: [{ type: 'mul', aMin: 2, aMax: 5, bMin: 2, bMax: 9 }], sedang: [{ type: 'mul', aMin: 2, aMax: 9, bMin: 2, bMax: 12 }], sulit: [{ type: 'mul', aMin: 6, aMax: 15, bMin: 6, bMax: 15 }, { type: 'mul', aMin: 11, aMax: 30, bMin: 3, bMax: 9 }] },
    div: { mudah: [{ type: 'div', bMin: 2, bMax: 5, qMin: 2, qMax: 21 }], sedang: [{ type: 'div', bMin: 2, bMax: 9, qMin: 2, qMax: 12 }], sulit: [{ type: 'div', bMin: 3, bMax: 12, qMin: 5, qMax: 25 }] },
    int: { mudah: [INT('+', 1, 9), INT('-', 1, 9)], sedang: [INT('any', 1, 12)], sulit: [INT('+', 5, 40), INT('-', 5, 40), INT('*', 2, 15), INT('/', 2, 15)] },
    frac: { mudah: [{ type: 'frac', ops: ['+', '-'], mode: 'same', dmax: 6 }], sedang: [{ type: 'frac', ops: ['+', '-', '×'], mode: 'rel', dmax: 8 }], sulit: [{ type: 'frac', ops: ['+', '-', '×', '÷'], mode: 'any', dmax: 10 }] },
    dec: { mudah: [DEC('+', 1, 1, 10), DEC('-', 1, 1, 10)], sedang: [DEC('+', 1, 1, 30), DEC('-', 1, 1, 30), DEC('*', 1, 1, 9)], sulit: [DEC('+', 2, 1, 20), DEC('-', 2, 1, 20), DEC('*', 1, 1, 9, 1), DEC('/', 1, 1, 9)] }
  };
  const CHOICES = { mudah: 4, sedang: 6, sulit: 8 };

  function categoryById(id) { return GA.Categories.byId(id); }

  /** Daftar topik untuk satu kategori dan kesulitan ('mix' = semua kategori). Boleh juga array kategori (campur beberapa slot). */
  function topicsFor(cat, diff) {
    diff = TABLE.add[diff] ? diff : 'sedang';
    if (Array.isArray(cat)) { const out = []; cat.forEach(function (c) { topicsFor(c, diff).forEach(function (t) { out.push(t); }); }); return out; }
    if (cat === 'mix') return topicsFor(['add', 'sub', 'mul', 'div', 'int', 'frac', 'dec'], diff);
    return (TABLE[cat] || TABLE.add)[diff].slice();
  }

  GA.Questions = { generate: generate, Session: Session, deck: buildDeck, examples: examples, BLANK: BLANK, fmt: fmt, DEFAULTS: DEFAULTS, GEN: GEN, CATEGORIES: CATEGORIES, categoryById: categoryById, topicsFor: topicsFor, maxChoices: function (d) { return CHOICES[d] || 6; } };
})(window.GA = window.GA || {});
