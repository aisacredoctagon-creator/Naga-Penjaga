# Revisi 11 · Checkpoint tahap b + c — tema gelap, UI kit baru, render dua lapisan, peta Stage 1

Dasar audit/baseline: `docs/rev11-a-audit.md`. Screenshot: `docs/screenshots/rev11-*.jpg`
(`start-390x844`, `start-1440x900`, `pause-390x844`, `stage1-390x844`, `stage1-1440x900`; ukuran desktop/mobile diambil dari viewport sebenarnya lalu diperkecil lewat `transform` karena panel preview hanya menangkap 800×500).

## Yang sudah dikerjakan
**b — token + UI kit:** `Theme.ui` (satu sumber token gelap: slate, plakat, bingkai batu, hijau/amber/merah/biru, krem, emas) → CSS variables (`ui/skin.js`, satu tile noise 128 px; tekstur kayu/batu/perkamen prosedural besar dihapus). `css/kit.css` ditulis ulang: panel batu bingkai tebal (sudut tak rata, retakan sederhana), plakat judul slate, **tombol bersegi delapan** (hijau utama, amber sekunder, merah bahaya, biru), tombol ikon, chip rekor, sakelar, **penggeser**, kartu kategori, bar progres pil, bintang siluet→emas, telur datar. Font: satu keluarga Baloo 2 (Cinzel dibuang, −2 berkas font). Halaman awal, Cara Main, Atur (penggeser Suara + Musik, sakelar Efek, Cerita, Hapus Data), pemuatan, konfirmasi, **popup Jeda** (panel batu kecil; maskot naga tidur digambar sekali, tanpa loop rAF dan tanpa `backdrop-filter`; banner booster dihapus) dan layar cerita/pembuka/hasil/overview sudah dalam gaya baru.
**c — dua lapisan:** latar STATIS `#bg` (`render/flatmap.js` + data `maps/themes.js`, 3 varian per stage: forest/grove/bloom, volcano/magma/crystal, tower/tower2/library) dirender sekali per stage/varian/layout; kanvas dinamis `#game` transparan di atasnya hanya untuk sarang, portal, bola, naga, peluru, efek, indikator, rintangan, boss. **Portal ringan** (`render/portal.js`: cincin + pusaran sprite, berputar hanya saat bola keluar). **HUD DOM** (`ui/hud.js` + `css/hud.css`; geometri `metrics/geo` tidak berubah; DOM hanya ditulis bila nilai berubah). **Loop berhenti** di keadaan non-gerak (Jeda, cerita, pembuka, hasil, tab tersembunyi; satu frame dirender lalu berhenti).
Dihapus: `scenery.js`, `render/{background,decor,decor2,birds,effects}.js`, `maps/{forest,volcano,tower,variants}.js`, parallax, kabut, kunang-kunang/bara, burung, riak, kedip obor/lava, berkas cahaya, vignette dinamis, getar layar dan kilatan layar penuh, adegan "attract", loop maskot Jeda, HUD kanvas, tekstur UI prosedural. Pool peta Stage 2: 6 → 3.

## Profil sebelum → sesudah (waktu kerja JS per frame; Stage 1 / Stage 3; detail metode dan batas ukur di `rev11-a-audit.md`)
| | 390×844 sebelum | 390×844 sesudah | 1440×900 sebelum | 1440×900 sesudah |
|---|---|---|---|---|
| Rata-rata | 5,85 / 9,57 ms | **0,85 / 0,91 ms** | 7,98 / 11,3 ms | **0,58 / 0,93 ms** |
| p95 | 9,3 / 21,4 ms | **1,8 / 1,4 ms** | 10,8 / 24,7 ms | **0,9 / 1,5 ms** |
| p99 | 127 / 260 ms | **4,1 / 1,9 ms** | 227 / 279 ms | **1,6 / 2,1 ms** |
| Maks (setelah warm-up) | 834 / 745 ms | **27 / 18 ms** | 781 / 1029 ms | **4,7 / 8,5 ms** |
| p95 @ 4× (target ≤ 20) | 37 / 86 ms ✗ | **7,2 / 5,6 ms ✓** | 43 / 99 ms ✗ | **3,6 / 6,0 ms ✓** |
| FPS ekuivalen @ 4× (target ≥ 55) | 43 / 26 ✗ | **294 / 275 ✓** | 31 / 22 ✗ | **431 / 269 ✓** |
| Frame > 33 ms berturut-turut | 2 / 1 | **1 / 0** | 2 / 1 | **0 / 0** |
| Operasi gambar kanvas/frame | 606 / 989 | **388 / 672** | 625 / 910 | **390 / 668** |
| Komposit "lighter"/frame | 53 / 64 | 41 / 49 | 53 / 63 | 40 / 51 |
| Rincian modul (Stage 1, 390×844) | rantai 3,23 · HUD 0,67 · ambient 0,19 · burung 0,37 · portal 0,27 | rantai **0,14** · HUD **0,015** · ambient/burung **0** · portal **0,014** | | |

Jujur soal angka: ini waktu kerja **JS** (logika + perintah gambar kanvas), bukan FPS di perangkat; rasterisasi GPU dan komposit dua kanvas + DOM HUD tidak terukur dari sini (tidak ada CPU throttling di panel). Lompatan besar terutama karena (1) latar tidak lagi di-blit penuh ke kanvas tiap frame dan efek ambient/komposit dihapus, (2) HUD tidak digambar ulang, (3) hilangnya lonjakan 100–1000 ms. Sisa 390–670 operasi/frame berasal dari bola, naga, penyihir, telur dan rintangan lama (bentuk vektor) — itu tahap d–e (sprite prarender). Ukuran: JS inti 66,8 KB + mesin 519 KB (sebelumnya 670 KB total), CSS 34,5 + 8,8 KB (sebelumnya 54 KB); tidak ada aset peta gambar (semua ilustrasi dari kode, 0 KB).

## Tes
`?test=1`: **183 hasil, semua lulus** (termasuk tes kontras UI baru) — dijalankan sebelum dua perbaikan kecil terakhir (urutan DOM tombol Jeda/HUD di bawah popup). `?resp=1` bersih di 390×844, 844×390, 1440×900 (setelah perbaikan itu).

## Belum (sesuai rencana)
Bola, bola api, naga, penyihir, telur/sarang, rintangan, indikator penukaran masih bergaya lama (tahap d–e); peta Stage 2–3 sudah memakai renderer baru tetapi belum dipoles; README/ASSET_GUIDE, hapus `quality.js` (diganti Efek Hidup/Mati penuh) dan kode mati sisa → tahap f.
