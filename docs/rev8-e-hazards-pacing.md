# Revisi 8 — tahap e: rintangan, kecepatan, bot kecepatan

## 1. Rintangan di tata letak spiral

Ruang bebas di sekitar naga kini hanya cakram sayap di dalam spiral (jangkauan sayap ≈ 108 px pada R = 32; mulut naga 90 px dari pusat). Penempatan lama (cincin tetap 1–4R di luar mulut, radius tetap, pilar rune selalu vertikal ke atas) sering gagal: pengukuran 150 percobaan per jenis menunjukkan gelombang 0–6% di potret S1/S2, pilar rune 0% di semua lanskap dan desktop.

| Perubahan (`js/hazards.js`) | Alasan |
| --- | --- |
| Radius rintangan menyesuaikan ruang: `free = jarak ke jalur − (R + margin) − 6`; boleh mengecil sampai 60% radius dasar, tidak pernah menimpa jalur / bola | ruang bebas sempit |
| 28 percobaan (sebelumnya 14) dan ujung dalam cincin tidak lagi menambah radius tetap | kemungkinan berhasil |
| Pilar petir rune = lajur LURUS dari mulut naga ke arah acak, sepanjang ruang bebas (≥ 1R), bukan kolom vertikal dari tepi atas layar | di lanskap ruang bebas hanya timur/barat, dan kolom lama menimpa bola |
| `blocksLine` untuk lajur: cuplik sepanjang garis, jarak ke ruas lajur | lajur tidak lagi vertikal |
| Perbaikan: rintangan yang berakhir sebelum lontaran mendarat tetap menghalangi (`blocksLine` tidak lagi memakai `e.t + LOB_TIME`) | cincin target hijau, tetapi lontaran melintasi geyser yang masih aktif → telur hilang (ditemukan bot: 74–81 kasus per 300 putaran di Stage 3 lanskap/desktop → 0) |
| `targetsOpen`: bola jawaban soal AKTIF juga harus tetap punya garis terbuka setelah rintangan pemblokir muncul | validator "tidak ada bola target yang terkunci" |

Peluang muncul per 100 percobaan (Sedang, 3 stage × layar; sebelum → sesudah):

| Jenis | potret S1 | potret S2 | lanskap S1 | lanskap S3 |
| --- | --- | --- | --- | --- |
| gelombang | 6 → 62 | 0 → 31 | 49 → 100 | 25 → 80 |
| geyser | 46 → 93 | 19 → 89 | 79 → 88 | 26 → 54 |
| rune | 1 → 77 | 21 → 78 | 0 → 69 | 0 → 53 |

Tes baru `testHazardPlacement` (di `?test=1`): untuk 3 layar × 3 stage × 8 jenis × 60 percobaan, setiap rintangan yang muncul ada di dalam area, tidak menimpa jalur / bola / mulut naga, lajur rune sepenuhnya di ruang bebas, setiap jenis muncul ≥ 15%, dan bola jawaban aktif tetap terbuka.

Penyesuaian yang perlu diketahui: rintangan rendah (semak, teratai, gelombang) tetap muncul tetapi tidak memengaruhi lontaran (tahap d).

## 2. Kecepatan

Satuan kecepatan = diameter bola per detik, jadi panjang jalur yang bertambah otomatis menambah waktu tempuh. Waktu tempuh jalur penuh pada Sedang (S1/S2 0,20 d/dtk): serpentin lama ≈ 190 dtk (38 d), revisi 7 ≈ 80 dtk (16 d), sekarang ≈ 145 dtk (29 d).

Satu perubahan: `STAGE_SPEED_MULT[2]` (Stage 3 boss) 0,5 → **0,75** (0,10 → 0,15 d/dtk pada Sedang). Alasan terukur: dengan 0,5 bola jawaban yang diacak ke ekor rantai terlalu lama keluar dari portal (bot menunggu ±39 dtk per putaran di lanskap, timer soal boss habis), Sedang lanskap Stage 3 hanya 77%. Waktu tempuh Stage 3 ≈ 25 d / 0,15 = 167 dtk (revisi 7: 150 dtk). Stage 1–2 tidak diubah.

## 3. Bot kecepatan

`js/dev/pacing.js` (`?debug=pace`, `GA.Pace.run`): waktu menjawab N(6, 2) dtk, akurasi 90%, memakai API target-lock (`aimAtBall` + `openLine`), PRNG ber-seed, game yang sama tanpa render. Menang = stage selesai dengan ≥ 1 telur. Tambahan diagnostik: `diag` (alasan bot menunggu) dan `hazLog` (rintangan saat tembakan).

### Hasil akhir (persentase menang; telur hilang rata-rata; Stage 3 ×0,75; semua perbaikan rintangan)

Sedang, 200 seed per sel:

| Layar | Stage 1 | Stage 2 | Stage 3 |
| --- | --- | --- | --- |
| Potret 390×844 | 91,5% (0,90) | 88,0% (1,01) | 88,0% (0,95) |
| Lanskap 844×390 | 86,0% (1,00) | 90,0% (0,92) | 87,0% (0,96) |
| Desktop 1440×900 | 87,0% (0,96) | 91,0% (0,88) | 92,0% (0,88) |

Sedang 86–92% di semua sel: target 85–95% tercapai dengan satu perubahan konfigurasi (`STAGE_SPEED_MULT[2]`). Tidak ada "peluru mengenai rintangan" lagi setelah perbaikan `blocksLine`.

Mudah / Sulit (potret · lanskap), 100 seed per sel (derau ±3,5 poin):

| | S1 | S2 | S3 |
| --- | --- | --- | --- |
| Mudah | 85 · 89 | 87 · 81 | 86 · 94 |
| Sulit | 91 · 86 | 86 · 92 | 87 · 93 |

Sebelum tuning (Stage 3 ×0,5, sebelum perbaikan rintangan), Sedang: potret 89,0 / lanskap 77,3 / desktop 84,0 untuk Stage 3; Stage 1–2 87–90% (tidak berubah secara berarti). Selisih antar kesulitan masih dalam derau, seperti pada revisi 7 (kecepatan tiap kesulitan tidak diubah di sini).

Pembatas: bot hanya menembak bola jawaban (atau salah sengaja) dan tidak memodelkan pemain yang menunggu rintangan lewat; angka ini batas atas realistis untuk pemain dengan akurasi 90%.
