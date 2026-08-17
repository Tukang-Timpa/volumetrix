Summary

Hackathon project (tema Logistik) - sistem smart packaging AI untuk optimasi muatan armada, FastAPI+Supabase,  visualisasi 3D

Details
Ide & tujuan
Sedang mengerjakan proyek untuk lomba hackathon implementasi AI dengan tema Logistik (nama folder project: compfest)
Ide: sistem smart packaging dengan fitur input armada, data armada disimpan
User dapat menginput list barang yang akan dikirim beserta ukuran dimensinya
Menggunakan algoritma P3DBP (py3dbp) untuk penyusunan barang ke kargo armada
Berencana memakai LLM untuk mengatur constraint/sorting (distribusi berat, barang pecah belah) sebelum data dikirim ke P3DBP, karena P3DBP sendiri tidak mempertimbangkan parameter tersebut
Mempertimbangkan pakai img2threejs untuk generate bentuk 3D kendaraan dari gambar armada, karena ukuran kargo/karoseri tiap armada berbeda-beda
Ingin AI juga bisa menentukan armada yang cocok untuk kasus pengiriman tertentu agar efisien
Waktu pengerjaan tersisa 2 minggu (dihitung sejak 12 Agustus 2026)
Stack & struktur project
Stack backend: FastAPI + PostgreSQL, pakai Supabase untuk PostgreSQL-nya
Struktur project pakai package app.postgresql (bukan app.database/app.models biasa): app/postgresql/database.py, app/postgresql/schema/armada.py, app/postgresql/schema/pengiriman.py, app/postgresql/schema/packing.py
Logic P3DBP ditaruh di app/py3dbp/p3dbp_service.py dengan fungsi pack()
Endpoint barang bersifat flat di /barang (bukan nested di bawah /pengiriman/{id}/barang), pengiriman_id dikirim lewat body/query param
Skema data (versi terbaru dari user)
Tabel Karoseri dipisah dari Armada: field jenis_karoseri, panjang, lebar, tinggi, bahan, warna, model_3d_template
Tabel Armada: nama_kendaraan, jenis_armada (free text), max_payload, karoseri_id (FK), konsumsi_bahan_bakar, status, model_3d_template, timestamps
Router CRUD sudah dibuat lengkap untuk karoseri, armada, pengiriman, barang (masing-masing dengan POST/GET/PUT/DELETE)
Tabel Barang field lengkap: nama_barang, bentuk_barang (kotak/silinder/bola/dll), panjang, lebar, tinggi, berat, quantity, kategori, is_fragile, butuh_pendingin, orientable (boleh diputar rotasinya atau tidak)
Status implementasi
Semua endpoint CRUD (karoseri, armada, pengiriman, barang) sudah selesai dibuat oleh user
Endpoint run-packing dan get_visualisation (path: /pengiriman/{id}/visualisation) sudah diimplementasikan sendiri oleh user, memanggil pack() dari app.py3dbp.p3dbp_service
User memilih untuk memperbaiki/menyesuaikan endpoint sendiri, bukan selalu pakai kode yang diberikan
Layer AI (constraint & rekomendasi)
Untuk LLM constraint layer, user memakai LangGraph sebagai framework orkestrasi, dengan Groq sebagai provider LLM-nya
Rekomendasi armada yang diinginkan berbentuk strategi pengiriman (bukan cuma 1 armada terbaik) -- misal opsi 1 truk besar vs 2 truk kecil, mempertimbangkan kebutuhan pendingin barang, berat, kapasitas muatan, dan konsumsi bensin
Isu yang sudah beres
Bug visualisasi "manjang keluar" (kondisi terbalik di get_visualisation + bug tukar parameter di _dimension_after_rotation) sudah berhasil diperbaiki user, visualisasi P3DBP sekarang sudah jalan dengan benar
Tools bantu yang sudah dibuat (oleh Claude, disimpan user)
Ada web test console (test-console.html) untuk uji semua endpoint (karoseri, armada, pengiriman, barang, run-packing) sekaligus visualisasi 3D dengan animasi peletakan barang
Ada standalone 3D visualizer (packing-visualizer.html) yang menerima JSON hasil endpoint visualisasi