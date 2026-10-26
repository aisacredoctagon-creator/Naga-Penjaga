# Zuma Matematika

Game matematika berbasis browser dengan mekanik ala Zuma, penembaknya kodok. Rantai bola bergerak di jalur lengkung menuju lubang
**FINISH**. Di atas layar selalu ada soal. Tembak bola yang berisi **jawaban benar** dari kodok di tengah layar.

**▶ Main sekarang (demo):** https://aisacredoctagon-creator.github.io/Zuma/

**Materi yang dilatih:** penjumlahan, pengurangan, perkalian, pembagian, bilangan bulat (termasuk negatif), dan pecahan desimal
(+, −, ×, ÷ dengan pembulatan yang jelas), lalu campuran semuanya.

HTML5 Canvas + JavaScript murni. Tidak ada framework dan tidak ada build step. Gambar game dan suara
dibuat lewat kode; hanya popup Jeda memakai beberapa aset di `assets/`. Bahasa antarmuka: Indonesia.

## Cara menjalankan

**Paling mudah:** klik dua kali `index.html` (atau seret ke browser). Semua skrip memakai `<script>` klasik, jadi
bisa jalan lewat `file://`.

Kalau mau lewat server lokal (opsional), salah satu dari:

```bash
python -m http.server 8000     # lalu buka http://localhost:8000
npx serve .                    # jika Node.js terpasang
```

Parameter URL untuk uji coba: `index.html?unlock=1` membuka semua level tanpa harus menamatkan stage sebelumnya.

## Cara bermain

| Aksi | Mouse | Layar sentuh | Papan ketik |
|---|---|---|---|
| Membidik | arahkan kursor | geser jari | ← → |
| Menembak | klik | lepas jari | Spasi |
| Tukar bola tembak | klik kodok (bola cadangan ada di punggungnya) | ketuk kodok / bola di punggungnya | Q |
| Jeda | tombol kuning di kanan atas (juga bisa lewat Tab + Enter) | idem | P / Esc |

- Bola tembak membawa pengali skor **×1 / ×2 / ×3**. Ketuk kodok untuk menukar dengan bola cadangan di punggungnya.
  Bola yang dipakai tidak memengaruhi benar-salah, hanya skor.
- **Benar:** bola meledak, skor naik, kombo naik, rantai ditarik mundur, soal berganti.
- **Salah:** nyawa berkurang, layar bergetar merah, bola tidak meledak, muncul penjelasan singkat
  (mis. "Salah! 12 + 7 = 19").
- Nyawa (5 pion) juga berkurang jika peluru mengenai batu/rintangan bergerak, menembak bola bom,
  atau rantai sampai di lubang FINISH.
- Bola khusus: **Bom** (jangan ditembak), **Es** (rantai melambat), **Petir** (rantai ngebut), **Hati** (+1 nyawa).
- Bintang (1–3) per stage dihitung dari nyawa tersisa: 4–5 nyawa = 3★, 2–3 nyawa = 2★, 1 nyawa = 1★.
  Nyawa diisi ulang 5 di awal tiap stage.
- Progres, bintang, skor tertinggi, dan pengaturan suara disimpan di `localStorage`.

## Level

| Level | Materi | Stage |
|---|---|---|
| 1 | Penjumlahan & pengurangan bilangan bulat positif kecil | 1-1, 1-2, 1-3, Boss |
| 2 | Perkalian & pembagian dasar | 2-1 … Boss |
| 3 | Bilangan bulat (negatif) pada empat operasi | 3-1 … Boss |
| 4 | Desimal (+, −, ×, ÷) dengan pembulatan yang jelas | 4-1 … Boss |
| 5 | Campuran semua materi, lebih cepat, rintangan lebih banyak | 5-1 … Boss |

Setiap level diakhiri **Raja Angka** (3 fase): fase 1 rantai lambat, fase 2 rintangan bergerak,
fase 3 soal campuran dengan batas waktu 15 detik per soal. Jawaban benar melukai boss, jawaban salah
atau waktu habis membuat boss menyerang (nyawa berkurang).

## Struktur proyek

```
index.html          kerangka halaman
css/style.css       menu, overlay, tombol (target sentuh ≥ 44px)
css/pause.css       popup JEDA: token warna dari Figma sebagai CSS variables di satu blok :root
assets/             gambar dari Figma: maskot kodok tidur, ikon play / restart / home
js/theme.js         SATU file konfigurasi tema: warna, font, ukuran bola, parameter kodok, slot sprite
js/storage.js       localStorage: progres, bintang, skor, pengaturan
js/audio.js         efek suara Web Audio (tanpa file eksternal) + mute
js/fx.js            partikel, teks melayang, getar & kilatan layar
js/path.js          jalur spline Catmull-Rom + preset jalur + gambar alur/START/FINISH
js/chain.js         rantai bola, bola khusus, gambar bola
js/frog.js          kodok: gambar + animasi + ekspresi (modul terpisah, mudah diganti)
js/shooter.js       penembak (memakai frog.js), bola tembak (pengali), peluru
js/questions.js     generator soal + pengecoh yang masuk akal
js/obstacles.js     batu statis, rintangan bergerak (sweep/orbit)
js/levels.js        konfigurasi level & stage (data)
js/boss.js          boss sebagai konfigurasi/modul (Raja Angka)
js/ui.js            menu & overlay (DOM) + HUD (canvas)
js/main.js          loop game, layout responsif, input, alur stage/boss
```

Resolusi logis tetap: 960×540 (landscape) dan 540×960 (portrait), diskalakan dengan rasio terjaga dan
`devicePixelRatio` (maks. 2). Jalur ditulis sekali dalam koordinat ternormalisasi lalu otomatis disusun ulang
untuk portrait. Mengubah orientasi di tengah permainan didukung.

## Menambah level / stage baru

Buka `js/levels.js`, tambahkan stage ke larik `stages` sebuah level, atau tambahkan objek level baru ke `LEVELS`:

```js
{ name: 'Pemanasan', label: 'Penjumlahan', topics: [ADD(1, 10)], goal: 5, speed: 20, maxBalls: 14, pathId: 'arc' }
```

| Bidang | Arti |
|---|---|
| `topics` | daftar spesifikasi soal (lihat bawah); `'ALL'` = semua topik dari Level 1 sampai Level 5 |
| `goal` | jumlah jawaban benar untuk menamatkan stage |
| `speed` | kecepatan rantai (px/detik logis) |
| `maxBalls` | jumlah maksimum bola di rantai |
| `pathId` | `arc`, `wave`, `ring`, `hook` (preset di `path.js`) |
| `retreat` | jarak rantai mundur per jawaban benar (otomatis naik per level) |
| `rocks`, `movers`, `specials` | rintangan & bola khusus. Kosongkan untuk otomatis (kurva di `obstaclesFor`) |
| `ballScale` | pembesar bola (mis. 1.12 agar angka desimal muat) |
| `questionTime` | batas waktu per soal (detik) atau `null` |

Contoh rintangan manual:

```js
rocks:  [{ a: -135, dist: 90, r: 20 }],                         // a = sudut (derajat), dist = jarak dari kodok; posisi digeser otomatis agar tidak menimpa alur
movers: [{ type: 'sweep', offset: -80, range: 150, speed: 1.3, r: 16 },
         { type: 'orbit', radius: 80, speed: 1.8, count: 2, r: 14 }],
specials: { bomb: 0.05, ice: 0.03, bolt: 0.02, life: 0.012 }    // peluang per bola baru
```

## Menambah / mengubah soal

Soal dibuat oleh `js/questions.js`. Satu topik = satu objek spesifikasi:

| `type` | Parameter (bawaan) |
|---|---|
| `add`, `sub` | `min`, `max` atau `digits` (jumlah digit) |
| `mul` | `aMin, aMax, bMin, bMax` |
| `div` | `bMin, bMax, qMin, qMax` (a = b × q, selalu habis dibagi, pembagi ≥ 2) |
| `int` | `op` (`'+' '-' '*' '/' 'any'`), `min`, `max` (besar angka, tanda diacak) |
| `dec` | `op`, `places` (1/2), `min`, `max`, `round` (0 = hasil tepat; 1/2 = dibulatkan ke sekian desimal, pembulatan "setengah ke atas") |

Coba di konsol browser:

```js
GA.Questions.generate({ type: 'dec', op: '*', min: 1, max: 9, round: 1 })
// → { text:'4,37 × 2,5 = ?', note:'(bulatkan ke 1 desimal)', answerText:'10,9', explain:'4,37 × 2,5 = 10,925 ≈ 10,9', choices:[…] }
```

Pengecoh dibuat dari kesalahan yang masuk akal (salah tanda, geser koma ×10 / ÷10, salah satuan/puluhan,
salah operasi, salah pembulatan), bukan angka acak. Untuk jenis soal baru, tambahkan fungsi di objek `GEN`
dan nilai bawaan di `DEFAULTS`; fungsi `make({...})` membersihkan pengecoh otomatis.

## Mengganti tampilan (aset)

Semua gambar sekarang digambar lewat kode. Untuk memakai aset sendiri, isi `Theme.sprites` di `js/theme.js`
dengan URL gambar, misalnya `{ shooter: 'assets/katak.png', rock: 'assets/batu.png' }`. Slot yang tersedia:
`ball, shooter, boss, rock, mover, hole, background`. Kalau slot kosong, gambar placeholder dipakai.
Warna bola dan font juga ada di file yang sama.

## Mengganti / menambah boss

Boss didefinisikan terpisah di `js/boss.js`. Salin objek `RajaAngka`, ubah `id`, `name`, `phases`, `lines`,
dan fungsi `draw`, lalu daftarkan dengan `GA.Bosses.register(...)`. Pilih boss untuk sebuah level dengan
`bossCfg: { id: 'id-boss-baru' }` pada bagian `boss` level tersebut di `levels.js`. Arena boss memakai
preset jalur `bossU` (penembak di bawah, boss di atas).

## Ide boss alternatif

1. **Naga Pecahan**: naga panjang yang melingkar di arena. Tubuhnya terdiri dari segmen pecahan/persamaan;
   menembak segmen dengan nilai yang cocok memutus tubuhnya, sedangkan kepala menyemburkan api yang
   menutup sebagian jalur tembak.
2. **Robot Kalkulator**: layar robot menampilkan operator yang berganti (+ − × ÷) setiap beberapa detik, jadi
   soal yang sama bisa punya jawaban berbeda. Pemain harus membaca operator terbaru sebelum menembak.
   Tombol-tombol di tubuh robot mengunci sementara beberapa bola.
3. **Gurita Tinta**: tentakel menyapu arena (rintangan bergerak yang lebih besar) dan sesekali menyemprotkan
   tinta yang menutupi angka pada sebagian rantai selama beberapa detik. Pemain harus mengingat posisi
   jawaban sebelum tertutup.

## Ukuran bola & kodok

Semua ukuran diturunkan dari satu konstanta di `js/theme.js`:

```js
BALL_RADIUS_RATIO: 0.06,        // radius bola rantai = 6% dari sisi pendek canvas logis (540) → 32
ball: { minScreenDiameter: 44,  // diameter bola di layar (px) minimal; radius dinaikkan otomatis di HP kecil
        maxRadius: 36, playerRatio: 0.72, bulletHitRatio: 0.55, trackMargin: 12 },
frog: { radiusRatio: 1.4, body: [...], ... }   // ukuran & warna kodok
```

Dari radius itu dihitung jarak antar-bola, lebar alur, hitbox peluru, ukuran bola pemain/preview/peluru, ukuran
font angka, efek ledakan, serta penempatan batu dan rintangan bergerak (digeser otomatis agar tidak menimpa alur).
Untuk mengubah ukuran bola cukup ubah `BALL_RADIUS_RATIO`.

## Kodok (`js/frog.js`)

Badan bulat, dua mata besar yang menonjol, mulut lebar, kaki depan/belakang, dan daun teratai. Badan dan mata
menoleh halus mengikuti bidikan. Ekspresi dipicu dari `main.js` lewat `shooter.react(...)`:
`happy` (jawaban benar), `hurt` (nyawa berkurang), `sad` (Game Over), `cheer` (menang / boss kalah).
Saat menembak: mulut terbuka cepat, tubuh mengerut lalu memantul, lidah menjulur. Idle: bernapas dan berkedip acak.
Untuk memakai gambar sendiri, isi `Theme.sprites.shooter` (menghadap ke kanan).

## Popup JEDA

Dibuat dari desain Figma (node `123:122`, file `P8Ul9VcEHT7rDrbTGsAZVF`): latar game yang di-dim + blur + vignette,
top bar (tombol status jeda + lencana "Level … · Stage … - nama"), papan kayu bermaskot kodok tidur, plakat
"JEDA", sub-judul humor, tombol LANJUT / ULANGI / MENU, toggle "Suara Permainan", dan banner "Booster Gratis".

- **Gaya:** `css/pause.css`. Semua warna, gradient, dan bayangan dari Figma ada di blok `:root` paling atas (`--pz-*`).
  Popup didesain pada lebar 350px lalu diskalakan otomatis (0,78×–1,3×) oleh `UI.fitPause()`. Di layar yang terlalu
  pendek (HP landscape) area popup bisa digulir.
- **Markup & perilaku:** `js/ui.js` (`pauseHTML()`, `UI.showPause()`, `UI.hidePause()`, dialog konfirmasi, toast).
  Teks sub-judul ada di larik `PAUSE_QUOTES` (dipilih acak tiap dibuka; bisa diganti via `GA.UI.pauseQuotes`).
- **Berhenti total:** saat jeda, `main.js` tidak menggerakkan rantai, rintangan, boss, partikel, animasi, maupun timer
  soal, dan `Audio.suspend()` menahan semua suara. LANJUT melanjutkan dari kondisi persis sebelumnya.
- **Konfirmasi:** ULANGI dan MENU bertanya dulu hanya jika stage sudah punya progres (skor, jawaban, atau nyawa berubah).
- **Suara:** toggle memakai `Audio.setEnabled` dan menyimpan pilihan ke localStorage.
- **Booster:** tombol placeholder. `UI.onBoosterClick()` hanya menampilkan toast "Segera hadir"; belum ada SDK iklan atau reward.
- **Aksesibilitas:** `role="dialog"` `aria-modal`, fokus pindah ke LANJUT saat terbuka dan kembali ke tombol jeda HUD
  saat tertutup (tombol HUD sungguhan `#pause-hud` dipasang di atas tombol yang digambar di canvas), fokus terkunci di
  dalam popup (Tab / Shift+Tab), Esc menutup dialog konfirmasi dulu lalu popup, toggle memakai `role="switch"`,
  `prefers-reduced-motion` mematikan animasi, dan padding mengikuti `env(safe-area-inset-*)`.

Catatan: font desain (Fredoka dan Nunito) tidak disertakan karena game tidak memakai file eksternal; popup memakai
font sistem bergaya bulat sebagai cadangan. Untuk tampilan persis desain, tambahkan `@font-face` kedua font itu di
`css/pause.css` dan ubah `--pz-font-display` / `--pz-font-body`.
