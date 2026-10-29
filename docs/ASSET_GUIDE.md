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
untuk sprite, tanpa tulisan/logo, gaya fantasi kartun-realistis hangat (kayu, batu, emas, rune bercahaya).

---

## A. Sudah tersambung (lewat `assets/manifest.json`)

| Kunci manifest | Berkas contoh | Ukuran | Format | Digunakan untuk | Catatan |
|---|---|---|---|---|---|
| `sprites.boss` | `sprites/boss.png` | 512×512 | PNG transparan | Penyihir Jahat (Stage 3, final boss; menggantikan seluruh rig kode `js/render/wizard.js`, jadi animasi jubah/tangan/hancur hilang) | Menghadap depan, pusat gambar = pusat badan; digambar ±2,6× radius bola. Bilah HP, dialog, dan animasi getar tetap dari kode. |
| `sprites.ball` | `sprites/orb.png` | 256×256 | PNG transparan | Badan semua bola sihir | **Satu gambar untuk semua warna** (tidak ada varian warna/rune); angka tetap digambar kode di atasnya. Gunakan hanya bila ingin menimpa total tampilan bola. |
| `sprites.portal` | `sprites/portal-ring.png` | 512×512 | PNG transparan | Cincin portal tempat bola muncul | Hanya cincin/bingkainya (tengah berlubang/transparan); pusaran, sinar, dan partikel tetap dari kode. Cincin diputar pelan. Tepi luar cincin ≈ 96% lebar gambar. |
| `sprites.nest` | `sprites/nest.png` | 512×512 | PNG transparan | Mangkuk sarang telur | Telur (maks. 6, melingkar di ±48% radius) digambar kode di atasnya, jadi biarkan bagian tengah kosong/berjerami. |
| `maps.<id>.landscape` / `.portrait` | `maps/forest-landscape.webp` | 1920×1080 / 1080×1920 | WebP/JPEG | Dasar peta (id: `forest`, `grove`, `volcano`, `crystal`, `tower`, `tower2`, `menu`) | Menggantikan dasar + dekorasi + kolam/altar prosedural. **Alur parit, portal, efek, dan jembatan tetap digambar kode di atasnya.** Jangan melukis alur bola di gambar; posisi penembak dan bentuk jalur berubah-ubah menurut arketipe, jadi gambar sebaiknya berupa latar tanpa objek di tengah. Dipakai sedikit lebih besar dari layar (cover). |
| `ui.wood` / `ui.stone` / `ui.parchment` | `ui/wood.webp` | 1024×768 | WebP/JPEG | Tekstur bingkai (kayu), kartu kategori (batu), isi panel (perkamen) | Diregangkan satu kali ke tiap panel (tidak perlu seamless); hindari motif besar yang jelas terlihat melar. |

### Contoh deskripsi untuk generator gambar

- **boss.png:** "Evil wizard villain, front view, tall purple pointed hat with gold stars, long white beard, glowing orange eyes, dark purple
  robe, holding a glowing violet orb staff, stylized fantasy cartoon-realistic, soft painted shading, light from upper-left, transparent
  background, no text, 512x512."
- **portal-ring.png:** "Circular ancient stone ring portal frame, carved glowing violet runes, cracked dark grey stone with gold trim, front view,
  empty transparent center, soft rim light from upper-left, transparent background, 512x512."
- **nest.png:** "Top-down large bird nest bowl made of woven golden straw and twigs, warm brown tones, soft shadow underneath, empty center,
  light from upper-left, transparent background, 512x512."
- **forest-landscape.webp:** "Top-down painterly mossy fantasy forest floor, ferns, small stones, fireflies-lit, warm green light from upper-left,
  no paths, no characters, no text, empty center, 1920x1080."

---

## B. Belum tersambung (usulan; perlu kait kode)

Aset berikut paling berdampak bila diganti ilustrasi buatan sendiri, tetapi **belum ada pembaca di kode**. Beri tahu saya bila ingin disambungkan.

| Aset | Ukuran / format | Keterangan |
|---|---|---|
| Naga penembak (spritesheet) | Bagian terpisah 1024×1024 per bagian (kepala, rahang, leher, badan, sayap kiri/kanan, ekor, kaki), PNG transparan | Animasi skeletal sekarang digambar kode (`js/dragon.js`); sprite bagian bisa menggantikan bentuk, animasi pegas tetap. |
| Bola sihir 8 warna | 8 × 256×256 PNG, motif rune berbeda per warna | Perlu kait varian warna per indeks (sekarang `sprites.ball` hanya satu gambar). |
| Bola api (frame animasi) | 8 frame 256×256 PNG transparan | Sekarang 8 frame prosedural di `js/render/fire.js`. |
| Bola khusus (beku, telur emas) | 2 × 256×256 PNG | Sekarang digambar kode (`drawSpecial` di `js/chain.js`). |
| Telur naga | 6 × 128×160 PNG | Dipakai di sarang dan HUD; sekarang dibentuk kode. |
| Bingkai HUD | 1920×160 PNG transparan (bisa 9-slice) | Sekarang bingkai kayu prosedural (`js/ui/hud.js`). |
| Ikon UI | SVG 24×24 | Mudah diganti langsung di `js/ui/icons.js`. |
| Musik, ambient & efek suara | OGG/MP3 | Audio disintesis Web Audio (`js/audio.js`): 70 efek, 5 ambient, 5 lagu per zona. Belum ada yang membaca berkas; untuk memakai rekaman, ganti isi fungsi di `SOUNDS`/`SONGS` dengan pemutaran `AudioBuffer` (nama suara tetap). |

## Tiga aset yang paling berdampak bila diganti

1. **Naga penembak** (`js/dragon.js`): karakter utama, selalu di layar dan paling sering dilihat. Bentuk sekarang dibangun dari kode (cukup bagus, tetapi tetap tampak "vektor"); sprite bagian + animasi pegas yang sudah ada akan langsung terasa lebih premium. Butuh kait kode (bagian B).
2. **Latar peta per zona** (`maps.*`, 12 peta × 2 orientasi): memenuhi seluruh layar dan sudah tersambung lewat manifest, jadi hasil ilustrasi langsung terlihat tanpa kerja kode tambahan.
3. **Penyihir Jahat** (`sprites.boss` atau sprite bagian untuk rig `wizard.js`): klimaks cerita. Rig kode sekarang sudah beranimasi penuh; mengganti dengan satu gambar diam justru menurunkan animasinya, jadi idealnya sprite **bagian** (tudung, wajah, jubah, lengan, tongkat) yang dikaitkan ke rig yang ada (belum ada kaitnya).

## Daftar placeholder (digambar/disintesis kode, belum aset akhir)

| Area | Sekarang | Berkas kode |
|---|---|---|
| Naga, burung | gambar kode (skeletal + pegas), tampak atas | `js/dragon.js`, `js/render/birds.js` |
| Penyihir Jahat | rig kode (kain verlet, IK, tekstur prosedural) | `js/render/wizard.js` |
| Bola sihir, bola api, bola khusus, telur, sarang, portal | sprite/pola prosedural di cache | `js/render/balls.js`, `fire.js`, `eggs.js`, `effects.js` |
| Latar peta (15) + dekor | prosedural berlapis (parallax, kabut, cahaya) | `js/render/background.js`, `decor*.js`, `js/maps/variants.js` |
| Rintangan zona (10 jenis) | gambar kode dengan peringatan berdenyut | `js/hazards.js` |
| UI kit (kayu/batu/perkamen) | tekstur prosedural CSS/canvas | `css/kit.css`, `js/ui/kit.js` |
| Ilustrasi cerita | panel kode | `js/story.js` |
| Mascot popup jeda | masih tampak samping (bukan atas) | `js/ui.js` (`drawMascot`) |
| HUD kanvas | bingkai kayu prosedural, belum memakai gaya kit | `js/ui/hud.js` |
| Semua suara | sintesis Web Audio (70 efek, 5 ambient, 5 lagu); belum diuji telinga | `js/audio.js` |

## Catatan performa & responsif (uji `?test=1` dan `?resp=1`)

- Resolusi logis 960×540 / 540×960, diskalakan sampai 2× dan dibatasi `dpr` per tingkat kualitas (Tinggi 2, Sedang 1,5, Rendah 1). Mode Otomatis menurunkan tingkat bila FPS rata-rata < 50.
- Tekstur kain/kulit/karat/tulang penyihir hanya di kualitas Tinggi; cahaya aditif dan partikel di Sedang ke atas. Stage 3 (boss, rig penyihir + rintangan) adalah stage paling berat pada rasterisasi perangkat lunak.
- `?resp=1` lalu `await GA.Resp.check()` memeriksa tiap layar (judul, atur, cara main, menu, pembuka, jeda, hasil) pada ukuran viewport saat ini. Sudah lolos pada 320×568, 360×640, 568×320, 640×360, 667×375, 768×1024, 1920×1080, 2560×1080.
