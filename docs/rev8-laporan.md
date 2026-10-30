# Revisi 8 — laporan akhir (lintasan panjang, naga di tengah, target-lock + lontaran)

Status: commit lokal `e994038` (a) → `0c83ad9` (b) → `33a7b29` (c) → `6c8f468` (d) → `9d89791` (e) → commit (f). **Belum di-push ke main** (menunggu permintaan).

## Keputusan

| Keputusan | Pilihan | Alasan |
| --- | --- | --- |
| Opsi tata letak | **A**: spiral stadion + tembakan lontar target-lock (dipilih Anda) | satu lap tidak bisa menyamai panjang serpentin lama; B hanya 11–17 d |
| Definisi INV-4 | ≥ 95% serpentin lama **terpendek** per stage/orientasi (dipilih Anda) | rata-rata lama (35–38 d) tidak mungkin dicapai: spiral ≥ 1,5 lap tidak muat (potret 1,16–1,34 lap, lanskap < 1 lap) |
| Kecepatan | hanya `STAGE_SPEED_MULT[2]` 0,5 → 0,75 | Sedang lanskap Stage 3 hanya 77% (bola jawaban lama keluar portal) |
| Rintangan rendah | tidak menghalangi lontaran (hiasan sementara) | lontaran terbang di atas rantai; sesuai spesifikasi |

## Panjang jalur (diameter bola, R = 32)

| Layout | Stage | Serpentin lama (rata-rata / terpendek) | Revisi 7 (satu lap) | Revisi 8 | % terhadap terpendek |
| --- | --- | --- | --- | --- | --- |
| Potret 390×844 | 1 | 38,4 / 30,8 | 16 | 29,4 | 95% |
| | 2 | 35,3 / 26,1 | 17 | 25,3–25,7 | 97–98% |
| | 3 | 25,5 / 25,4 | 15 | 24,6 | 97% |
| Lanskap 844×390 dan desktop | 1 | 37,1 / 27,1 | 11–12 | 29,3 | 108% |
| | 2 | 34,5 / 26,8 | 11–12 | 29,4 | 110% |
| | 3 | 21,3 / 20,8 | 11–12 | 25,1 | 120% |

Dibandingkan rata-rata lama, jalur baru 73–76% (S1/S2) dan ≈ 100–118% (S3). Rincian ukuran layar lain, jumlah putaran, dan pitch: `docs/rev8-c-paths.md`.

## Hasil uji

- `?test=1` (suite penuh): **161 hasil, semua lulus** (≈ 3,5 mnt) pada commit tahap (e); termasuk INV-2..5 untuk 27 jalur × 3 layar, uji bidik 27 skenario (target-lock, lontaran, tembakan kosong, rintangan tinggi/rendah, mouse + sentuh), `testHazardPlacement` (9 kombinasi × 8 jenis), simulasi rantai/penukaran/soal aktif, 3 stage penuh oleh bot, audio, lapisan.
- `?resp=1` (`GA.Resp.check`): tanpa masalah di 390×844, 844×390, 1440×900 (judul, atur, cara main, menu, pembuka, jeda, hasil).
- Rotasi saat bermain (potret ↔ lanskap, Stage 2): soal aktif, jawaban benar, telur, urutan seluruh rantai (termasuk antrean) identik setelah potret → lanskap → potret; permainan otomatis dijeda; satu pasangan penukaran yang sedang berlangsung diselesaikan saat dibangun ulang.
- Tangkapan layar: `docs/screenshots/k-f-*.jpg` (Stage 2 potret, Stage 1 dan 3 lanskap, Stage 2 desktop dengan lontaran di udara), `k-c-*` (tiga jalur per stage), `k-d-*` (cincin kunci, lontaran).

## Bot kecepatan (Sedang, 200 seed per sel; Mudah/Sulit 100 seed)

| Layar | Stage 1 | Stage 2 | Stage 3 |
| --- | --- | --- | --- |
| Potret | 91,5% | 88,0% | 88,0% |
| Lanskap | 86,0% | 90,0% | 87,0% |
| Desktop | 87,0% | 91,0% | 92,0% |

Target 85–95% tercapai tanpa mengubah mekanik. Mudah/Sulit 81–94% (derau ±3,5 poin). Detail dan sebab di `docs/rev8-e-hazards-pacing.md`.

## Berkas utama yang diubah

`js/maps/paths.js` (generator spiral, validator INV-2..5), `js/shooter.js` (lontaran), `js/main.js` (target-lock, input, penanda), `js/hazards.js` (penempatan adaptif, lajur rune, `blocksLine`), `js/chain.js` (gembung bola terkunci), `js/config/gameplay.js` (konstanta lontaran/kunci, kecepatan Stage 3), `js/render/effects.js` (dt portal), tes/alat `js/dev/{tests,aimsweep,qsim,chainsim,pacing,pathprev}.js`, `index.html` (memuat `pathprev.js`), README dan `docs/rev8-*.md`.

## Temuan di jalan (semua diperbaiki)

- Lontaran melewati rintangan yang berakhir sebelum mendarat (cincin hijau tetapi telur hilang): 74–81 kasus per 300 putaran → 0.
- Pilar rune dan gelombang hampir tidak pernah muncul di spiral (0–6%) → 50–100% pada semua kombinasi.
- dt negatif / jendela berukuran 0 menghasilkan radius negatif dan NaN di gambar portal / gradien latar → dijaga.
- Dua tes yang kadang gagal (penukaran berulang, bidik) karena rancangan tes, bukan permainan; diperbaiki.

## Keterbatasan yang diketahui

- Ponsel potret sempit (R 35–36, 320–360 px): 17–20 d, ±72–88% dari serpentin lama terpendek; INV-4 hanya diberlakukan pada R ≈ 32.
- Lobus (±14 px potret, ±5 px lanskap) dan poligon (stadion polos pada potret) halus; bentuk yang jelas tidak muat bersama syarat panjang.
- Rintangan rendah (semak, teratai, ombak) tidak berpengaruh pada tembakan.
- Validator "semua bola target selalu terbuka" diterapkan pada bola jawaban soal aktif + minimal satu bola lain; rintangan tinggi dekat naga dapat menutup bola lain sampai 30% busur sementara.
