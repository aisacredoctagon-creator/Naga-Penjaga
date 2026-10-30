# Revisi 9 · Tahap d + e — rekor dan polish responsif

## d — Rekor
Logika rekor sudah masuk di commit b+c; tahap ini memverifikasinya (tes `?test=1`, alur penuh):
- Chip Rekor = `Storage.highScore` (global; cara hitung dan simpan tidak berubah, data lama utuh, termasuk simpanan v1/v2 → mis. 28975 tetap terbaca dan tampil "28.975").
- Rekor dicatat di akhir permainan (menang Stage 3 atau Game Over); `adv.best0`/`adv.announced` mencegah "Rekor baru!" muncul dua kali setelah Ulangi. Tampil di layar hasil akhir dan overview Game Over.
- Skor yang dicapai di stage yang selesai tetap menaikkan rekor secara diam-diam (tidak hilang bila pemain keluar lewat Menu).
- Chip diperbarui saat halaman awal ditampilkan lagi dan setelah Hapus Data.

## e — Responsif dan polish
`?resp=1` (`GA.Resp.check`) kini juga memeriksa halaman awal: target sentuh ≥ 44 px, papan muat di layar, kartu tidak perlu gulir di lanskap pendek, dan **kata nama kategori tidak terpotong** (diukur dengan canvas + letter-spacing). Bersih di: 1440×900, 1024×768, 768×1024, 932×430, 844×390, 667×375, 390×844, 360×640, 320×568.
Perbaikan dari temuan: nama kategori dipatahkan di tengah kata pada ≤ 360 px dan lanskap kecil (font 11–12 px, tanpa `overflow-wrap:anywhere`), kolom kiri lanskap ≤ 720 px dipersempit, tombol "Mulai Main" tidak membungkus (`nowrap`), ruang atas di lanskap pendek supaya tombol ? dan gerigi tidak menimpa kartu.
Catatan di luar cakupan (popup Jeda tidak diubah): lencana stage di popup Jeda terpotong ("Stage 2 · Gunung &…") pada lebar 320 px; sudah begitu sebelumnya.
Screenshot: `docs/screenshots/rev9-start-{1440x900,390x844,844x390,667x375}.jpg`.
