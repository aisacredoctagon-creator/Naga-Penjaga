# Revisi 8, tahap (a): audit panjang lintasan dan mekanik peluru

Patokan = serpentin sebelum revisi 6 (commit `ddd3183`, kolam jalur: S1 `hook/serp3/s2/serp4`, S2 `serp4/figure8/zigzag/serp3w/horseshoe`, S3 `bossU/bossU2/bossBowl`). Diukur dengan kode commit itu (worktree terpisah, port 8124) lewat `GA.Path.forLayout`, R = 32 (BALL_RADIUS layout 540×960 dan 960×540). Satuan: **diameter bola** = panjang ÷ 2R. "Rasio rantai" = panjang ÷ panjang rantai 20 bola (20 × 2R × 0,98 = 19,6 d). 844×390 dan 1440×900 memakai layout logis 960×540 yang sama, jadi panjangnya identik.

## Lintasan serpentin lama (ddd3183)

| Stage | Layout | Jalur (diameter bola) | Min | Rata-rata | Maks | Rasio rantai (rata-rata) |
|---|---|---|---|---|---|---|
| 1 | Potret | hook 31,1 · serp3 45,7 · s2 30,8 · serp4 45,8 | 30,8 | 38,4 | 45,8 | 1,96 |
| 1 | Lanskap/desktop | hook 35,3 · serp3 42,9 · s2 27,1 · serp4 42,9 | 27,1 | 37,1 | 42,9 | 1,89 |
| 2 | Potret | serp4 45,8 · figure8 31,2 · zigzag 36,7 · serp3w 36,6 · horseshoe 26,1 | 26,1 | 35,3 | 45,8 | 1,80 |
| 2 | Lanskap/desktop | serp4 42,9 · figure8 31,7 · zigzag 28,1 · serp3w 43,2 · horseshoe 26,8 | 26,8 | 34,5 | 43,2 | 1,76 |
| 3 | Potret | bossU 25,4 · bossU2 25,4 · bossBowl 25,6 | 25,4 | 25,5 | 25,6 | 1,30 |
| 3 | Lanskap/desktop | bossU 20,8 · bossU2 20,8 · bossBowl 22,2 | 20,8 | 21,3 | 22,2 | 1,09 |

## Lintasan "naga di tengah" sekarang (7051175)

| Stage | Layout | Jalur | Min | Rata-rata | Rasio rantai | % dari rata-rata lama | % dari min lama |
|---|---|---|---|---|---|---|---|
| 1 | Potret | siput1 16,7 · siput2 16,8 · siput3 15,3 | 15,3 | 16,3 | 0,83 | 42% | 50% |
| 1 | Lanskap/desktop | siput1 11,2 · siput2 11,2 · siput3 11,1 | 11,1 | 11,2 | 0,57 | 30% | 41% |
| 2 | Potret | lobus1 17,8 · lobus2 17,7 · lobus3 16,3 | 16,3 | 17,3 | 0,88 | 49% | 62% |
| 2 | Lanskap/desktop | lobus1 11,8 · lobus2 11,9 · lobus3 11,8 | 11,8 | 11,8 | 0,60 | 34% | 44% |
| 3 | Potret | poligon1-3 15,5 · 15,5 · 15,3 | 15,3 | 15,4 | 0,79 | 60% | 60% |
| 3 | Lanskap/desktop | poligon1-3 11,9 · 11,9 · 11,8 | 11,8 | 11,9 | 0,61 | 56% | 57% |

Jalur sekarang **lebih pendek dari rantai 20 bola** (rasio 0,57–0,88) dan hanya 30–60% dari serpentin lama. Ambang INV-4 (≥ 95% serpentin lama, per stage dan layout) tidak terpenuhi di satu pun sel. "Serpentin lama" per stage saya definisikan sebagai rata-rata kolam jalurnya (min dan maks tercantum bila Anda lebih suka salah satunya); lihat keputusan di laporan tahap (b).

## Cara kerja peluru sekarang (dikonfirmasi dari kode)

- Peluru **berhenti di bola PERTAMA yang tersentuh sepanjang garis bidik**, bukan langsung ke bola yang dibidik. `onBulletStep` (`js/main.js`) memanggil `run.chain.hit(b.x, b.y, Bullets.r)` di setiap langkah peluru; `Chain.hit` mengembalikan bola dengan pusat terdekat di antara bola yang bersentuhan (jarak sentuh 0,92R + radius peluru, radius peluru = R), lalu `ballHit` mengevaluasi bola itu (benar / salah / beku / telur). Peluru tidak menyisip ke rantai: bola yang tertembak hanya dihancurkan (benar) atau memicu hukuman (salah); `Chain.insert` hanya dipakai untuk memunculkan ulang bola target.
- Peluru lahir di mulut naga, 2,83R dari pusat naga, di garis bidik dari pusat.
- Konsekuensi: lintasan multi-lap (bola yang lebih dalam tertutup bola luar) hanya bisa dimainkan bila tembakan diubah menjadi lontaran (Opsi A); pada tembakan lurus (Opsi B) tiap bola harus terjangkau dari pusat naga (INV-1 dengan peluru sebesar bola, seperti di revisi 7).

## Batas geometri yang sudah terukur (relevan untuk tahap b)

- Pusat bola harus ≥ (celah HUD + 1)R di bawah panel (potret 2,5R, lanskap 2,0R) dan naga di tengah area bermain, sehingga setengah-tinggi yang tersedia untuk jalur hanya ±288 px (potret) dan ±146 px (lanskap), setengah-lebar ±220 px (potret) / ±430 px (lanskap).
- Sayap/mulut naga memotong lingkaran jari-jari ≈ 111 px (3,5R) dari pusat; jalur tidak boleh lebih dekat.
