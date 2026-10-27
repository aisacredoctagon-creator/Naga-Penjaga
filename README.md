# Naga Penjaga

Game matematika berbasis browser bergaya Zuma dengan tema fantasi. **Naga Penjaga** menyemburkan **bola api berangka**
untuk menghancurkan **bola sihir berangka** milik **Penyihir Jahat**, yang ingin mencuri telur-telur naga. Di atas layar
selalu ada soal; semburkan api ke bola sihir yang berisi **jawaban yang benar** sebelum bola-bola itu sampai ke sarang.

**▶ Main sekarang (demo):** https://aisacredoctagon-creator.github.io/Naga-Penjaga/

HTML5 Canvas + JavaScript murni. Tidak ada framework dan tidak ada build step. Gambar game dan suara dibuat lewat kode
(placeholder yang mudah diganti); hanya popup Jeda memakai beberapa ikon di `assets/`. Bahasa antarmuka: Indonesia.

## Cara menjalankan

**Paling mudah:** klik dua kali `index.html` (atau seret ke browser). Semua skrip memakai `<script>` klasik, jadi bisa
jalan lewat `file://`. Lewat server lokal (opsional): `python -m http.server 8000` atau `npx serve .`.

## Alur permainan

Judul → **Main Menu** (pilih kategori & kesulitan) → cerita pembuka (3–5 panel, sekali saja, bisa dilewati) →
**Step 1 Hutan Berbisik** → **Step 2 Gua Lava** → **Step 3 Menara Penyihir (boss)** → hasil (bintang, skor, Main Lagi /
Ganti Kategori / Menu Utama).

Sebelum tiap step ada layar pembuka (nama tempat, kategori, contoh soal, rintangan, legenda bola khusus) lalu hitung mundur 3-2-1.
Jalur punya penanda **MUNCUL** (bola masuk) dan **SARANG** (tujuan bola sihir).

### Main Menu

- **8 kategori:** Penjumlahan, Pengurangan, Perkalian, Pembagian, Bilangan Bulat, Pecahan, Desimal, Campuran.
- **3 slot:** Step 1, Step 2, Boss. Pilih satu slot lalu kategorinya, atau nyalakan **Satu kategori untuk semua**, atau **Acak**.
- **Kesulitan:** Mudah / Sedang / Sulit. Mengatur rentang angka, jumlah digit, kerumitan soal (mis. penyebut pecahan,
  jumlah angka di belakang koma), kecepatan rantai, kerapatan rintangan, dan banyaknya bola pengecoh.
- Ringkasan pilihan + bintang terbaik + rekor ditampilkan sebelum **Mulai Petualangan**. Pilihan terakhir, bintang tiap step,
  skor tertinggi, dan pengaturan suara/musik disimpan di `localStorage`.

### Aturan

- Kamu punya **5 telur** (nyawa), dibawa dari step ke step (maksimal 6). Telur hilang jika jawaban salah, peluru kena rintangan,
  menembak bola kutukan, atau bola sihir sampai di sarang. Selesai Step 1 dan 2 kamu mendapat **+1 telur**.
  **Telur emas** (bola khusus) menyembuhkan satu telur.
- Bintang tiap step: 3 jika tidak ada telur hilang, 2 jika hilang ≤ 2, selain itu 1.
- Pecahan **bersusun** (pembilang di atas penyebut) di soal dan di bola. Jawaban pecahan harus **bentuk paling sederhana** (1/2 ≠ 2/4),
  desimal memakai **koma**, tanda negatif memakai "−" dan kurung bila perlu, tidak ada pembagian dengan nol.
- Kontrol: mouse/sentuh (geser untuk membidik, lepas untuk menembak), ketuk naga atau bola kecil di dadanya untuk menukar bola api;
  papan ketik ← → membidik, Spasi menembak, Q menukar, P/Esc jeda.

### Step, rintangan, dan boss

| Step | Latar & jalur | Rintangan |
|------|---------------|-----------|
| 1 Hutan Berbisik | hutan, jalur spiral/kait lebar | akar berduri, kabut sihir (menyembunyikan angka), bola kutukan |
| 2 Gua Lava | gunung berapi, jalur zig-zag (S) | kristal pemantul (peluru memantul sekali, garis bidik menunjukkan pantulan), lahar & petir bergerak, bola beku (rantai melambat), kelelawar penyihir (menukar dua bola), naga beku sebentar setelah salah tembak |
| 3 Menara Penyihir | menara malam, arena U | **Penyihir Jahat**, 3 fase |

Boss (`js/boss.js`): **Fase 1** rantai lambat. **Fase 2** mantra kabut / es / tukar angka, rantai lebih cepat, rintangan bergerak.
**Fase 3** soal campuran dari ketiga kategori pilihanmu, ada batas waktu per soal (waktu habis = telur hilang), mantra lebih sering.

## Struktur proyek

```
index.html          halaman tunggal
css/style.css       gaya layar & menu          css/pause.css   popup Jeda (desain Figma)
js/theme.js         warna, ukuran bola, naga, latar tiap step (satu-satunya tempat untuk ganti tampilan)
js/storage.js       localStorage (pilihan, bintang, rekor, pengaturan)
js/audio.js         efek suara + musik latar sederhana (Web Audio, tanpa berkas)
js/fx.js            partikel, getar layar          js/scenery.js   latar parallax + partikel ambient
js/path.js          jalur (spline) & preset: arc, wave, hook, zigzag, ring, bossU; sarang & penanda
js/mathtext.js      teks matematika dengan pecahan bersusun (canvas & HTML)
js/chain.js         rantai bola sihir, bola khusus (kutukan, beku, telur emas), kabut
js/dragon.js        Naga Penjaga (kepala/leher mengikuti bidikan, ekspresi, animasi)
js/shooter.js       naga + bola api + peluru
js/questions.js     generator soal, kategori & tabel kesulitan
js/obstacles.js     akar berduri, kristal, lahar/petir, kelelawar
js/levels.js        3 step + tabel kesulitan (data)
js/boss.js          Penyihir Jahat (modul terpisah, bisa diganti)
js/story.js         cerita & akhir (nama tokoh bisa diatur)
js/ui.js            layar (DOM) + HUD (canvas)     js/menu.js   Main Menu
js/main.js          loop, layout responsif, input, alur petualangan
```

## Menambah / mengubah

- **Kategori soal:** tambahkan ke `CATEGORIES` dan isi `TABLE` (tiga kesulitan) di `js/questions.js`. Generator baru ditambahkan ke `GEN`
  (kembalikan lewat `make({ expr, answer, answerText, cands, ... })`; jawaban dinilai dari **teks**).
- **Kesulitan / kecepatan / jumlah soal:** `TUNE` di `js/levels.js` (nilai per kesulitan untuk Step 1, 2, 3).
- **Step atau rintangan baru:** tambahkan objek ke `STEPS` di `js/levels.js` (`scene`, `pathId`, fungsi `obst(d)`). Preset jalur baru
  ada di `presets` pada `js/path.js` (koordinat ternormalisasi; `mode: 'transpose'` untuk potret). Latar baru di `Theme.scenes`.
  Jenis rintangan baru: tambahkan di `js/obstacles.js` dan hubungkan di `onBulletStep` (`js/main.js`).
- **Boss lain:** `GA.Bosses.register({ id, name, phases, lines, draw })`, lalu isi `boss.id` di `levels.js`.
- **Cerita:** ubah `names`, `intro`, `win`, `lose` di `js/story.js`.
- **Pause:** teks humor di `PAUSE_QUOTES` (`js/ui.js`); gaya di `css/pause.css`.
- **Aset sendiri:** isi `Theme.sprites` (mis. `boss`, `rock`, `mover`) dengan URL gambar relatif; gambar kode otomatis diganti.
  Pakai path relatif (mis. `assets/boss.png`) dan huruf besar-kecil yang sama agar jalan di GitHub Pages.

## Ukuran bola

Semua ukuran diturunkan dari konstanta di `js/theme.js`. Bola yang berperan sama memakai radius yang **sama persis**: bola sihir
di rantai, bola api siap tembak di mulut naga, dan bola api yang melesat (`SHOOTER_BALL_SCALE = 1.0`, tanpa animasi mengecil
saat ditembak). Bola berikutnya di dada naga sedikit lebih kecil (`NEXT_BALL_SCALE = 0.8`). Diameter bola di layar minimal 46 px (HP);
batas atas `maxRadius`. Hitbox peluru = radius bola yang terlihat (`bulletHitRatio = 1.0`). Bola desimal/pecahan boleh sedikit lebih
besar di tiap step (`ballScale`, maks 1,2×) agar angka tetap terbaca. Untuk mengubah ukuran semua bola ubah `BALL_RADIUS_RATIO`.

## Popup JEDA

Dibuat dari desain Figma (node `123:122`, file `P8Ul9VcEHT7rDrbTGsAZVF`); tata letak, tombol, dan toggle tetap. Maskotnya kini **naga
tidur** (digambar kode di kanvas) dan teksnya bertema naga. Detail: gaya di `css/pause.css` (variabel `--pz-*`), perilaku di `js/ui.js`
(`UI.showPause`, `UI.hidePause`, konfirmasi, toast). Saat jeda semuanya berhenti total (rantai, rintangan, boss, partikel, timer soal)
dan `Audio.suspend()` menahan suara. ULANGI mengulang step ini dari awal (telur & skor seperti saat step dimulai); ULANGI dan MENU
bertanya dulu hanya jika sudah ada progres. Tombol **Booster Gratis** masih placeholder (toast "Segera hadir"; belum ada SDK iklan).
Aksesibilitas: `role="dialog"`, fokus terkunci, Esc menutup konfirmasi dulu lalu popup, `prefers-reduced-motion`.

## Uji coba

`GA.game` terbuka di konsol: `GA.game.startAdventure({slots:['add','mul','frac'],same:false,random:false,diff:'sedang'}, true)`,
`GA.game.startStep(n, true)` (n = 0..2), dan `GA.game.tick(dt, noRender)` untuk menjalankan waktu game secara manual
(berguna di panel yang tidak menjalankan `requestAnimationFrame`).

## UI & tema visual

- **Token desain** di `Theme.ui` (js/theme.js): material kayu, emas, perkamen, batu, api, warna status, radius. `js/ui/skin.js` menerjemahkannya menjadi CSS variables (`--wood-*`, `--gold-*`, `--parch-*`, `--stone-*`, `--r-*`, `--font-*`) dan tekstur material prosedural (`--tex-wood`, `--tex-stone`, `--tex-parch`). HUD canvas memakai token yang sama, jadi mengubah `Theme.ui` mengubah seluruh UI. Opsi aset gambar: letakkan `assets/ui/wood.webp`, `stone.webp`, `parchment.webp` untuk menggantikan tekstur prosedural.
- **Font**: judul `Cinzel Decorative` dan UI `Baloo 2` dimuat dari Google Fonts (`display=swap`); bila gagal dimuat, tumpukan cadangan (Palatino/Georgia dan Trebuchet/sistem) dipakai. Angka di bola tidak bergantung pada font eksternal untuk sprite.
- `css/ui.css`: panel perkamen berbingkai kayu dengan paku emas, tombol kayu/emas (hover, tekan, nonaktif), kartu kategori dari batu, slot dan kesulitan dari kayu, transisi antar layar. `prefers-reduced-motion` mematikan animasi layar, kilau tombol, dan mengurangi getar/kilatan/goyangan dedaunan.
- `js/ui/icons.js`: ikon SVG inline (garis 2,3 bulat) untuk tombol, kategori, dan status. `js/ui/hud.js`: HUD canvas (bingkai kayu bertrim emas di-cache; plakat skor odometer, plakat step permata, plakat soal perkamen dengan animasi ganti soal, bilah progres api, telur bercahaya, tombol Jeda).
- Popup melayang bergaya `FX.pop(x, y, teks, 'score|combo|good|bad|info')`. Bunyi UI: ketuk (klik), denting (pilih), gema (kembali), fanfare kecil (konfirmasi) lewat Web Audio.

## Kualitas grafis & performa

- `js/quality.js`: tiga tingkat (**Tinggi / Sedang / Rendah**) dan mode **Otomatis** (Pengaturan → Grafik). Otomatis mengukur FPS saat bermain (bukan saat jeda/menu) dan menurunkan tingkat bila rata-rata di bawah ~50 FPS selama dua jendela 2 detik berturut-turut; ia hanya menurunkan, tidak menaikkan lagi. Pilihan disimpan di `localStorage`.
- Yang diatur: efek atmosfer (kabut, berkas cahaya, riak, cahaya obor/lava, burung, goyangan dedaunan, partikel portal), kepadatan partikel pendek, batas `devicePixelRatio`, dan lapisan menyala (retakan lava, rune). `?debug=1` menampilkan FPS dan tingkat aktif di pojok kiri bawah.
- Lapisan statis peta, sprite bola, dan bingkai HUD di-cache dan dibangun ulang hanya saat ukuran/orientasi/kualitas berubah (sekali, bisa terasa sebagai jeda singkat). Partikel memakai pool; tidak ada alokasi per frame di jalur panas.

## Aset gambar opsional

Gambar bawaan semuanya prosedural. Untuk memakai ilustrasi sendiri, daftarkan berkas di `assets/manifest.json` (sprite boss/rintangan/portal/sarang, latar peta per orientasi, tekstur UI). Lihat **`docs/ASSET_GUIDE.md`** untuk ukuran, format, arah cahaya, contoh deskripsi untuk generator gambar, dan daftar aset yang belum tersambung.

## Jalur & peta (js/maps/)

- `maps/paths.js`: **pustaka arketipe jalur** berbasis data. Tiap arketipe punya definisi LANDSCAPE dan PORTRAIT sendiri (titik kontrol ternormalisasi), posisi penembak/boss, dan opsional zona kecepatan. Step 1: `hook`, `serp3`, `s2`. Step 2: `zigzag`, `figure8` (persilangan dengan jembatan), `horseshoe`. Step 3: `bossU`, `bossU2`, `bossBowl`. Jalur dan peta dipilih acak per petualangan (`Levels.pick`), disimpan di `adv.picks` supaya Ulangi memakai yang sama.
- Spline Catmull-Rom sentripetal, tabel panjang busur (`path.js`), jumlah bola mengikuti panjang jalur dan `BALL_RADIUS`.
- **Validator** (otomatis tiap jalur dibangun): jarak antar-segmen ≥ 2,5R + 8, radius tikungan ≥ 1,15R, jalur di dalam layar, ruang penembak/boss bebas, deteksi persilangan. Tikungan tajam dilunakkan otomatis.
- **Jembatan**: di persilangan, deck batu digambar di lapisan depan; bola di jalur bawah lewat di bawahnya, bola di jalur atas (`path.overWindows`) digambar setelahnya.
- **Mode debug** `index.html?debug=1`: menampilkan jalur (cyan), titik kontrol bernomor, pelanggaran jarak (merah), tikungan tajam (oranye), persilangan (hijau), zona kecepatan (magenta), ruang penembak/boss, titik portal, dan laporan validator.
- Peta (`GA.Maps`): `forest`, `grove` (Step 1); `volcano`, `crystal` (Step 2); `tower`, `tower2` (Step 3). Satu file data per tema berisi palet, jenis dasar (`moss|basalt|cave|flags`), komposisi dekorasi (`mix`), elemen depan (`front`: `leaf|stone|hall`), dan opsi efek. Untuk menambah peta: salin salah satu file, ubah palet/`mix`, lalu daftarkan idnya di `Levels` (`POOL`) dan `Theme.scenes`.
- Zona kecepatan: `zones` pada arketipe (mis. `serp3`) mempercepat rantai di bagian jalur tertentu.

## Render berlapis (js/render/, js/maps/)

- `render/noise.js` + `render/textures.js`: RNG berbenih, noise fBm, Voronoi (retak batu), sisik, kayu, logam. Hasilnya di-cache sebagai kanvas kecil / CanvasPattern dan dipakai peta, bola, naga, dan portal.
- `render/background.js`: peta statis dirender sekali per layout ke kanvas luar layar: dasar bertekstur → parit jalur terukir → kolam & altar → dekorasi → `front` (daun penutup depan + vignette, digambar setelah rantai). Data peta di `maps/*.js` (`GA.Maps`); peta tanpa data memakai `scenery.js` lama.
- `render/effects.js`: efek dinamis. **Portal dimensi** di titik masuk (`Effects.openPortal()/closePortal()/pulse()`), riak kolam, berkas cahaya, kabut, kunang-kunang, burung. Kualitas: `GA.Effects.setQuality(0|1|2)`.
- `render/balls.js`: bola sihir 3D (badan berputar + nebula + 8 motif rune, kilau tetap tegak, plakat angka, bayangan), sprite di-cache per radius × warna. Bola muncul dari portal: kecil, transparan, bercahaya, lalu membesar (`chain.entryD`).
- `render/fire.js`: bola api (8 frame turbulensi, ekor, cahaya dinamis). `fx.js`: pecahan kristal, ledakan api, gelombang kejut, jelaga, muzzle flash.
- `dragon.js`: naga bersegmen (leher dan ekor berpegas, sayap bertulang, sisik bertekstur).

## Deploy (GitHub Pages)

Workflow `.github/workflows/deploy.yml` menyalin `index.html`, `css/`, `js/`, `assets/` ke Pages saat push ke `main`. Semua path relatif,
jadi aman di subpath `/Naga-Penjaga/`. Pengaturan Pages: Source = GitHub Actions.
