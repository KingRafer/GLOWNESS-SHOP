# Changelog — GLOWNESS SHOP

## [1.1.2] — 2026-10-16

### Penyimpanan data (penting)
- Data penting (produk, pesanan, user, settings) **selalu** disimpan ke localStorage dulu, lalu dicoba sinkron ke cloud
- `persist()` kini async & menyimpan key kritis secara berurutan (lebih andal)
- Edge Function dicoba meski `STORAGE_WRITE_SECRET` kosong (fallback direct upsert tetap ada)
- Foto produk di-kompres otomatis (JPEG ~900px) agar localStorage tidak penuh
- Guard kuota localStorage: bersihkan meta lama jika penyimpanan penuh + pesan jelas ke admin

### Catatan
- Untuk sinkron multi-device penuh: deploy Edge Function `storage-write` (lihat `docs/SECURITY-SETUP.md`)
- Tanpa Edge Function, data tetap aman di perangkat yang sama

## [1.1.1] — 2026-10-16

### Perbaikan sinkron produk (admin → mitra)
- Bandingkan `updated_at` lokal vs cloud agar produk baru admin tidak tertimpa data cloud lama
- Toast peringatan jika simpan cloud gagal
- Tombol **↻ Sinkron Cloud** di admin Produk
- Simpan produk menunggu hasil cloud sebelum konfirmasi

## [1.1.0] — 2026-10-16

### Keamanan
- Password di-hash (PBKDF2), tidak ditampilkan di admin
- SQL RLS ketat + tabel audit & backup
- Edge Function `storage-write` & `backup-create`
- Panduan: `docs/SECURITY-SETUP.md`

### Perbaikan bug
- Panel admin Pesanan/Pengguna tidak hilang (opacity scroll-reveal)
- Sync data: cloud diprioritaskan + timeout 4 detik (hindari hang)
- Order items null-safe (tidak crash di tabel/riwayat)
- XSS escape pada nama produk & data tampilan

### Fitur
- Tombol **Konfirmasi via WhatsApp** di modal setelah checkout
- Cari & filter status di admin Pesanan
- Manajemen stok produk (admin + validasi keranjang/checkout)
- Badge stok / Habis di katalog
- Cache-bust `?v=` di index.html agar HP tidak stuck versi lama
- Header cache Vercel diperhalus

### Deploy
- Siap static di Vercel (lihat `DEPLOY-VERCEL.md`)

## [1.0.0] — sebelumnya
- Storefront, akun customer, dashboard mitra (matrix), portal staff
- Checkout manual + upload bukti bayar
- Seed data & integrasi Supabase opsional
