# Revisi 11 · Laporan akhir — tema gelap, UI kit baru, render dua lapisan, entitas ringan

Tahap: a audit · b token + UI kit + halaman awal + Jeda · c dua lapisan + peta Stage 1 · d entitas ringan · e penyihir/boss/cerita · f pembersihan, dokumen, profil akhir.
Dokumen terkait: `rev11-a-audit.md` (baseline), `rev11-bc-laporan.md` (checkpoint b+c), `../README.md` (arsitektur, token, UI kit), `ASSET_GUIDE.md` (aset + perintah generator gambar).
Screenshot: `docs/screenshots/rev11-*.jpg` (start, Jeda, Stage 1, Stage 3 boss, overview, cerita).

## Profil sebelum → sesudah (alat `?debug=perf`, bot memainkan satu stage penuh)

Waktu kerja JS per frame (tick + render). "@4×" = angka terukur × 4 (tidak ada throttling CPU sungguhan di panel preview); rasterisasi GPU tidak terukur.

| | 390×844 sebelum (S1 / S3) | 390×844 sesudah (S1 / S3) | 1440×900 sebelum (S1 / S3) | 1440×900 sesudah (S1 / S3) |
|---|---|---|---|---|
| Rata-rata | 5,85 / 9,57 ms | **0,22 / 0,26 ms** | 7,98 / 11,3 ms | **0,21 / 0,25 ms** |
| p95 | 9,3 / 21,4 ms | **0,4 / 0,5 ms** | 10,8 / 24,7 ms | **0,4 / 0,5 ms** |
| p99 | 127 / 260 ms | **1,1 / 1,2 ms** | 227 / 279 ms | **1,0 / 1,1 ms** |
| Maks (setelah warm-up) | 834 / 745 ms | **3,3 / 3,7 ms** | 781 / 1029 ms | **3,6 / 4,1 ms** |
| p95 @ 4× (target ≤ 20 ms) | 37 / 86 ms ✗ | **1,6 / 2,0 ms ✓** | 43 / 99 ms ✗ | **1,6 / 2,0 ms ✓** |
| FPS ekuivalen @ 4× (target ≥ 55) | 43 / 26 ✗ | **1136 / 962 ✓** | 31 / 22 ✗ | **1190 / 1000 ✓** |
| Frame > 33 ms berturut-turut | 2 / 1 | **0 / 0** | 2 / 1 | **0 / 0** |
| Operasi kanvas per frame | 606 / 989 (gradien 40 / 54, komposit non-default 53 / 64) | **62 / 70**, gradien 0, komposit non-default 0, `shadowBlur` 0 | 625 / 910 | **63 / 70** |
| Partikel aktif maks | 110 / 114 (pool 600) | **29** (pool 80) | 114 / 108 | — |
| Memori JS (selisih heap, 25 dtk) | +5,7 / +0,8 MB | stabil (heap 4,2–4,3 MB, tanpa tren naik) | −1,3 / +0,8 MB | stabil |
| Waktu JS per frame vs sebelum | — | **−96% / −97%** (target −50%) | — | **−97% / −98%** |
| Dimuat saat bermain | JS 688 KB · CSS 56 KB · gambar 79 KB | JS 507 KB · CSS 43 KB · gambar 77 KB (stage ≪ 1,2 MB; aset peta 0) | | |

Target terpenuhi pada semua metrik yang terukur. Catatan jujur: ini ukuran sisi JS di mesin pengembang; belum diukur di ponsel nyata (biaya raster/komposit GPU, `drawImage` ber-skala, dan DPR 2 bisa lebih besar). Halaman awal tidak punya loop animasi (loop hanya berjalan saat dibutuhkan).

## Uji
- `?test=1`: **SEMUA LULUS** (173 pemeriksaan + info, 230 dtk) setelah tahap d dan setelah tahap f; termasuk tes kontras UI/bola, fairness rintangan, penukaran, boss, telur, Jeda, overview, rekor, simpanan.
- `?resp=1` (`GA.Resp.check()`): 390×844, 844×390, 1440×900 → tanpa isu (layar: start, atur, cara main, pembuka, jeda, hasil).
- Ganti orientasi saat bermain (390×844 → 844×390): soal aktif, antrean bola, telur, dan progres tetap sama (game otomatis jeda saat ukuran berubah).
- Bot Stage 1 dan Stage 3 lewat `GA.Perf.run` tanpa error konsol.

## Efek yang dihapus
Parallax, kabut/asap, partikel ambient (daun, air, lava, obor, kunang-kunang, bara melayang), burung/kelelawar ambient/ikan, riak/kaustik, kedip obor/lava, berkas cahaya, vignette dinamis, simulasi pegas/IK/kain/verlet (naga, penyihir), bayangan dinamis, `shadowBlur`, komposit `lighter` (halo bola, api, portal, boss, rintangan), gradien per frame, bola 3D 24 bingkai rotasi, fBm/turbulensi api, partikel portal/ledakan besar, getar layar, kilatan layar penuh, teks melayang kanvas (→ popup DOM), tingkat Tinggi/Sedang/Rendah + Otomatis (→ saklar Efek Hidup/Mati).

## Berkas dihapus
`js/scenery.js`, `js/render/{background,decor,decor2,birds,effects,textures}.js`, `js/maps/{forest,volcano,tower,variants}.js`, `assets/icon-{home,play,restart}.svg`; kode mati: `drawBallBody`/cache sprite lama di `chain.js`, `Theme.ui.wood/parchment`.

## Berkas utama berubah / baru
Baru: `js/render/flatmap.js`, `js/maps/themes.js`, `js/render/portal.js`, `js/ui/hud.js` (HUD DOM), `js/dev/perf.js`. Ditulis ulang: `js/theme.js` (token gelap), `js/ui/{skin,kit,start}.js`, `css/{kit,base,pause,hud}.css`, `js/fx.js`, `js/quality.js`, `js/render/{balls,fire,eggs,wizard}.js`, `js/dragon.js`, `js/boss.js` (bar darah ter-cache), `js/hazards.js` (datar), `js/story.js`, `js/main.js` (dua lapisan, loop sesuai kebutuhan). Dokumen: `README.md`, `docs/ASSET_GUIDE.md`, laporan ini.

## Yang tidak diubah (diverifikasi tes)
Mekanik tembak, 20 soal/stage, 3 stage (boss di Stage 3), telur 3/3, format soal, `QuestionManager`, jalur + invarian INV-1..8, aturan fairness rintangan, indikator tukar ≥ 2 dtk, pengacakan bola jawaban, halaman awal satu layar, lazy loading, SFX, satu `BALL_RADIUS`, path relatif GitHub Pages, simpanan `localStorage`, workflow deploy. Urutan lapisan: bola di atas jalur/dekor, indikator tukar di atas bola, HUD di atas semua.

## Placeholder tersisa
Semua gambar masih digambar kode (tidak ada aset gambar akhir): naga, penyihir, bola, bola api, telur, sarang, portal, rintangan, 9 peta, ilustrasi cerita, splash art halaman awal (masih gaya hutan lama dari revisi 9 — masih selaras gelap, belum digambar ulang), suara sintesis. Daftar, ukuran, anggaran berat, dan perintah generator gambar ada di `docs/ASSET_GUIDE.md`.

## Keputusan untuk Anda
1. **Splash art** halaman awal: pertahankan versi revisi 9, atau regenerasi dalam gaya datar baru (`?debug=splash`)?
2. **Efek Mati** juga menurunkan DPR kanvas ke 1 (teks kanvas boss/bubble sedikit lebih lembut). Setuju, atau DPR tetap 2 saat Mati?
3. **Pengukuran di ponsel nyata** (mis. Chrome DevTools throttling 4× atau perangkat Android kelas menengah) belum dilakukan; disarankan sebelum rilis.
4. Peta berbasis gambar (`assets/maps/...`) tersambung lewat manifest per id peta; penamaan `<idPeta>-<orientasi>.webp` hanya konvensi di panduan aset — beri tahu bila ingin penamaan `<stage>-<varian>-<orientasi>` ditegakkan di kode.
