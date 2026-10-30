# Revisi 7 tahap (d): acak posisi bola jawaban

`QM.arrange` (`js/qmanager.js`) memilih urutan keluar bola jawaban dari portal. Urutan antrean SOAL tidak disentuh; `QuestionManager`, pemicu `advance`, dan penyorotan (jawaban benar tidak pernah disorot) tidak berubah. Seed = seed stage per percobaan (`run.qm.rand()`), jadi "Ulangi" mendapat urutan baru, tata letak sama.

## Cara kerja

Undian tanpa pengembalian (gaya Fisher-Yates, ber-seed) ke SELURUH rantai, bukan jendela sempit seperti sebelumnya, dengan batas keadilan:

- jawaban soal pertama = bola pertama yang keluar (`SHUFFLE_FIRST = 1`): terlihat begitu hitung mundur selesai;
- jawaban soal ke-k hanya diundi di antara bola yang sudah keluar saat soal itu aktif. Model keluarnya bola diukur dengan bot (`STAGE_SHUFFLE` di `js/config/gameplay.js`; Stage 3 lebih lambat); separuh soal (`SHUFFLE_CONS`) hanya di bola yang pasti sudah keluar;
- tiap soal diundi ke sepertiga rantai (depan / tengah / ekor) menurut sasaran seimbang, sehingga posisi jawaban soal aktif tersebar merata (sebelumnya menumpuk di depan: 54/24/22% di Stage 1);
- paling banyak 2 jawaban berurutan (urutan soal) yang bertetangga di rantai;
- penjaga runtime tidak berubah: bila jawaban soal yang baru aktif ada di 12% terakhir jalur, rantai melambat ±3 dtk, tanpa menandai bola. Dalam 54.000 aktivasi bot, 0 kejadian.

Posisi sebuah bola di rantai = tengah selnya, `(i + 0,5) / m` (setiap bola menempati 1/m panjang rantai; bola pertama/terakhir tidak dipaksa ke 0%/100%).

## Hasil di mesin permainan asli (bot ?debug=pace, potret 390×844, 300 putaran × 3 stage × 3 kesulitan)

Posisi jawaban soal yang baru aktif di antara bola jawaban yang ada (depan / tengah / ekor, %); "belum keluar" = jawaban belum keluar dari portal saat soal aktif (game memunculkannya lewat `surfaceTarget`/percepatan); menang = Sedang jawaban salah 2 = 1 telur:

| Stage | Kesulitan | Depan / tengah / ekor | Belum keluar | Menang |
|---|---|---|---|---|
| 1 | Mudah | 29,9 / 41,9 / 28,2 | 3,6% | 89,7% |
| 1 | Sedang | 32,8 / 38,4 / 28,8 | 1,9% | 90,7% |
| 1 | Sulit | 33,8 / 40,4 / 25,8 | 1,1% | 90,7% |
| 2 | Mudah | 35,0 / 40,1 / 24,9 | 12,8% | 87,7% |
| 2 | Sedang | 33,3 / 40,6 / 26,0 | 8,9% | 92,3% |
| 2 | Sulit | 35,3 / 39,2 / 25,5 | 6,2% | 90,0% |
| 3 | Mudah | 36,9 / 33,6 / 29,5 | 15,6% | 90,0% |
| 3 | Sedang | 36,4 / 34,7 / 28,9 | 12,1% | 91,3% |
| 3 | Sulit | 36,4 / 38,7 / 24,8 | 8,7% | 91,3% |

Semua sepertiga 24,8–41,9% (target 25–42%). Rata-rata 19,8–19,9 soal terjawab per putaran; stage yang dimenangkan selalu menjawab tepat 20 soal. Jalur 12% terakhir: 0 kejadian. Persentase menang Sedang tetap 90–92% (target tahap c 85–95%).

**Catatan jujur tentang metrik.** Rantai yang terlihat di layar hanya ±4–5 bola (Stage 3 ±3–4), jadi "sepertiga rantai" kasar. Bila dihitung terhadap SEMUA bola terlihat (termasuk bola khusus es/telur dan bola salah tembakan yang menyatu dengan rantai), Stage 1–2 tetap 28–42% per sepertiga, tetapi Stage 3 menjadi ≈ 21 / 50 / 29% (sepertiga tengah menampung 2 dari 4 bola, dan ada ≈ 1,1 bola non-jawaban per aktivasi). Angka itu tercantum di pesan tes. Jawaban yang belum keluar tinggi di Stage 2–3 Mudah (rantai paling lambat); itu tidak membuat macet karena game memunculkan bolanya, tetapi bisa diperketat dengan menaikkan `SHUFFLE_CONS` (kompromi: jawaban lebih sering di sepertiga depan).

## Temuan lain tahap ini

- `lineBlocker` (`js/main.js`) dulu menganggap bola tujuan "terhalang" bila mulut naga sudah menempel pada bola bertetangga, padahal `Chain.hit` memilih pusat bola TERDEKAT. Akibatnya anti-macet sering menukar tempat bola jawaban (`validateActive`) dan simulasi Stage 1 Sulit gagal (garis terbuka 50%). Sekarang mengikuti fisika peluru yang sama. Tak ada perubahan aturan permainan.

## Tes

`?test=1`: 152 pemeriksaan; run terakhir semua lulus (206 dtk). Pemeriksaan baru: 15.000 seed (permutasi sah, deterministik, soal pertama = bola pertama, jawaban selalu di antara bola yang sudah keluar, maks 2 berurutan bertetangga), distribusi model nominal (5000 seed/stage: 27–38%), distribusi di mesin asli (100 putaran/stage), jawaban belum keluar ≤ 18% dan 0 kejadian di 12% terakhir jalur, 20 soal terjawab tepat sekali di semua stage yang dimenangkan bot.

Dua kegagalan acak terlihat di dua run suite penuh sebelum run terakhir yang hijau, masing-masing sekali dan tidak berulang: (1) `stage 3: penukaran ... jarak tetap rapat` (celah ±1 bola bertahan ≥ 30 frame; rasio maks 1,93–1,95 juga muncul di run yang lulus, jadi ambangnya tipis), (2) `TIMEOUT: efek tampil dulu` (satu jeda 24,7 dtk dari 9). Keduanya ada di uji boss/penukaran yang bergantung waktu (`js/dev/qsim.js`), bukan di tes posisi bola; belum diselidiki lebih jauh.
