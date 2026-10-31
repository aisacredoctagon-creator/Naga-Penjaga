# Panduan Aset Gambar (Naga Penjaga)

Semua gambar di game ini **digambar lewat kode** (prosedural), jadi game jalan tanpa satu pun berkas gambar. Dokumen ini menjelaskan
aset ilustrasi yang bisa kamu buat sendiri untuk menggantikan sebagian gambar itu, apa yang **sudah tersambung** ke kode, dan apa yang
**baru usulan** (butuh kait tambahan di kode).

## Cara memasang aset yang sudah tersambung

1. Taruh berkas di folder `assets/` (mis. `assets/sprites/boss.png`). Gunakan huruf kecil dan **huruf besar-kecil yang sama persis**
   dengan yang ditulis di manifest (GitHub Pages peka huruf besar-kecil).
2. Daftarkan di `assets/manifest.json` (path relatif terhadap `assets/`):

```json
{
  "version": 1,
  "sprites": { "boss": "sprites/boss.png", "portal": "sprites/portal-ring.png", "nest": "sprites/nest.png" },
  "maps":    { "forest": { "landscape": "maps/forest-landscape.webp", "portrait": "maps/forest-portrait.webp" } },
  "ui":      { "wood": "ui/wood.webp", "parchment": "ui/parchment.webp" }
}
```

3. Muat ulang. Entri yang dihapus/dikosongkan otomatis kembali ke gambar bawaan. Manifest dibaca lewat `fetch`, jadi **tidak jalan lewat
   `file://`** (pakai server lokal atau GitHub Pages).

Umum untuk semua gambar: **arah cahaya dari kiri-atas** (bayangan jatuh ke kanan-bawah), format PNG/WebP dengan **latar transparan**
untuk sprite, tanpa tulisan/logo, gaya **datar (flat) 2–3 nada, GELAP** (hutan malam / gunung api / menara penyihir): bentuk bersih, tepi gelap tipis, tanpa gradien berat, tanpa tekstur foto, tanpa tulisan/logo/merek dan tanpa meniru karakter atau UI gim lain.

---

## A. Sudah tersambung (lewat `assets/manifest.json`)

| Kunci manifest | Berkas contoh | Ukuran | Format | Digunakan untuk | Catatan |
|---|---|---|---|---|---|
| `sprites.boss` | `sprites/boss.png` | 512×512 | PNG transparan | Penyihir Jahat (Stage 3, final boss; menggantikan seluruh rig kode `js/render/wizard.js`, jadi animasi jubah/tangan/hancur hilang) | Menghadap depan, pusat gambar = pusat badan; digambar ±2,6× radius bola. Bilah HP, dialog, dan animasi getar tetap dari kode. |
| `sprites.ball` | `sprites/orb.png` | 256×256 | PNG transparan | Badan semua bola sihir | **Satu gambar untuk semua warna** (tidak ada varian warna/rune); angka tetap digambar kode di atasnya. Gunakan hanya bila ingin menimpa total tampilan bola. |
| `sprites.portal` | `sprites/portal-ring.png` | 512×512 | PNG transparan | Cincin portal tempat bola muncul | Hanya cincin/bingkainya (tengah berlubang/transparan); pusaran, sinar, dan partikel tetap dari kode. Cincin diputar pelan. Tepi luar cincin ≈ 96% lebar gambar. |
| `sprites.nest` | `sprites/nest.png` | 512×512 | PNG transparan | Mangkuk sarang telur | Telur (maks. 6, melingkar di ±48% radius) digambar kode di atasnya, jadi biarkan bagian tengah kosong/berjerami. |
| `maps.<id>.landscape` / `.portrait` | `maps/forest-landscape.webp` | 1920×1080 / 1080×1920 | WebP/JPEG | Dasar peta (id: `forest`, `grove`, `volcano`, `crystal`, `tower`, `tower2`, `menu`) | Menggantikan dasar + dekorasi + kolam/altar prosedural. **Alur parit, portal, efek, dan jembatan tetap digambar kode di atasnya.** Jangan melukis alur bola di gambar, dan **jangan menanam portal atau sarang di dalam gambar** (revisi 10): keduanya adalah sprite yang dipasang dari data jalur (portal = titik awal jalur, sarang = titik akhir; posisinya berbeda tiap stage, varian, dan orientasi, selalu berseberangan), dan di sekitarnya (radius sprite + 2R) dekorasi sengaja dikosongkan. Posisi penembak dan bentuk jalur berubah-ubah menurut arketipe, jadi gambar sebaiknya berupa latar tanpa objek penting di tengah maupun di sudut. Dipakai sedikit lebih besar dari layar (cover). |
| `ui.wood` / `ui.stone` / `ui.parchment` | `ui/wood.webp` | 1024×768 | WebP/JPEG | Tekstur bingkai (kayu), kartu kategori (batu), isi panel (perkamen) | Diregangkan satu kali ke tiap panel (tidak perlu seamless); hindari motif besar yang jelas terlihat melar. |

### Contoh deskripsi untuk generator gambar

- **boss.png:** "Evil wizard villain, front view, tall purple pointed hat with gold stars, long white beard, glowing orange eyes, dark purple
  robe, holding a glowing violet orb staff, flat 2-3 tone fantasy illustration, clean dark outline, no gradients, light from upper-left, transparent
  background, no text, 512x512."
- **portal-ring.png:** "Circular ancient stone ring portal frame, carved glowing violet runes, cracked dark grey stone with gold trim, front view,
  empty transparent center, soft rim light from upper-left, transparent background, 512x512."
- **nest.png:** "Top-down large bird nest bowl made of woven golden straw and twigs, warm brown tones, soft shadow underneath, empty center,
  light from upper-left, transparent background, 512x512."
- **forest-landscape.webp:** "Top-down flat-style dark night forest floor, 2-3 tone teal and navy, mossy patches, small stones, mushrooms kept 1.5 ball-widths away from the track,
  no paths, no characters, no text, empty center, 1920x1080."

---

### Splash art halaman awal (revisi 9; tersambung lewat nama berkas, bukan manifest)

Latar halaman awal = **gambar statis** (tanpa animasi). `index.html` memuatnya lewat `<picture>`: potret memakai `splash-portrait.webp`, selain itu `splash-landscape.webp` (`object-fit: cover`, jadi tepi bisa terpotong; tempatkan hal penting di tengah-bawah).

| Berkas | Ukuran | Format | Berat | Catatan |
|---|---|---|---|---|
| `assets/splash/splash-landscape.webp` | 1920×1080 (16:9) | WebP | idealnya < 250 KB (bawaan ±80 KB) | desktop / HP lanskap |
| `assets/splash/splash-portrait.webp` | 1080×1920 (9:16) | WebP | idealnya < 250 KB (bawaan ±80 KB) | HP potret |

- **Gelap-terang sudah "dibakar":** tengah gambar digelapkan (papan menu ±960 px menutupinya) dan tepi diberi vinyet, supaya kartu dan teks terbaca tanpa overlay CSS tambahan. Hindari bagian terang di belakang papan.
- Tanpa teks, logo gim, atau karakter milik pihak lain. Isi bawaan (ORIGINAL): hutan gelap bercahaya, naga penjaga di depan sarang telur, portal ungu dengan siluet penyihir di kejauhan, daun dan kunang-kunang sebagai hiasan diam.
- Bila berkas **tidak ada / gagal dimuat**, `js/splash-art.js` menggambarnya sekali lewat Canvas (tanpa loop) sebagai cadangan. Buat ulang aset bawaan: buka `index.html?debug=splash`, jalankan `await GA.SplashGen.run()` di konsol (server dev `/__save/…` menyimpan `gen-splash-*.png` di `docs/screenshots`; berkasnya sebenarnya WebP, pindahkan dan ganti nama ke `assets/splash/*.webp`).
- Dengan `prefers-reduced-motion` atau Save-Data tidak ada pra-pemuatan tambahan; gambar splash sendiri dimuat berprioritas rendah sehingga tombol bisa diklik lebih dulu.

**Contoh deskripsi untuk generator gambar:**
- **splash-landscape.webp:** "Dark glowing fantasy forest at night, a guardian dragon standing protectively in front of a nest of glowing eggs on the left, distant purple magic portal with a small wizard silhouette on the right, moonlight shafts through tall pines, drifting leaves and fireflies, painterly storybook style, deep teal and violet palette, dark vignette, empty darker center, no text, no logo, no characters from existing franchises, 1920x1080, 16:9."
- **splash-portrait.webp:** "Same scene composed vertically: purple portal and wizard silhouette near the top, dragon curled protectively around glowing eggs near the bottom, dark pine forest in between, fireflies, painterly storybook style, dark vignette, no text, no logo, 1080x1920, 9:16."

## B. Anggaran berat & aturan peta (revisi 11)

| Aset | Anggaran | Catatan |
|---|---|---|
| Satu berkas peta (`maps.<id>.<orientasi>`) | ≤ ~300 KB (WebP) | Hanya peta stage/varian yang sedang dimainkan yang diunduh (peta dibangun malas saat stage dimulai). Gambar dipakai sebagai dasar lapisan STATIS `#bg`; alur bola, bingkai batu, portal, sarang tetap digambar kode di atasnya. |
| Seluruh aset satu stage | ≤ ~1,2 MB | Peta + (bila ada) sprite boss; kode game sendiri ±520 KB JS dan ±43 KB CSS (dimuat malas saat Mulai Main). |
| Splash halaman awal | < 250 KB per berkas | Lihat bagian splash di atas. |
| Penamaan peta (saran) | `maps/<idPeta>-<orientasi>.webp` | mis. `maps/forest-portrait.webp`, `maps/magma-landscape.webp`. Id peta: `forest`, `grove`, `bloom` (Stage 1), `volcano`, `magma`, `crystal` (Stage 2), `tower`, `tower2`, `library` (Stage 3). Daftarkan tiap berkas di `assets/manifest.json` → `maps`. |

Aturan isi peta: palet 2–3 nada; dekorasi (jamur, batu, kristal, retakan lava, lingkaran rune, obor, pilar, panji) ditaruh **≥ 1,5 × radius bola dari alur**; tanpa objek bergerak (daun, air, lava, obor, kabut, kunang-kunang, burung, awan, sinar cahaya); jangan melukis alur, portal, atau sarang.

## C. Sprite yang digambar kode (prarender sekali, hanya `drawImage` per frame)

Semua ini bisa diganti ilustrasi sendiri bila ada kait kodenya (belum ada selain `sprites.boss/ball/portal/nest` di atas). Format sprite pengganti: PNG/WebP transparan, tampak atas untuk naga/bola/telur/sarang, tampak depan untuk penyihir, cahaya dari kiri-atas, tepi gelap tipis `#12101f`.

| Sprite | Berkas kode | Isi | Ukuran usulan | Perintah untuk generator gambar |
|---|---|---|---|---|
| Bola sihir (8 warna) | `js/render/balls.js` | bola datar + motif rune berbeda per warna + plakat angka gelap | 8 × 128×128 | "Flat-style glossy magic orb, top view, 3 tones of {color}, a carved glowing rune {shape} on it, thin dark outline, small white highlight, transparent background, no text." |
| Bola api | `js/render/fire.js` | inti bara gelap, cincin oranye-kuning, 3 lidah api | 1 inti 128×128 + 3 lidah 128×256 | "Flat-style fireball, dark charcoal ember core with a glowing orange-yellow ring, three flame tongues streaming behind, thin dark outline, transparent background." |
| Naga | `js/dragon.js` | badan+ekor+kaki, sayap (2–3 pose), kepala tampak atas 4 ekspresi (moncong, lubang hidung, mata di atas, rahang) | badan 512×576, sayap 336×352, kepala 240×336 | "Top-down view of a green guardian dragon, flat 3-tone style, orange wing membranes, head with snout and nostrils, eyes on top, jaw visible when open, thin dark outline, separate layers, transparent background." |
| Penyihir | `js/render/wizard.js` | jubah, lengan (turun/angkat), kepala 5 ekspresi, tongkat berkristal ungu, siluet kilat | jubah 384×384, kepala 210×240 | "Evil wizard, front view, tall hooded purple robe with ragged hem, pale scarred face with green glowing eyes, bone shoulder pads, crystal staff, flat 3-tone style, thin dark outline, layered, transparent background." |
| Telur | `js/render/eggs.js` | 3 elemen (api/es/hutan) × keadaan ok / terancam / retak / kosong | 6 × 128×160 | "Flat-style dragon egg, {element} pattern, thin dark outline, small highlight, transparent background." |
| Sarang | `js/render/eggs.js` | ring batu/ranting/tulang per tema | 3 × 512×512 | "Top-down dragon nest bowl of twigs and moss ringed with stones, flat 3-tone, empty center, transparent background." |
| Portal | `js/render/portal.js` | cincin batu berukir rune + sprite pusaran | cincin 512×512, pusaran 256×256 | "Top-down ancient stone ring portal, carved violet runes, flat style, empty center, transparent background; separate flat swirl sprite." |
| Rintangan (10 jenis) | `js/hazards.js` | duri, teratai, kristal es, ombak, geyser, batu panas, stalaktit, spora, petir jalur, kelelawar | 10 × 128×128 | "Flat-style hazard sprite, top view, bright warning colours, thin dark outline, transparent background." |
| Bingkai HUD, ikon, tombol | `css/kit.css`, `js/ui/icons.js` | DOM/CSS + SVG | — | Ganti variabel di `Theme.ui` atau SVG di `icons.js`. |
| Musik, ambient & efek suara | `js/audio.js` | disintesis Web Audio (70 efek, 5 ambient, 5 lagu) | OGG/MP3 | Belum ada yang membaca berkas; untuk memakai rekaman, ganti isi fungsi di `SOUNDS`. |

## D. Aset yang paling berdampak bila diganti

1. **Naga penembak**: karakter utama dan paling sering terlihat; sprite lapis sekarang cukup bersih tetapi tetap "vektor".
2. **Peta per stage** (`maps.*`, 9 peta × 2 orientasi): sudah tersambung lewat manifest; hasil ilustrasi langsung terlihat tanpa kerja kode.
3. **Penyihir Jahat** (`sprites.boss` menimpa seluruh sprite berlapis, atau sprite bagian di `wizard.js`).

## E. Daftar placeholder (digambar/disintesis kode, belum aset akhir)

| Area | Sekarang | Berkas kode |
|---|---|---|
| Naga, penyihir | sprite berlapis prarender dari kode | `js/dragon.js`, `js/render/wizard.js` |
| Bola sihir, bola api, bola khusus, telur, sarang, portal | sprite datar prarender | `js/render/balls.js`, `fire.js`, `eggs.js`, `portal.js` |
| Latar peta (9) + dekor | peta datar statis dari kode (`#bg`, sekali per stage/varian/layout) | `js/render/flatmap.js`, `js/maps/themes.js` |
| Rintangan zona (10 jenis) | gambar datar dari kode, peringatan ⚠ + cincin berdenyut | `js/hazards.js` |
| UI kit | DOM/CSS + token `Theme.ui` | `css/kit.css`, `js/ui/kit.js` |
| Ilustrasi cerita | panel kode | `js/story.js` |
| Maskot popup Jeda | naga tidur statis (kode) | `js/dragon.js` (`drawSleeping`) |
| Semua suara | sintesis Web Audio; belum diuji telinga | `js/audio.js` |

## F. Catatan performa & responsif (uji `?test=1`, `?resp=1`, `?debug=perf`)

- Resolusi logis 960×540 / 540×960, diskalakan sampai 2× dan dibatasi `dpr` oleh saklar **Efek** (Hidup 2, Mati 1). Tidak ada lagi tingkat Tinggi/Sedang/Rendah atau mode Otomatis.
- Profil sebelum/sesudah revisi 11: `docs/rev11-laporan.md`. Perintah: `?debug=perf` → `await GA.Perf.run({ stage: 0, secs: 40 })`.
- `?resp=1` lalu `await GA.Resp.check()` memeriksa tiap layar (judul, atur, cara main, menu, pembuka, jeda, hasil) pada ukuran viewport saat ini: kliping teks, target sentuh ≥ 44 px, scroll horizontal.
