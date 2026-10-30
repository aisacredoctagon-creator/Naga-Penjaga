# Revisi 7 tahap (e): penukaran bola tidak mendadak

Kode: `js/swap.js` (SwapManager), `js/config/gameplay.js` (`SWAP_TELEGRAPH_MS` dkk), kait di `js/main.js` (`makeSwap`), SFX `swapWarn`/`swapGo` di `js/audio.js`, pemicu manual `?debug=swap` (`js/dev/swapdbg.js`).

## Garis waktu (default 2500 ms dari peringatan sampai mulai menukar)

| Fase | Lama | Yang tampak / terdengar |
|---|---|---|
| Peringatan | 0,8 dtk (`SWAP_WARN_MS`) | ikon ⇄ + teks di zona informasi HUD, 3 bip peringatan, pelaku (kelelawar / penyihir) mulai beraksi, cincin putus-putus samar di kedua bola |
| Sorot | sisanya (±1,7 dtk) | cincin cyan → emas berdenyut dengan garis luar gelap, lencana ⇄ melayang di atas tiap bola dengan cincin hitung mundur yang mengisi, busur energi putus-putus, denyut SFX makin rapat dan naik nada |
| Tukar | 0,5 dtk (`SWAP_ANIM`) | dua bola bergerak melengkung (satu di atas, satu di bawah jalur) tanpa celah; lengkungan ke atas ditahan di bawah zona HUD/bar boss (`GA.view.minY`) |
| Sesudah | 1,0 dtk (`SWAP_AFTER`) | cincin tetap menempel pada bola di posisi BARU lalu memudar |

`SWAP_TELEGRAPH_MS` dijepit ke ≥ 2000 ms (`SWAP_TELEGRAPH_MIN_MS`); slider di `?debug=tune`. Bentuk ikon ⇄ selalu ada (tidak hanya warna). Gambar di lapisan 7 (di atas bola), ukuran mengikuti radius bola. `prefers-reduced-motion`: cincin statis (tanpa denyut, gelombang, goyang), jeda waktu sama. Stage 3 fase 2: dua pasangan sekaligus; pasangan kedua magenta → oranye dengan ikon ⇅ (pasangan pertama cyan → emas, ⇄).

## Aturan

- Tidak ada penukaran terjadwal dalam 4 dtk pertama stage atau 3 dtk setelah soal aktif berganti (`SWAP_MIN_START`, `SWAP_AFTER_QUESTION`); penukaran manual melewati penjaga ini.
- Eksekusi ditahan selama ada peluru terbang (indikator tetap tampil); jeda hanya bisa lebih panjang dari 2,5 dtk, tidak pernah lebih pendek.
- Bola hancur / terjawab / hilang selama telegraf: pasangan itu batal dengan efek kecil (`fizzle`).
- Jeda layar membekukan hitung mundur (update hanya saat `playing`). Rotasi layar mengubah jalur: hitung mundur berlanjut (tidak diulang / dipotong); bila bola pasangan jatuh di belakang portal pada jalur baru, pasangan itu dibatalkan (aturan batal).
- Pasangan acak ber-seed di antara bola jawaban terlihat (bukan yang keluar portal / 10% terakhir jalur), jarak di rantai bervariasi, bukan pasangan sama berturut-turut; jeda antar-penukaran dari `SWAP_EVERY` per stage (tidak diubah).
- Satu penukaran pada satu waktu (kecuali Stage 3 fase 2: dua pasangan).

## Tes (`?test=1`, atau `?test=1&only=swap` hanya telegraf)

Peringatan → mulai menukar di 3 ukuran layar × Stage 2–3: 18 penukaran, semuanya 2,50 dtk (konfigurasi 800 ms dijepit ke 2000 ms); 47 telegraf terjadwal, 0 dini / 0 melanggar penjaga 4 dtk dan 3 dtk; penahanan saat peluru terbang, pembatalan, jeda; 6 rotasi di tengah telegraf (5 berlanjut tanpa terpotong, 1 dibatalkan karena bola di belakang portal); dua pasangan berbeda warna dan ikon; reduced-motion tanpa galat; lencana terlihat penuh di bawah HUD di 390×844, 844×390, 1440×900 (72 lencana).

Bukti gambar: `docs/screenshots/j-e-seq-portrait-stage2.jpg` (7 bingkai: peringatan, sorot, detik terakhir, menukar, sesudah, memudar), `j-e-seq-desktop-boss-2pairs.jpg` (Stage 3 desktop, dua pasangan).

## Catatan

- Pada cincin lanskap yang kecil (≈ 125–145 px), dua pasangan sekaligus (Stage 3 fase 2) membuat empat bola berdekatan: cincin dan lencana saling berdekatan, tetap terbaca (warna dan ikon beda) tetapi padat.
- Uji qsim `penukaran terjadi berulang` diturunkan dari ≥ 8 ke ≥ 5 dalam 260 dtk karena penjaga waktu baru membatasi jendela mulai.
- `finish()` dulu error bila `every` null (pemicu manual di Stage 1); diperbaiki.
- Intermiten (muncul di beberapa run suite penuh, tidak berulang pada run ulang): `TIMEOUT: efek tampil dulu` di `js/dev/qsim.js`. Belum diselidiki.
