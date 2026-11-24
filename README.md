# KuliahKu

Aplikasi web untuk mengelola jadwal deadline tugas kuliah dan menghitung IP/IPK secara realtime berdasarkan komponen penilaian maupun nilai akhir semester.

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

## Fitur Utama

### 1. Autentikasi & Multi-User
- Registrasi dan login akun lokal (`/login`)
- Password di-hash menggunakan `scrypt` bawaan Node.js
- Sesi login berbasis cookie `httpOnly` (berlaku 30 hari) dengan pembatasan percobaan login (5 kali gagal terkunci 5 menit)
- Isolasi data per pengguna di folder `data/users/<id>/` (user pertama yang mendaftar otomatis mewarisi data awal di `data/db.json`)

### 2. Dashboard (`/`)
- Ringkasan mata kuliah semester aktif beserta progress penilaian
- Kartu IPK kumulatif dan IP semester berjalan
- Kalender bulanan dengan penanda tanggal deadline
- Daftar deadline terdekat

### 3. Manajemen Tugas (`/tugas`)
- Tambah, edit, tandai selesai, dan hapus tugas (judul, tenggat waktu, mata kuliah, prioritas, serta tautan opsional)
- Integrasi tautan langsung ke halaman tugas Moodle
- Notifikasi pengingat deadline di browser/desktop

### 4. Nilai & IPK (`/nilai`)
- Pengelompokan mata kuliah per semester beserta grafik perkembangan IP
- Dua mode input nilai:
  - **Per komponen** (Kuis, Tugas, UTS, UAS, atau komponen kustom dengan bobot masing-masing)
  - **Nilai akhir** (input langsung huruf mutu untuk semester yang sudah selesai)
- Kalkulator simulasi target nilai akhir pada sisa komponen yang belum terisi

### 5. Integrasi Moodle & Pengaturan (`/pengaturan`)
- Tiga metode sinkronisasi Moodle:
  1. **Login akun** (mengambil token Moodle Mobile Web Service secara langsung tanpa menyimpan password)
  2. **Token manual** (dari *Preferences > Security keys* di Moodle)
  3. **Link kalender `.ics`** (ekspor jadwal deadline dari kalender Moodle)
- Sinkronisasi otomatis setiap 30 menit, impor daftar mata kuliah, pembaruan status pengumpulan tugas, dan pemetaan nilai otomatis ke komponen yang sesuai
- Kustomisasi skala/matriks huruf mutu, interval pengingat deadline, serta pengaturan profil dan password

## Rumus Perhitungan Nilai & IPK

1. **Nilai akhir mata kuliah**: $\frac{\sum (\text{nilai} \times \text{bobot})}{\sum \text{bobot komponen terisi}}$
2. **Konversi huruf mutu**: mengacu pada matriks nilai di halaman Pengaturan (default: A $\ge 85$, A- $\ge 80$, B+ $\ge 75$, B $\ge 70$, B- $\ge 65$, C+ $\ge 60$, C $\ge 55$, D $\ge 40$, E $< 40$)
3. **IP / IPK**: $\frac{\sum (\text{SKS} \times \text{bobot huruf})}{\sum \text{SKS mata kuliah bernilai}}$

## Struktur Direktori

```text
app/
  api/                  # REST API routes (auth, tasks, courses, semesters, settings, moodle)
  login/page.js         # Halaman masuk & pendaftaran akun
  nilai/page.js         # Halaman pengelolaan nilai & grafik IPK
  pengaturan/page.js    # Halaman konfigurasi akun, pengingat, Moodle, & matriks nilai
  tugas/page.js         # Halaman manajemen daftar tugas
  page.js               # Halaman utama (Dashboard)
components/             # Komponen UI reusable & global state (DataProvider)
data/                   # Penyimpanan JSON lokal (db.json & data per user)
lib/                    # Utilitas autentikasi, database, kalkulasi IPK, parser iCal, & klien Moodle
```
