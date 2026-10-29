# Revisi 7 tahap (c): hasil bot kecepatan

Bot: `js/dev/pacing.js` (`?debug=pace`, `GA.Pace.play` / `GA.Pace.run`). Game sama persis, tanpa render. Per soal aktif ia "berpikir" ~ N(6 dtk, SD 2 dtk), akurasi 90% (10% menembak bola angka lain), membidik dari pusat naga (seperti pointer pemain), menembak hanya bila bola pertama yang tersentuh peluru (prediksi fisik `Chain.hit` dari mulut naga) memang bola yang dituju dan rintangan tidak menghalangi. `Math.random` diganti PRNG ber-seed per putaran (hasil bisa diulang). 300 seed per sel. Menang = stage selesai dengan ≥ 1 telur.

Dua cacat bot ditemukan dan diperbaiki sebelum angka akhir ini (angka awal yang lebih rendah salah): (1) bot menguji "garis terbuka" sebelum membidik, sehingga menunggu bola salah yang tak pernah tersedia ±60 dtk dan bola sampai di sarang; (2) bidikan iteratif dari mulut naga tidak konvergen untuk bola yang dekat dengan mulut (landskap). Tidak ada kode permainan yang berubah karena temuan ini.

## Hasil akhir (`WRONG_ANSWERS_PER_EGG = 2`, kecepatan TIDAK diubah)

Persentase menang (telur hilang rata-rata):

| Layar | Stage | Mudah | Sedang | Sulit |
|---|---|---|---|---|
| Potret 390×844 | 1 | 90,7% (0,89) | **91,7%** (0,87) | 89,3% (0,93) |
| Potret | 2 | 91,3% (0,71) | **89,3%** (0,76) | 90,0% (0,75) |
| Potret | 3 | 89,0% (0,75) | **93,7%** (0,70) | 88,0% (0,88) |
| Lanskap 844×390 | 1 | 90,0% (0,93) | **87,0%** (1,01) | 88,3% (0,96) |
| Lanskap | 2 | 93,7% (0,65) | **87,7%** (0,78) | 90,3% (0,70) |
| Lanskap | 3 | 92,3% (0,68) | **89,3%** (0,76) | 89,0% (0,85) |

Sedang 87–94% di semua stage dan layar: target 85–95% tercapai tanpa mengubah kecepatan rantai. Selisih antar kesulitan masih dalam derau (±1,8 poin untuk 300 seed), jadi urutan Mudah > Sedang > Sulit belum tampak jelas. Penyebab telur hilang per putaran: jawaban salah ≈ 0,7, bola sampai di sarang 0,14–0,33, waktu habis boss 0,2–0,4 (Stage 3).

## Pembanding: aturan lama `WRONG_ANSWERS_PER_EGG = 1` (potret, bot yang sama)

| Stage | Mudah | Sedang | Sulit |
|---|---|---|---|
| 1 | 64,0% | 59,3% | 64,7% |
| 2 | 67,3% | 71,7% | 72,0% |
| 3 | 69,3% | 69,0% | 68,7% |

Dengan satu telur per jawaban salah, akurasi 90% saja membatasi kemenangan ke ≈ 68% (peluang paling banyak 2 salah dari 20 soal = 67,7%), sehingga kecepatan tidak bisa mencapai target. Karena itu `WRONG_ANSWERS_PER_EGG` diubah ke 2 (disetujui).
