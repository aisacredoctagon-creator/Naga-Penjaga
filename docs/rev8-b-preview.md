# Revisi 8, tahap (b): generator dan pratinjau Opsi A dan Opsi B (Stage 1)

Kode: `js/maps/paths.js` (`spiralA`, `capsuleTau`, `analyzeStar(def)` dengan INV-3/4/5 untuk spiral, `OLD_LEN`, `LAP_PITCH_FACTOR`), pratinjau `js/dev/pathprev.js` (`?debug=pathprev`, `GA.PathPrev.sheet/table`). Arketipe pratinjau (belum masuk kolam stage, game utuh tidak berubah): `optA1`, `optA2` (Opsi A, dua arah/apex), `optB1` (Opsi B, peluru nyata), `optB1thin` (Opsi B dengan sinar tipis, hanya pembanding). Belum ada perubahan mekanik tembak.

Gambar: `docs/screenshots/k-b-optA-stage1.jpg` (baris `optA1` dan `optA2`; kolom 390×844, 844×390, 1440×900), `k-b-optB-stage1.jpg` (`optB1`, `optB1thin`), dan tangkapan game utuh dengan `?debug=1`: `k-b-ingame-optA1-portrait.jpg`, `k-b-ingame-optB1-portrait.jpg`. Pratinjau menggambar area bermain, zona HUD, naga + jangkauan sayap, jalur (garis tengah), titik kontrol (kuning), **20 bola penuh** (bernomor) dan sisa jalur (lingkaran samar), portal (ungu), sarang (oranye), dan pelanggaran validator.

## Tabel panjang (diameter bola = panjang ÷ 2R, R = 32)

| Opsi | Layout | Panjang | Rasio rantai 20 bola | vs serpentin lama (rata-rata kolam) | vs min kolam lama | Bentuk |
|---|---|---|---|---|---|---|
| lama (ddd3183) S1 | potret | 38,4 (30,8–45,8) | 1,96 | 100% | 100% | serpentin |
| lama S1 | lanskap/desktop | 37,1 (27,1–42,9) | 1,89 | 100% | 100% | serpentin |
| **A** `optA1` | potret 390×844 | **28,8** | 1,47 | 75% | 94% | stadion 1,31 putaran, pitch 2,6R |
| **A** `optA1` | lanskap 844×390 dan desktop 1440×900 | **28,0** | 1,43 | 76% | 103% | stadion 0,96 putaran |
| **A** `optA2` | potret / lanskap / desktop | 28,0 / 28,0 / 28,0 | 1,43 | 73% / 76% / 76% | 91% / 103% / 103% | arah dan apex lain |
| **B** `optB1` (peluru nyata) | potret | **16,7** | 0,85 | 44% | 54% | satu lap hampir bulat |
| **B** `optB1` | lanskap / desktop | **11,2** | 0,57 | 30% | 41% | satu lap hampir bulat |
| B `optB1thin` (sinar tipis, pembanding) | potret / lanskap | 15,0 / 10,6 | 0,77 / 0,54 | – | – | gagal INV-1 peluru nyata (75/363 dan 3/255 sinar) |

Hasil validator: Opsi A lulus INV-2, INV-3 (jarak antar-segmen 2,60R), INV-5 (jarak dua bola non-tetangga ≥ 2,6R; tetangga rantai 1,96R sehingga radius target-lock yang terjamin 0,98R, toleransi 1,25R memilih bola terdekat) dan **gagal INV-4** (panjang 73–76% dari rata-rata serpentin lama; ambang 95% = 36,4 d potret / 35,2 d lanskap). Opsi B lulus INV-1..3 tetapi panjangnya hanya 30–44% serpentin lama dan lebih pendek dari rantai 20 bola.

## Mengapa panjang Opsi A terbatas (batas geometri, bukan kemalasan penyetel)

- Naga tepat di tengah area bermain, sayap/mulut membutuhkan lingkaran jari-jari ≈ 114 px (3,6R) bebas, dan pusat bola harus 2,0–2,5R di bawah HUD. Ruang yang tersisa untuk jalur: setengah-lebar 220 px dan setengah-tinggi 288 px (potret); setengah-lebar 410 px dan setengah-tinggi **hanya 146 px** (lanskap).
- Spiral berpitch ≥ 2,6R (83 px) hanya muat **selisih jari-jari ÷ pitch** putaran: potret (220 − 114) / 83 = **1,3 putaran** (bukan 1,5–3); lanskap (146 − 114) / 83 = 0,4 sehingga yang muat hanya **satu lap stadion memanjang** (0,96 putaran, celah portal–ujung ≥ 2,6R). Spiral 1,5–3 putaran tidak mungkin di layout ini tanpa mengecilkan pitch di bawah 2,6R, mengecilkan jangkauan sayap, atau memindahkan naga dari tengah.
- Stadion sudah memakai seluruh tinggi (potret) dan lebar (lanskap) yang ada; sumbu stadion tidak harus simetris terhadap naga (potret: 68 px ke atas, 108 px ke bawah), tetapi naga harus berada di sumbu.

## Opsi B: jujur soal panjang

Jalur satu lap ≤ 330° dengan INV-1 peluru nyata praktis berupa lingkaran (kemiringan tangen dari tegak-lurus-radial ≲ 0,1 sehingga lobus ≤ 4 px; syarat "tangen ≥ 35° dari radial" lolos tetapi tidak menambah panjang). Panjang maksimum ≈ keliling lingkaran terbesar yang muat: 16,7 d potret, 11,2 d lanskap. Dengan sinar tipis pun (pembanding) hanya 15,0 / 10,6 d. **Opsi B tidak dapat memenuhi patokan panjang** (INV-4) di layout mana pun.

## Keputusan yang diperlukan

1. **Opsi A atau B.** A satu-satunya yang mendekati patokan panjang (73–76% rata-rata, 91–103% dari jalur serpentin terpendek) tetapi mengubah mekanik tembak menjadi lontaran target-lock; B tidak mengubah mekanik tetapi jalurnya 30–44%.
2. **Bila A: definisi INV-4.** (i) terima ≥ 95% dari serpentin **terpendek** kolam lama (potret S1 30,8 d → A 94% mendekati; lanskap 103% lolos), (ii) turunkan ambang menjadi sekitar 72% rata-rata, atau (iii) tambah ruang: mengecilkan jangkauan sayap (ρ ujung 114 → 80 px menambah ≈ 0,4 putaran ≈ +9 d potret, mengubah ukuran naga) atau celah HUD lanskap 1,0R → 0,5R (menambah tinggi ±16 px, hanya sedikit membantu).
3. Bila tanpa pengawasan dan belum dijawab, sesuai arahan dipakai Opsi A (dengan INV-4 gagal dilaporkan apa adanya).
