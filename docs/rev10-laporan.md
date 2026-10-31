# Revisi 10 — laporan akhir

Dua revisi: (1) hapus bola api yang tidak berguna di samping naga; (2) layout jalur baru di semua map: sarang telur dan portal bola sihir berjauhan tanpa bola saling menutupi. Dokumen terkait: `rev10-a-audit.md` (audit), `rev10-c-checkpoint.md` (checkpoint tahap c + screenshot di `docs/rev10/`).

## Temuan audit
- **Bola api diam**: dua, yaitu bola siap-tembak di mulut (`Shooter.cur`) dan soket "bola berikutnya" (`Shooter.nxt`/`bubble()`; ketuk naga/soket/Q menukar). Tidak ada mekanik yang memakai angka atau identitasnya: sasaran = target-lock (`run.lock`), `mult` hanya panas cahaya, skor tidak memakainya → semua dihapus. Tersisa nyala singkat di mulut saat menembak dan bola yang melesat.
- **Mekanik tembak**: lontaran target-lock (bola api terbang di atas rantai ke bola yang dikunci), sehingga invarian keterpilihan = INV-5, bukan INV-1.
- **Layout lama**: portal–sarang 0,09 × sisi terpanjang dan 6° di lanskap/desktop (potret 0,30–0,58 dan 44–142°), karena spiral berujung di platform naga. Tidak ada ilustrasi latar yang menanam portal/sarang.

## File yang diubah
`js/maps/paths.js` (rute grid, validator INV-6/7/8, boss, overlay), `js/path.js` (label SARANG), `js/main.js` (bola api dihapus, zona bersih, bar boss, `stageR`, kecepatan per orientasi), `js/shooter.js`, `js/dragon.js`, `js/story.js`, `js/theme.js`, `js/hazards.js`, `js/render/background.js`, `js/levels.js`, `js/config/gameplay.js`, `index.html`, dev: `js/dev/routesearch.js` (baru), `tests.js`, `pathprev.js`, `chainsim.js`, `orbs.js`; docs: README, ASSET_GUIDE, `rev10-*.md`.

## Panjang jalur lama (revisi 8) vs baru (R = 32, diameter bola) dan jarak portal–sarang
Lihat tabel di `rev10-c-checkpoint.md`: panjang baru 97–101% dari lama di semua varian; jarak portal–sarang 0,69–0,93 × sisi terpanjang, sudut 155–180° (INV-6: ≥ 0,55 dan ≥ 150°).

## Hasil tes
- `?test=1` penuh: **semua lulus** (171 PASS, 0 FAIL, 261 dtk) termasuk invarian INV-2…INV-8 untuk 27 jalur (9 arketipe × 390×844, 844×390, 1440×900), sapuan radius R = 26–36, `testClearZones` (INV-8: dekorasi dasar, objek depan, label SARANG, bar boss; 27 kombinasi, 2161 dekorasi), `testHazardPlacement` (rintangan tidak di zona bersih), `testSmallPhones` (243 kombinasi layar kecil × bola 1,0/1,08/1,12×; ditambahkan setelah suite penuh dan dijalankan lewat `?test=1&only=paths`, lulus), rotasi/jeda/soal/penukaran/boss (`qsim`), simulasi rantai (`?debug=sim`).
- Responsif: `?resp=1` di 568×320 tanpa masalah; rute valid di 360×640, 320×568, 568×320, 667×375, 768×1024, 1024×768 (layar kecil dengan bola kategori besar: radius dikecilkan bertahap oleh `stageR`).
- FPS: 60 fps (penghitung `GA.Quality.fps`) di potret dan lanskap untuk Stage 1–3, sama dengan sebelum revisi.
- Rotasi di tengah permainan (potret → lanskap, Stage 2): jeda otomatis, jumlah bola, soal aktif, telur, dan progres tidak berubah, tanpa celah (`spacing.gaps = 0`), kecepatan rantai mengikuti orientasi baru.

## Bot kecepatan (Sedang; jawab N(6, 2) dtk; akurasi 90%)
Sebelum (revisi 9, 300 seed per sel) → sesudah (rute grid + penyetelan, **1000 seed per sel**, seed 1000–1999):

| | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| Potret | 87,3 → 88,9 | 88,7 → 88,8 | 92,0 → 88,7 |
| Lanskap | 90,7 → 88,9 | 91,0 → 89,3 | 86,3 → 88,8 |
| Desktop | 91,0 → 89,5 | 88,3 → 89,1 | 85,0 → 88,6 |

Selisih terbesar 3,7 poin (potret Stage 3; galat baku pembanding ±2 poin pada 300 seed); semua sel baru 88,6–89,5%. Sebelum penyetelan (300 seed), Stage 3 lanskap/desktop naik ke 92,7% (+6,4/+7,7). Penyetelan: `STAGE_SPEED_MULT_LANDSCAPE[2]` = 0,55 (potret tetap 0,75). Catatan: kemenangan Stage 3 ternyata hanya lemah bergantung pada kecepatan kepala rantai (0,4 → 90,5%; 0,55 → 88%; 0,75 → 92%; 1,0 → 92,5%; 1,3 → 91,5%), karena kekalahan datang dari jawaban salah dan soal berbatas waktu; selisih awal berasal dari berkurangnya waktu menunggu bola jawaban (diagnostik bot: "bola belum terlihat" 27 ribu → 0,6 ribu frame per 40 putaran, durasi stage 163 → 135 dtk). Mudah dan Sulit tidak diukur ulang.

## Keputusan / hal yang perlu Anda putuskan
1. **INV-4**: 95% dari yang lebih panjang antara panjang saat ini (revisi 8) dan serpentin lama terpendek.
2. **Jarak baris minimum 2,6R** (bukan 2,8R) agar potret Stage 1 mencapai panjang (INV-5 tetap lulus).
3. **Tiga perubahan konfigurasi**: `GAP_CLOSE_SPEED` 7,5 → 8; `STAGE_SPEED_MULT_LANDSCAPE[2]` = 0,55 (baru; potret tidak berubah); `stageR` dapat mengecilkan radius bola kategori besar di layar kecil. Tidak ada mekanik lain yang diubah.
4. **Bola 1,12× (pecahan/desimal) dan 1,08× (campuran)**: rute cadangan valid tetapi lebih pendek (lanskap 23–24,5 d, potret ±19,5 d) → pacing lebih mudah di kategori itu; belum disetel (tidak diminta; INV-4 hanya pada R ≈ 32, seperti revisi 8).
5. **Label SARANG** dianggap melekat pada sprite sarang (bukan "label lain"); bar darah boss digeser agar tidak menimpa sprite.
6. Bot hanya untuk kesulitan Sedang (1000 seed per sel); Mudah dan Sulit belum diukur.
