# Revisi 9 · Tahap a — audit dan baseline

## Peta layar lama (sebelum revisi 9)

| Layar | Dibangun di | Isi |
|---|---|---|
| Judul `#s-title` | `js/ui.js` (TPL.title) | logo, tagline, **Main**, Cara Main, Atur, bar telur/bintang/api; di atas adegan permainan bergerak (`attract` di `main.js`: rantai, naga, portal, burung, kunang-kunang, rAF jalan terus) |
| Petualangan `#s-menu` | `js/menu.js` | bar sumber daya, tombol Satu kategori / Acak, tab Stage 1/2/Boss, 8 kartu kategori, kesulitan, tombol **Pilih Stage** |
| Pilih Stage `#s-steps` | `js/menu.js` | 3 kartu stage (terkunci/terbuka, bintang, skor terbaik, tombol hasil terakhir) |
| Cara Main / Atur | `js/ui.js` | 3 kartu bergambar + format soal; Suara, Musik, Grafik, Cerita, Hapus Data |

Pembaca pilihan menu: `Storage.sel` (`slots[3]`, `same`, `random`, `diff`) → `Levels.resolveCats` → `Levels.build` → `startAdventure(sel, skipStory, first)`;
`Storage.prog/unlocked/totalStars/lastResult` hanya dibaca menu, kartu stage, dan layar judul; `?unlock=1` membuka semua stage.
Tes/alat dev yang menyentuh menu: `js/dev/resp.js` (`Menu.open`, `show('title')`), `js/dev/qsim.js` (membuat `sel` lama), `tests.js` (migrasi simpanan, `unlocked`, `recordStep`).

## Angka dengan ikon api (contoh 28975)

`Storage.data.highScore` = **rekor skor tertinggi satu petualangan** (bukan mata uang, bukan total kumulatif antar-permainan).
- Global: tidak per kategori/kesulitan.
- Naik lewat `Storage.noteScore(score)` (setiap stage selesai dan saat Game Over) dan `recordRun(adv.score)` (akhir Stage 3); `adv.score` kumulatif antar-stage dalam satu petualangan.
- Temuan: karena `noteScore` sudah menaikkan rekor di akhir tiap stage, `recordRun` di akhir Stage 3 hampir tidak pernah melaporkan `newHigh` ⇒ lencana "Rekor Baru!" jarang muncul; Game Over tidak menampilkannya sama sekali. Diperbaiki di tahap d (rekor awal petualangan disimpan di `adv`).
- Tidak perlu keputusan user: angkanya memang rekor, datanya dipertahankan apa adanya. Rekor tetap global (opsional nanti: rekor per kategori+kesulitan).

## Telur dan bintang

- "Telur" di menu = konstanta `Gameplay.DEFAULTS.EGGS_MAX` (selalu 3), hanya tampilan di `Kit.resbar`. Telur 3/3 di HUD/permainan (`run.lives`) tidak terkait dan tidak diubah.
- "Bintang" di menu = `Storage.totalStars()` (jumlah bintang semua stage/kesulitan), hanya tampilan. Bintang per stage di layar hasil (`stageResult`) tetap.
- Syarat membuka stage (`Storage.unlocked`): stage n+1 terbuka bila stage n punya ≥ 1 bintang. Hanya dipakai layar Pilih Stage ⇒ dihapus bersama layarnya.

## Baseline layar judul (Chromium di panel preview, localhost, tanpa jaringan nyata)

| | 1440×900 | 390×844 (dpr 2) |
|---|---|---|
| JS dimuat sebelum klik | 44 berkas, **670.599 B** | sama |
| CSS | 3 berkas, **54.025 B** | sama |
| Aset lain | 3 SVG ikon (1.096 B) + manifest (244 B) + CSS Google Fonts (697 B, **render-blocking**) | sama |
| `requestAnimationFrame` aktif | **1 loop** (28 frame/dtk di panel; 60 di perangkat nyata) | 1 loop |
| Waktu JS per frame saat diam | **2,2 ms** (±6 % satu inti pada 28 fps, ±13 % pada 60 fps) | **2,9 ms** (±8 % / ±17 %) |
| `DOMContentLoaded` (≈ bisa diklik) | **410 ms** | **652 ms** |

Catatan pengukuran: throttling CPU 4× tidak tersedia di panel preview; perkiraan = angka di atas × 4 (JS parse + eksekusi mendominasi), jadi ≈ 1,6 dtk (desktop) dan ≈ 2,6 dtk (390×844) sebelum jaringan. Tidak ada audio otomatis (AudioContext baru dibuat setelah ketukan pertama).
