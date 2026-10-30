# Revisi 9 · Tahap b + c — halaman awal baru, splash statis, lazy loading

Catatan commit: tahap b dan c dikerjakan dalam satu rangkaian (pemuat malas dan halaman awal saling bergantung: `start.js` memanggil `GA.Boot`, mesin harus bisa dibongkar), jadi keduanya masuk satu commit.
Tahap d (rekor) sebagian sudah ikut: rekor dicatat sekali di akhir permainan dan "Rekor baru!" tampil di hasil akhir + overview Game Over; sisa tahap d = verifikasi. Tahap e (polish responsif) menunggu persetujuan.

## Yang berubah

| | |
|---|---|
| **Baru** | `js/ui/start.js` (halaman awal), `css/start.css`, `js/config/categories.js`, `js/boot.js` (pemuat malas), `js/splash-art.js` (cadangan + pembuat aset), `js/dev/splashgen.js`, `assets/splash/splash-{landscape,portrait}.webp`, `docs/rev9-*.md` |
| **Dihapus** | `js/menu.js` (Main Menu + Pilih Stage), layar judul/Atur/Cara Main di `ui.js`, kartu stage + bar sumber daya di `kit.js`/`kit.css`, `Storage.prog/unlocked/totalStars/lastResult/recordStep/recordRun`, `?unlock=1`, `Levels.resolveCats` per-slot, string `menu.*` `steps.*` `title.*` |
| **Diubah** | `index.html` (ringan + `<picture>` splash), `storage.js` (skema v3), `levels.js`, `questions.js` (kategori pindah ke config), `main.js` (`GA.Game.boot/destroy/exit`, tanpa adegan menu), `ui.js` (`UI.destroy`, overview + hasil), `audio.js` (`shutdown`, `preCtx`), `strings.js`, `README.md`, `docs/ASSET_GUIDE.md`, alat/tes dev |

## Sebelum / sesudah (panel preview Chromium, localhost, `Cache-Control: no-store`, kondisi sama; baseline = commit `56fe4e1` dijalankan berdampingan)

| | Sebelum 1440×900 | Sesudah 1440×900 | Sebelum 390×844 | Sesudah 390×844 |
|---|---|---|---|---|
| JS sebelum klik | 44 berkas, 664 KB (gzip ≈ 200 KB) | 13 berkas, 74 KB (gzip ≈ 25 KB) | sama | sama |
| CSS | 53 KB (gzip ≈ 12,6 KB) | 33 KB (gzip ≈ 8,5 KB); `pause.css` ikut mesin | sama | sama |
| Gambar | 3 SVG ikon (1 KB) | splash WebP 78 KB (landscape) / 77 KB (portrait; hanya satu yang dimuat), prioritas rendah | | |
| Total JS+CSS+gambar (gzip) | ≈ 213 KB | ≈ 34 KB + splash 78 KB = ≈ 112 KB | | |
| Loop `requestAnimationFrame` | **1** (88 callback / 3 dtk di panel) | **0** | 1 (89) | **0** |
| JS per frame saat diam | 1,93 ms (≈ 6 % satu inti @ 29 fps; ≈ 12 % @ 60 fps) | **0** | 1,85 ms | **0** |
| Long task saat dibuka | 482 ms | **0** | 359 ms | **0** |
| `DOMContentLoaded` (≈ bisa diklik) | 261 ms | **128 ms** | 376 ms | **118 ms** |
| Perkiraan bisa diklik @ CPU 4× | ≈ 1,0 s | **≈ 0,5 s** | ≈ 1,5 s | **≈ 0,5 s** |
| Animasi CSS berkelanjutan | — | **0** (hanya transisi masuk papan sekali, 340 ms; mati bila reduced-motion) | | |

Catatan: panel preview tidak punya CPU throttling, jadi kolom "@ CPU 4×" = waktu terukur × 4 (tanpa jaringan). Angka sebelum/sesudah diambil dengan skrip yang sama (amatan `longtask`, hitung rAF 3 dtk, `DOMContentLoaded`).
Tombol "Mulai Main" → Stage 1 (mesin diunduh 592 KB ≈ 175 KB gzip, dijalankan, diinisialisasi dalam 4 irisan): ≈ 350–640 ms di localhost (283 ms di main thread) ⇒ perkiraan 1,2–2,6 s pada CPU 4× di luar unduhan. Pra-muat senyap setelah interaksi pertama (idle) memangkas unduhan; **dilewati** untuk Save-Data / 2G / reduced-motion, jadi pada koneksi seperti itu unduhan terjadi saat "Mulai Main" (opsi bila terasa lama: mesin dipecah dua — inti + Stage 2/3 — atau minify/bundel build-time; belum dilakukan karena aturan "tanpa build tool").
Setelah kembali ke halaman awal: loop dihentikan, canvas + listener + UI permainan + AudioContext dilepas (`rafCallbacks = 0`, tidak ada `<canvas>` permainan). Skrip mesin tetap di memori JS (tidak bisa dibongkar), tetapi tidak ada yang berjalan; "Mulai Main" berikutnya tidak mengunduh ulang.

## Tes

- `?test=1`: **177 hasil, semua lulus** (247 dtk; sebelumnya 161 — tambahan = tes halaman awal, migrasi, rekor, alur, siklus hidup mesin).
- `?resp=1`: bersih di 1440×900, 390×844, 844×390 (tambahan: target sentuh ≥ 44 px, papan muat di layar, kartu tidak perlu gulir di lanskap pendek).
- Tes baru: halaman awal (ARIA radiogroup, papan ketik, centang, simpanan lama v2 / tanpa simpanan, tanpa animasi/canvas, Cara Main + Atur), migrasi v1/v2→v3, rekor, alur penuh (Mulai Main → Stage 1 → Lanjut → Stage 2 → Stage 3 → hasil → halaman awal), Game Over → Ulangi → Menu ("Rekor baru!" sekali), Menu dari Jeda dengan konfirmasi, pembongkaran + muat ulang mesin, resize/blur setelah dibongkar.

Screenshot: `docs/screenshots/rev9-start-1440x900.jpg`, `rev9-start-390x844.jpg`, `rev9-start-844x390.jpg`.
