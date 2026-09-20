# GLOWNESS SHOP

Toko online + peluang bisnis seller: **belanja di GLOWNESS SHOP, ubah pengeluaran jadi pemasukan.** Fitur: toko, keranjang, checkout multi-pembayaran, akun customer, dashboard seller (kode referral + matrix), portal admin, dan asisten bantuan.

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

Portal Admin → **Metode Pembayaran**. Tambah/edit/nonaktifkan QRIS, GoPay, DANA, OVO, ShopeePay, dan rekening bank (BCA, BRI, Mandiri, BNI, dll). Isi nomor rekening/HP, atas nama, dan unggah gambar QR bila perlu. Hanya metode berstatus **Aktif** yang tampil di checkout. Setelah pesanan dibuat, pembeli melihat instruksi bayar lalu konfirmasi via WhatsApp.

## Referral & Matrix (Seller)

Dashboard Seller → **Referral & Matrix**: kode, link, tombol bagikan WhatsApp, statistik jaringan per level, dan pohon struktur.

- Seller baru bisa memasukkan kode upline saat daftar (atau otomatis terisi dari link `?ref=KODE`).
- Lebar & kedalaman matrix diatur admin di **Pengaturan → Struktur Matrix** (default 3 × 5).
- Jika posisi sponsor penuh, seller baru otomatis ditempatkan di jaringan sponsor (spillover).

## Catatan konfigurasi

- Pengaturan Supabase, Midtrans, dan endpoint fungsi ada di `assets/js/app.js`. Tombol Midtrans hanya muncul jika `MIDTRANS_CLIENT_KEY` sudah diisi.
- Key penyimpanan Supabase tetap berawalan `oliv_` agar data lama tidak hilang.
- Jangan menaruh server key / API key rahasia di frontend.
