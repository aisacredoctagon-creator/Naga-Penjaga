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

Judul → **Main Menu** (kategori & kesulitan) → **Pilih Stage** (3 simpul: kunci, bintang, skor terbaik, hasil terakhir) → cerita pembuka (sekali, bisa dilewati) →
layar pembuka stage (nama + ikon, **contoh soal bergambar** sesuai format stage) → hitung mundur 3-2-1 → stage → **overview jawaban** → … → Stage 3 (final boss) → cerita akhir.

Stage terbuka berurutan per kesulitan (stage n+1 terbuka setelah stage n selesai). `?unlock=1` membuka semuanya (untuk uji coba).

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
| `GAP_CLOSE_SPEED` | bagian belakang celah menyusul sekian d/dtk (celah 1 bola ±0,13 dtk) | 7,5 |
| `INSERT_TIME` | bola disisipkan: tetangga bergeser halus selama ini (`Chain.insert`) | 0,12 dtk |
| `MAX_DT` | langkah waktu maksimum (tab di-resume tidak membuat bola melompat) | 0,05 dtk |

Cara kerja rantai (`js/chain.js`): posisi tiap bola = jarak busur `d`; solver pembatas jarak berjalan tiap frame (bola ke-i tidak boleh melewati bola di depannya dikurangi jarak sentuh; jarak sentuh diukur **lurus** pusat-ke-pusat, sehingga di tikungan busur sedikit lebih panjang dan bola tetap menempel). Bola yang tertinggal menyusul dengan `GAP_CLOSE_SPEED`; bagian depan celah tetap berjalan normal. Seluruh pengali kecepatan (beku, arus, tekanan, sarang, fase boss) berlaku untuk **seluruh rantai**, bukan per bola. Animasi bola keluar portal berbasis waktu (`EMERGE_ANIM_TIME`) dan tidak memperlambat arus.

**Mengapa tidak semua 25 bola keluar dalam 6 detik:** rantai 25 bola panjangnya ±25 diameter, sedangkan jalur hanya 11–43 diameter. Bila semua keluar sekaligus, kepala rantai langsung berada 60–90% jalur (pada jalur pendek bahkan melewati sarang). Karena itu fase masuk berhenti saat kepala mencapai `ENTRY_HEAD_FRAC`; sisa bola tetap satu aliran rapat tanpa jeda tetapi keluar mengikuti kecepatan normal. Ingin lebih banyak bola di awal? Naikkan `ENTRY_HEAD_FRAC` (0,35–0,5).

**Panel penyetelan `?debug=tune`** (tidak tampil ke pemain biasa): slider semua parameter di atas, berlaku langsung pada step yang berjalan; **Salin nilai** (JSON: nilai yang diubah + nilai efektif), **Reset**, **Ulangi step**, dan angka hidup (fase, kecepatan d/dtk, bola keluar, kepala %, waktu isi, rasio jarak min/maks, jumlah celah). Nilai disimpan di localStorage hanya saat `?debug=tune`. Contoh: `index.html?debug=tune&unlock=1&go=1&diff=sedang` (langsung mulai Step 1).
Flag lain (boleh digabung, mis. `?debug=tune,chain`): `chain` = overlay garis hijau/merah/oranye antar-bola (merah = celah > 1,05 diameter); `sim` = simulasi kerapatan tanpa render.

**Simulasi kerapatan** (`js/dev/chainsim.js`, `?debug=sim`, juga bagian `?test=1`): semua arketipe jalur × 2 orientasi × 3 radius × 3 kesulitan × 45 dtk dengan pemain acak (hancur, sisip, mundur, dt bergetar + lonjakan 500 ms); jarak bola bersebelahan harus tetap 0,96–1,05 diameter kecuali celah sementara < 400 ms; juga uji penutupan celah, penyisipan halus, fase masuk.

### Main Menu

- **8 kategori:** Penjumlahan, Pengurangan, Perkalian, Pembagian, Bilangan Bulat, Pecahan, Desimal, Campuran.
- **3 slot:** Stage 1, Stage 2, Stage 3 (Boss). Default **Satu kategori untuk semua stage**; matikan untuk **atur per stage** (3 slot); atau **Acak**. Stage 3 mencampur kategori yang dipilih.
- **Kesulitan:** Mudah / Sedang / Sulit (rentang angka, kerumitan soal, kecepatan rantai, kerapatan rintangan).
- Pilihan terakhir, bintang & skor terbaik per stage, **hasil terakhir tiap stage** (untuk overview), skor tertinggi, dan pengaturan disimpan di `localStorage` (skema berversi, lihat "Simpanan").

### Telur, bintang, kontrol

- **Telur = nyawa, selalu 3/3** (ikon di HUD). Telur di-refresh penuh di awal **setiap stage**, termasuk saat **Ulangi**. Telur berkurang karena: jawaban salah
  (`WRONG_ANSWERS_PER_EGG` = 2 di `js/config/gameplay.js`: dua jawaban salah = satu telur; diubah dari 1 di revisi 7 karena dengan akurasi pemain 90% satu telur per salah membatasi kemenangan ≈ 68%, lihat `docs/pacing-c.md`), bola sihir sampai ke sarang, atau terkena zona berbahaya. **Telur emas** memulihkan satu telur tetapi tidak pernah melebihi 3.
  0 telur = Game Over untuk stage itu. Hanya **satu portal, satu rantai, satu sarang** di semua stage.
- Bintang (`STAR_3_PCT` 90%, `STAR_2_PCT` 70%): menurut persentase soal yang dijawab **benar pada percobaan pertama**; 1 bintang bila stage selesai.
- Pecahan **bersusun**; jawaban pecahan harus **bentuk paling sederhana** (1/2 ≠ 2/4), desimal memakai **koma**, tanda negatif "−".
- Kontrol (revisi 8, **target-lock + lontaran**): arahkan mouse ke sebuah bola jawaban lalu klik; sentuh = seret (titik bidik 56 px di atas jari agar tidak tertutup) lalu lepas; tidak ada aksi hanya-hover. Bola terdekat dalam 1,0R (mouse) / 1,25R (sentuh, papan ketik) dari titik bidik terkunci (cincin kecil di atas bola, bola sedikit menggembung; merah bila terhalang rintangan tinggi). Tanpa bola dalam radius: bola api terbang ke titik itu lalu padam tanpa hukuman. Ketuk naga/bola kecil untuk menukar bola api; papan ketik ← → membidik, ↑ ↓ (W/S) mengubah jarak titik bidik, Spasi menembak, Q menukar, P/Esc jeda.
- **Bola api bersih**: tidak ada label angka. Tingkat pengali skor acak (×1–×3) tetap ada tetapi hanya terlihat dari panas cahaya api (label "×N" dihapus atas permintaan).

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
Aturan keadilan (diuji otomatis): busur bidik tertutup ≤ 30%; tidak muncul di alur / lintasan mulut / menimpa rintangan lain; sebelum muncul diuji masih ada bola target dengan garis tembak terbuka DAN bola jawaban soal aktif tetap terbuka; bila semua target terhalang > 1 detik, rintangan menyingkir. Penempatan (revisi 8 tahap e): ruang bebas hanya cakram sayap di dalam spiral, jadi radius rintangan menyesuaikan ruang (≥ 60% radius dasar; rintangan rendah ≥ 50%) dan petir rune berupa lajur lurus sepanjang ruang bebas (`docs/rev8-e-hazards-pacing.md`). Jenis dan jeda muncul: `HAZ_TIERS`/`HAZ_BASE` di `js/levels.js`; jumlah serentak: `Gameplay.HAZ_MAX = [2, 3, 4]`.
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

- Arketipe jalur (revisi 7; revisi 8 mengganti bentuknya menjadi spiral stadion panjang) di `js/maps/paths.js`: Stage 1 `siput1-3`, Stage 2 `lobus1-3`, Stage 3 `poligon1-3`; tiap varian punya definisi potret dan lanskap/desktop. Tiap stage memilih acak satu varian per petualangan (disimpan agar "Ulangi" memakai yang sama). Lihat "Tata letak" di bawah.
- Menambah peta: salin satu entri di `js/maps/variants.js`, daftarkan di `Levels.STAGES[n].pool`, `Levels.ZONE`, dan alias warna di `js/theme.js`.

### Final boss (`js/boss.js` + rig `js/render/wizard.js`)

Darah **proporsional**: 20 soal = 20 HP, tiap jawaban benar −1. `Gameplay.BOSS_HP_BARS` (1 atau 2, bawaan 2): **2 bar** → bar 1 habis di soal ke-10 dan memicu **fase 2** (sinematik singkat yang bisa dilewati; pola terberat = gabungan fase 2+3 lama: mantra lebih sering, rintangan zona, soal berbatas waktu dengan TIMEOUT yang sah; penukaran dua pasangan); **1 bar** → satu bar, pola meningkat bertahap tanpa sinematik. Jawaban salah → boss menyerang (telur berkurang). Bar darah tebal dan jelas di dekat boss. Penyihir digambar penuh dengan kode: jubah compang-camping (kain verlet), lengan dua ruas (IK), tongkat berkristal, tekstur prosedural; animasi melayang, gestur mantra, tawa jahat, perisai saat terkena, aura amarah, dan **hancur menjadi abu** saat kalah. Mengganti dengan sprite: `Theme.sprites.boss`.

### Tata letak: naga di tengah, lapisan render, penukaran, posisi bola

**Urutan lapisan (tetap, bawah → atas):** 1 latar, 2 alur jalur, 3 dekorasi/objek depan (`Scenery.drawFront`, dijauhkan ≥ 3,2R dari garis tengah jalur; dekorasi ≥ 2,2R), 4 dasar/glow portal, 5 **bola** (alpha selalu 1), 6 bola api + efek tembakan, 7 overlay penukaran, 8 HUD/popup. Tidak ada kerucut cahaya, vignette, kabut, atau objek depan di atas bola; garis bidik putus-putus digambar di bawah bola. Vignette ada di lapisan dasar. `?debug=layers` menandai merah bola yang bertumpang tindih (HUD = 1,5R potret / 1,0R lanskap di bawah panel, objek depan, sarang, boss, naga, rintangan) dan menggambar garis zona cadangan HUD; uji geometri di `?test=1` memeriksa semua jalur × 3 ukuran layar.

**Naga di tengah, jalur PANJANG berbentuk spiral stadion** (revisi 8; `js/maps/paths.js`, generator `spiralA()`; menimpa jalur satu-lap dan INV-1 revisi 7): naga/platform/sarang tepat di tengah area bermain; jalur adalah kurva sejajar kapsul (stadion) di sekeliling sumbu vertikal (potret) atau horizontal (lanskap/desktop) melalui naga, mengecil menuju platform; panjangnya 25–29 diameter bola per stage (potret ±1,3 lap; lanskap < 1 lap karena setengah tinggi layar hanya ±146 px). Portal di tepi luar (digeser mundur sepanjang jalur agar penuh di area bermain), boss di ruang cadangan (atas pada potret, samping pada lanskap). Arketipe (semua memakai spiral): Stage 1 `siput1-3` polos, Stage 2 `lobus1-3` dengan 4–6 lobus halus (amplitudo ±14 px potret, ±5 px lanskap), Stage 3 `poligon1-3` (gelombang poligon/bintang 5–6; pada potret praktis stadion polos). Tidak ada bola yang tak bisa dipilih: karena bola target dipilih langsung (target-lock) dan peluru dilontarkan, jalur tidak perlu "terlihat" lurus dari naga.

**Invarian jalur (divalidasi tiap jalur dibangun, `analyzeStar`; `?debug=1` menampilkannya):**
- **INV-1** (satu lap, tiga sinar per posisi bola) **dihapus untuk jalur spiral** (revisi 8); kode `inv1`/`analyzeStar` cabang bintang tetap ada untuk jalur satu-lap.
- **INV-2:** naga di tengah area bermain; jalur mengelilingi (sudut hanya bertambah) dan berujung di platform; jarak ke naga ≥ jangkauan sayap (`wingNeed`); pusat bola ≥ (celah HUD + 1)R di bawah panel HUD (`L.hudGap`: 1,5 potret, 1,0 lanskap; `padTopFor(L, R)` mengikuti radius stage); portal penuh di area bermain.
- **INV-3:** jarak antar-segmen jalur (pitch antar-lap) ≥ 2,6R − 0,5; radius lengkung minimum ≥ 1,4R.
- **INV-4 (panjang):** panjang jalur ≥ 95% dari panjang TERPENDEK serpentin lama (commit `ddd3183`) untuk stage dan orientasi itu (`OLD_MIN`: potret 30,8 / 26,1 / 25,4 d, lanskap 27,1 / 26,8 / 20,8 d); hanya berlaku bila R ≈ 32 (ponsel kecil dengan R 35–36 lebih pendek, ±72–88%; dilaporkan, bukan kegagalan).
- **INV-5 (kunci target):** dua bola yang bukan tetangga rantai dipisah ≥ 2,6R dan busur ≥ 4R, sehingga radius kunci 1,0R tidak pernah ambigu (tetangga rantai 1,96R → radius aman ≈ 0,98R).
- Uji `?test=1` (`testInvariants`): semua jalur × varian × 3 ukuran layar (390×844, 844×390, 1440×900) untuk INV-2..5; `testPaths` memeriksa radius 26–36. Overlay `?debug=1` menggambar jalur, jarak ke naga, dan laporan INV-4/INV-5; `?debug=pathprev` (`js/dev/pathprev.js`) membuat lembar pratinjau (bola 1–20 bernomor, portal, sarang, boss, pelanggaran merah) dan tabel panjang; `?test=1&only=paths` hanya menguji jalur; `docs/rev8-a-audit.md` … `rev8-e-hazards-pacing.md` berisi tabel panjang lama vs baru dan hasil bot.

**Indikator penukaran:** lihat bagian "Penukaran bola" di atas (telegraf 2,5 dtk).

**Posisi bola jawaban** (`QM.arrange`, `js/qmanager.js`; konstanta `SHUFFLE_*` dan `STAGE_SHUFFLE` di `js/config/gameplay.js`): urutan antrean soal tidak berubah; urutan keluar bola jawaban dari portal diundi ber-seed (gaya Fisher-Yates, undian tanpa pengembalian) ke SELURUH rantai per stage per percobaan (urutan baru tiap Ulangi, layout sama). Jawaban soal pertama = bola pertama yang keluar (terlihat begitu hitung mundur selesai); jawaban soal ke-k hanya diundi di antara bola yang sudah keluar saat soal itu aktif (model keluarnya bola diukur dengan bot, per stage); tiap soal diundi ke sepertiga rantai (depan/tengah/ekor) menurut sasaran seimbang; maks 2 jawaban berurutan bertetangga. Penjaga runtime: bila bola jawaban soal yang baru aktif berada di 12% terakhir jalur, rantai melambat ±3 dtk tanpa menandai bola (0 kejadian dalam 54.000 aktivasi bot). Jawaban benar tidak pernah disorot. Hasil di mesin asli (bot, 300 putaran × 9 sel): tiap sepertiga 24,8–41,9% di antara bola jawaban yang ada; rincian dan catatan metrik di `docs/shuffle-d.md`. `lineBlocker` (`js/main.js`) kini hanya memeriksa rintangan tinggi pada garis naga → target (lontaran melewati bola lain).

**Kecepatan permainan (bot):** `js/dev/pacing.js` (`?debug=pace`, `GA.Pace.play/run`): pemain buatan (jawab ~N(6, 2) dtk, akurasi 90%, PRNG ber-seed) pada mesin asli tanpa render; Bot memakai API target-lock (`aimAtBall` + `openLine`) dan memiliki diagnostik `diag` / `hazLog`. Revisi 8: Sedang menang 86–92% di 3 layar × 3 stage (200 seed); satu-satunya perubahan konfigurasi `STAGE_SPEED_MULT[2]` 0,5 → 0,75 (`docs/rev8-e-hazards-pacing.md`; sebelumnya `docs/pacing-c.md`, `WRONG_ANSWERS_PER_EGG` 1 → 2).

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
css/base.css + kit.css  dasar halaman + komponen UI kit   css/pause.css   popup Jeda (desain Figma)
js/theme.js         warna, ukuran bola, naga, latar tiap stage (satu-satunya tempat untuk ganti tampilan)
js/storage.js       localStorage (pilihan, bintang, rekor, pengaturan)
js/audio.js         efek suara, ambient & musik per zona (Web Audio, tanpa berkas)
js/qmanager.js      QuestionManager: soal aktif, urutan, pemicu sah (lihat bagian Soal aktif)
js/fx.js            partikel, getar layar          js/scenery.js   latar parallax + partikel ambient
js/path.js          jalur (spline) & preset: arc, wave, hook, zigzag, ring, bossU; sarang & penanda
js/mathtext.js      teks matematika dengan pecahan bersusun (canvas & HTML)
js/chain.js         rantai bola sihir, bola khusus (beku, telur emas), kabut, tukar tempat (swapPositions)
js/dragon.js        Naga Penjaga (kepala/leher mengikuti bidikan, ekspresi, animasi)
js/shooter.js       naga + bola api + peluru
js/questions.js     generator soal, kategori & tabel kesulitan
js/swap.js          penukaran bola: indikator ⇄, eksekusi melengkung, pasangan acak ber-seed, kelelawar
js/hazards.js       rintangan zona sementara (peringatan ±1 dtk)
js/config/gameplay.js  semua angka gameplay (diameter/dtk), telur, boss, penukaran
js/levels.js        3 stage + tabel kesulitan (data)
js/boss.js          Penyihir Jahat (modul terpisah, bisa diganti)
js/render/wizard.js rig & gambar Penyihir (kain verlet, IK lengan, tekstur prosedural, hancur jadi abu)
js/story.js         cerita & akhir (nama tokoh bisa diatur)
js/ui.js            layar (DOM) + HUD (canvas)     js/menu.js   Main Menu
js/main.js          loop, layout responsif, input, alur petualangan
```

## Menambah / mengubah

- **Kategori soal:** tambahkan ke `CATEGORIES` dan isi `TABLE` (tiga kesulitan) di `js/questions.js`. Generator baru ditambahkan ke `GEN`
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
di rantai, bola api siap tembak di mulut naga, dan bola api yang melesat (`SHOOTER_BALL_SCALE = 1.0`, tanpa animasi mengecil
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

`GA.game` terbuka di konsol: `GA.game.startAdventure({slots:['add','mul','frac'],same:false,random:false,diff:'sedang'}, true)`,
`GA.game.startStep(n, true)` (n = 0..2), `GA.game.skipCountdown()`, dan `GA.game.tick(dt, noRender)` untuk menjalankan waktu game secara manual
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

- `maps/paths.js`: **pustaka arketipe jalur** (revisi 7: semua jalur lama dihapus). `siput1-3` (Stage 1), `lobus1-3` (Stage 2), `poligon1-3` (Stage 3), masing-masing dengan definisi potret dan lanskap; naga di tengah area bermain. Generator spiral (`spiralA`), invarian INV-2..5, dan alat debug dijelaskan di "Tata letak: naga di tengah" (bagian Gameplay di atas).
- Spline Catmull-Rom sentripetal, tabel panjang busur (`path.js`), jumlah bola mengikuti panjang jalur dan `BALL_RADIUS`.
- **Validator** (otomatis tiap jalur dibangun, `analyze` + `analyzeStar`): INV-2 (naga di tengah, sayap, HUD, portal), INV-3 (pitch ≥ 2,6R − 0,5), INV-4 (panjang ≥ 95% serpentin lama terpendek), INV-5 (kunci target tak ambigu); hasilnya di `path.report`.
- **Mode debug** `index.html?debug=1`: menampilkan jalur (cyan), titik kontrol, sinar uji INV-1 (hijau/merah), bola tertutup (merah), pelanggaran jarak, ruang penembak/boss, titik portal, dan laporan validator.
- Peta (`GA.Maps`): `forest`, `grove` (Step 1); `volcano`, `crystal` (Step 2); `tower`, `tower2` (Step 3). Satu file data per tema berisi palet, jenis dasar (`moss|basalt|cave|flags`), komposisi dekorasi (`mix`), elemen depan (`front`: `leaf|stone|hall`), dan opsi efek. Untuk menambah peta: salin salah satu file, ubah palet/`mix`, lalu daftarkan idnya di `Levels` (`POOL`) dan `Theme.scenes`.
- Zona kecepatan: `zones` pada arketipe (tidak dipakai jalur baru) mempercepat rantai di bagian jalur tertentu.

## Bola sihir, bola api, portal, telur & sarang

- **Bola sihir (`js/render/balls.js`)**: obsidian gelap berurat energi (urat dari noise punggungan, warna per bola + ungu/hijau), retakan dan rune bercahaya. Permukaan dibangkitkan sekali per warna sebagai peta ekuirektangular lalu dirender sebagai bola SUNGGUHAN (proyeksi per piksel) menjadi **24 bingkai rotasi** (16 sedang, 12 rendah), di-cache dan dibuat malas, dipanaskan saat layar pembuka (`Balls.warm`). Bola menggelinding (sudut = jarak ÷ radius, sumbu tegak lurus arah jalur). Pencahayaan tetap (sisi gelap, pantulan lingkungan, rim light, spekular) di lapisan terpisah; asap tipis dari permukaan; jejak kabut gelap di belakang bola terakhir tiap kelompok. **8 motif rune berbeda** per warna (aman buta warna). Pecah = pecahan obsidian + asap + riak energi.
- **Angka** berada di segel gelap hampir opak: isi krem `#fff4d6`, outline gelap, pendar tipis; mendukung negatif, pecahan bersusun, desimal. Kontras diuji otomatis (≥ 4,5:1; terukur ±15:1 untuk bola sihir dan ±5:1 untuk bola api) dan bisa dilihat di **`?debug=orbs`** (semua warna × jenis angka × ukuran rantai/preview + bola api ×1–×3).
- **Bola api (`js/render/fire.js`)**: api berlapis (lidah turbulen, 8 bingkai, ekor, bara mengorbit, cahaya aditif) mengelilingi **cakram bara gelap** (arang menyala + retakan, tepi panas) di tengah; angka ×N hanya di atas cakram, tidak pernah di atas api terang. Preview bola berikutnya ada di **soket rune** di sisi naga (jangkauan jempol, digambar di atas naga), ukuran = 0,9 × bola siap tembak (`NEXT_BALL_SCALE`), jadi font ≥ 0,85 ×.
- **Portal (`js/render/effects.js`)**: tanah gosong dengan retakan bercahaya, bayangan cincin, tiga lapis pusaran + dua lapis fBm berlawanan arah, lorong kedalaman (cincin menyusut ke pusat), cincin rune MELAYANG (bayangan di tanah), efek lensa kromatik di tepi, busur petir, partikel tersedot/terlontar, denyut tiap bola keluar, buka/tutup. Lapisan berat dimatikan di kualitas rendah.
- **Telur & sarang (`js/render/eggs.js`)**: telur bersisik (relief sisik, bintik, urat, cahaya dalam, rim light) dengan 3 elemen (api/es/hutan) dan keadaan ok/terancam (bergetar, merah)/retak/kosong; pecah dengan pecahan cangkang saat hilang (`FX.eggBreak`). Sarang: bayangan kontak, cincin batu (lumut / basal / es / rune menurut tema), ranting, tulang, sisik, abu & bara; cahaya telur menyinari sarang. Telur HUD memakai sprite yang sama. Gambar sarang sendiri: `sprites.nest` di manifest.

## Naga top-down & burung

- **Naga (`js/dragon.js`)**: dilihat dari ATAS dan melayang. Badan bersisik dengan pelat punggung, kaki belakang bercakar, leher dan ekor bersegmen (simulasi pegas), dua sayap bertulang (lengan, pergelangan, empat jari, selaput bergerigi tembus cahaya dengan urat & tekstur kulit) yang mengepak berirama (pelan saat melayang, cepat saat menembak/bersorak, lesu saat sedih; foreshortening saat terangkat). **Kepala tampak atas**: moncong memanjang dengan lubang hidung di ujung, dua mata di sisi atas, tanduk & jumbai ke belakang; saat menyembur rongga mulut terbuka tampak gelap dengan gigi di tepi, lidah dan tenggorokan jingga; bola api muncul tepat di depan ujung moncong (`mouthDist`) dan digambar di atas kepala agar angka ×N terbaca. Animasi: napas, ekor bergoyang, kedip, recoil, mengaum (kombo), kaget (salah), sayap membentang (menang), lesu (kalah). **Bayangan terbang** di tanah (offset menurut ketinggian, 3 lapis lembut). Setiap ayunan turun: `Dragon.onFlap` (bunyi `flap`), hembusan debu/daun dari ujung sayap, dan denyut `Dragon.pulse` yang membuat telur di sarang bergetar sedikit. Footprint sayap dibatasi `Theme.dragon.wingSpan` (setengah bentang ≈ 1,85 × radius badan).
- **Burung (`js/render/birds.js`)**: tampak atas; sayap berbulu (bulu primer & sekunder bergerak, melipat, meluncur) atau selaput kelelawar; spesies per zona (gagak & elang di hutan, kelelawar di gua & menara); kawanan longgar (boids: kohesi, keselarasan, pemisahan), goyangan angin, bayangan yang berubah menurut ketinggian, dan sesekali hinggap di tepi peta. Digambar DI BAWAH bola (tidak pernah menutupi bola/angka), tidak menerima input, dikurangi di kualitas rendah (mati) / sedang (satu kawanan).

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
