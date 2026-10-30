# Revisi 8, tahap (c): Opsi A diterapkan ke semua stage, varian, dan layout

Keputusan: **Opsi A** (spiral stadion + tembakan lontar target-lock), INV-4 = **≥ 95% serpentin lama TERPENDEK** per stage dan layout (commit `ddd3183`). Kode: `js/maps/paths.js` (`spiralA`, `capsuleTau`, `modWave`, `lockDist`, `analyzeStar(def)`, `OLD_MIN`/`OLD_LEN`), tes `testInvariants` (`?test=1&only=paths` menjalankannya saja), pratinjau `?debug=pathprev`. Mekanik tembak BELUM diubah (tahap d), jadi pada commit ini bola di lap dalam masih tertutup bagi tembakan lurus dan simulasi/bot yang menembak lurus akan gagal sampai tahap (d).

Gambar: `docs/screenshots/k-c-stage1-paths.jpg`, `k-c-stage2-paths.jpg`, `k-c-stage3-paths.jpg` (tiap varian × 390×844, 844×390, 1440×900; 20 bola penuh, portal ungu, sarang oranye, boss merah).

## Bentuk dan varian (kolam acak per petualangan, disimpan untuk "Ulangi")

| Stage | Id | Bentuk |
|---|---|---|
| 1 | `siput1-3` | spiral stadion polos; arah dan apex (portal) berbeda |
| 2 | `lobus1-3` | spiral stadion dengan 5 / 4 / 6 lobus (selubung sin^0,7: muncul dari portal, terbesar di tengah, hilang di dekat sarang; amplitudo dibatasi ruang bebas) |
| 3 | `poligon1-3` | poligon membulat (tanh) / bintang membulat, 5–6 sisi; boss di luar spiral (atas pada potret, samping pada lanskap, ruang boss disisihkan dari ekstensi stadion) |

Potret = stadion vertikal (portal di apex atas/bawah, sumbu tidak harus simetris terhadap naga: 68 px atas, 108 px bawah); lanskap/desktop = stadion horizontal (apex kiri/kanan). Sumbu stadion selalu melewati naga.

## Panjang (diameter bola; % = terhadap serpentin lama TERPENDEK stage/layout itu; putaran)

| Layout | S1 `siput1/2/3` | S2 `lobus1/2/3` | S3 `poligon1/2/3` | Ambang 95% terpendek lama |
|---|---|---|---|---|
| Potret 390×844 (R 32) | 29,4 / 29,4 / 29,4 (95%, 1,34 putaran, pitch 2,6R) | 25,3 / 25,4 / 25,7 (97–98%, 1,16, pitch 3R) | 24,6 ×3 (97%, 1,27, pitch 2,6R) | 29,3 / 24,8 / 24,1 d |
| Lanskap 844×390 dan desktop 1440×900 (R 32) | 29,3 ×3 (108%, 0,96) | 29,4 ×3 (110%, 0,96) | 25,1 ×3 (120–121%, 0,95) | 25,7 / 25,5 / 19,8 d |
| Lanskap 667×375 (R 33) | 28,5 (105%) | 28,3 (106%) | 24,3 (117%) | – |
| Lanskap 568×320 (R 36) | 26,1 (96%) | 26,1 (97%) | 21,9 (106%) | – |
| Potret 360×640 (R 35) | 19,8 | 20,0–20,3 | 17,5–17,6 | – |
| Potret 320×568 (R 36) | 19,3 | 19,5–19,7 | 16,8 | – |

Rasio terhadap rantai 20 bola (19,6 d): 1,50 (S1), 1,28–1,33 (S2 potret) / 1,5 (S2 lanskap), 1,25 (S3). INV-4 lulus (≥ 95%) untuk semua 27 kombinasi pada tiga layar yang diminta; S1 potret tepat 95% (29,4 d vs 29,3 d).

**Keterbatasan (perlu Anda tahu):**
- Potret pada HP sempit (R 35–36, lebar 320–360 px) hanya 17–20 d: radius bola dinaikkan agar bola ≥ 44 px, ruang dan jangkauan sayap bertambah besar, sehingga spiral hanya muat satu putaran. Serpentin lama pada ukuran itu (diukur ulang di commit `ddd3183`: 320×568 min 26,9 / 22,1 / 22,3 d) berarti jalur baru ≈ 72% / 88% / 75% dari yang lama; INV-4 hanya diberlakukan pada R ≈ 32 (patokan diukur di sana). Lanskap kecil (568×320) lolos (96–106%).
- Lobus dan poligon di potret sangat terbatas oleh INV-4 yang ketat: lobus 14 px (target 22), poligon 0 px (stadion polos) karena modulasi mengurangi jarak antar-lap atau memperpendek jalur di bawah ambang. Di lanskap lobus hanya ≈ 5 px (ruang vertikal bebas 38 px). Stage 3 praktis berupa stadion dengan boss di luarnya; poligon/bintang yang jelas tidak muat di dalam batasan panjang.
- Spiral 1,5–3 putaran tidak mungkin (potret 1,16–1,34; lanskap ≤ 0,96), lihat `docs/rev8-b-preview.md`.

## Hasil validator (`?test=1&only=paths`)
INV-2 (27 jalur: naga di tengah, sayap, ujung di platform, portal penuh, HUD) lulus; INV-3 minimum terukur 2,59R (pitch 2,6R); INV-4 terendah 95%; INV-5 jarak dua bola non-tetangga ≥ 2,6R (tetangga rantai 1,96R → target-lock menjamin radius 0,98R); penyetel tanpa cadangan; 3 varian per stage; 10 ukuran layar (320×568 … 1920×1080) tanpa pelanggaran. Overlay `?debug=1` menampilkan baris INV-4/INV-5.
