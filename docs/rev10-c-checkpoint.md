# Revisi 10 — checkpoint setelah tahap c (generator rute + validator + tes)

Audit (tahap a): `docs/rev10-a-audit.md`. Tahap b (hapus bola api diam): commit `cb332bd`. Dokumen ini = tahap c.

## Yang berubah di kode

- `js/maps/paths.js`: jalur spiral revisi 8 diganti **rute grid**. Jalur = rangkaian simpul pada grid persegi panjang berpusat di naga; simpul pertama = **portal**, simpul terakhir = **sarang**; tikungan 90° berfilet (U-turn = setengah lingkaran). Jarak baris = yang terbesar yang muat di area bermain (maks. 3,3R, minimum 2,6R = INV-5). Rute (data `TPL`) dicari offline oleh `js/dev/routesearch.js` (`?debug=route`), lalu divalidasi memakai validator asli; tiap rute dipakai asli dan dicerminkan (sumbu x / y), sehingga tiap stage punya 3 varian (`ular1–3`, `teluk1–3`, `benteng1–3`). Untuk radius bola besar (kategori pecahan/desimal 1,12×, R ≈ 36) tiap varian punya rute cadangan yang lebih ringkas (`xl*`, `xp*`); jarak baris diperkecil bertahap sampai INV-6/7 terpenuhi bila radius bukan 32.
- Validator baru (`routeChecks`, dijalankan tiap jalur dibangun): **INV-6** (jarak portal–sarang ≥ 0,55 × sisi terpanjang area bermain DAN selisih sudut terhadap pivot naga ≥ 150°), **INV-7** (titik jalur yang berjarak busur > 8 diameter = 16R dari ujung awal ≥ radius sprite portal + 3R dari portal; dari ujung akhir ≥ radius sprite sarang + 3R dari sarang), **INV-8** (zona bersih sprite + 2R tanpa naga/sayap/boss; dekorasi/rintangan: lihat di bawah). INV-4 sekarang = panjang ≥ 95% dari yang lebih panjang antara panjang saat ini (revisi 8) dan serpentin lama terpendek (INV-4 lama). Radius sprite: portal 2,45R (`effects.js`), sarang 2,3R (cincin batu `eggs.js`).
- Overlay `?debug=1`: zona INV-7 (garis putus-putus) dan INV-8 (titik-titik) di portal dan sarang, garis dan angka jarak portal–sarang, simpul grid bernomor, laporan INV-4…INV-8; pelanggaran INV-7 menandai bola merah.
- Elemen yang mengikuti layout baru: label "SARANG" (`path.js` `nestLabelSpot`: sisi sarang paling lapang, tidak menutupi bola); dekorasi latar dan objek depan menghindari zona bersih portal dan sarang (`render/background.js`); rintangan zona menghindari zona bersih (`hazards.js` `inZone`, `main.js` `clearZonesOf`); boss Stage 3 di ruang terlapang (`paths.js` `bossSpot`); bar darah boss digeser bila menimpa portal/sarang (`main.js` `bossBarX`).
- Tes `?test=1&only=paths`: INV-2…INV-8 untuk 27 jalur (9 arketipe × 3 ukuran layar nyata) dan sapuan radius R = 26, 29, 32, 34,56, 35,84, 36 pada kanvas logis potret/lanskap.

## Hasil tes invarian (27 jalur: stage 1–3 × 3 varian × 390×844, 844×390, 1440×900)

| Invarian | Hasil | Ukuran terburuk |
|---|---|---|
| INV-2 naga di tengah; sayap tidak menutupi jalur; di bawah HUD; portal+sarang penuh di area | **27/27 lulus** | — |
| INV-3 jarak antar-segmen ≥ 2,6R | **lulus** | 2,65R |
| INV-4 panjang ≥ 95% dari yang lebih panjang (revisi 8 / serpentin lama) | **lulus** | 95% dari yang lebih panjang (lihat tabel) |
| INV-5 target-lock tak ambigu (non-tetangga ≥ 2,6R) | **lulus** | 2,6R+ |
| INV-6 jarak portal–sarang ≥ 0,55 × sisi terpanjang, sudut ≥ 150° | **lulus** | 0,69 dan 155° |
| INV-7 jarak jalur ke portal ≥ 5,45R, ke sarang ≥ 5,30R | **lulus** | 5,77R dan 5,74R |
| INV-8 naga/sayap/boss di luar zona bersih | **lulus** | — |
| Semua rute muat tanpa cadangan; ≥ 2 varian per stage | **lulus** (3/3/3) | — |

## Panjang jalur lama (revisi 8) vs baru (R = 32, diameter bola) dan jarak portal–sarang

| Varian | Potret 390×844: lama → baru | jarak (px = × sisi) / sudut | Lanskap 844×390 dan desktop 1440×900: lama → baru | jarak (px = × sisi) / sudut |
|---|---|---|---|---|
| Stage 1 `ular1` | 29,4 → 29,4 | 706 = 0,93 / 180° | 29,3 → 29,3 | 847 = 0,88 / 180° |
| `ular2` | 29,4 → 29,4 | 706 = 0,93 / 180° | 29,3 → 29,5 | 666 = 0,69 / 165° |
| `ular3` | 29,4 → 29,4 | 706 = 0,93 / 180° | 29,3 → 29,3 | 847 = 0,88 / 180° |
| Stage 2 `teluk1` | 25,3 → 25,3 | 638 = 0,84 / 171° | 29,4 → 29,3 | 661 = 0,69 / 165° |
| `teluk2` | 25,3 → 25,3 | 637 = 0,84 / 171° | 29,4 → 29,0 | 660 = 0,69 / 165° |
| `teluk3` | 25,3 → 25,3 | 638 = 0,84 / 171° | 29,4 → 29,3 | 661 = 0,69 / 165° |
| Stage 3 `benteng1` | 24,6 → 24,6 | 707 = 0,93 / 180° | 25,1 → 24,3 (97%) | 846 = 0,88 / 180° |
| `benteng2` | 24,6 → 24,9 | 706 = 0,93 / 180° | 25,1 → 24,3 (97%) | 808 = 0,84 / 155° |
| `benteng3` | 24,6 → 24,6 | 707 = 0,93 / 180° | 25,1 → 24,3 (97%) | 846 = 0,88 / 180° |

Sebelum revisi: jarak portal–sarang 0,09 × sisi terpanjang dan 6° di lanskap/desktop, 0,30–0,58 dan 44–142° di potret (`docs/rev10-a-audit.md`).

Screenshot `?debug=1` (Stage 1, 2, 3 × potret, lanskap, desktop): `docs/rev10/c-{potret,lanskap,desktop}-stage{1,2,3}.jpg`.

## Keputusan / catatan untuk pengguna

1. **Tafsir INV-4.** Teks revisi: "≥ 95% dari panjang saat ini (tidak boleh lebih pendek)", sedangkan INV-4 revisi 8 memakai 95% dari serpentin lama terpendek. Saya menerapkan yang **lebih ketat dari keduanya** per stage dan layout (potret: serpentin lama lebih panjang untuk Stage 1; lanskap: revisi 8 lebih panjang). Semua jalur lulus dengan itu.
2. **Pitch 2,6R.** Syarat INV-4 di potret Stage 1 tidak tercapai dengan jarak baris ≥ 2,8R (maks. 26,6 d), jadi jarak baris minimum dipakai **2,6R** (= batas INV-5 yang sudah ada; radius tikungan 1,3R, di atas batas validator 1,15R). Tidak ada syarat yang dilonggarkan.
3. **Radius bola 1,12× (pecahan/desimal) dan 1,08× (campuran)** — R ≈ 36 di kanvas yang sama membuat grid jauh lebih sesak: jalur tetap valid untuk INV-2…INV-8 (rute cadangan), tetapi lebih pendek dalam diameter (lanskap 23–24,5 d, potret ±19,5 d; INV-4 hanya diperiksa pada R ≈ 32, seperti revisi 8). Dampak ke pacing akan diukur di tahap e.
4. **Label "SARANG"** tidak dianggap "label lain" di zona bersih sarang: ia melekat pada sprite sarang, dipasang di sisi paling lapang dan tidak menutupi bola mana pun.
5. **Bar darah boss** (Stage 3) bukan bagian layout jalur; saya geser horizontal bila menimpa sprite portal/sarang (Section 5: HUD tidak menimpa portal/sarang).
6. **Satu perubahan konfigurasi mekanik rantai:** `GAP_CLOSE_SPEED` 7,5 → 8 d/dtk. Pada rute baru, U-turn berjari-jari 1,3R membuat penutupan celah ganda (uji `chainsim`) 408 ms, sedikit di atas batas 400 ms; dengan 8 d/dtk semua uji simulasi kerapatan lulus (`?debug=sim`). Selisih ±0,01 dtk tidak terasa; ini satu-satunya angka non-layout yang disentuh.
7. Belum dikerjakan (tahap d–f): uji statistik dekorasi/rintangan di zona bersih (tes khusus), bot pacing + penyetelan kecepatan, regresi penuh `?test=1`, rotasi di tengah permainan pada layout baru (kode pemetaan posisi bola sudah ada dan tidak diubah), README.
