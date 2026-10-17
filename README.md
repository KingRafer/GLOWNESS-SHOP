# GLOWNESS SHOP

**Versi 1.3.0** — hybrid lokal + cloud (last-write-wins), multi-tab sync, perbaikan matrix/user/XSS.

Toko online + peluang bisnis seller: **belanja di GLOWNESS SHOP, ubah pengeluaran jadi pemasukan.** Fitur: toko, keranjang, checkout multi-pembayaran, akun customer, dashboard seller (kode referral + matrix), dan portal admin.

## Struktur

```text
glowness-shop/
├── index.html
├── package.json
├── assets/
│   ├── css/styles.css
│   ├── js/app.js
│   └── img/
└── README.md
```

## Menjalankan

```bash
npx vite --host 0.0.0.0
```

Atau buka `index.html` lewat web server statis (disarankan `http://localhost`).

## Metode pembayaran (Admin)

Portal Admin → **Metode Pembayaran**. Tambah/edit/nonaktifkan QRIS, GoPay, DANA, OVO, ShopeePay, dan rekening bank (BCA, BRI, Mandiri, BNI, dll). Isi nomor rekening/HP, atas nama, dan unggah gambar QR bila perlu. Hanya metode berstatus **Aktif** yang tampil di checkout. Setelah pesanan dibuat, pembeli melihat instruksi bayar lalu mengunggah foto bukti pembayaran.

## Bukti Pembayaran

- **Pembeli:** setelah pesanan dibuat muncul kolom upload foto bukti. Bisa juga dikirim nanti lewat **Akun → Riwayat Pesanan → Upload Bukti**. Jika ditolak admin, tombol berubah menjadi **Kirim Ulang**.
- **Admin:** Portal Admin → **Pesanan**, kolom **Bukti Bayar** → **Tinjau** → **Konfirmasi Pembayaran** atau **Tolak** (dengan alasan). Menu Pesanan menampilkan badge jumlah bukti yang menunggu.
- Status pembayaran: `Belum Dibayar` → `Menunggu Konfirmasi` → `Terkonfirmasi` / `Ditolak`. Status pesanan (Diproses/Selesai/Dibatalkan) tetap diatur admin secara terpisah.
- Foto dikompres di browser (JPEG maks. 1000px) dan disimpan di key Supabase terpisah `oliv_proof_<idPesanan>`, jadi data pesanan tetap ringan. Pesanan Midtrans tidak memerlukan bukti.

## Referral & Matrix (Seller)

Dashboard Seller → **Referral & Matrix**: kode, link, tombol bagikan WhatsApp, statistik jaringan per level, dan pohon struktur.

- Seller baru bisa memasukkan kode upline saat daftar (atau otomatis terisi dari link `?ref=KODE`).
- Lebar & kedalaman matrix diatur admin di **Pengaturan → Struktur Matrix** (default 3 × 5).
- Jika posisi sponsor penuh, seller baru otomatis ditempatkan di jaringan sponsor (spillover).

## Komisi Pending & Saldo Manual

- Komisi dari order referral (selain yang **Dibatalkan**) otomatis tercatat sebagai **Komisi Pending** di dashboard mitra. Komisi pending **tidak** langsung jadi saldo.
- **Saldo** mitra hanya bertambah saat admin mengisinya manual: Portal Admin → **Mitra** → **+ Isi Saldo** (jumlah + catatan opsional). Angka negatif dipakai untuk koreksi/pengurangan saldo.
- Komisi Pending berkurang sebesar total saldo yang sudah diisi admin. Saldo Bisa Ditarik = total saldo diisi admin − penarikan (Menunggu/Disetujui).
- Pengajuan penarikan ditolak otomatis jika melebihi saldo. Semua pengisian tercatat di **Riwayat Pengisian Saldo** (admin & mitra), disimpan di key Supabase `oliv_balance_logs`.

## Catatan konfigurasi

- Pengaturan Supabase, Midtrans, dan endpoint fungsi ada di `assets/js/app.js`. Tombol Midtrans hanya muncul jika `MIDTRANS_CLIENT_KEY` sudah diisi.
- Key penyimpanan Supabase tetap berawalan `oliv_` agar data lama tidak hilang.
- Jangan menaruh server key / API key rahasia di frontend.


## Versi demo lokal (optimasi)

- Data default disimpan di **localStorage** (buka cepat, tanpa jaringan).
- Produk contoh, order contoh, dan akun demo sudah terisi.
- Akun demo (dari seed):
  - **Owner:** `owner@glowness.id` / `owner123`
  - **Admin:** `admin@glowness.id` / `admin123`
  - (Password di-hash otomatis saat pertama kali dimuat)
- Konfigurasi asli dari proyek (WhatsApp `6285133352577`, URL Supabase, EmailJS, Midtrans) tetap ada di `assets/js/app.js`.
- Untuk sinkron cloud: uncomment script Supabase di `index.html` dan pastikan key valid.
- Mobile-friendly: tap target ≥44px, tanpa Google Fonts, blur dinonaktifkan di layar kecil.


## Database (Supabase)

Data toko diambil dari database live (`app_storage` di Supabase proyek GLOWNESS) pada 11 Okt 2026:

| Koleksi | Jumlah |
|---------|--------|
| Produk | 8 (gambar di `assets/img/products/`) |
| Pengguna | 66 |
| Pesanan | 65 |
| Penarikan | 6 |
| Log saldo | 79 |
| Chat | 6 |
| Metode bayar | GoPay + Bank BCA |

Seed tersedia di `seed-from-supabase.json` dan dimuat otomatis saat localStorage masih kosong.
Prefix localStorage `glowness_v3_db_` memastikan data DB menggantikan demo lama.




## Keamanan (perbaikan)

- **Password di-hash** dengan PBKDF2 (100.000 iterasi, SHA-256) via Web Crypto API. Tidak disimpan plain text.
- Password lama dari seed otomatis di-migrate ke hash saat pertama load.
- Admin **tidak bisa melihat / menyalin** password pengguna.
- Form edit user: field password kosong (hanya untuk reset, bukan menampilkan hash).
- Pencarian pengguna tidak mencakup password.
- Komentar RLS Supabase diperbarui: **jangan** aktifkan public write. Gunakan service role di Edge Functions.
- Catatan: aplikasi frontend-only tetap memiliki batasan keamanan (data di localStorage / anon key). Untuk produksi, pindahkan auth & mutasi sensitif ke backend.

## Login Google

1. Buka [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. **Create Credentials → OAuth client ID → Web application**
3. **Authorized JavaScript origins**: tambahkan origin toko, misalnya:
   - `http://localhost:8080`
   - `https://domain-toko-anda.com`
4. Salin **Client ID**, tempel ke `assets/js/app.js` pada konstanta `GOOGLE_CLIENT_ID`
5. Di modal **Masuk / Daftar** muncul tombol Google resmi

Alur: user pilih akun Google → email & nama dibaca dari token → jika belum ada, akun member dibuat otomatis (bisa bawa kode referral dari `?ref=`) → langsung masuk.

## Lupa password

- Di form Masuk → **Lupa password?** → isi email → kode 6 digit (15 menit)
- **Tanpa EmailJS:** kode ditampilkan di layar (mode demo/lokal)
- **Dengan EmailJS:** isi `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID` dan aktifkan script EmailJS di `index.html` — kode dikirim ke email
- Akun yang **hanya** Login Google (tanpa password) tidak memakai reset password; user diminta masuk lewat Google lagi. Setelah masuk, password bisa diatur di menu **Keamanan** (jika tersedia)
