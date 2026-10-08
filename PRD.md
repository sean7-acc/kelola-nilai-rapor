# PRD - Aplikasi Pengelolaan Nilai Berbasis PWA

**Pendukung E-Rapor di SMK Negeri 2 Kasongan**

| Keterangan | Isi |
| --- | --- |
| Status dokumen | Draf 1 (berdasarkan konsep dari peneliti dan hasil observasi awal) |
| Penyusun | Sean Joses Emanuel |
| Metode pengembangan | *Prototype* (tiga tahap, lihat bagian 12) |
| Catatan | Hal bertanda **\[BELUM PASTI\]** menunggu data dari wawancara atau pengujian |

## 1. Ringkasan Produk

Aplikasi Pengelolaan Nilai adalah *Progressive Web App* (PWA) yang membantu guru mengelola nilai komponen siswa, menghitung nilai rapor secara otomatis, lalu menghasilkan daftar nilai yang dapat disalin ke template impor e-rapor. Aplikasi dipasang di laptop guru, berjalan tanpa koneksi internet setelah terpasang, dan menyimpan data secara lokal di browser.

**Tujuan produk:** guru dapat menghitung nilai rapor satu kelas dengan cepat dan tanpa salah hitung, lalu memindahkan hasilnya ke template e-rapor tanpa mengetik ulang.

**Yang bukan tujuan produk:** menggantikan e-rapor, terhubung langsung ke e-rapor atau Dapodik, mengelola jenis penilaian selain nilai rapor mata pelajaran, atau menyediakan rekap terpusat untuk sekolah.

## 2. Latar Belakang dan Masalah

- SMK Negeri 2 Kasongan memakai e-Rapor SMK (terintegrasi Dapodik). Nilai rapor dapat diinput langsung atau diimpor lewat template Excel per kelas dan mata pelajaran.
- E-rapor belum menyediakan perhitungan nilai otomatis. Guru menghitung nilai akhir dari komponen penilaian secara manual sebelum mengisinya ke e-rapor, sehingga rawan salah hitung dan memakan waktu.
- Kepala sekolah menyarankan adanya aplikasi perhitungan nilai otomatis sebagai pendukung e-rapor, dan guru meminta aplikasi yang mudah dijalankan di laptop sendiri.

## 3. Sasaran dan Ukuran Keberhasilan

| No | Sasaran | Ukuran keberhasilan |
| --- | --- | --- |
| S1 | Perhitungan akurat | Nilai rapor hasil aplikasi sama dengan perhitungan manual pada seluruh sampel uji |
| S2 | Mudah digunakan | Guru dapat menyelesaikan alur impor, hitung, dan salin untuk satu kelas tanpa bantuan peneliti |
| S3 | Lebih cepat | Waktu pengolahan satu kelas lebih singkat daripada cara manual (target angka ditetapkan setelah pengukuran awal) **\[BELUM PASTI\]** |
| S4 | Dapat dipakai offline | Setelah terpasang, semua fitur utama berfungsi dalam mode tanpa internet |
| S5 | Cocok dengan e-rapor | Nilai yang ditempel ke template e-rapor, setelah kolom TP diisi guru, berstatus Valid dan berhasil diimpor |

## 4. Pengguna

**Pengguna tunggal: guru mata pelajaran.** Tidak ada peran admin, kepala sekolah, atau siswa di dalam aplikasi.

| Aspek | Keterangan |
| --- | --- |
| Perangkat | Laptop pribadi guru (sistem operasi dan browser perlu dipastikan, target Chrome atau Edge) |
| Kemampuan | Terbiasa memakai aplikasi komputer dan Excel (perlu dibuktikan lewat wawancara) |
| Kebutuhan utama | Menghitung nilai rapor cepat dan benar, lalu menyalinnya ke template e-rapor |
| Kendala | Menghitung manual, rawan salah, waktu lama |

## 5. Lingkup

**Termasuk:**

- Login lokal di laptop guru.
- Impor template Excel e-rapor (hanya dibaca).
- Pengelolaan kelas, mata pelajaran, dan siswa dari template.
- Pengaturan komponen dan bobot nilai.
- Input nilai komponen, perhitungan nilai rapor otomatis, dan penyimpanan.
- Salin nilai ke clipboard dan ekspor daftar nilai.
- Cadangkan dan pulihkan data (JSON).
- Pemasangan sebagai PWA dan mode offline.

**Tidak termasuk:**

- Mengubah, menulis ke, atau menyimpan ulang berkas template e-rapor.
- Pengisian kolom TP (T atau R) dan pemeriksaan status Valid (dilakukan guru di template e-rapor).
- Integrasi langsung dengan e-rapor atau Dapodik.
- Nilai sikap/karakter, ekstrakurikuler, P5, kokurikuler, PKL, UKK, dan nilai transkrip ijazah.
- Cetak rapor.
- Rekap terpusat, sinkronisasi antar perangkat, dan akun admin.

## 6. Alur Pengguna Utama

1. Guru membuka alamat aplikasi di Chrome atau Edge (dengan internet), lalu memasang aplikasi.
2. Guru membuat akun lokal dan masuk.
3. Guru mengimpor template Excel e-rapor untuk satu kelas dan mata pelajaran.
4. Aplikasi membaca judul di baris 1 dan menampilkan kelas serta mata pelajaran untuk dikonfirmasi atau dikoreksi.
5. Guru memilih kelas dan mata pelajaran di form pilihan, lalu daftar siswa tampil.
6. Guru mengatur komponen dan bobot nilai (sekali per kelas dan mata pelajaran).
7. Guru mengisi nilai komponen siswa (per siswa atau dalam tabel kelas), lalu menyimpan.
8. Aplikasi menghitung nilai rapor secara otomatis.
9. Guru menyalin nilai rapor ke clipboard atau mengekspor daftar nilai.
10. **Di luar aplikasi:** guru menempel nilai ke kolom nilai rapor di template e-rapor (Tempel Khusus, Nilai), mengisi TP, memeriksa status Valid, lalu mengimpor ke e-rapor.
11. Guru mencadangkan data secara berkala.

## 7. Kebutuhan Fungsional

Prioritas: **M** = wajib, **S** = sebaiknya ada, **C** = bila waktu cukup.

| ID | Fitur | Deskripsi | Kriteria penerimaan | Prioritas |
| --- | --- | --- | --- | --- |
| FR-01 | Login lokal | Guru membuat akun (nama pengguna dan kata sandi) dan masuk. Data tiap akun terpisah. | Kata sandi tersimpan sebagai hash. Data akun lain tidak terlihat setelah masuk. | M |
| FR-02 | Impor template Excel | Guru memilih berkas .xlsx e-rapor. Aplikasi membaca judul baris 1, NISN, nama siswa, dan urutan siswa. | Daftar siswa dan urutannya sama dengan template. Berkas template tidak diubah. | M |
| FR-03 | Penguraian kelas dan mata pelajaran | Dari judul dengan pola FORMAT IMPORT NILAI RAPOR (mata pelajaran), KELAS (kelas). Hasil ditampilkan untuk dikonfirmasi atau diedit. | Pada template contoh, kelas dan mapel terbaca benar. Jika gagal, tersedia input manual. | M |
| FR-04 | Pilih kelas dan mata pelajaran | Dua pilihan (select), dengan daftar mapel menyesuaikan kelas. | Memilih keduanya menampilkan seluruh siswa yang diimpor. | M |
| FR-05 | Daftar siswa | Menampilkan NISN dan nama siswa sesuai urutan template. Klik siswa membuka halaman nilai siswa. | Urutan sama dengan template. | M |
| FR-06 | Halaman nilai siswa | Kolom untuk mengisi nilai setiap komponen satu siswa. | Nilai tersimpan dan tampil kembali saat halaman dibuka. | M |
| FR-07 | Tabel input nilai per kelas | Baris siswa, kolom komponen, agar input satu kelas lebih cepat. | Mengisi sel menyimpan nilai ke siswa dan komponen yang benar. | S |
| FR-08 | Pengaturan komponen dan bobot | Guru menentukan nama komponen (harian, UTS, UAS, dan lainnya) dan bobotnya per kelas dan mata pelajaran. | Total bobot sesuai aturan sekolah **\[BELUM PASTI\]**. Peringatan jika tidak sesuai. | M |
| FR-09 | Perhitungan nilai rapor | Menghitung nilai rapor dari nilai komponen dan bobot, otomatis setiap nilai berubah. | Hasil sama dengan perhitungan manual pada sampel uji. Pembulatan sesuai aturan sekolah **\[BELUM PASTI\]**. | M |
| FR-10 | Simpan nilai | Tombol untuk menyimpan nilai komponen dan hasil hitung. | Data bertahan setelah aplikasi ditutup dan dibuka lagi. | M |
| FR-11 | Validasi nilai | Nilai harus angka 1 sampai 100 dan tidak kosong sebelum disalin atau diekspor. | Nilai di luar rentang ditolak dengan pesan yang jelas. | M |
| FR-12 | Salin nilai ke clipboard | Menyalin satu kolom nilai rapor sesuai urutan siswa di template. | Hasil tempel di Excel sejajar dengan kolom nilai rapor template. | M |
| FR-13 | Ekspor daftar nilai | Mengunduh berkas berisi NISN, nama, dan nilai rapor (format .xlsx atau .csv, ditentukan saat prototype). | Isi berkas sama dengan data di aplikasi. | M |
| FR-14 | Cadangkan data | Mengunduh seluruh data akun sebagai berkas JSON bernomor versi. | Berkas JSON dapat dipulihkan penuh. | M |
| FR-15 | Pulihkan data | Mengunggah berkas JSON untuk mengembalikan data. | Data setelah pemulihan sama dengan sebelum dicadangkan. Berkas tidak valid ditolak. | M |
| FR-16 | Impor ulang template | Siswa dicocokkan dengan NISN agar tidak ganda. | Impor kedua kali tidak membuat siswa ganda dan nilai yang sudah ada tidak hilang. | S |
| FR-17 | Pemasangan PWA dan offline | Aplikasi dapat dipasang dan semua fitur utama berjalan tanpa internet. | Pengujian mode pesawat berhasil untuk FR-02 sampai FR-15. | M |
| FR-18 | Pengingat cadangan | Pengingat bila sudah lama tidak mencadangkan data. | Pengingat tampil sesuai aturan yang ditetapkan. | C |

## 8. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
| --- | --- |
| Offline | Semua fitur utama berjalan tanpa internet setelah aplikasi terpasang. Internet hanya untuk pemasangan awal dan pembaruan. |
| Kompatibilitas | Chrome dan Edge pada Windows (target utama). Browser dan sistem operasi lain perlu diuji **\[BELUM PASTI\]**. |
| Keamanan dan privasi | Data siswa tidak dikirim ke server. Kata sandi disimpan sebagai hash. Login bersifat pembatas akses lokal, bukan keamanan penuh. |
| Keandalan data | Meminta penyimpanan permanen dari browser. Cadangan JSON menjadi sarana utama pemulihan. |
| Kegunaan | Alur utama dapat dipakai tanpa pelatihan. Pesan kesalahan dalam bahasa Indonesia yang jelas. |
| Kinerja | Daftar satu kelas (sekitar 40 siswa) tampil dan terhitung tanpa jeda yang terasa. Target angka ditetapkan saat pengujian **\[BELUM PASTI\]**. |
| Pemeliharaan | Berkas aplikasi diberi nomor versi. Pembaruan diambil saat guru membuka aplikasi dengan internet. |
| Integritas template | Berkas template tidak pernah ditulis ulang oleh aplikasi. |

## 9. Teknologi dan Arsitektur

- **Antarmuka dan logika:** HTML, CSS, JavaScript.
- **Mode offline:** web app manifest, service worker, dan Cache Storage untuk berkas aplikasi.
- **Penyimpanan data:** IndexedDB (pustaka Dexie.js opsional).
- **Pembacaan Excel:** SheetJS (hanya membaca).
- **Cadangan:** JSON.
- **Hosting:** berkas statis dengan alamat HTTPS, dibutuhkan saat pemasangan awal dan pembaruan. Tempat hosting belum ditentukan **\[BELUM PASTI\]**.
- **Tanpa backend dan tanpa database server.**

### Model data (object store di IndexedDB)

| Object store | Isi utama | Kunci |
| --- | --- | --- |
| pengguna | username, hash kata sandi, garam (salt) | username |
| kelas | nama kelas, pengguna | id otomatis |
| mapel | nama mata pelajaran | id otomatis |
| kelasMapel | kelasId, mapelId, judul asli template | id otomatis |
| siswa | nisn, nama, kelasId, urutan | nisn dan kelas |
| komponen | kelasMapelId, nama, bobot | id otomatis |
| nilai | nisn, komponenId, nilai | id otomatis |

Nilai rapor tidak disimpan permanen, tetapi dihitung dari nilai komponen dan bobot.

## 10. Aturan Bisnis

1. Satu template mewakili satu pasangan kelas dan mata pelajaran.
2. NISN adalah kunci siswa. Impor ulang mencocokkan dengan NISN.
3. Urutan siswa pada salinan dan ekspor mengikuti urutan template.
4. Nilai rapor berupa angka 1 sampai 100 (sesuai template e-rapor yang diamati).
5. Kolom TP dan status validasi di template tidak dikelola aplikasi.
6. Komponen dan bobot mengikuti ketentuan penilaian sekolah **\[BELUM PASTI\]**.

## 11. Asumsi, Risiko, dan Pertanyaan Terbuka

| No | Hal | Dampak | Penanganan |
| --- | --- | --- | --- |
| R1 | Rumus nilai rapor, bobot, dan pembulatan belum diketahui | Fitur perhitungan belum dapat difinalkan | Wawancara waka kurikulum dan guru, minta dokumen penilaian |
| R2 | Tujuan login belum pasti (identitas atau pembatas akses di laptop bersama) | Menentukan perlu tidaknya enkripsi data | Putuskan bersama pembimbing dan guru |
| R3 | Format judul baris 1 mungkin berbeda antar mata pelajaran | Penguraian kelas dan mapel gagal | Uji beberapa template, sediakan koreksi manual |
| R4 | Data hilang bila data situs browser dihapus | Kehilangan nilai | Penyimpanan permanen, cadangan JSON, pengingat cadangan |
| R5 | Lupa kata sandi tidak dapat dipulihkan tanpa server | Akses data terkunci | Pemulihan lewat cadangan JSON, beri tahu pengguna sejak awal |
| R6 | Browser guru tidak mendukung pemasangan PWA | Pengalaman sebagai aplikasi tidak tercapai | Cek browser di laptop guru, siapkan petunjuk |
| R7 | Format template e-rapor berubah di versi mendatang | Pembacaan berkas gagal | Cari kolom berdasarkan teks judul kolom, bukan posisi tetap |
| R8 | Tidak ada rekap terpusat | Kepala sekolah tidak dapat melihat rekap | Dinyatakan sebagai batasan, saran pengembangan lanjutan |
| R9 | Tempat hosting berkas statis belum ada | Aplikasi tidak dapat dipasang | Pilih layanan hosting statis, putuskan sebelum prototype diuji |
| R10 | Keterbiasaan guru memasang aplikasi dari browser belum terbukti | Adopsi rendah | Tanyakan lewat wawancara dan sertakan petunjuk pemasangan |

## 12. Rencana Rilis (Metode *Prototype*)

| Tahap | Isi | Evaluasi dengan guru |
| --- | --- | --- |
| Prototype 1 | Pemasangan PWA, impor template, penguraian kelas dan mapel, pilih kelas dan mapel, daftar siswa | Apakah impor dan tampilan daftar sesuai harapan |
| Prototype 2 | Pengaturan komponen dan bobot, input nilai, perhitungan, simpan, salin dan ekspor | Apakah hasil hitung benar dan alur input nyaman |
| Prototype 3 | Login lokal, cadangkan dan pulihkan, pengingat, penyempurnaan tampilan dan pengujian offline | Penerimaan akhir (UAT) |

## 13. Rencana Pengujian dan Penerimaan

1. **Ketepatan hitung:** bandingkan nilai aplikasi dengan hitungan manual pada beberapa kelas dan mata pelajaran.
2. **Impor template:** uji beberapa template dari mata pelajaran berbeda, termasuk impor ulang.
3. **Offline:** pasang aplikasi, putuskan internet, lalu jalankan seluruh alur utama.
4. **Salin ke template:** tempel nilai ke template e-rapor, isi TP sesuai aturan, pastikan status Valid, lalu impor ke e-rapor.
5. **Cadangan dan pemulihan:** cadangkan, hapus data, pulihkan, lalu bandingkan data.
6. **Kegunaan:** minta beberapa guru menyelesaikan alur utama tanpa bantuan, catat kendala.

## 14. Lampiran

**Pola judul template (dari template contoh):**

FORMAT IMPORT NILAI RAPOR (mata pelajaran), KELAS (kelas)

Contoh: FORMAT IMPORT NILAI RAPOR BAHASA INDONESIA, KELAS KELAS X TSM - REGULER. Kata KELAS tampak ganda pada contoh ini sehingga penguraian perlu membuang pengulangan.

**Letak data pada template contoh:** judul di baris 1, nomor di kolom A, NISN di kolom E, nama siswa di kolom F, nilai rapor di kolom G, kolom TP di kolom H dan seterusnya, validasi di kolom M, data siswa mulai baris 7. Letak ini dapat bergeser, sehingga pencarian kolom memakai teks judul kolom.
