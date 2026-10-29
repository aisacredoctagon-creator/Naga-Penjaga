# Revisi 7 tahap (c): hasil bot kecepatan

Bot: `js/dev/pacing.js` (`?debug=pace`, `GA.Pace.run` / `GA.Pace.play`). Game sama persis, tanpa render. Waktu menjawab per soal ~ N(6 dtk, SD 2 dtk), akurasi 90% (10% menembak bola angka lain), menunggu garis tembak terbuka dan bebas rintangan, PRNG ber-seed (hasil bisa diulang). Layar potret 390×844, 300 seed per sel (2.700 putaran per tabel). Menang = stage selesai dengan ≥ 1 telur.

## Mekanik apa adanya (tidak ada nilai yang diubah)

| Stage | Kesulitan | Menang | Telur hilang (rata-rata) | Sebab telur hilang per putaran |
|---|---|---|---|---|
| 1 | Mudah | 57,3% | 1,91 | salah 1,52; sarang 0,39 |
| 1 | Sedang | 52,3% | 2,04 | salah 1,59; sarang 0,45 |
| 1 | Sulit | 50,0% | 2,09 | salah 1,47; sarang 0,62 |
| 2 | Mudah | 71,7% | 1,58 | salah 1,76; sarang 0,18 |
| 2 | Sedang | 71,3% | 1,66 | salah 1,89; sarang 0,16 |
| 2 | Sulit | 71,0% | 1,66 | salah 1,86; sarang 0,19 |
| 3 | Mudah | 67,0% | 1,61 | salah 1,57; waktu habis 0,43 |
| 3 | Sedang | 71,3% | 1,58 | salah 1,52; waktu habis 0,47 |
| 3 | Sulit | 65,0% | 1,64 | salah 1,42; waktu habis 0,60 |

Target Sedang 85–95% **tidak tercapai** dan tidak bisa dicapai lewat kecepatan: dengan akurasi 90% dan `WRONG_ANSWERS_PER_EGG = 1` (3 telur), peluang tidak lebih dari 2 jawaban salah dalam 20 soal hanya 67,7% (binomial). Telur emas menambah sedikit (Stage 2 ≈ 71%). Menurunkan kecepatan rantai hanya mengurangi kerugian "sampai di sarang" (Stage 1, ≈ 15 poin); batas atas tetap ≈ 68–72%.

## Opsi yang diukur: `WRONG_ANSWERS_PER_EGG = 2` (kecepatan tidak diubah)

| Stage | Kesulitan | Menang | Telur hilang | Sebab |
|---|---|---|---|---|
| 1 | Mudah | 75,3% | 1,32 | salah 0,71; sarang 0,61 |
| 1 | Sedang | 79,0% | 1,31 | salah 0,65; sarang 0,66 |
| 1 | Sulit | 75,3% | 1,41 | salah 0,72; sarang 0,69 |
| 2 | Mudah | 87,7% | 0,80 | salah 0,67; sarang 0,30 |
| 2 | Sedang | 85,3% | 0,93 | salah 0,73; sarang 0,36 |
| 2 | Sulit | 87,7% | 0,84 | salah 0,72; sarang 0,26 |
| 3 | Mudah | 86,0% | 0,95 | waktu habis 0,59; salah 0,56 |
| 3 | Sedang | 85,3% | 0,97 | salah 0,55; waktu habis 0,57 |
| 3 | Sulit | 81,7% | 1,17 | waktu habis 0,76; salah 0,54 |

Stage 1 masih tertahan kerugian "sarang" 0,66/putaran, bagian yang memang bisa dikurangi lewat `CHAIN_BASE_SPEED`. Stage 3 dibatasi "waktu habis" pola akhir boss (waktu soal boss, bukan kecepatan rantai).
