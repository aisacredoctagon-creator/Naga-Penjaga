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

Judul → **Main Menu** (kategori & kesulitan) → **Pilih Step** (peta 5 simpul: kunci, bintang, skor terbaik) → cerita pembuka (sekali, bisa dilewati) →
layar pembuka step (kategori, contoh, **1 buff + 1 nerf**) → hitung mundur → step → … → hasil.

Step terbuka berurutan per kesulitan (step n+1 terbuka setelah step n selesai). `?unlock=1` membuka semuanya (untuk uji coba).

### Aturan 20 soal (inti)

- Tiap step punya **tepat 20 soal**; tiap soal berpasangan dengan **satu bola sihir target** (total 20 bola target). Step selesai
  **hanya** setelah semua 20 soal dijawab benar. Progres ditampilkan sebagai ikon bola + angka (mis. `12/20`) di plakat soal.
- **Soal aktif** dipilih hanya dari bola target yang sudah muncul dan terlihat di jalur (utamakan yang garis tembaknya terbuka dan
  yang paling dekat sarang). **Jawaban tiap soal dalam satu step unik** (`Questions.deck`, rentang topik dilebarkan otomatis bila terlalu
  sempit). Bola pengecoh alami = jawaban soal-soal lain yang belum selesai.
- **Gelombang:** 20 bola dibagi 4–6 kelompok (`TUNE.waves`) yang keluar bergantian dari portal dengan jeda `gapSec`. Saat tidak ada target
  terlihat, rantai dipercepat 4× sampai kelompok berikutnya muncul. Kecepatan rantai = panjang jalur ÷ `TUNE.travel`.
- **Anti-macet:** (1) bila bola target lolos ke sarang, satu telur hilang, rantai mundur, tetapi **soalnya masuk antrean lagi** dan keluar dari
  portal — progres jawaban benar tidak hilang; (2) jika soal aktif terhalang > 2,4 dtk dan ada target lain yang terbuka, soal berganti;
  (3) jika semua target terhalang > 1,2 dtk, bola khusus penghalang lenyap dan rintangan statis menyurut sementara (kembali setelah ±9 dtk
  dengan kedipan peringatan 1 detik); (4) peluru yang ditembakkan untuk soal sebelumnya (soal berganti saat melayang) tidak dihukum;
  (5) tembakan ditahan sejenak selama rantai masih bergeser menutup celah.
- **Bola khusus** (kutukan, beku, telur emas) tidak dihitung dalam 20 dan tidak pernah membuat step mustahil; yang lolos ke sarang lenyap tanpa hukuman.

### Main Menu

- **8 kategori:** Penjumlahan, Pengurangan, Perkalian, Pembagian, Bilangan Bulat, Pecahan, Desimal, Campuran.
- **5 slot:** Step 1–4 dan Boss. Default **Satu kategori untuk semua**; matikan untuk memilih per step; atau **Acak**. Step 5 (boss) mencampur
  kategori yang dipilih.
- **Kesulitan:** Mudah / Sedang / Sulit (rentang angka, kerumitan soal, kecepatan rantai, jeda gelombang, kerapatan rintangan).
- Pilihan terakhir, bintang & skor terbaik per step, skor tertinggi, dan pengaturan disimpan di `localStorage`.

### Telur, bintang, kontrol

- **5 telur** (nyawa) dibawa antar-step (maks. 6). Hilang bila jawaban salah, peluru kena rintangan, menembak bola kutukan, atau bola target sampai
  di sarang. Selesai satu step = **+1 telur**. **Telur emas** menyembuhkan satu telur.
- Bintang: 3 jika tidak ada telur hilang, 2 jika hilang ≤ 2, selain itu 1.
- Pecahan **bersusun**; jawaban pecahan harus **bentuk paling sederhana** (1/2 ≠ 2/4), desimal memakai **koma**, tanda negatif "−".
- Kontrol: mouse/sentuh (geser untuk membidik, lepas untuk menembak), ketuk naga/bola kecil untuk menukar bola api; papan ketik ← → membidik,
  Spasi menembak, Q menukar, P/Esc jeda.

### Lima step, buff & nerf (data di `js/levels.js`)

| Step | Tema: tiga peta (`js/maps/`) | Buff | Nerf | Rintangan zona (kumulatif) |
|------|------------------------------|------|------|----------------------------|
| 1 | Lembah Hutan Naga: `forest`, `grove`, `bloom` | Bidik Panjang | Kabut Pagi | semak berduri, akar menyapu (2 jenis) |
| 2 | Rawa Berkabut: `swamp`, `swampDusk`, `coast` | Api Ganda | Arus Deras | + ombak, teratai (4) |
| 3 | Gunung Api: `volcano`, `ashfield`, `magma` | Perisai Telur | Hawa Panas | + lahar menyembur, batu panas jatuh (6) |
| 4 | Gua Kristal Beku: `crystal`, `iceCave`, `amethyst` | Waktu Beku | Es Licin | + stalaktit jatuh, kristal pemantul, kelelawar (8) |
| 5 | Menara Penyihir: `tower`, `tower2`, `library` | Telur Emas | Serangan Boss | + petir rune, tangan bayangan, jamur spora (11) + boss |

**Step 5 = dua sarang.** Jalurnya salah satu `dualU/dualW/dualC`: dua portal, dua rantai (`run.chains`), dua sarang berisi **3 telur** masing-masing (`run.nest = [3, 3]`). 20 soal dibagi 10 + 10 ke dua rantai (bola khusus dibagi dua), kecepatan tiap rantai ×0,88. Bola target yang lolos hanya memecahkan telur di sarangnya sendiri; salah jawab / rintangan mengambil telur dari sarang yang masih terbanyak; **kalah bila salah satu sarang kosong**. Bola telur emas menambah telur di sarang rantai asalnya. Ancaman ditandai cahaya merah berdenyut di sarang + panah merah di tepi arena (HUD menampilkan 3 + 3 telur).

### Rintangan zona (`js/hazards.js`)

Semua **sementara** dan diberi **peringatan ±1 detik** (lingkaran bergaris berdenyut + tanda seru) sebelum aktif; tidak ada yang permanen.
Mekanik: **slow** (semak berduri memperlambat api), **deflect** (ombak membelokkan api), **reflect** (teratai/kristal memantulkan sekali), **strike** (lahar, batu panas, stalaktit, akar menyapu, petir rune lajur: peluru hancur saat aktif, telur hilang), **veil** (spora menyamarkan angka bola, kecuali soal aktif), **blind** (tangan bayangan menutup garis bidik).
Aturan keadilan (diuji otomatis): busur bidik tertutup ≤ 30%; tidak muncul di alur / lintasan mulut / menimpa rintangan lain; sebelum muncul diuji masih ada bola target dengan garis tembak terbuka; bila semua target terhalang > 1 detik, rintangan menyingkir. Jenis, jeda muncul dan jumlah: `HAZ_TIERS`/`HAZ_BASE` di `js/levels.js`; tampilan menyesuaikan zona (hijau, arang, es, rune).
Menambah jenis: tambahkan ke `KINDS` (hazards.js: mekanik, radius, waktu peringatan/aktif), gambar di `drawBody`, lalu ke `HAZ_TIERS`.

### Jalur & peta

- Arketipe jalur di `js/maps/paths.js` (landscape + portrait, divalidasi untuk radius bola 26–32): `hook`, `serp3`, `serp3w`, `serp4`, `serp4w` (padat; jumlah baris menyesuaikan radius bola), `s2`, `zigzag`, `figure8` (persilangan + jembatan), `horseshoe`, `bossU/bossU2/bossBowl`, dan dua-sarang `dualU/dualW/dualC`. Tiap step memilih acak dari 3–4 jalur dan 3 peta (disimpan agar "Ulangi" memakai yang sama). Panjang jalur ≈ 1,3–3,6 × diagonal area main (batas: ruang penembak 2,5R+8 antar-segmen dan zona bebas naga membatasi jumlah baris, terutama di landscape).
- Peta rawa memakai dekorasi baru `js/render/decor3.js` (kolam teratai berbunga, alang-alang, kayu apung). Menambah peta: salin satu entri di `js/maps/variants.js`, daftarkan di `Levels.POOL`, `Levels.ZONE`, dan alias warna di `js/theme.js`.
- **Belum ada:** arketipe spiral dan "dua jalur bertemu".

Buff/nerf: **Bidik Panjang** (garis bidik panjang; tanpa buff ini garis pendek), **Api Ganda** (tiap 5 jawaban benar: tembakan bonus tanpa jeda isi ulang,
skor ×2), **Perisai Telur** (satu kesalahan dimaafkan), **Waktu Beku** (sekali, otomatis memperlambat rantai saat hampir sampai di sarang),
**Telur Emas** (+1 telur di awal), **Kabut Pagi** (angka samar sesaat; jawaban aktif tetap terbaca), **Arus Deras** (dua segmen jalur tempat rantai
melaju 1,5×, ditandai pita air), **Hawa Panas** (bidikan bergetar), **Es Licin** (sudut bidik berinersia).

Boss (`js/boss.js` + rig `js/render/wizard.js`): setiap jawaban benar melukai boss (20 soal = boss kalah); fase berubah pada soal ke-7 dan ke-14 (`TUNE.hits = [7, 7, 6]`) dengan **sinematik singkat yang bisa dilewati** (ketuk / Spasi / Enter; state `cine`, rantai berhenti, zoom ke boss, pita sinema). Penyihir digambar penuh dengan kode: sosok tinggi-kurus, jubah compang-camping (simulasi kain verlet 7×7), tudung runcing, wajah pucat berparut bermata hijau/ungu menyala, bantalan bahu bertumpuk (tulang + logam berkarat), sabuk & tali kulit, lengan dua ruas (IK) dengan jari panjang bercincin, tongkat berkristal berisi energi telur curian (cahaya makin besar tiap fase), tekstur prosedural (anyaman kain, kulit, karat, tulang). Animasi: melayang, gestur mantra, serangan sambil tertawa jahat, berkedip dengan perisai heksagonal saat terkena, aura amarah merah di pergantian fase, dan **hancur menjadi abu + energi ungu** saat kalah. Cahaya berasal dari sihirnya sendiri (lantai, jubah, wajah) dan ada bayangan lantai. Mengganti dengan sprite: `Theme.sprites.boss`.

### Uji otomatis

Buka `index.html?test=1` (lewat server lokal): `js/dev/tests.js` memeriksa dek 20 soal berjawaban unik untuk semua kategori × kesulitan, pembagian gelombang,
penyimpanan step, anti-macet (bola lolos ke sarang), dan menjalankan **bot** yang menamatkan step 1–5 (tanpa render) sambil memastikan 20/20 soal selesai,
selalu ada target terjangkau, dan durasi wajar. Hasil tampil di pojok layar dan di `GA.Tests.results`.

## Struktur proyek

```
index.html          halaman tunggal
css/base.css + kit.css  dasar halaman + komponen UI kit   css/pause.css   popup Jeda (desain Figma)
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
js/levels.js        5 step, buff/nerf, tabel kesulitan (data)
js/boss.js          Penyihir Jahat (modul terpisah, bisa diganti)
js/render/wizard.js rig & gambar Penyihir (kain verlet, IK lengan, tekstur prosedural, hancur jadi abu)
js/story.js         cerita & akhir (nama tokoh bisa diatur)
js/ui.js            layar (DOM) + HUD (canvas)     js/menu.js   Main Menu
js/main.js          loop, layout responsif, input, alur petualangan
```

## Menambah / mengubah

- **Kategori soal:** tambahkan ke `CATEGORIES` dan isi `TABLE` (tiga kesulitan) di `js/questions.js`. Generator baru ditambahkan ke `GEN`
  (kembalikan lewat `make({ expr, answer, answerText, cands, ... })`; jawaban dinilai dari **teks**).
- **Kesulitan / kecepatan / jumlah soal:** `TUNE` di `js/levels.js` (nilai per kesulitan: durasi tempuh, gelombang, jeda, retreat).
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

### UI kit tunggal

Semua layar (judul, pengaturan, cara main, cerita, menu, pilih step, pembuka step, hasil, konfirmasi) dibangun dari **satu UI kit**; popup Jeda tetap desain Figma (`css/pause.css`) dengan warna selaras.

- `js/ui/kit.js`: komponen yang menghasilkan HTML — `Kit.panel` (papan kayu + perkamen, paku emas, kepala naga ORIGINAL yang mengintip), `button` (hijau utama / oranye sekunder / merah bahaya / kayu; mengilap, tebal, beroutline; keadaan tekan & nonaktif), `badge`, `chip`, `toggle`, `segmented`, `progress` (api/energi), `card` (kategori berwarna & step), `stars`, `eggs`, `resbar` (bilah sumber daya berikon), `tip` (tooltip), plus `toast`, `confirm` (modal), `coach` (coachmark ≤ 6 kata, hanya pertama kali). Ikon di `js/ui/icons.js` (satu gaya SVG).
- `css/kit.css` (komponen), `css/base.css` (reset, lapisan layar, hitung mundur). Token warna/tekstur: `Theme.ui` (`js/theme.js`) → CSS variables (`js/ui/skin.js`); tekstur prosedural kayu/batu/perkamen dari `js/render/textures.js`. Bevel/bayangan sama di semua elemen. Target sentuh ≥ 44 px, fokus keyboard terlihat, `prefers-reduced-motion` dihormati.
- **Kebijakan teks** (`js/strings.js`): semua teks UI di satu tempat (`GA.T('kunci')`); label ≤ 2 kata, keterangan ≤ ~5 kata; "Cara Main" = 3 kartu bergambar; cerita 4 panel satu kalimat. Lint: tes "teks UI ringkas" di `?test=1` atau `powershell -File tools/lint-strings.ps1`.
- Cara menambah layar: bangun HTML dengan `GA.Kit.*`, daftarkan lewat `UI.addScreen(nama, node)`, tombol memakai `data-act` yang ditangani `UI.act`/`Menu.act`.

## UI & tema visual

- **Token desain** di `Theme.ui` (js/theme.js): material kayu, emas, perkamen, batu, api, warna status, radius. `js/ui/skin.js` menerjemahkannya menjadi CSS variables (`--wood-*`, `--gold-*`, `--parch-*`, `--stone-*`, `--r-*`, `--font-*`) dan tekstur material prosedural (`--tex-wood`, `--tex-stone`, `--tex-parch`). HUD canvas memakai token yang sama, jadi mengubah `Theme.ui` mengubah seluruh UI. Opsi aset gambar: letakkan `assets/ui/wood.webp`, `stone.webp`, `parchment.webp` untuk menggantikan tekstur prosedural.
- **Font**: judul `Cinzel Decorative` dan UI `Baloo 2` dimuat dari Google Fonts (`display=swap`); bila gagal dimuat, tumpukan cadangan (Palatino/Georgia dan Trebuchet/sistem) dipakai. Angka di bola tidak bergantung pada font eksternal untuk sprite.
- `js/ui/icons.js`: ikon SVG inline (garis 2,3 bulat) untuk tombol, kategori, dan status. `js/ui/hud.js`: HUD canvas (bingkai kayu bertrim emas di-cache; plakat skor odometer, plakat step permata, plakat soal perkamen dengan animasi ganti soal, bilah progres api, telur bercahaya, tombol Jeda).
- Popup melayang bergaya `FX.pop(x, y, teks, 'score|combo|good|bad|info')`. Bunyi UI: ketuk (klik), denting (pilih), gema (kembali), fanfare kecil (konfirmasi) lewat Web Audio.

## Kualitas grafis & performa

- `js/quality.js`: tiga tingkat (**Tinggi / Sedang / Rendah**) dan mode **Otomatis** (Pengaturan → Grafik). Otomatis mengukur FPS saat bermain (bukan saat jeda/menu) dan menurunkan tingkat bila rata-rata di bawah ~50 FPS selama dua jendela 2 detik berturut-turut; ia hanya menurunkan, tidak menaikkan lagi. Pilihan disimpan di `localStorage`.
- Yang diatur: efek atmosfer (kabut, berkas cahaya, riak, cahaya obor/lava, burung, goyangan dedaunan, partikel portal), kepadatan partikel pendek, batas `devicePixelRatio`, dan lapisan menyala (retakan lava, rune). `?debug=1` menampilkan FPS dan tingkat aktif di pojok kiri bawah.
- Lapisan statis peta, sprite bola, dan bingkai HUD di-cache dan dibangun ulang hanya saat ukuran/orientasi/kualitas berubah (sekali, bisa terasa sebagai jeda singkat). Partikel memakai pool; tidak ada alokasi per frame di jalur panas.

## Aset gambar opsional

Gambar bawaan semuanya prosedural. Untuk memakai ilustrasi sendiri, daftarkan berkas di `assets/manifest.json` (sprite boss/rintangan/portal/sarang, latar peta per orientasi, tekstur UI). Lihat **`docs/ASSET_GUIDE.md`** untuk ukuran, format, arah cahaya, contoh deskripsi untuk generator gambar, dan daftar aset yang belum tersambung.

## Jalur & peta (js/maps/)

- `maps/paths.js`: **pustaka arketipe jalur** berbasis data. Tiap arketipe punya definisi LANDSCAPE dan PORTRAIT sendiri (titik kontrol ternormalisasi), posisi penembak/boss, dan opsional zona kecepatan. Step 1: `hook`, `serp3`, `s2`, `serp4`. Step 2: `zigzag`, `figure8` (persilangan dengan jembatan), `horseshoe`, `serp4w`. Step 3: `serp4`, `figure8`, `zigzag`, `serp3w`. Step 4: `horseshoe`, `serp4w`, `s2`, `serp3w`. Step 5: `dualU`, `dualW`, `dualC` (dua sarang). Jalur dan peta dipilih acak per petualangan (`Levels.pick`), disimpan di `adv.picks` supaya Ulangi memakai yang sama.
- Spline Catmull-Rom sentripetal, tabel panjang busur (`path.js`), jumlah bola mengikuti panjang jalur dan `BALL_RADIUS`.
- **Validator** (otomatis tiap jalur dibangun): jarak antar-segmen ≥ 2,5R + 8, radius tikungan ≥ 1,15R, jalur di dalam layar, ruang penembak/boss bebas, deteksi persilangan. Tikungan tajam dilunakkan otomatis.
- **Jembatan**: di persilangan, deck batu digambar di lapisan depan; bola di jalur bawah lewat di bawahnya, bola di jalur atas (`path.overWindows`) digambar setelahnya.
- **Mode debug** `index.html?debug=1`: menampilkan jalur (cyan), titik kontrol bernomor, pelanggaran jarak (merah), tikungan tajam (oranye), persilangan (hijau), zona kecepatan (magenta), ruang penembak/boss, titik portal, dan laporan validator.
- Peta (`GA.Maps`): `forest`, `grove` (Step 1); `volcano`, `crystal` (Step 2); `tower`, `tower2` (Step 3). Satu file data per tema berisi palet, jenis dasar (`moss|basalt|cave|flags`), komposisi dekorasi (`mix`), elemen depan (`front`: `leaf|stone|hall`), dan opsi efek. Untuk menambah peta: salin salah satu file, ubah palet/`mix`, lalu daftarkan idnya di `Levels` (`POOL`) dan `Theme.scenes`.
- Zona kecepatan: `zones` pada arketipe (mis. `serp3`) mempercepat rantai di bagian jalur tertentu.

## Bola sihir, bola api, portal, telur & sarang

- **Bola sihir (`js/render/balls.js`)**: obsidian gelap berurat energi (urat dari noise punggungan, warna per bola + ungu/hijau), retakan dan rune bercahaya. Permukaan dibangkitkan sekali per warna sebagai peta ekuirektangular lalu dirender sebagai bola SUNGGUHAN (proyeksi per piksel) menjadi **24 bingkai rotasi** (16 sedang, 12 rendah), di-cache dan dibuat malas, dipanaskan saat layar pembuka (`Balls.warm`). Bola menggelinding (sudut = jarak ÷ radius, sumbu tegak lurus arah jalur). Pencahayaan tetap (sisi gelap, pantulan lingkungan, rim light, spekular) di lapisan terpisah; asap tipis dari permukaan; jejak kabut gelap di belakang bola terakhir tiap kelompok. **8 motif rune berbeda** per warna (aman buta warna). Pecah = pecahan obsidian + asap + riak energi.
- **Angka** berada di segel gelap hampir opak: isi krem `#fff4d6`, outline gelap, pendar tipis; mendukung negatif, pecahan bersusun, desimal. Kontras diuji otomatis (≥ 4,5:1; terukur ±15:1 untuk bola sihir dan ±5:1 untuk bola api) dan bisa dilihat di **`?debug=orbs`** (semua warna × jenis angka × ukuran rantai/preview + bola api ×1–×3).
- **Bola api (`js/render/fire.js`)**: api berlapis (lidah turbulen, 8 bingkai, ekor, bara mengorbit, cahaya aditif) mengelilingi **cakram bara gelap** (arang menyala + retakan, tepi panas) di tengah; angka ×N hanya di atas cakram, tidak pernah di atas api terang. Preview bola berikutnya ada di **soket rune** di sisi naga (jangkauan jempol, digambar di atas naga), ukuran = 0,9 × bola siap tembak (`NEXT_BALL_SCALE`), jadi font ≥ 0,85 ×.
- **Portal (`js/render/effects.js`)**: tanah gosong dengan retakan bercahaya, bayangan cincin, tiga lapis pusaran + dua lapis fBm berlawanan arah, lorong kedalaman (cincin menyusut ke pusat), cincin rune MELAYANG (bayangan di tanah), efek lensa kromatik di tepi, busur petir, partikel tersedot/terlontar, denyut tiap bola keluar, buka/tutup. Lapisan berat dimatikan di kualitas rendah.
- **Telur & sarang (`js/render/eggs.js`)**: telur bersisik (relief sisik, bintik, urat, cahaya dalam, rim light) dengan 3 elemen (api/es/hutan) dan keadaan ok/terancam (bergetar, merah)/retak/kosong; pecah dengan pecahan cangkang saat hilang (`FX.eggBreak`). Sarang: bayangan kontak, cincin batu (lumut / basal / es / rune menurut tema), ranting, tulang, sisik, abu & bara; cahaya telur menyinari sarang. Telur HUD memakai sprite yang sama. Gambar sarang sendiri: `sprites.nest` di manifest.

## Naga top-down & burung

- **Naga (`js/dragon.js`)**: dilihat dari ATAS dan melayang. Badan bersisik dengan pelat punggung, kaki belakang bercakar, leher dan ekor bersegmen (simulasi pegas), dua sayap bertulang (lengan, pergelangan, empat jari, selaput bergerigi tembus cahaya dengan urat & tekstur kulit) yang mengepak berirama (pelan saat melayang, cepat saat menembak/bersorak, lesu saat sedih; foreshortening saat terangkat). **Kepala tampak atas**: moncong memanjang dengan lubang hidung di ujung, dua mata di sisi atas, tanduk & jumbai ke belakang; saat menyembur rongga mulut terbuka tampak gelap dengan gigi di tepi, lidah dan tenggorokan jingga; bola api muncul tepat di depan ujung moncong (`mouthDist`) dan digambar di atas kepala agar angka ×N terbaca. Animasi: napas, ekor bergoyang, kedip, recoil, mengaum (kombo), kaget (salah), sayap membentang (menang), lesu (kalah). **Bayangan terbang** di tanah (offset menurut ketinggian, 3 lapis lembut). Setiap ayunan turun: `Dragon.onFlap` (bunyi `flap`), hembusan debu/daun dari ujung sayap, dan denyut `Dragon.pulse` yang membuat telur di sarang bergetar sedikit. Footprint sayap dibatasi `Theme.dragon.wingSpan` (setengah bentang ≈ 1,85 × radius badan).
- **Burung (`js/render/birds.js`)**: tampak atas; sayap berbulu (bulu primer & sekunder bergerak, melipat, meluncur) atau selaput kelelawar; spesies per zona (gagak & elang di hutan, camar di rawa, kelelawar di gua & menara); kawanan longgar (boids: kohesi, keselarasan, pemisahan), goyangan angin, bayangan yang berubah menurut ketinggian, dan sesekali hinggap di tepi peta. Digambar DI BAWAH bola (tidak pernah menutupi bola/angka), tidak menerima input, dikurangi di kualitas rendah (mati) / sedang (satu kawanan).

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
