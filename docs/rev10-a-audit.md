# Revisi 10 — tahap a: audit (sebelum mengubah kode)

Dua revisi: (1) hapus bola api yang tidak berguna di samping naga; (2) layout lintasan baru di semua map: SARANG dan PORTAL berjauhan tanpa bola saling menutupi.

## 1. Bola api di samping naga

Di kode (`js/shooter.js` sebelum revisi 10) ada tepat **dua** bola api yang diam, keduanya digambar oleh `Shooter.draw` lewat `Fire.drawBall`:

| Bola | Kode | Fungsi lama | Dipakai mekanik? |
|---|---|---|---|
| **Bola siap tembak di mulut** | `Shooter.cur` → `Dragon.draw(ctx, …, ballCb)` di ujung moncong (ikut berputar mengikuti bidikan, jadi di screenshot tampak "di samping naga" bila naga menoleh ke samping) | bola yang ditembakkan berikutnya | **Tidak.** Isinya hanya `{ mult: 1..3, ci: -1 }`; `mult` hanya mengatur panas cahaya api (`Fire.drawBall`: `MULT[ammo.mult]`). Tidak ada angka/label sejak revisi 8 ("×N" dihapus). |
| **Soket "bola berikutnya"** | `Shooter.nxt` + `Shooter.bubble()` (bingkai kayu bundar dengan rune di sisi naga, `NEXT_BALL_SCALE`) | pratinjau bola setelahnya; ketuk soket / naga / tombol Q atau Shift menukar `cur` ↔ `nxt` (`Shooter.swap`, `hitsSwap`, `swapAmmo` di `main.js`) | **Tidak.** Penukaran hanya menukar dua objek `{ mult }` yang tidak punya identitas. |

Bukti bahwa tidak ada mekanik yang memakai angka/identitas bola api:
- Sasaran ditentukan **target-lock** (revisi 8): `fire()` mengambil `run.lock` (bola jawaban terdekat dari titik bidik dalam 1,0R/1,25R) dan memanggil `Bullets.lob(muzzle, tgt, aimPt, sh.takeShot(), …)`. Argumen `takeShot()` hanya dipakai untuk **menggambar** bola yang melayang (`drawAmmo`).
- `grep ammo|mult` di seluruh `js/` (di luar `shooter.js`, `render/fire.js`, dua ilustrasi `story.js`) tidak menemukan pemakaian di skor, jawaban benar/salah, rintangan, atau soal. Skor tidak memakai `mult`.
- Hasil lontaran = hasil pada bola **target** (`onLobLand` → `ballHit(b, b.tgt)`), bukan pada isi bola api.

Keputusan (aturan "TIDAK memakai angka/identitas"): hapus **semua** bola api yang diam beserta kode pendukungnya (`cur`, `nxt`, `bubble`, `swap`, `hitsSwap`, `swapT`, zona ketuk-naga untuk menukar, tombol Q/Shift, `NEXT_BALL_SCALE`/`nextBallRadius`, bola di mulut pada ilustrasi cerita). Dipertahankan: nyala singkat di mulut saat menembak (`FX.muzzle`, partikel "api berkumpul" saat isi ulang) dan bola api yang melesat (`Bullets.lob`). `mult` acak dihapus (hanya hiasan; tidak memengaruhi skor).

Catatan: bola cokelat berduri (semak berduri) dan daun teratai di screenshot adalah **rintangan zona** (`js/hazards.js`): tidak disentuh.

## 2. Mekanik tembak yang berlaku

**Lontaran target-lock** (bukan peluru lurus): bola api terbang melengkung di atas rantai selama `LOB_TIME` ke bola target (mengikuti posisinya), tidak bertabrakan dengan bola di jalan; hanya rintangan **tinggi** (kristal, stalaktit, lahar, batu panas, pilar petir rune) yang menghalangi. Invarian keterpilihan yang wajib dijaga: **INV-5** (dua bola yang bukan tetangga rantai ≥ 2,6R, busur ≥ 4R, sehingga radius kunci 1,0R tidak pernah ambigu), bukan INV-1 (tembakan lurus, hanya untuk jalur satu-lap lama).

## 3. Layout lintasan sebelum revisi 10 (revisi 8, spiral stadion)

Sumber: `GA.PathPrev.table` pada R = 32 (tiga ukuran layar; desktop 1440×900 memakai kanvas logis lanskap 960×540 yang sama).

| Stage / varian | Panjang (diameter) potret | lanskap & desktop | Jarak portal-sarang / sisi terpanjang | Selisih sudut terhadap naga |
|---|---|---|---|---|
| 1 `siput1–3` | 29,4 | 29,3 | potret 0,52–0,58; **lanskap 0,09** | potret 122–142°; **lanskap 6°** |
| 2 `lobus1–3` | 25,3–25,7 | 29,4 | potret 0,30; **lanskap 0,09** | potret 44–50°; **lanskap 6°** |
| 3 `poligon1–3` | 24,6 | 25,1 | potret 0,38; **lanskap 0,09** | potret 63°; **lanskap 7°** |

Penyebab portal dan sarang berdekatan: jalur spiral satu sampai 1,3 putaran selalu **berujung di platform naga** (INV-2 lama), dan lap luar/dalam hanya berjarak satu pitch (3R); di lanskap (tinggi area bermain hanya 426 px = 6,6 diameter) portal di apex kiri/kanan dan ujung jalur di apex yang sama satu lap lebih dalam, jadi keduanya terpaksa di sisi yang sama.

Elemen yang menempel pada posisi portal/sarang:
- **Sprite portal** (`render/effects.js`, `entry()`): titik pertama jalur yang penuh di area bermain (radius cincin 2,45R). **Sprite sarang** (`render/eggs.js`, `holeXY` = titik akhir jalur; cincin batu ≈ 2,3R). Keduanya sudah dipasang dari data jalur (bukan posisi tetap).
- **Label "SARANG"** (`path.js` `drawMarkers`): lama = di sisi luar sarang menjauhi pivot.
- **Rintangan** (`hazards.js`): penempatan adaptif di sekitar naga; tidak tahu zona portal/sarang.
- **Dekorasi** (`render/background.js` `scatter`, `paintFront`): menghindari sarang 3,8R/4,5R, **tidak** menghindari portal.
- **Boss**: lama = `path.boss` di ruang cadangan di luar spiral (atas/samping).
- **Bar darah boss** (`main.js`): di tengah pita atas area bermain.
- **Ilustrasi latar yang menanam portal/sarang**: tidak ada (`assets/manifest.json` kosong: portal, sarang, naga, dekorasi digambar kode); `docs/ASSET_GUIDE.md` diperbarui agar ilustrasi latar tidak menanam keduanya.
- **Jangkar rintangan jalur / poligon area tembak**: sudah diganti penempatan adaptif sejak revisi 8 (tidak ada jangkar tetap).
