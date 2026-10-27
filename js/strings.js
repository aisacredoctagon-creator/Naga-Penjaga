/* strings.js — SEMUA teks antarmuka di satu tempat (Bahasa Indonesia).
 * Kebijakan teks: ikon dulu, teks seperlunya. Label tombol/HUD maksimal 1-2 kata; keterangan maksimal ±5 kata.
 * Pengecualian (tidak dilint): kunci berawalan `story.` (cerita) dan soal matematika (questions.js).
 * Lint: buka index.html?test=1 (tes "teks UI ringkas") atau jalankan `powershell -File tools/lint-strings.ps1`.
 * Pakai: GA.T('menu.start'), GA.T('step.done', { n: 3 }) — {n} diganti nilai. Kunci tak dikenal dikembalikan apa adanya. */
(function (GA) {
  'use strict';

  const S = {
    // umum
    'common.back': 'Kembali', 'common.go': 'Mulai!', 'common.next': 'Lanjut', 'common.skip': 'Lewati', 'common.menu': 'Menu',
    'common.again': 'Main Lagi', 'common.yes': 'Ya', 'common.no': 'Batal', 'common.ok': 'Oke',
    'common.score': 'Skor', 'common.example': 'Contoh', 'common.questions': 'soal', 'common.boss': 'Boss', 'common.step': 'Step',

    // judul
    'title.play': 'Main', 'title.howto': 'Cara Main', 'title.settings': 'Atur',
    'title.tag': 'Selamatkan telur naga!', 'title.best': 'Rekor',

    // pengaturan
    'set.title': 'Atur', 'set.sound': 'Suara', 'set.music': 'Musik', 'set.quality': 'Grafik',
    'set.auto': 'Otomatis', 'set.high': 'Tinggi', 'set.mid': 'Sedang', 'set.low': 'Rendah',
    'set.story': 'Cerita', 'set.reset': 'Hapus Data', 'set.resetq': 'Hapus semua progres?', 'set.resetx': 'Bintang dan skor akan hilang.',
    'set.resetyes': 'Hapus', 'set.resetdone': 'Progres dihapus',

    // cara main: 3 kartu bergambar
    'how.title': 'Cara Main',
    'how.aim': 'Bidik', 'how.aim2': 'Geser, lalu lepas', 'how.hit': 'Tembak jawaban', 'how.hit2': 'Bola dengan angka benar',
    'how.egg': 'Jaga telur', 'how.egg2': 'Salah = telur hilang',
    'how.curse': 'Kutukan', 'how.frost': 'Beku', 'how.gold': 'Emas',
    'how.goal': '20 soal per step',

    // menu & pilih step
    'menu.title': 'Petualangan', 'menu.same': 'Satu kategori', 'menu.random': 'Acak', 'menu.pick': 'Pilih Step',
    'menu.cat': 'Kategori', 'menu.diff': 'Kesulitan', 'menu.boss': 'Boss',
    'diff.mudah': 'Mudah', 'diff.sedang': 'Sedang', 'diff.sulit': 'Sulit',
    'menu.hint.same': 'Semua step sama', 'menu.hint.per': 'Pilih tiap step', 'menu.hint.random': 'Kategori diacak',
    'steps.title': 'Pilih Step', 'steps.locked': 'Terkunci', 'steps.mix': 'Campuran',

    // layar awal step
    'intro.buff': 'Buff', 'intro.nerf': 'Nerf', 'intro.specials': 'Bola khusus',
    'sp.curse': 'Kutukan', 'sp.frost': 'Beku', 'sp.egg': 'Emas',
    'sp.curse2': 'Jangan tembak', 'sp.frost2': 'Rantai melambat', 'sp.egg2': '+1 telur',

    // hasil
    'step.done': 'Step {n} Selesai!', 'step.next': 'Step {n}', 'step.egg': '+1 telur!',
    'res.win': 'Menang!', 'res.lose': 'Telur Dicuri', 'res.best': 'Rekor Baru!', 'res.stats': '✓ {c}   ✗ {w}   ×{k}',
    'res.hi': 'Rekor',

    // kejadian di arena (popup melayang)
    'fx.wrong': 'Salah!', 'fx.curse': 'KUTUKAN!', 'fx.slow': 'Lambat!', 'fx.egg': '+1 telur', 'fx.swap': 'Tukar!', 'fx.shield': 'Perisai!',
    'fx.stolen': 'Telur dicuri!', 'fx.twin': 'Api Ganda!', 'fx.freeze': 'Waktu Beku!', 'fx.changed': 'Soal berganti', 'fx.warn': 'Awas!', 'fx.frozen': 'Beku!', 'fx.twinready': 'Api Ganda siap!', 'fx.twin2': 'Api Ganda ×2', 'fx.c1': 'Hebat!', 'fx.c2': 'Mantap!', 'fx.c3': 'Luar biasa!', 'fx.boss': 'BOSS KALAH!', 'fx.stepdone': 'STEP SELESAI!',
    'fb.curse': 'Jangan tembak kutukan!', 'fb.obst': 'Kena rintangan!', 'fb.obst2': 'Tunggu celah.', 'fb.hole': 'Bola sampai di sarang!', 'fb.hole2': 'Soal muncul lagi.', 'fb.time': 'Waktu habis!',

    // coachmark (muncul pertama kali saja)
    'coach.1': 'Geser untuk membidik', 'coach.2': 'Lepas untuk menembak', 'coach.3': 'Bidik bola jawaban',

    // cerita (dikecualikan dari lint): maksimal 5 panel, satu kalimat pendek
    'story.1.t': 'Penjaga Telur', 'story.1': '{dragonName} menjaga telur-telur naga.',
    'story.2.t': 'Si Penyihir', 'story.2': '{wizardName} mengirim bola sihir untuk mencuri telur.',
    'story.3.t': 'Telur Hilang!', 'story.3': 'Bola sihir menggulung ke sarang!',
    'story.4.t': 'Semburkan Api!', 'story.4': 'Tembak bola berisi jawaban yang benar.',
    'story.win.t': 'Telur Selamat!', 'story.win': '{wizardName} kalah. Lembah aman kembali!',
    'story.lose.t': 'Telur Dicuri', 'story.lose': '{dragonName} belum menyerah. Coba lagi!',
    'story.s1': 'Penyihir menyelinap lewat hutan.', 'story.s2': 'Jejaknya menuju rawa berkabut.',
    'story.s3': 'Jejaknya menuju gunung api.', 'story.s4': 'Es menjebak bidikan di gua kristal.', 'story.s5': 'Puncak menara. Selamatkan semua telur!'
  };

  function T(key, vars) {
    let s = S[key];
    if (s == null) return key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }

  /** Daftar string UI yang melebihi `max` kata (default 5), tanpa kunci `story.*`. Dipakai tes & skrip lint. */
  T.lint = function (max) {
    max = max || 5; const bad = [];
    Object.keys(S).forEach(function (k) {
      if (k.indexOf('story.') === 0) return;
      const n = S[k].replace(/\{\w+\}/g, 'x').trim().split(/\s+/).filter(function (w) { return /[A-Za-z0-9]/.test(w); }).length;
      if (n > max) bad.push(k + ' (' + n + ' kata): ' + S[k]);
    });
    return bad;
  };
  T.all = S;
  GA.T = T;
})(window.GA = window.GA || {});
