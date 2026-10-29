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
    'common.score': 'Skor', 'common.example': 'Contoh', 'common.questions': 'soal', 'common.boss': 'Boss', 'common.stage': 'Stage', 'common.retry': 'Ulangi',

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
    'how.f1': 'Hitung hasil', 'how.f2': 'Cari angka hilang', 'how.f3': 'Gabungan',
    'how.goal': '20 soal per stage',

    // menu & pilih step
    'menu.title': 'Petualangan', 'menu.same': 'Satu kategori', 'menu.random': 'Acak', 'menu.pick': 'Pilih Stage',
    'menu.cat': 'Kategori', 'menu.diff': 'Kesulitan', 'menu.boss': 'Boss',
    'diff.mudah': 'Mudah', 'diff.sedang': 'Sedang', 'diff.sulit': 'Sulit',
    'menu.hint.same': 'Semua stage sama', 'menu.hint.per': 'Pilih tiap stage', 'menu.hint.random': 'Kategori diacak',
    'steps.title': 'Pilih Stage', 'steps.locked': 'Terkunci', 'steps.mix': 'Campuran', 'steps.result': 'Hasil',

    // layar awal stage + bola khusus
    'sp.frost': 'Beku', 'sp.egg': 'Emas',
    'sp.frost2': 'Rantai melambat', 'sp.egg2': '+1 telur',
    'fmt.result': 'Hitung hasil', 'fmt.missing': 'Cari angka hilang', 'fmt.mixed': 'Gabungan',
    'fmt.result2': 'Isi kotak: hasilnya', 'fmt.missing2': 'Isi kotak: angka hilang', 'fmt.mixed2': 'Dua jenis soal, bergantian',

    // hasil
    'step.done': 'Stage {n} Selesai!', 'step.next': 'Stage {n}', 'ov.first': 'Benar pertama', 'ov.eggs': 'Telur', 'ov.wrong': 'Salah', 'ov.unanswered': 'Belum terjawab', 'ov.lose': 'Telur Habis', 'ov.tap': 'Ketuk nomor soal',
    'res.win': 'Menang!', 'res.lose': 'Telur Dicuri', 'res.best': 'Rekor Baru!', 'res.stats': '✓ {c}   ✗ {w}   ×{k}',
    'res.hi': 'Rekor',

    // kejadian di arena (popup melayang)
    'fx.wrong': 'Salah!', 'fx.slow': 'Lambat!', 'fx.egg': '+1 telur',
    'fx.stolen': 'Telur dicuri!', 'fx.changed': 'Soal berganti', 'fx.warn': 'Awas!', 'fx.frozen': 'Beku!', 'fx.c1': 'Hebat!', 'fx.c2': 'Mantap!', 'fx.c3': 'Luar biasa!', 'fx.boss': 'BOSS KALAH!', 'fx.stepdone': 'STAGE SELESAI!',
    'fb.obst': 'Kena rintangan!', 'fb.obst2': 'Tunggu celah.', 'fb.hole': 'Bola sampai di sarang!', 'fb.hole2': 'Soal muncul lagi.', 'fb.time': 'Waktu habis!',

    // coachmark (muncul pertama kali saja)
    'cine.skip': 'Ketuk untuk lewati', 'coach.1': 'Geser untuk membidik', 'coach.2': 'Lepas untuk menembak', 'coach.3': 'Bidik bola jawaban',

    // cerita (dikecualikan dari lint): maksimal 5 panel, satu kalimat pendek
    'story.1.t': 'Penjaga Telur', 'story.1': '{dragonName} menjaga telur-telur naga.',
    'story.2.t': 'Si Penyihir', 'story.2': '{wizardName} mengirim bola sihir lewat tiga negeri.',
    'story.3.t': 'Telur Hilang!', 'story.3': 'Bola sihir menggulung ke sarang!',
    'story.4.t': 'Semburkan Api!', 'story.4': 'Tembak bola berisi jawaban yang benar.',
    'story.win.t': 'Telur Selamat!', 'story.win': '{wizardName} kalah. Tiga negeri aman!',
    'story.lose.t': 'Telur Dicuri', 'story.lose': '{dragonName} belum menyerah. Coba lagi!',
    'story.s1': 'Penyihir menyelinap lewat hutan.', 'story.s2': 'Jejaknya menuju gunung api dan gua kristal.', 'story.s3': 'Puncak menara. Selamatkan semua telur!'
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
