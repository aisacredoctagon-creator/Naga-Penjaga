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

**Halaman awal** (satu layar: kategori + kesulitan + **Mulai Main**) → cerita pembuka (sekali, bisa dilewati) → layar pembuka **Stage 1** (nama + ikon, **contoh soal bergambar**) →
hitung mundur 3-2-1 → stage → **overview jawaban** → **Lanjut** Stage 2 → **Lanjut** Stage 3 (final boss) → cerita akhir → hasil → kembali ke halaman awal.

Tidak ada pilihan stage: **Mulai Main selalu dari Stage 1** dan kategori + kesulitan terpilih berlaku untuk ketiga stage ("Campuran" mencampur semua kategori). Game Over → **Ulangi** (stage itu, telur 3/3) atau **Menu**.

### Aturan 20 soal (inti)

- Tiap step punya **tepat 20 soal**; tiap soal berpasangan dengan **satu bola sihir target** (total 20 bola target). Step selesai
  **hanya** setelah semua 20 soal dijawab benar. Progres ditampilkan sebagai ikon bola + angka (mis. `12/20`) di plakat soal.
- **Soal aktif** dipilih hanya dari bola target yang sudah muncul dan terlihat di jalur (utamakan yang garis tembaknya terbuka dan
  yang paling dekat sarang). **Jawaban tiap soal dalam satu step unik** (`Questions.deck`, rentang topik dilebarkan otomatis bila terlalu
  sempit). Bola pengecoh alami = jawaban soal-soal lain yang belum selesai.
- **Aliran bola (bukan gelombang):** semua bola step itu (20 target + bola khusus) keluar sebagai **satu aliran kontinu** dari portal, tanpa jeda
  antar-kelompok. Portal sudah terbuka sejak hitung mundur, jadi bola pertama keluar tepat saat permainan dimulai. Bola **rapat**: jarak pusat
  bersebelahan = 2 × radius × `BALL_SPACING_FACTOR` (0,98; diukur lurus pusat-ke-pusat, jadi tetap rapat di tikungan). Lihat "Gameplay rantai" di bawah.
- **Anti-macet:** (1) bila bola target lolos ke sarang, satu telur hilang, rantai mundur, tetapi **soalnya masuk antrean lagi** dan keluar dari
  portal — progres jawaban benar tidak hilang; (2) jika soal aktif terhalang > 2,4 dtk dan ada target lain yang terbuka, soal berganti;
  (3) jika semua target terhalang > 1 dtk, bola khusus penghalang lenyap dan rintangan zona menyingkir (
  tanpa kedipan); (4) peluru yang ditembakkan untuk soal sebelumnya (soal berganti saat melayang) tidak dihukum;
  (5) tembakan ditahan sejenak selama rantai masih bergeser menutup celah.
- **Bola khusus** (beku = rantai melambat, telur emas = +1 telur) tidak dihitung dalam 20 dan tidak pernah membuat stage mustahil; yang lolos ke sarang lenyap tanpa hukuman.

### Gameplay rantai (`js/config/gameplay.js`)

Semua angka kecepatan & kerapatan ada di satu berkas, dalam **diameter bola per detik** (bukan piksel), jadi terasa sama di portrait, landscape, dan
desktop. Tiga lapis: `DEFAULTS` → `PER_DIFF[mudah|sedang|sulit]` → `STAGE_SPEED_MULT[stage]` (Stage 3 = ×0,75 sejak revisi 8; sebelumnya ×0,5). `Gameplay.resolve(diff, step)` menghasilkan objek `run.gp` yang dibaca `Chain` setiap frame.

| Parameter | Arti | Nilai awal |
|---|---|---|
| `CHAIN_BASE_SPEED` | kecepatan normal kepala rantai (d/dtk) | 0,16 / 0,20 / 0,25 (mudah/sedang/sulit) |
| `CHAIN_ENTRY_SPEED_MULT`, `SPAWN_FILL_TIME`, `ENTRY_HEAD_FRAC` | **fase masuk**: rantai ngebut sampai kepala mencapai `ENTRY_HEAD_FRAC` jalur terlihat (atau semua bola sudah keluar); kecepatan = yang lebih besar antara DASAR × mult dan "bola fase masuk ÷ `SPAWN_FILL_TIME`" | 3× · 6 dtk · 0,25 |
| `ENTRY_EASE_TIME` | transisi halus ke kecepatan normal | 1 dtk |
| `CHAIN_PRESSURE_RAMP`, `PRESSURE_RAMP_TIME`, `PRESSURE_DROP` | tekanan: kecepatan naik pelan hingga +15% dalam 240 dtk; tiap jawaban benar beruntun (kombo ≥ 2) menurunkannya | 0,15 · 240 · 0,12 |
| `NEST_SLOW_DIAMS`, `NEST_SLOW_MULT` | dekat sarang rantai melambat (tidak pernah berhenti) | 7 d · ×0,7 |
| `BALL_SPACING_FACTOR` | jarak pusat bola bersebelahan = 2R × ini | 0,98 |
| `GAP_CLOSE_SPEED` | bagian belakang celah menyusul sekian d/dtk (celah 1 bola ±0,125 dtk; revisi 10: 7,5 → 8 karena U-turn berjari-jari 1,3R memperlambat penutupan celah ganda) | 8 |
| `INSERT_TIME` | bola disisipkan: tetangga bergeser halus selama ini (`Chain.insert`) | 0,12 dtk |
| `MAX_DT` | langkah waktu maksimum (tab di-resume tidak membuat bola melompat) | 0,05 dtk |

Cara kerja rantai (`js/chain.js`): posisi tiap bola = jarak busur `d`; solver pembatas jarak berjalan tiap frame (bola ke-i tidak boleh melewati bola di depannya dikurangi jarak sentuh; jarak sentuh diukur **lurus** pusat-ke-pusat, sehingga di tikungan busur sedikit lebih panjang dan bola tetap menempel). Bola yang tertinggal menyusul dengan `GAP_CLOSE_SPEED`; bagian depan celah tetap berjalan normal. Seluruh pengali kecepatan (beku, arus, tekanan, sarang, fase boss) berlaku untuk **seluruh rantai**, bukan per bola. Animasi bola keluar portal berbasis waktu (`EMERGE_ANIM_TIME`) dan tidak memperlambat arus.

**Mengapa tidak semua 25 bola keluar dalam 6 detik:** rantai 25 bola panjangnya ±25 diameter, sedangkan jalur hanya 11–43 diameter. Bila semua keluar sekaligus, kepala rantai langsung berada 60–90% jalur (pada jalur pendek bahkan melewati sarang). Karena itu fase masuk berhenti saat kepala mencapai `ENTRY_HEAD_FRAC`; sisa bola tetap satu aliran rapat tanpa jeda tetapi keluar mengikuti kecepatan normal. Ingin lebih banyak bola di awal? Naikkan `ENTRY_HEAD_FRAC` (0,35–0,5).

**Panel penyetelan `?debug=tune`** (tidak tampil ke pemain biasa): slider semua parameter di atas, berlaku langsung pada step yang berjalan; **Salin nilai** (JSON: nilai yang diubah + nilai efektif), **Reset**, **Ulangi step**, dan angka hidup (fase, kecepatan d/dtk, bola keluar, kepala %, waktu isi, rasio jarak min/maks, jumlah celah). Nilai disimpan di localStorage hanya saat `?debug=tune`. Contoh: `index.html?debug=tune&unlock=1&go=1&diff=sedang` (langsung mulai Step 1).
Flag lain (boleh digabung, mis. `?debug=tune,chain`): `chain` = overlay garis hijau/merah/oranye antar-bola (merah = celah > 1,05 diameter); `sim` = simulasi kerapatan tanpa render.

**Simulasi kerapatan** (`js/dev/chainsim.js`, `?debug=sim`, juga bagian `?test=1`): semua arketipe jalur × 2 orientasi × 3 radius × 3 kesulitan × 45 dtk dengan pemain acak (hancur, sisip, mundur, dt bergetar + lonjakan 500 ms); jarak bola bersebelahan harus tetap 0,96–1,05 diameter kecuali celah sementara < 400 ms; juga uji penutupan celah, penyisipan halus, fase masuk.

### Halaman awal (`js/ui/start.js`, gaya `css/start.css`)

Satu papan di atas **splash art statis** (tanpa adegan permainan, tanpa animasi): logo, chip **Rekor** (piala + angka), kartu **kategori**, **kesulitan**, tombol hijau **Mulai Main**, dan dua tombol sudut: **?** (Cara Main, 3 kartu bergambar) dan **gerigi** (Atur: suara, musik, grafik, cerita, hapus data).
- **8 kategori** (daftar di `js/config/categories.js`): Penjumlahan, Pengurangan, Perkalian, Pembagian, Bilangan Bulat, Pecahan, Desimal, Campuran; tiap kartu = ikon, nama, satu contoh soal kecil; yang terpilih berbingkai emas + ikon centang. **Kesulitan:** Mudah / Sedang / Sulit (rentang angka, kerumitan soal, kecepatan rantai, kerapatan rintangan).
- Kategori + kesulitan terakhir tersimpan dan otomatis terpilih lagi; pertama kali **Penjumlahan + Sedang** (`DEFAULT_CAT`/`DEFAULT_DIFF` di `config/categories.js`). Selalu ada pilihan aktif.
- Papan ketik: panah memindah pilihan (radiogroup ARIA), Enter/Spasi memilih, Enter pada Mulai Main memulai, Esc menutup dialog. Mobile potret: kartu 2 × 4 + tombol Mulai di bawah (hanya area kartu yang bisa digulir); lanskap pendek: dua kolom tanpa gulir; desktop: papan ≤ 960 px.
- **Rekor** = skor tertinggi satu petualangan (global, `Storage.highScore`); naik di akhir permainan (menang Stage 3 atau Game Over) dan "**Rekor baru!**" tampil di layar hasil / overview Game Over. Telur dan bintang tidak lagi ditampilkan di menu (telur 3/3 tetap di HUD, bintang per stage tetap di layar hasil).

### Memuat malas (`js/boot.js`)

Halaman awal hanya memuat HTML, CSS inti (`base`, `kit`, `start`), UI kit, strings, theme token, storage, dan `ui/start.js` (±76 KB JS). **Mesin game** (render, entitas, peta, tekstur prosedural, audio sintesis, soal, HUD, popup Jeda + `css/pause.css`) diunduh dan dijalankan baru saat **Mulai Main**
(daftar urutan di `ENGINE`, `js/boot.js`): layar pemuatan statis dengan bar progres, inisialisasi berat dipecah per bagian (`GA.Game.boot`, jeda `setTimeout` antar-bagian), AudioContext dibuat pada ketukan itu, musik baru mulai bersama permainan.
Pra-muat senyap (`<link rel=prefetch>`) hanya setelah interaksi pertama dan saat idle; **dilewati** bila Save-Data, koneksi 2G, atau `prefers-reduced-motion`. Kembali ke halaman awal (Menu / Game Over / hasil akhir) **membongkar mesin** (`GA.Game.destroy`): loop rAF dihentikan, canvas dan semua listener dilepas, UI permainan dan AudioContext ditutup; "Mulai Main" berikutnya memakai skrip yang sudah ada di cache.
Alat dev (`?test=1`, `?debug=…`, `?resp=1`) memuat mesin lebih dulu dan mempertahankannya (`GA.keepEngine`).

### Splash art

Latar halaman awal = gambar statis `assets/splash/splash-landscape.webp` (1920×1080) dan `splash-portrait.webp` (1080×1920) lewat `<picture>`, ±80 KB masing-masing, gelap-terang sudah "dibakar" agar papan terbaca. Bila berkas hilang, `js/splash-art.js` menggambarnya sekali lewat Canvas sebagai cadangan.
Ganti dengan gambar sendiri: taruh berkas bernama sama (lihat contoh prompt di `docs/ASSET_GUIDE.md`); buat ulang aset bawaan lewat `index.html?debug=splash` → `await GA.SplashGen.run()`.

### Telur, bintang, kontrol

- **Telur = nyawa, selalu 3/3** (ikon di HUD). Telur di-refresh penuh di awal **setiap stage**, termasuk saat **Ulangi**. Telur berkurang karena: jawaban salah
  (`WRONG_ANSWERS_PER_EGG` = 2 di `js/config/gameplay.js`: dua jawaban salah = satu telur; diubah dari 1 di revisi 7 karena dengan akurasi pemain 90% satu telur per salah membatasi kemenangan ≈ 68%, lihat `docs/pacing-c.md`), bola sihir sampai ke sarang, atau terkena zona berbahaya. **Telur emas** memulihkan satu telur tetapi tidak pernah melebihi 3.
  0 telur = Game Over untuk stage itu. Hanya **satu portal, satu rantai, satu sarang** di semua stage.
- Bintang (`STAR_3_PCT` 90%, `STAR_2_PCT` 70%): menurut persentase soal yang dijawab **benar pada percobaan pertama**; 1 bintang bila stage selesai.
- Pecahan **bersusun**; jawaban pecahan harus **bentuk paling sederhana** (1/2 ≠ 2/4), desimal memakai **koma**, tanda negatif "−".
- Kontrol (revisi 8, **target-lock + lontaran**): arahkan mouse ke sebuah bola jawaban lalu klik; sentuh = seret (titik bidik 56 px di atas jari agar tidak tertutup) lalu lepas; tidak ada aksi hanya-hover. Bola terdekat dalam 1,0R (mouse) / 1,25R (sentuh, papan ketik) dari titik bidik terkunci (cincin kecil di atas bola, bola sedikit menggembung; merah bila terhalang rintangan tinggi). Tanpa bola dalam radius: bola api terbang ke titik itu lalu padam tanpa hukuman. Tidak ada bola api yang diam di samping naga (revisi 10: bola siap-tembak di mulut, soket "bola berikutnya", tukar-bola dengan ketuk naga/Q dihapus karena sasaran ditentukan target-lock, bukan angka bola api): bola api hanya muncul sebagai nyala singkat di mulut saat menembak dan bola yang melesat. Papan ketik ← → membidik, ↑ ↓ (W/S) mengubah jarak titik bidik, Spasi menembak, P/Esc jeda.
- **Bola api bersih**: tidak ada label angka dan tidak ada pengali skor acak (revisi 10: tingkat panas ×1–×3 hanya hiasan dan tidak memengaruhi skor, jadi dihapus bersama bola siap-tembak).

### Tiga stage (data di `js/levels.js`)

| Stage | Tema (peta di `js/maps/`) | Format soal | Rintangan zona (kumulatif, maks. serentak) | Bola khusus | Penukaran bola |
|------|---------------------------|-------------|--------------------------------------------|-------------|----------------|
| 1 | Lembah Hutan Naga: `forest`, `grove`, `bloom` | **hitung hasil** `a op b = ▢` | semak berduri, teratai (2 jenis, maks. 2) | — | — |
| 2 | Gunung Api / Gua Kristal: `volcano`, `ashfield`, `magma`, `crystal`, `iceCave`, `amethyst` | **angka hilang** `▢ op b = c` / `a op ▢ = c` | + lahar menyembur, batu panas jatuh (4 jenis, maks. 3) | beku, emas | kelelawar, tiap 20–30 dtk |
| 3 | Menara Penyihir (**FINAL BOSS**): `tower`, `tower2`, `library` | **gabungan** (≈ separuh-separuh, maks. 3 berturut-turut sama) | + ombak, kristal, stalaktit, petir rune, tangan bayangan, jamur spora + serangan boss (maks. 4) | beku ×2, emas | penyihir, tiap 12–20 dtk (dua pasangan di fase 2 boss) |

Kurva kesulitan dipetakan dari versi lima step: Stage 1 = step lama 1, Stage 2 = step 3, Stage 3 = step 5 (kecepatan rantai `STAGE_SPEED_MULT`, kerapatan, jumlah rintangan). Dihapus: Step 4/5 lama, peta rawa, dua sarang/dua portal, buff & nerf, bola kutukan, rintangan Akar ("cacing"), rintangan statis (`obstacles.js`), toast/teks melayang di peta.

### Format soal (`js/questions.js`)

Bentuk soal ditentukan stage, operasinya mengikuti kategori. Semua 20 soal dibangkitkan **sekali** di awal stage (PRNG ber-seed, jawaban unik; bila bentrok dibangkitkan ulang, lalu soal cadangan yang aman).
- **Hitung hasil**: `2 + 1 = ▢`, jawaban = hasil. **Angka hilang**: `▢ + 3 = 18`; jawaban = angka yang hilang; solusi selalu terdefinisi (tanpa pembagian nol, pembagian dengan operan hilang menghasilkan nilai pas, pecahan hilang paling sederhana, negatif ber-kurung, desimal ≤ 2 angka; soal desimal berpembulatan dilewati). Pengecoh memuat kesalahan umum (mis. `21` untuk `▢ + 3 = 18`) selain jawaban soal lain.
- `▢` digambar sebagai **kotak kosong bergaris putus yang berkedip halus** (`MathText`, canvas dan HTML `.mblank`). Contoh soal di layar pembuka stage dan kartu "Cara Main" mengikuti tiga format ini.

### Rintangan zona (`js/hazards.js`)

Semua **sementara** dan diberi **peringatan ±1 detik** (lingkaran bergaris berdenyut + tanda seru) sebelum aktif; tidak ada yang permanen.
Mekanik (revisi 8: bola api **dilontarkan** di atas rantai, jadi hanya rintangan **tinggi** yang menghalangi garis naga → target): **reflect** (kristal: lontaran diserap tanpa hukuman), **strike** (lahar, batu panas, stalaktit, petir rune lajur: lontaran hancur saat aktif, telur hilang) — keduanya tinggi; **slow** (semak berduri), **deflect** (ombak), teratai = rendah, hanya hiasan sementara bagi lontaran; **veil** (spora menyamarkan angka bola, kecuali soal aktif), **blind** (tangan bayangan menutup garis bidik).
Aturan keadilan (diuji otomatis): busur bidik tertutup ≤ 30%; tidak muncul di alur / lintasan mulut / menimpa rintangan lain; sebelum muncul diuji masih ada bola target dengan garis tembak terbuka DAN bola jawaban soal aktif tetap terbuka; bila semua target terhalang > 1 detik, rintangan menyingkir. Penempatan (revisi 8 tahap e, revisi 10): ruang bebas di sekitar naga dan di kantong kosong peta (di luar zona bersih portal/sarang, sprite + 2R: tidak ada rintangan di sana), jadi radius rintangan menyesuaikan ruang (≥ 60% radius dasar; rintangan rendah ≥ 50%) dan petir rune berupa lajur lurus sepanjang ruang bebas (`docs/rev8-e-hazards-pacing.md`). Jenis dan jeda muncul: `HAZ_TIERS`/`HAZ_BASE` di `js/levels.js`; jumlah serentak: `Gameplay.HAZ_MAX = [2, 3, 4]`.
Menambah jenis: tambahkan ke `KINDS` (hazards.js: mekanik, radius, waktu peringatan/aktif), gambar di `drawBody`, lalu ke `HAZ_TIERS`.
*(Penempatan berbasis jangkar/poligon area tembak diganti penempatan adaptif terhadap jarak ke jalur; validator realtime = `targetsOpen` + `blocksLine`.)*

### Penukaran bola (`js/swap.js`)

Dua bola jawaban bertukar **tempat** (hanya posisi; soal aktif, teks, warna tidak berubah; rantai tetap rapat). Satu modul untuk semua sumber: kelelawar (Stage 2), penyihir (Stage 3, tongkat menyala), dan penukar anti-macet. **Tidak mendadak:** dari peringatan sampai mulai menukar `SWAP_TELEGRAPH_MS` (default **2500 ms**, dijepit ≥ 2000) dalam tiga fase:
1. **Peringatan** (0,8 dtk, `SWAP_WARN_MS`): ikon ⇄ + teks di zona informasi HUD, SFX peringatan, pelaku mulai beraksi, cincin putus-putus samar di kedua bola.
2. **Sorot** (±1,7 dtk): cincin kontras berdenyut di kedua bola, lencana ⇄ melayang di atas tiap bola dengan cincin hitung mundur yang mengisi, busur energi putus-putus, SFX naik nada. Menempel pada bola (mengikuti rantai), berukuran menurut radius bola, bentuk ikon wajib ada (bukan hanya warna), digambar di lapisan 7 (tidak pernah tertutup). `prefers-reduced-motion`: cincin statis, jeda tetap sama.
3. **Tukar** (`SWAP_ANIM` 0,5 dtk): gerak melengkung (satu di atas, satu di bawah jalur; lengkung ke atas ditahan di bawah zona HUD, `GA.view.minY`) tanpa celah; sesudahnya cincin memudar 1 dtk (`SWAP_AFTER`) di posisi **baru**.

Aturan: tidak ada penukaran terjadwal dalam 4 dtk pertama stage atau 3 dtk setelah soal aktif berganti; eksekusi ditahan selama peluru terbang; bola hancur/terjawab/hilang selama telegraf membatalkan pasangan itu (efek kecil); jeda membekukan hitung mundur; rotasi layar tidak mengulang/memotong hitung mundur (pasangan batal bila bolanya jatuh di belakang portal pada jalur baru); satu penukaran pada satu waktu, kecuali Stage 3 fase 2 (`SWAP_PAIRS_PHASE2` = 2: pasangan kedua magenta → oranye dengan ikon ⇅). Pasangan acak ber-seed di antara bola jawaban terlihat (jarak 2–9 di rantai, nilai berbeda, bukan pasangan sama berturut-turut; bukan bola yang baru keluar portal / 10% terakhir jalur, `SWAP_END_GUARD`). Jeda antar-penukaran: `Gameplay.SWAP_EVERY = [null, [20, 30], [12, 20]]`. Rincian dan bukti: `docs/swap-e.md`.

### Zona informasi & umpan balik

HUD punya **zona informasi** tetap di bawah plakat soal (bagian HUD, bukan di atas peta; tinggi tetap sehingga tidak ada loncatan layout): kiri = kombo, tengah = pesan singkat, kanan = status (Lambat, Naga beku). Jawaban salah → ikon ✗ + soal dengan nilai yang baru ditembak ("20 + 3 ≠ 18", tanpa membocorkan jawaban), plakat berkedip merah, SFX; ~1,4 dtk lalu memudar. Rintangan, bola sampai sarang, waktu habis, coachmark, dan stage selesai juga di zona ini. Di peta hanya efek visual (percikan, telur retak, angka skor pendek). Di landscape zona berada di bawah plakat soal pada bilah HUD (bukan kolom samping, agar lebar arena tetap).

### Overview jawaban (`UI.showOverview`)

Setelah stage selesai (menang) maupun Game Over: telur tersisa, persentase benar-pertama-kali, bintang, dan **grid 20 chip bernomor** (5×4 portrait, 10×2 landscape/desktop): ✓ lingkaran (benar langsung), ✓ + titik kotak (benar setelah salah), strip putus (belum terjawab, hanya Game Over). Ketuk chip → kartu soal lengkap, jawaban benar, jumlah salah, nilai yang sempat salah ditembak (data dari `QuestionManager.stats`). Tombol: Ulangi, Lanjut (stage berikutnya; setelah Stage 3 → cerita akhir lalu ringkasan), Menu. Hasil terakhir tiap stage tersimpan dan dapat dibuka dari kartu stage di Pilih Stage.

### Jalur & peta

- Arketipe jalur (revisi 10: rute grid menggantikan spiral revisi 8) di `js/maps/paths.js`: Stage 1 `ular1-3`, Stage 2 `teluk1-3`, Stage 3 `benteng1-3`; tiap varian punya rute potret dan lanskap/desktop (rute asli atau dicermin). Tiap stage memilih acak satu varian per petualangan (disimpan agar "Ulangi" memakai yang sama). Lihat "Tata letak" di bawah.
- Menambah peta: salin satu entri di `js/maps/variants.js`, daftarkan di `Levels.STAGES[n].pool`, `Levels.ZONE`, dan alias warna di `js/theme.js`.

### Final boss (`js/boss.js` + rig `js/render/wizard.js`)

Darah **proporsional**: 20 soal = 20 HP, tiap jawaban benar −1. `Gameplay.BOSS_HP_BARS` (1 atau 2, bawaan 2): **2 bar** → bar 1 habis di soal ke-10 dan memicu **fase 2** (sinematik singkat yang bisa dilewati; pola terberat = gabungan fase 2+3 lama: mantra lebih sering, rintangan zona, soal berbatas waktu dengan TIMEOUT yang sah; penukaran dua pasangan); **1 bar** → satu bar, pola meningkat bertahap tanpa sinematik. Jawaban salah → boss menyerang (telur berkurang). Bar darah tebal dan jelas di dekat boss. Penyihir = sprite berlapis datar (jubah, lengan, kepala 5 ekspresi, tongkat berkristal): melayang, kilat putih saat terkena, ganti sprite + kilat ungu saat merapal, cincin amarah saat pergantian fase, dan **memudar** saat kalah (tanpa simulasi kain/IK). Mengganti dengan sprite: `Theme.sprites.boss`.

### Tata letak: naga di tengah, lapisan render, penukaran, posisi bola

**Urutan lapisan (tetap, bawah → atas):** 1 latar, 2 alur jalur, 3 dekorasi/objek depan (`Scenery.drawFront`, dijauhkan ≥ 3,2R dari garis tengah jalur; dekorasi ≥ 2,2R), 4 dasar/glow portal, 5 **bola** (alpha selalu 1), 6 bola api + efek tembakan, 7 overlay penukaran, 8 HUD/popup. Tidak ada kerucut cahaya, vignette, kabut, atau objek depan di atas bola; garis bidik putus-putus digambar di bawah bola. Vignette ada di lapisan dasar. `?debug=layers` menandai merah bola yang bertumpang tindih (HUD = 1,5R potret / 1,0R lanskap di bawah panel, objek depan, sarang, boss, naga, rintangan) dan menggambar garis zona cadangan HUD; uji geometri di `?test=1` memeriksa semua jalur × 3 ukuran layar.

**Naga di tengah, portal dan sarang di sisi yang saling berseberangan** (revisi 10; `js/maps/paths.js`: `TPL` = data rute, `routeGeom`, `routeArch`, validator `routeChecks`): naga/platform tetap tepat di tengah area bermain. Jalur = rangkaian simpul pada grid persegi panjang berpusat di naga; simpul pertama = **portal**, simpul terakhir = **sarang**; tikungan 90° berfilet (U-turn = setengah lingkaran). Jarak baris = yang terbesar yang muat di area bermain (maks. 3,3R, minimum 2,6R; bila radius bola bukan 32, jarak diperkecil bertahap sampai INV-6/7 terpenuhi, dan tiap varian punya rute cadangan yang lebih ringkas untuk bola 1,12× pada kategori pecahan/desimal). Panjang 24–29 diameter (sama dengan revisi 8). Di layar kecil (bola dasar >= 33, mis. 360×640) dengan kategori berbola besar, `stageR` (main.js) mengecilkan radius stage bertahap (tidak di bawah bola dasar) sampai rute valid. Arketipe: Stage 1 `ular1-3` (serpentin di kantong sisi naga), Stage 2 `teluk1-3` (kait panjang di atas/bawah naga), Stage 3 `benteng1-3` (jalur lebih ringkas, ruang lapang untuk boss yang dicari otomatis oleh `bossSpot`); tiap rute dipakai asli dan dicerminkan sumbu x/y. Potret memakai tinggi layar (portal dan sarang di ujung atas dan bawah), lanskap/desktop memakai lebar (kiri-kanan atau diagonal). Rute dicari offline oleh `js/dev/routesearch.js` (`?debug=route`: `GA.RouteSearch.search / evalRoute / sheet`) lalu divalidasi dengan validator asli. Tidak ada bola yang tak bisa dipilih: karena bola target dipilih langsung (target-lock) dan peluru dilontarkan, jalur tidak perlu "terlihat" lurus dari naga. Sprite portal/sarang, label SARANG, boss, dan bar darah boss dipasang dari data jalur; ilustrasi latar tidak boleh menanam portal/sarang (`docs/ASSET_GUIDE.md`).

**Invarian jalur (divalidasi tiap jalur dibangun, `analyzeStar` + `routeChecks`; `?debug=1` menampilkannya):**
- **INV-1** (satu lap, tiga sinar per posisi bola) hanya untuk jalur satu-lap lama; tidak dipakai (target-lock).
- **INV-2:** naga di tengah area bermain; jarak jalur ke naga ≥ jangkauan sayap (`wingNeed`); pusat bola ≥ (celah HUD + 1)R di bawah panel HUD (`L.hudGap`: 1,5 potret, 1,0 lanskap); portal (radius sprite 2,45R) dan sarang (≈ 2,3R) penuh di area bermain.
- **INV-3:** jarak antar-segmen jalur ≥ 2,6R − 0,5; radius lengkung minimum ≥ 1,15R (U-turn rute = 1,3R).
- **INV-4 (panjang):** panjang jalur ≥ 95% dari yang **lebih panjang** antara panjang revisi 8 (`REV8_LEN`: potret 29,4 / 25,3 / 24,6 d, lanskap 29,3 / 29,4 / 25,1 d) dan serpentin lama terpendek (`OLD_MIN`, commit `ddd3183`); hanya diperiksa bila R ≈ 32 (bola 1,12× lebih pendek dalam diameter; dilaporkan, bukan kegagalan).
- **INV-5 (kunci target):** dua bola yang bukan tetangga rantai dipisah ≥ 2,6R dan busur ≥ 4R, sehingga radius kunci 1,0R tidak pernah ambigu.
- **INV-6 (portal dan sarang berjauhan):** jarak pusat portal–sarang ≥ 0,55 × sisi terpanjang area bermain (area bermain = kanvas dikurangi HUD + zona informasi) DAN selisih sudut keduanya terhadap pivot naga ≥ 150°.
- **INV-7 (jalur tidak berbalik mendekat):** titik jalur yang berjarak busur > 8 diameter (16R) dari ujung awal ≥ radius sprite portal + 3R dari pusat portal; titik yang berjarak busur > 8 diameter dari ujung akhir ≥ radius sprite sarang + 3R dari pusat sarang.
- **INV-8 (zona bersih):** dalam radius sprite + 2R dari portal dan sarang tidak ada naga, sayap, boss, dekorasi dasar, objek depan, rintangan zona, atau label lain; label SARANG melekat pada sprite sarang di sisi paling lapang dan tidak menutupi bola mana pun (jarak persegi label ke jalur ≥ R); bar darah boss digeser bila menimpa sprite.
- Uji `?test=1` (`testInvariants`): 9 arketipe × 3 ukuran layar (390×844, 844×390, 1440×900) untuk INV-2..8; `testPaths` memeriksa radius R = 26, 29, 32, 34,56, 35,84, 36; `testClearZones` (`?test=1&only=zones`) memeriksa INV-8 untuk dekorasi, objek depan, label, dan bar boss; `testHazardPlacement` memeriksa rintangan. Overlay `?debug=1` menggambar jalur, simpul grid, zona INV-7 (putus-putus) dan INV-8 (titik-titik), garis dan angka jarak portal–sarang, dan laporan INV-4..8 (pelanggaran = bola merah); `?debug=pathprev` (`js/dev/pathprev.js`) membuat lembar pratinjau dan tabel panjang + jarak portal–sarang; `?test=1&only=paths` hanya menguji jalur; `docs/rev10-a-audit.md`, `rev10-c-checkpoint.md`, `rev10-laporan.md` berisi audit, tabel panjang lama vs baru, dan hasil bot.



**Indikator penukaran:** lihat bagian "Penukaran bola" di atas (telegraf 2,5 dtk).

**Posisi bola jawaban** (`QM.arrange`, `js/qmanager.js`; konstanta `SHUFFLE_*` dan `STAGE_SHUFFLE` di `js/config/gameplay.js`): urutan antrean soal tidak berubah; urutan keluar bola jawaban dari portal diundi ber-seed (gaya Fisher-Yates, undian tanpa pengembalian) ke SELURUH rantai per stage per percobaan (urutan baru tiap Ulangi, layout sama). Jawaban soal pertama = bola pertama yang keluar (terlihat begitu hitung mundur selesai); jawaban soal ke-k hanya diundi di antara bola yang sudah keluar saat soal itu aktif (model keluarnya bola diukur dengan bot, per stage); tiap soal diundi ke sepertiga rantai (depan/tengah/ekor) menurut sasaran seimbang; maks 2 jawaban berurutan bertetangga. Penjaga runtime: bila bola jawaban soal yang baru aktif berada di 12% terakhir jalur, rantai melambat ±3 dtk tanpa menandai bola (0 kejadian dalam 54.000 aktivasi bot). Jawaban benar tidak pernah disorot. Hasil di mesin asli (bot, 300 putaran × 9 sel): tiap sepertiga 24,8–41,9% di antara bola jawaban yang ada; rincian dan catatan metrik di `docs/shuffle-d.md`. `lineBlocker` (`js/main.js`) kini hanya memeriksa rintangan tinggi pada garis naga → target (lontaran melewati bola lain).

**Kecepatan permainan (bot):** `js/dev/pacing.js` (`?debug=pace`, `GA.Pace.play/run`): pemain buatan (jawab ~N(6, 2) dtk, akurasi 90%, PRNG ber-seed) pada mesin asli tanpa render; Bot memakai API target-lock (`aimAtBall` + `openLine`) dan memiliki diagnostik `diag` / `hazLog`. Revisi 8: Sedang menang 86–92% di 3 layar × 3 stage (200 seed); satu-satunya perubahan konfigurasi `STAGE_SPEED_MULT[2]` 0,5 → 0,75 (`docs/rev8-e-hazards-pacing.md`; sebelumnya `docs/pacing-c.md`, `WRONG_ANSWERS_PER_EGG` 1 → 2). **Revisi 10** (rute grid; Sedang; sebelum 300 seed → sesudah 1000 seed): potret 87,3/88,7/92,0 → 88,9/88,8/88,7, lanskap 90,7/91,0/86,3 → 88,9/89,3/88,8, desktop 91,0/88,3/85,0 → 89,5/89,1/88,6 (Stage 1/2/3). Penyetelan: `STAGE_SPEED_MULT_LANDSCAPE[2]` = 0,55 (Stage 3 lanskap/desktop; potret tetap 0,75; sebelum penyetelan lanskap/desktop Stage 3 = 92,7%). `GAP_CLOSE_SPEED` 7,5 → 8. Detail: `docs/rev10-laporan.md`.

**Alat debug dan uji (revisi 7):**
| Parameter URL | Fungsi |
|---|---|
| `?debug=1` | overlay jalur: sinar INV-1, bola tertutup merah, ruang naga/boss, laporan validator |
| `?debug=sim` | simulasi kerapatan rantai + penukaran + soal aktif tanpa render (`GA.Sim`, `GA.QSim`) |
| `?debug=swap` | tombol "⇄ Tukar" atau tombol X memicu telegraf penukaran sekarang (melewati penjaga waktu) |
| `?debug=pace` | bot kecepatan (`GA.Pace`); `GA.Pace.newStat()` mengukur posisi jawaban soal aktif |
| `?debug=layers` | tanda merah bola yang tertimpa (HUD, objek depan, sarang, boss, naga, rintangan) |
| `?debug=aim` | uji target-lock + lontaran (INV-5 empiris, durasi ≈ 0,4 dtk, hanya target terkena, tembakan kosong, rintangan tinggi/rendah, mouse + sentuh) |
| `?debug=pathprev` | lembar pratinjau jalur + tabel panjang (`GA.PathPrev.sheet / table`) |
| `?test=1` | seluruh suite (±3,5 mnt, `GA.Tests.results`); `?test=1&only=swap` hanya telegraf penukaran; `?test=1&only=paths` hanya jalur |
| `?resp=1` | `await GA.Resp.check()` memeriksa tiap layar pada viewport sekarang |

### Soal aktif (`js/qmanager.js`)


**Soal aktif tidak boleh berubah sampai dijawab benar.** Satu sumber kebenaran: `run.qm` (`GA.QM.Manager`).

- 20 soal dibangkitkan **sekali** per step memakai PRNG ber-seed (seed = petualangan × step × percobaan; `Questions.deck(topics, n, rng)`) lalu diurutkan di awal. Soal berupa objek **beku** (`id`, `text`, `answer`, `answerText`, `distractors`, `hint`, `explain`, …); modul lain hanya membaca (`run.q`, `run.qid`, `run.qSerial` hanya-baca).
- Soal aktif = elemen terdepan antrean yang belum selesai (PENDING → ACTIVE → SOLVED), **bukan** hasil pencarian dari bola yang terlihat. Bola dikeluarkan dari portal menurut urutan soal yang **diacak ber-seed dalam blok kecil** (4 soal), jadi bola jawaban aktif tidak selalu yang terdepan tetapi paling banyak 3 bola lain keluar lebih dulu; bola target sebuah soal adalah bola ber-`qid` sama (penukaran bola memindahkan bola beserta qid-nya; soal aktif tidak berubah).
- Perubahan hanya lewat `qm.advance(reason)` dengan enum tertutup `GA.QM.REASONS`. **Pemicu sah (satu-satunya):**
  - `STEP_START` / `STEP_RESTART`: step dimulai / diulang (QuestionManager baru, seed baru).
  - `ANSWERED_CORRECT`: bola jawaban yang benar tertembak.
  - `TIMEOUT`: hanya fase 3 boss (soal berbatas waktu). Bilah waktu di plakat; saat habis ada efek merah + SFX ±0,55 dtk, lalu soal pindah ke **ujung antrean** (tidak dihitung terjawab) dan ikon jam muncul.
  - `LOST_TARGET`: cadangan (soal pindah ke ujung antrean); tidak dipakai saat ini karena bola yang hilang selalu dimunculkan lagi.
- **Tidak mengubah soal:** jawaban salah (telur berkurang, soal tetap), bola target bergerak / di belakang portal / terhalang, rintangan, kabut, penukaran bola, resize, rotasi, jeda/lanjut, blur/tab tersembunyi, ganti kualitas, penukaran peluru, snapshot/restore.
- **Bola target dicuri ke sarang / hilang:** soal tetap. Bola yang sama masuk antrean dan diselipkan tepat di batas portal setelah rantai berhenti bergeser (`surfaceTarget`), muncul bercahaya dengan cincin berulang. Bila target terhalang bola khusus/rintangan > 1 dtk, penghalang menyingkir; bila terhalang bola angka lain > 2,4 dtk, angkanya ditukar (animasi balik) sehingga bola jawaban pindah ke depan.
- **Terlihat:** soal lama memudar dengan centang, soal baru masuk ±0,38 dtk + SFX tick; TIMEOUT/LOST_TARGET menampilkan ikon alasan.
- **Guard:** menimpa `run.q`/`run.qid` di luar `advance()` dicatat di `qm.violations` dan **melempar Error** pada mode ketat (`?test=1`, `?debug=question`, `?debug=sim`).
- `qm.snapshot()` / `restore()` memulihkan seed + antrean + soal selesai (soal & urutan identik). Game belum menyimpan progres di tengah step ke localStorage, jadi muat ulang memulai step dari awal.

Alat bantu (hanya dimuat dengan parameter URL):
- `?debug=question`: overlay soal aktif (id, status, bola target, antrean, jumlah pelanggaran) + **log perubahan soal** (waktu, alasan, lama → baru); juga `console.info`.
- `?debug=sim`: `js/dev/qsim.js` menjalankan simulasi tanpa render (hasil di layar + `GA.QSim.results`): idle penuh, peluru salah (umpan balik di zona informasi), bola dicuri, penukaran bola, overview jawaban, semua 3 stage, resize/rotasi (390×844 / 844×390 / 1440×900), jeda/blur, ganti kualitas, TIMEOUT boss, seed/snapshot/guard, dan keterbacaan plakat. Juga dijalankan oleh `?test=1`.

### Audio (`js/audio.js`)


Semua suara disintesis dari kode (tanpa berkas): rantai sumber → pan → bus (efek / ambient) → master → kompresor, dengan gema sintetis untuk suara bernuansa ruang.

- **Efek:** UI, semburan api (desis menyapu), pecah kaca bola sihir, telur pecah + detak jantung saat tinggal satu telur, alarm sarang terancam, portal terbuka + bola keluar, tawa jahat boss, amarah, perisai, penukaran bola (`swapWarn` naik nada, `swapGo`, `fizzle`), sinematik, hancur jadi abu, dan lainnya.
- **Rintangan zona:** satu bunyi **peringatan per mekanik** (`hzw_*`) dan satu bunyi **aktif per jenis** (`hz_*`: semak, ombak, teratai, kristal, geyser, batu panas, stalaktit, petir rune, spora, tangan bayangan), dipan sesuai posisi di layar.
- **Ambient per zona** (`Audio.ambient(zona)`): lapisan angin/gemuruh + kejadian acak: hutan (burung, jangkrik), gunung api (gemuruh, retakan lahar), gua kristal (denting, tetes air), menara (angin, guntur, bisikan, lonceng). Tiap lapisan punya bus sendiri; dimatikan bersama tombol suara.
- **Musik per zona** (`Audio.music(zona)`): arpeggio + bass + pad, perkusi di zona keras; boss memakai `Audio.intensity(0..2)` sehingga lagu makin cepat dan padat tiap fase.
- Menambah suara: tambahkan fungsi ke `SOUNDS` lalu panggil `Audio.play('nama', arg, pan, wet)`. Uji `?test=1` memastikan semua suara berbunyi tanpa galat dan tiap jenis rintangan/zona punya suara.

### Uji otomatis


Buka `index.html?test=1` (lewat server lokal): `js/dev/tests.js` memeriksa dek 20 soal berjawaban unik untuk semua kategori × kesulitan, format soal (hasil / angka hilang / gabungan), zona informasi, aliran bola,
penyimpanan + migrasi simpanan lama, telur 3/3, anti-macet (bola lolos ke sarang), dan menjalankan **bot** yang menamatkan stage 1–3 (tanpa render) sambil memastikan 20/20 soal selesai,
selalu ada target terjangkau, dan durasi wajar. Hasil tampil di pojok layar dan di `GA.Tests.results`.
Juga diuji: arketipe jalur (semua radius, dua orientasi), rintangan zona, fase boss, sapu sudut bidik 0–360° termasuk ke portal (`?debug=aim`, `js/dev/aimsweep.js`), simulasi kerapatan + penukaran (`?debug=sim`), dan audio (semua suara berbunyi tanpa galat). Buka `index.html?resp=1` lalu jalankan `await GA.Resp.check()` di console untuk memeriksa tiap layar pada ukuran viewport saat ini (overflow, teks terpotong, popup jeda). `tools/lint-strings.ps1` memeriksa string UI maks. 5 kata.

## Struktur proyek

```
index.html          halaman tunggal
css/base.css + kit.css + start.css  dasar halaman + komponen UI kit + halaman awal   css/pause.css   popup Jeda (desain Figma; dimuat bersama mesin)
js/theme.js         token tema gelap (Theme.ui), ukuran bola, naga, latar tiap stage (satu-satunya tempat untuk ganti tampilan)
js/storage.js       localStorage v3 (pilihan kategori + kesulitan, rekor, pengaturan; data lama dibawa tapi diabaikan)
js/boot.js          pemuat malas: unduh + jalankan mesin saat Mulai Main, pra-muat senyap
js/ui/start.js      halaman awal      js/config/categories.js  kategori + pilihan awal      css/start.css  tata letak halaman awal
js/splash-art.js    splash art cadangan (Canvas, sekali)   assets/splash/  splash art statis (.webp)
js/audio.js         efek suara, ambient & musik per zona (Web Audio, tanpa berkas)
js/qmanager.js      QuestionManager: soal aktif, urutan, pemicu sah (lihat bagian Soal aktif)
js/fx.js            pool partikel (maks. 80) + cincin kilas (tanpa getar layar)   js/quality.js  saklar Efek Hidup/Mati
js/path.js          jalur (spline) & preset: arc, wave, hook, zigzag, ring, bossU; sarang & penanda
js/mathtext.js      teks matematika dengan pecahan bersusun (canvas & HTML)
js/chain.js         rantai bola sihir, bola khusus (beku, telur emas), kabut, tukar tempat (swapPositions)
js/dragon.js        Naga Penjaga: sprite berlapis (kepala/leher mengikuti bidikan, ekspresi, kepak sayap)
js/shooter.js       naga + bola api + peluru
js/questions.js     generator soal, kategori & tabel kesulitan
js/swap.js          penukaran bola: indikator ⇄, eksekusi melengkung, pasangan acak ber-seed, kelelawar
js/hazards.js       rintangan zona sementara (peringatan ±1 dtk)
js/config/gameplay.js  semua angka gameplay (diameter/dtk), telur, boss, penukaran
js/levels.js        3 stage + tabel kesulitan (data)
js/boss.js          Penyihir Jahat (modul terpisah, bisa diganti)
js/render/wizard.js Penyihir: sprite berlapis (melayang, kilat putih/ungu, memudar saat kalah)
js/story.js         cerita & akhir (nama tokoh bisa diatur)
js/ui.js            layar permainan (cerita, pembuka stage, Jeda, hasil)   js/ui/hud.js  HUD DOM (diperbarui saat berubah)
js/main.js          loop, layout responsif, input, alur petualangan
```

## Menambah / mengubah

- **Kategori soal:** tambahkan ke `LIST` di `js/config/categories.js` (id, nama, warna, contoh kartu; ikon di `Icons.cat`) dan isi `TABLE` (tiga kesulitan) di `js/questions.js`. Generator baru ditambahkan ke `GEN`
  (kembalikan lewat `make({ expr, answer, answerText, cands, ... })`; jawaban dinilai dari **teks**).
- **Kesulitan / jumlah soal:** `TUNE` di `js/levels.js`. **Kecepatan, kerapatan, fase masuk, tekanan rantai:** `js/config/gameplay.js` (satuan diameter bola/detik).
- **Stage atau rintangan baru:** ubah `STAGES` di `js/levels.js` (`pool.paths`, `pool.maps`, `format`, `specials`). Preset jalur baru
  ada di `presets` pada `js/path.js` (koordinat ternormalisasi; `mode: 'transpose'` untuk potret). Latar baru di `Theme.scenes`.
  Jenis rintangan baru: lihat "Rintangan zona" (`KINDS` di `js/hazards.js`).
- **Boss lain:** `GA.Bosses.register({ id, name, phases, lines, draw })`, lalu isi `boss.id` di `levels.js`.
- **Cerita:** ubah `names`, `intro`, `win`, `lose` di `js/story.js`.
- **Pause:** teks humor di `PAUSE_QUOTES` (`js/ui.js`); gaya di `css/pause.css`.
- **Aset sendiri:** isi `Theme.sprites` (mis. `boss`, `ball`) dengan URL gambar relatif; gambar kode otomatis diganti.
  Pakai path relatif (mis. `assets/boss.png`) dan huruf besar-kecil yang sama agar jalan di GitHub Pages.

## Ukuran bola

Semua ukuran diturunkan dari konstanta di `js/theme.js`. Bola yang berperan sama memakai radius yang **sama persis**: bola sihir
di rantai dan bola api yang melesat (`SHOOTER_BALL_SCALE = 1.0`, tanpa animasi mengecil
saat ditembak). Bola berikutnya di dada naga sedikit lebih kecil (`NEXT_BALL_SCALE = 0.8`). Diameter bola di layar minimal 46 px (HP);
batas atas `maxRadius`. Hitbox peluru = radius bola yang terlihat (`bulletHitRatio = 1.0`). Bola desimal/pecahan boleh sedikit lebih
besar di tiap step (`ballScale`, maks 1,2×) agar angka tetap terbaca. Untuk mengubah ukuran semua bola ubah `BALL_RADIUS_RATIO`.

## Popup JEDA

Dibuat dari desain Figma (node `123:122`, file `P8Ul9VcEHT7rDrbTGsAZVF`); tata letak, tombol, dan toggle tetap. Maskotnya kini **naga
tidur** (digambar kode di kanvas) dan teksnya bertema naga. Detail: gaya di `css/pause.css` (variabel `--pz-*`), perilaku di `js/ui.js`
(`UI.showPause`, `UI.hidePause`, konfirmasi, toast). Saat jeda semuanya berhenti total (rantai, rintangan, boss, partikel, timer soal)
dan `Audio.suspend()` menahan suara. ULANGI mengulang stage ini dari awal (telur 3/3, skor seperti saat stage dimulai); ULANGI dan MENU
bertanya dulu hanya jika sudah ada progres. Tombol **Booster Gratis** masih placeholder (toast "Segera hadir"; belum ada SDK iklan).
Aksesibilitas: `role="dialog"`, fokus terkunci, Esc menutup konfirmasi dulu lalu popup, `prefers-reduced-motion`.

## Uji coba

`GA.game` terbuka di konsol (setelah mesin dimuat; di halaman biasa lewat `await GA.Boot.ready()`): `GA.game.startAdventure({cat:'mul',diff:'sedang'}, true)`,
`GA.game.startStep(n, true)` (n = 0..2), `GA.game.skipCountdown()`, dan `GA.game.tick(dt, noRender)` untuk menjalankan waktu game secara manual
(berguna di panel yang tidak menjalankan `requestAnimationFrame`).

### UI kit tunggal (tema gelap, revisi 11)

Semua layar (halaman awal, Atur, Cara Main, cerita, pembuka stage, HUD, hasil/overview, konfirmasi) dibangun dari **satu UI kit**; popup Jeda memakai kit yang sama (`css/pause.css`).

- **Token tema = satu sumber**: `Theme.ui` di `js/theme.js` (slate `#2a2840–#3a3656`, plakat, bingkai batu, krem `#f6ecd3`, emas, hijau/amber/merah/biru untuk tombol, ungu `rune` untuk sihir). `js/ui/skin.js` menyalinnya ke CSS variables (`--slate-1..3`, `--plaque-*`, `--frame-*`, `--gold-*`, `--green-*`, `--amber-*`, `--red-*`, `--blue-*`, `--cream`, `--edge`, `--rune`, `--r-s/m/l`, `--font-*`) dan membuat satu tile noise 128 px. Mengubah `Theme.ui` mengubah seluruh UI. Warna peta/entitas ada di `Theme.scenes`, `Theme.colors`, `Theme.dragon`, dan `js/maps/themes.js`.
- **Komponen** (`js/ui/kit.js`, gaya `css/kit.css`): `Kit.panel` (panel batu + plakat judul), `button` (oktagon: hijau utama / amber sekunder / merah bahaya / batu), `badge`, `chip`, `toggle`, `segmented`, `slider`, `progress`, `card`, `stars`, `eggs`, `toast`, `confirm`. Panel dan tombol dibuat dengan border-bevel, `clip-path` oktagon, dan bayangan *inset* statis — **tanpa** `backdrop-filter`, blur, atau animasi `box-shadow`; animasi UI hanya `transform`/`opacity`. Fokus papan ketik digambar di dalam elemen (`::after`) karena `clip-path` memotong outline. Ikon SVG satu gaya di `js/ui/icons.js`.
- **Kebijakan teks** (`js/strings.js`): semua teks UI di satu tempat (`GA.T('kunci')`), ikon dulu baru teks; label ≤ 2 kata, keterangan ≤ ~5 kata. Lint: tes "teks UI ringkas" di `?test=1`.
- **Kontras**: tes otomatis `?test=1` (teks UI ≥ 4,5:1; angka bola ≥ 4,5:1 di atas plakat; tombol besar ≥ 3:1).
- **Responsif**: target sentuh ≥ 44 px, tanpa hover-only, tanpa scroll horizontal; ponsel potret = HUD ringkas + plakat soal di bawahnya, popup lebar penuh dengan margin 16 px; lanskap = HUD di sisi; desktop = menu maks ~960 px, popup ~480 px. `?resp=1` memeriksa kliping teks/target sentuh/scroll. Popup Jeda, konfirmasi, dan overlay stage memakai `role="dialog"`, fokus terkunci, Esc.
- Menambah layar: bangun HTML dengan `GA.Kit.*` di `TPL` (`js/ui.js`), tombol memakai `data-act` yang ditangani `UI.act`; layar halaman awal di `js/ui/start.js`.

## Efek Hidup / Mati dan performa

- `js/quality.js`: **satu saklar "Efek: Hidup/Mati"** di Atur (menggantikan Tinggi/Sedang/Rendah + Otomatis; tersimpan di `Storage.fx`). **Mati** = nol partikel, tanpa animasi sprite non-esensial (kepak sayap, kedip, napas, melayang penyihir, denyut), DPR kanvas ≤ 1. `prefers-reduced-motion` diperlakukan sama dengan Mati (`FX.reduce`, `GA.FlatMap.reduceMotion`). Gerak inti (bola, tembakan, indikator tukar, peringatan rintangan) selalu berjalan.
- **Arsitektur render dua lapisan**: `#bg` = kanvas STATIS (peta datar 2–3 nada dari `render/flatmap.js` + `maps/themes.js`, dibangun sekali per stage/varian/layout dan di-cache), di atasnya `#game` = kanvas transparan DINAMIS yang dibersihkan tiap frame (portal, jalur bola, naga, bola, rintangan, indikator, boss, partikel). HUD, popup skor/kombo, menu, dan teks = DOM/CSS yang diperbarui hanya saat nilai berubah (`js/ui/hud.js`). Loop `requestAnimationFrame` hanya berjalan saat dibutuhkan (`LOOPING = countdown|playing|cine|clearing|dying`); halaman awal tidak punya loop animasi.
- **Semua sprite diprarender** ke kanvas kecil (per radius terkuantisasi × piksel perangkat) lalu hanya `drawImage`: bola (8 warna × motif rune + plakat angka, `render/balls.js`), bola api (inti bara + 3 lidah api, `render/fire.js`), naga (badan/sayap/kepala 4 ekspresi, `dragon.js`), penyihir (jubah, lengan, kepala 5 ekspresi, tongkat, siluet kilat putih/ungu, `render/wizard.js`), telur/sarang (`render/eggs.js`), portal (`render/portal.js`). Pool partikel `FX` maks 80, ≤ 8 pecahan per bola. Tidak ada gradien/`shadowBlur`/`lighter`/WebGL/pustaka baru di jalur panas.
- Profil: `?debug=perf` lalu `await GA.Perf.run({ stage: 0|1|2, secs: 40 })` (waktu JS per frame, jumlah operasi kanvas, partikel, heap). Hasil sebelum/sesudah ada di `docs/rev11-laporan.md`. `?debug=1` menampilkan FPS.

## Aset gambar opsional

Semua gambar bawaan prosedural/datar dari kode; game jalan tanpa satu pun berkas gambar. Untuk memakai ilustrasi sendiri, daftarkan di `assets/manifest.json` — peta per tema (`maps.<idPeta>.landscape|portrait`, mis. `maps/forest-landscape.webp`; hanya peta stage yang sedang dimainkan yang diunduh, ≤ ~300 KB per berkas), sprite (`boss`, `ball`, `portal`, `nest`), dan tekstur panel. Lihat **`docs/ASSET_GUIDE.md`** untuk daftar aset, ukuran, format, anggaran berat, dan perintah untuk generator gambar (gaya datar gelap, tanpa merek).

## Jalur & peta (js/maps/)

- `maps/paths.js`: **pustaka arketipe jalur** (revisi 10: rute grid). `ular1-3` (Stage 1), `teluk1-3` (Stage 2), `benteng1-3` (Stage 3), masing-masing dengan rute potret dan lanskap; naga di tengah area bermain, portal dan sarang berseberangan. Data rute (`TPL`), `routeGeom`, validator INV-2..8, dan alat debug dijelaskan di "Tata letak: naga di tengah" (bagian Gameplay di atas); `dev/routesearch.js` = pencari rute (`?debug=route`).
- Spline Catmull-Rom sentripetal, tabel panjang busur (`path.js`), jumlah bola mengikuti panjang jalur dan `BALL_RADIUS`.
- **Validator** (otomatis tiap jalur dibangun, `analyze` + `analyzeStar`): INV-2 (naga di tengah, sayap, HUD, portal), INV-3 (pitch ≥ 2,6R − 0,5), INV-4 (panjang ≥ 95% serpentin lama terpendek), INV-5 (kunci target tak ambigu); hasilnya di `path.report`.
- **Mode debug** `index.html?debug=1`: menampilkan jalur (cyan), titik kontrol, sinar uji INV-1 (hijau/merah), bola tertutup (merah), pelanggaran jarak, ruang penembak/boss, titik portal, dan laporan validator.
- **Peta datar** (`GA.Maps`, `js/maps/themes.js`): 3 varian per stage — hutan malam (`forest`, `grove`, `bloom`), gunung api (`volcano`, `magma`, `crystal`), menara penyihir (`tower`, `tower2`, `library`). Tiap tema = palet 2–3 nada + dekorasi statis (lumut, kristal, retakan lava, lingkaran rune, obor, pilar, panji) yang ditaruh ≥ 1,5 × `BALL_RADIUS` dari jalur; jalur = alur tebal berkontras dengan bingkai batu. Menambah peta: tambahkan entri di `themes.js`, daftarkan id di `Levels` (`POOL`) dan `Theme.scenes`.

## Bola, bola api, portal, telur, sarang, naga, penyihir

- **Bola sihir** (`render/balls.js`): bola datar dengan motif rune berbeda per warna (aman buta warna), tepi gelap, kilau kecil, **plakat gelap** berisi angka krem (kontras ≥ 4,5:1, diuji otomatis; lihat `?debug=orbs`). Pecah = ≤ 8 pecahan sprite + satu cincin. Bola desimal/pecahan boleh sedikit lebih besar (`ballScale`).
- **Bola api** (`render/fire.js`): inti bara gelap bercincin oranye-kuning + 3 lidah api sprite (bergantian ±12×/dtk) di belakang arah gerak; ekor ≤ 6 partikel. Satu `BALL_RADIUS` untuk semua bola.
- **Portal** (`render/portal.js`): cincin batu + sprite pusaran ringan; hanya beranimasi saat bola keluar. **Telur & sarang** (`render/eggs.js`): sprite statis dengan keadaan ok/terancam/retak/kosong; sarang bertema per stage.
- **Naga** (`dragon.js`): tampak ATAS, sprite berlapis (badan+ekor, dua sayap, leher+kepala yang berputar mengikuti bidikan, mulut, hidung, mata di atas kepala), napas, kedip, 2–3 pose kepak sayap saat menembak/menang, recoil, ekspresi (senang/kaget/sedih/sorak), bayangan datar. `drawSleeping` = maskot Jeda statis.
- **Penyihir** (`render/wizard.js`): lapisan sprite — bayangan, jubah, lengan, kepala (normal/kena/tertawa/sihir/marah), tongkat berkristal; melayang naik-turun, kilat putih saat kena, ganti sprite lengan + cincin dan kilat ungu saat merapal, memudar sambil turun saat kalah. Tanpa simulasi kain/IK. Bar darah boss digambar ke kanvas kecil hanya saat HP/fase berubah (`boss.js`).
- **FX** (`fx.js`): pool 80 partikel, cincin kilas, popup skor/kombo = elemen DOM (`GA.HUD.pop`). Tanpa getar layar atau kilatan layar penuh.

## Deploy (GitHub Pages)

Workflow `.github/workflows/deploy.yml` menyalin `index.html`, `css/`, `js/`, `assets/` ke Pages saat push ke `main`. Semua path relatif,
jadi aman di subpath `/Naga-Penjaga/`. Pengaturan Pages: Source = GitHub Actions.
