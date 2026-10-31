# Revisi 11 · Tahap a — audit, profil baseline, inventaris efek

Dasar: commit `92e150f` (Revisi 10). Alat: `js/dev/perf.js` (`?debug=perf` → `await GA.Perf.run({ stage, secs })` dan `GA.Perf.breakdown`). Bot memainkan stage 25 dtk game (60 fps simulasi, render penuh), telur dijaga 3.

**Batas pengukuran (jujur):** panel preview tidak punya CPU throttling (tidak ada DevTools) dan rasterisasi/GPU tidak terukur dari JS. Yang terukur = waktu kerja JS per frame (logika + semua perintah gambar kanvas). "@4×" = waktu terukur × 4 (perkiraan). Karena rAF di panel dibatasi ±28 fps, FPS "ekuivalen" = 1000 / waktu kerja. 120 frame pertama tiap stage (pembuatan sprite) dipisahkan sebagai *warm-up* dan tidak dihitung di statistik.

## Baseline (sebelum revisi 11)

| | 390×844 (dpr 2) Stage 1 | 390×844 Stage 3 | 1440×900 (dpr 1,25) Stage 1 | 1440×900 Stage 3 |
|---|---|---|---|---|
| Waktu kerja/frame rata-rata | 5,85 ms | 9,57 ms | 7,98 ms | 11,3 ms |
| p50 / p95 | 1,2 / 9,3 ms | 1,6 / 21,4 ms | 1,3 / 10,8 ms | 1,7 / 24,7 ms |
| **p99 / maks** | **127 / 834 ms** | **260 / 745 ms** | **227 / 781 ms** | **279 / 1029 ms** |
| Warm-up maks (120 frame awal) | 209 ms | 768 ms | 509 ms | 992 ms |
| p95 @ 4× (target ≤ 20) | 37 ms ✗ | 86 ms ✗ | 43 ms ✗ | 99 ms ✗ |
| FPS ekuivalen @ 4× (target ≥ 55) | 43 ✗ | 26 ✗ | 31 ✗ | 22 ✗ |
| Frame > 33 ms berturut-turut | 2 | 1 | 2 | 1 |
| Operasi kanvas/frame (fill + stroke + drawImage + fillRect + teks) | 606 | 989 | 625 | 910 |
| – drawImage / fill / stroke | 50 / 320 / 185 | 77 / 511 / 305 | 50 / 335 / 188 | 56 / 458 / 301 |
| Gradient dibuat/frame | 40 | 54 | 40 | 54 |
| `globalCompositeOperation` ≠ source-over/frame | 53 | 64 | 53 | 63 |
| `shadowBlur` / `filter` per frame | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Partikel aktif maks / bola | 110 / 9 | 114 / 9 | 114 / 10 | 108 / 9 |
| Memori JS (selisih heap 25 dtk) | +5,7 MB* | +0,8 MB | −1,3 MB | +0,8 MB |
| Dimuat saat bermain | JS 688 KB, CSS 56 KB, gambar 79 KB (splash) — aset peta: 0 (semua prosedural) | | | |

\* sekali di stage pertama (cache sprite); tidak naik terus-menerus pada putaran berikutnya.

**Temuan utama:** (1) median frame murah (1,2–1,7 ms) tetapi ekor panjang: p99 127–279 ms dan maks 0,7–1 detik — itu bingkai rotasi bola 3D yang dibuat malas satu per kebutuhan (24 bingkai × 8 warna), sprite sarang/telur/rintangan yang dibuat saat pertama dipakai, dan `Balls.warm`; di HP nyata ini terasa sebagai patah-patah tiap kali bola baru berputar pertama kali. (2) 600–1000 perintah gambar/frame, mayoritas `fill`/`stroke` vektor (bola berlapis, naga bersegmen, penyihir, HUD) bukan blit sprite. (3) 53–64 operasi komposit "lighter" (cahaya aditif) per frame menambah beban rasterisasi di GPU HP. (4) Tidak ada WebGL, shader, `shadowBlur` atau `filter` di jalur per-frame (4 `shadowBlur` di `effects.js` hanya saat pembuatan sprite).

### Rincian waktu gambar per modul (ms per frame rata-rata, 390×844)

| Modul | Stage 1 | Stage 3 |
|---|---|---|
| Rantai bola (`Chain.draw`; termasuk pembuatan bingkai malas) | **3,23** | 1,43 |
| HUD kanvas | 0,67 | 0,81 |
| Naga + bola api (`Shooter.draw`) | 0,81 | 1,36 |
| Burung / kelelawar ambient | 0,37 | 0,07 |
| Partikel + teks FX | 0,34 | 0,08 |
| Portal | 0,27 | 0,99 |
| Ambient (kunang-kunang/bara + kabut + cahaya + riak: `Effects.drawUnder`) | 0,19 | **1,38** |
| Objek depan (daun/pilar) | 0,08 | 0,01 |
| Sarang + telur, penanda, latar (cache) | 0,10 | 0,10 |
| **Total / frame** | **6,39** | **9,64** |

## Inventaris efek dan animasi per frame

| # | Efek / animasi | Modul | Biaya (perkiraan, 390×844 S1/S3) | Keputusan |
|---|---|---|---|---|
| 1 | Parallax siluet jauh/dekat (3 `drawImage` layar penuh bergeser sin) | `scenery.js` (mode non-peta) | < 0,1 ms; 3 blit layar penuh | **Hapus** |
| 2 | Denyut cahaya aditif latar (retakan lava, rune, halo kristal) | `background.js drawGlow` | ~0,1 ms + komposit "lighter" layar penuh | **Hapus**; retakan/rune jadi gambar statis berwarna terang |
| 3 | Kunang-kunang / bara / percikan ambient (30–60 partikel) | `scenery.js drawAmbient`, `effects.js drawFlies` | 0,19 / 1,38 ms | **Hapus** |
| 4 | Kabut bergerak, berkas cahaya, cahaya obor/lava berkedip | `effects.js drawMist/drawShafts/drawLights` | termasuk baris 3 | **Hapus** |
| 5 | Riak air, kaustik, kolam pantul | `effects.js drawPond` | termasuk baris 3 | **Hapus** (kolam = bentuk datar statis) |
| 6 | Burung, elang, camar, kelelawar ambient (boids + bayangan) | `birds.js`, `effects.js drawBirds` | 0,37 / 0,07 ms | **Hapus** (kelelawar *penukar bola* = aktor mekanik di `swap.js`: dipertahankan, disederhanakan di tahap d) |
| 7 | Portal volumetrik (3 lapis pusaran, petir, partikel tersedot, riak, lensa) | `effects.js` | 0,27 / 0,99 ms | **Ganti** sprite cincin + pusaran; animasi hanya saat bola keluar (d) |
| 8 | Vignette dinamis + `FX.flash` layar penuh | `background.js front`, `main.js render` | 1 `fillRect` layar penuh | vignette → statis di latar; flash layar → dihapus (kilas lokal) |
| 9 | Getar layar (`FX.shake`) | `fx.js`, `main.js` | translasi seluruh adegan | **Hapus** (getar kecil hanya pada plakat soal/ikon telur, DOM) |
| 10 | Bayangan jatuh dinamis (naga, bola, telur, boss) | `dragon.js`, `balls.js`, `eggs.js`, `wizard.js` | gradien/elips per objek | **Hapus**; bayangan datar prarender |
| 11 | Bola sihir 3D berputar (24 bingkai × 8 warna dibuat malas, halo+badan+gloss+plakat = 5 `drawImage`/bola, kabut/fog, asap) | `balls.js`, `chain.js` | 3,23 / 1,43 ms; sumber p99 127–260 ms | **Ganti** atlas sprite datar prarender (warna × motif rune) satu kali; tanpa rotasi/ kabut (d) |
| 12 | Bola api: 8 bingkai turbulensi, lidah api, ekor aditif | `fire.js` | ~0,1 ms | **Ganti** inti + 2–3 sprite lidah, ekor ≤ 6 partikel (d) |
| 13 | Naga: simulasi pegas leher/ekor, sayap bertulang, sisik pola `createPattern`, bayangan, api tepi | `dragon.js` | 0,81 / 1,36 ms (~150 operasi vektor) | **Ganti** sprite berlapis tampak atas; transform kepala/leher (d) |
| 14 | Penyihir: kain verlet, IK lengan, tekstur prosedural, hancur jadi abu | `render/wizard.js` (38 KB) | ikut `Shooter`/boss, ~1 ms | **Ganti** 3 sprite + melayang (e) |
| 15 | Telur/sarang: sisik berelief, cahaya aditif, denyut | `render/eggs.js` | 0,06 ms | **Ganti** sprite statis + getar transform (d) |
| 16 | Rintangan: asap/puff, cahaya aditif, partikel | `hazards.js` | <0,1 ms (aktif sesekali) | **Sederhanakan** sprite datar + peringatan ⚠ (d) |
| 17 | Partikel FX (pool 600, ±110 aktif) | `fx.js` | 0,34 / 0,08 ms | **Kecilkan** pool (≤ 80), ledakan ≤ 8 partikel (d) |
| 18 | HUD digambar ulang di kanvas tiap frame (gradien, komposit, `MathText`) | `ui/hud.js` | 0,67 / 0,81 ms | **Pindah ke DOM/CSS**, perbarui hanya bila berubah (c) |
| 19 | Popup Jeda: loop rAF menggambar naga tidur di kanvas + `backdrop-filter` + 3 `@keyframes` | `ui.js drawMascot`, `css/pause.css` | rAF aktif selama jeda | **Hapus** loop dan `backdrop-filter`; maskot = gambar statis (b) |
| 20 | Tekstur UI prosedural besar (`Textures.wood/voronoi/fbm`, 256 px × 4) dipasang sebagai `data:` URL | `ui/skin.js`, `render/textures.js`, `noise.js` | ± 40–80 ms saat start | **Ganti** satu tile noise 128 px (b) |
| 21 | Peta realistis berlapis (dekor 40+ objek per peta, sortir y, bayangan blur) | `background.js`, `decor.js`, `decor2.js`, `maps/*.js` | sekali per layout (cache) — besar saat dibangun, murah per frame | **Ganti** ilustrasi datar 2–3 nada (c, e) |
| 22 | Tingkat kualitas Tinggi/Sedang/Rendah otomatis (ukur FPS) | `quality.js` | ukur per frame | **Ganti** satu sakelar "Efek: Hidup/Mati" (f) |
| 23 | Animasi CSS: `scrIn` (sekali 340 ms), `cdPop` (hitung mundur), `kStarIn` (sekali), `mBlank` (kotak soal berkedip, tak hingga di DOM) | `base.css`, `kit.css` | murah, hanya saat tampil | pertahankan transform/opacity; `mBlank` jadi statis |
| 24 | WebGL / shader / `filter` / `backdrop-filter` di jalur game | — | tidak ada WebGL/filter; `backdrop-filter` hanya di popup Jeda | hapus `backdrop-filter` |

Yang dipertahankan (inti mekanik): indikator penukaran (cincin + ikon ⇄ + garis putus + hitung mundur, digambar sprite/garis tanpa glow), garis bidik dan cincin target-lock, peringatan rintangan, hitung mundur, bar HP boss.

## Apakah teks/HUD digambar tiap frame?
Ya: seluruh HUD (plakat skor odometer, plakat soal `MathText`, bar progres, telur, tombol Jeda, zona informasi, bar boss) digambar di kanvas setiap frame (bingkai statis di-cache, isi dinamis tidak). Label SARANG, label bola khusus, popup skor/combo juga di kanvas. Popup Jeda memakai DOM tetapi menggambar maskot di kanvas dengan rAF sendiri. Tidak ada `shadowBlur`/`filter` per frame; `globalCompositeOperation = 'lighter'` dipakai 53–64×/frame.
