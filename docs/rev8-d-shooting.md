# Revisi 8 — tahap d: tembakan target-lock + lontaran

Mekanik tembak diganti agar bola jawaban SELALU bisa dipilih di lintasan spiral (tidak ada lagi garis lurus yang terhalang bola lain).

## Aturan

| Hal | Perilaku |
| --- | --- |
| Titik bidik P | mouse: posisi kursor; sentuh: posisi jari digeser ke atas `TOUCH_OFFSET_PX` (56 px layar) supaya jari tidak menutupi bola |
| Target | bola terdekat dalam `LOCK_RADIUS` × R dari P (mouse 1,0 R, sentuh/keyboard 1,25 R) |
| Penanda | cincin kecil di atas bola target (di bawahnya bila dekat HUD), bola sedikit menggembung (`LOCK_BUMP`); cincin merah bila garis terhalang rintangan tinggi |
| Tidak ada bola dalam radius | cincin putus-putus di P; peluru terbang ke P dan padam, tanpa hukuman |
| Lontaran | durasi tetap `LOB_TIME` (0,4 dtk) berapa pun jaraknya; skala 1 → 1,25 → 1 (`LOB_GROW`), tinggi `LOB_PEAK`·R, bayangan tertinggal di tanah |
| Tabrakan di jalan | tidak ada dengan bola lain; hanya rintangan TINGGI (kristal, geyser, batu panas, stalaktit, rune) yang menghalangi |
| Hasil | mekanik lama dievaluasi pada bola target (`ballHit`): benar / salah / telur |
| Rintangan rendah | semak berduri, teratai, ombak kini hanya dekorasi bagi lontaran (`blocks:false`) |
| Kristal | menyerap lontaran tanpa hukuman; stalaktit menghancurkan lontaran (telur hilang) |

Input: mouse = arahkan lalu klik; sentuh = seret lalu lepas (tidak ada aksi hanya-hover); keyboard ↑/↓ (W/S) mengubah jarak titik bidik.

## Berkas

`js/shooter.js` (Bullets.lob, aimPt), `js/main.js` (pickTarget, updateLock, drawLock, fire, onLobStep/onLobLand, pointer), `js/hazards.js` (blocks), `js/chain.js` (menggembung), `js/config/gameplay.js` (konstanta), `js/dev/aimsweep.js` (uji), bot di `js/dev/pacing.js` dan `js/dev/qsim.js` memakai `G.aimAtBall`.

## Uji (`?debug=aim`, dan dalam `?test=1`)

27 skenario (stage × jalur × 3 layar): pusat dan titik 0,9 R memilih bola itu, titik kosong tidak memilih, lontaran ≈ 0,4 dtk dan hanya mengenai target, tembakan kosong tanpa hukuman, rintangan tinggi/rendah, mouse + sentuh lewat PointerEvent.

Perbaikan flakiness tes: bola dipilih SESUDAH rantai bergerak (bukan sebelum), rintangan uji ditaruh 35% dari moncong; tes penukaran qsim memakai bot lebih lambat (think 9) karena jawaban benar membatalkan pasangan yang memuat bola soal aktif (dirancang demikian). `SwapManager.stats.why` mencatat alasan batal.

## Batasan yang diketahui

- Stage 3 landscape/portrait: lobus/poligon halus; rintangan rendah tidak lagi memengaruhi tembakan.
- Anchor rintangan dan poligon area tembak dihitung ulang di tahap e.
