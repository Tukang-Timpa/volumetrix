# Volumetrix — Visualisasi Peletakan Muatan

Aplikasi frontend untuk merencanakan & memvisualisasikan peletakan barang
dalam kontainer / mobil box / truck, dengan 6 alur kerja:

1. **Karoseri** — input jenis, dimensi, jumlah (manual/CSV) + tabel dengan status
2. **Armada** — input kendaraan, pilih karoseri, payload, konsumsi BBM
3. **Pengiriman** — input kode pengiriman + status
4. **Barang** — input barang per pengiriman (manual/CSV/**scan QR**), edit/hapus, opsi stackable
5. **Rekomendasi AI** — kartu rekomendasi armada (UI saja, mesin AI backend menyusul). Jika volume muatan melebihi kapasitas satu kendaraan, otomatis muncul opsi "N Kontainer (split muatan)" yang membagi barang ke beberapa armada sekaligus.
6. **Visualisasi 3D** — simulasi penataan step-by-step per kontainer, dengan dukungan multi-kontainer (tab terpisah untuk tiap kendaraan) dan kontrol kecepatan.

## Multi-kontainer (Step 5 & 6)

- Step 5 menghitung estimasi jumlah kontainer yang dibutuhkan dari total volume barang vs kapasitas kontainer, lalu menyusun strategi "N Kontainer (split muatan)" menggunakan algoritma packing yang sama (barang yang tak muat di kontainer pertama otomatis "meluap" ke kontainer berikutnya).
- Strategi yang dipilih di Step 5 otomatis terbawa sebagai daftar kontainer default saat membuka Step 6 untuk pengiriman yang sama.
- Di Step 6, setiap kontainer punya tab, simulasi 3D, dan progress playback sendiri-sendiri. Kontainer bisa ditambah/dihapus manual lewat dropdown "+ Tambah kontainer lain…", berguna kalau ternyata masih ada barang yang belum tertampung (ditandai peringatan kuning).

## Fitur QR Code (Step 4)

- **Scan via kamera** — buka dialog "Scan QR", arahkan kamera ke label QR barang, data otomatis terisi & ditambahkan ke tabel.
- **Scan via upload gambar** — alternatif jika kamera tidak tersedia/diizinkan, unggah foto/screenshot QR.
- **Buat label QR** — setiap baris barang punya tombol ikon QR untuk men-generate & mengunduh label QR (untuk dicetak dan ditempel di kemasan), yang nantinya bisa discan ulang.
- Format data QR: JSON ringkas `{n, p, l, t, b, q, s}` (nama, panjang, lebar, tinggi, berat, quantity, stackable), dengan fallback format teks `nama|panjang|lebar|tinggi|berat|quantity|stackable` untuk label yang ditulis manual.
- Modul scanner (`html5-qrcode`) di-lazy-load — hanya diunduh browser saat dialog Scan QR pertama kali dibuka, supaya tidak membebani waktu muat awal halaman.

## Struktur folder

```
src/
  types/             tipe data (Karoseri, Armada, Pengiriman, Barang, dll)
  lib/               utils.ts (helper umum), packing.ts (algoritma extreme-point)
  context/           AppDataContext — state global pengganti sementara backend
  components/ui/     primitif UI (button, card, table, select, dialog, badge, dll)
  components/layout/ Header, StepNav
  components/steps/  Step1Karoseri ... Step6Visualisasi
```
