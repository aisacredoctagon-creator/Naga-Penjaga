# Revisi 7: laporan akhir

Commit lokal (belum di-push): b `c1c60ff` jalur + INV-1..3, c `32f49f2`/`b839a13` bot kecepatan + `WRONG_ANSWERS_PER_EGG` 2, d `2e45e67` acak posisi bola, e `115bada` telegraf penukaran, f (commit ini) README + pemeriksaan responsif. Suite `?test=1`: 157 pemeriksaan, semua lulus pada run terakhir (213 dtk).

## Temuan audit (tahap a)
- Jalur bintang lama gagal INV-1 dengan peluru nyata: 24–38% sinar mengenai bola lain lebih dulu (sinar tipis 0–4,8%).
- Peluru sebesar bola membuat jalur harus hampir melingkar dari pusat naga (kemiringan ≲ 0,1); elips > 1,1, lobus kuat, poligon bersudut, dan bintang tidak mungkin lolos tanpa mengubah radius sentuh peluru.
- Peluru lahir di mulut naga (2,83R dari pusat), bukan dari pusat: INV-1 kini memodelkan itu.

## Berkas utama yang berubah
`js/maps/paths.js` (arketipe + validator), `js/path.js`, `js/levels.js`, `js/qmanager.js` (`arrange`), `js/swap.js`, `js/audio.js`, `js/chain.js`, `js/main.js` (`lineBlocker`, `hudGap`, kait penukaran), `js/config/gameplay.js`, `js/dev/{tests,pacing,qsim,aimsweep,chainsim,layers}.js`, `index.html` (pemuat `?debug=pace`), `README.md`, `docs/*.md`, `docs/screenshots/j-*`.

## Hasil
- **Jalur:** 9 arketipe × 3 ukuran layar, INV-1..3 100% (8.577 sinar), radius 26–36 lulus. Ball ≥ 45,8 px di HP ≥ 360 px; 320×568 / 568×320 = 42,6 px (batas `maxRadius` 36).
- **Kecepatan:** Sedang menang 87–94% (potret dan lanskap, 300 seed/sel) tanpa mengubah kecepatan rantai; `WRONG_ANSWERS_PER_EGG` 1 → 2 (disetujui).
- **Posisi jawaban:** tiap sepertiga rantai 24,8–41,9% di antara bola jawaban; 0 kejadian di 12% terakhir jalur; 20 soal terjawab tepat sekali.
- **Penukaran:** 2,5 dtk dari peringatan sampai mulai menukar (min 2000 diuji), aturan penjaga, 2 pasangan beda warna/ikon, reduced-motion.
- **Responsif:** `?resp=1` tanpa masalah di 390×844, 844×390, 1440×900.
- **Rintangan:** 56.700 frame bot di 3 ukuran × 3 stage × 3 jalur (Sulit): tidak ada rintangan aktif yang menutupi bola diam; 35 frame (0,06%) tumpang tindih sesaat saat bola melengkung ke luar jalur sewaktu bertukar tempat (lily 13, thorn 22), lalu hilang.

## Keputusan / hal yang perlu diketahui
1. Bentuk lobus dan poligon hampir melingkar (amplitudo 2–4 px). Lobus/poligon kuat butuh radius sentuh peluru lebih kecil (perubahan mekanik; 0,5R menurunkan kegagalan lobus A14 dari 16,6% ke 3,5%) atau memakai sinar tipis sebagai syarat.
2. Cincin lanskap kecil (≈ 11 diameter vs 15–18 di potret).
3. Metrik "sepertiga rantai" kasar karena rantai terlihat hanya ±4–5 bola; di semua bola terlihat Stage 3 ≈ 21/50/29%.
4. Dua pasangan sekaligus di cincin lanskap padat (tetap terbaca).
5. Anti-macet bot sempat menunjukkan `openLine` terlalu ketat; `lineBlocker` sudah mengikuti fisika peluru.
6. Intermiten: `TIMEOUT: efek tampil dulu` (`js/dev/qsim.js`) gagal sesekali di suite penuh dan lulus saat diulang; belum diselidiki.
7. Belum dikerjakan (bukan bagian revisi ini): penempatan rintangan berbasis jangkar/poligon area tembak (README lama sudah menandainya).
