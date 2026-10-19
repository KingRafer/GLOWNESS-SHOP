# Changelog — GLOWNESS SHOP

## [1.4.0] — 2026-10-19

### Fitur baru
- **Notifikasi perangkat admin** (Browser Notification + Service Worker)
  - Saat mitra/pengunjung **membuat pesanan**, admin yang login di perangkat mendapat notifikasi sistem
  - Saat mitra **mengajukan penarikan dana**, notifikasi masuk ke perangkat admin
  - Saat ada **chat baru ke admin**, notifikasi muncul dengan preview pesan
  - Klik notifikasi membuka portal terkait (Pesanan / Penarikan / Chat)
  - Permission diminta otomatis saat login sebagai admin/owner
  - Polling soft (~35 detik) + multi-tab sync agar event dari perangkat mitra lain ikut terdeteksi (mode hybrid cloud)
  - Data lama tidak memicu spam: bootstrap "sudah dilihat" saat setup

### PWA
- Service Worker menangani `notificationclick` dan `push` (siap VAPID nanti)
- Cache bump ke `glowness-shop-v1.4.0-pwa`


## [1.3.0] — 2026-10-17

### Perbaikan & Live-ready
- **Sinkron hybrid lokal + cloud** diaktifkan kembali dengan *last-write-wins* (`updated_at`)
  - LocalStorage tetap primary; cloud dipakai jika Supabase + Edge Function `storage-write` + `STORAGE_WRITE_SECRET` aktif
  - Mencegah data lokal tertimpa versi cloud yang lebih lama (bug utama 1.1.x)
- **Multi-tab sync**: perubahan di satu tab otomatis ter-reflect di tab lain (storage event)
- **Hapus user** sekarang *reparent* anak matrix (jaringan tidak patah)
- **Matrix placement** menghormati batas `depth` (tidak BFS tanpa batas)
- **Rate limit login** disimpan di `sessionStorage` (lebih tahan refresh halaman)
- **XSS hardening**: `escAttr()` untuk string di atribut/onclick
- Pembersihan localStorage saat kuota penuh juga menyentuh `oliv_proof_*` lama
- Tombol **Muat Ulang Data** + **Backup Cloud** di Pengaturan admin
- UI mode penyimpanan menampilkan HYBRID vs LOKAL sesuai konfigurasi

### Catatan deploy live
1. Deploy Edge Function `storage-write` & `backup-create`
2. Set secret `STORAGE_WRITE_SECRET` di Supabase + isi konstanta yang sama di `assets/js/app.js`
3. Jalankan `sql/secure-rls.sql`
4. Deploy ke Vercel (lihat DEPLOY-VERCEL.md)

## [1.2.0] — 2026-10-16

### Fitur baru
- **Audit Log** lengkap di Portal Admin (`#/portal/audit`)
  - Mencatat login/gagal login, logout, daftar, pesanan (buat/status/hapus/konfirmasi bayar), produk, pengguna, saldo, komisi pending, penarikan, profil, kata sandi, ekspor
  - Filter by aksi / aktor / pencarian teks
  - Ekspor JSON audit + CSV pesanan
  - Bersihkan entri >30 hari
  - Ringkasan aktivitas terbaru di Dashboard
- **Rate limit login** client-side (5 gagal → cooldown 60 detik)
- **ID pesanan** lebih unik (`timestamp base36 + random`) — mengurangi bentrok
- **Stok dikembalikan** otomatis saat status pesanan → Dibatalkan

### Perbaikan bug
- XSS kecil di hint kode referral checkout (`refCode` sekarang di-escape)
- Beberapa mutasi penting sekarang punya jejak audit yang konsisten

### Catatan
- Audit log disimpan di localStorage (`oliv_audit_logs`), maks. 500 entri
- Cloud sync tetap dinonaktifkan (stabilitas data lokal) seperti 1.1.3

## [1.1.3] — 2026-10-16

### Perbaikan kritis: produk hilang setelah refresh
- **Sinkron cloud dinonaktifkan** — data produk/pesanan/user/settings hanya di localStorage
- Saat refresh, data cloud **tidak lagi menimpa** data lokal
- Tombol "Sinkron Cloud" di admin Produk dihapus
- Toast simpan produk: "Produk disimpan" (tanpa pesan cloud)

### Catatan
- Data tersimpan di browser/perangkat yang sama (localStorage)
- Membersihkan cache browser / ganti browser = data lokal hilang (normal untuk mode lokal)

## [1.1.2] — 2026-10-16

### Penyimpanan data (penting)
- Data penting selalu disimpan ke localStorage dulu
- `persist()` async & key kritis berurutan
- Foto produk dikompres otomatis (JPEG ~900px)
- Guard kuota localStorage

## [1.1.1] — 2026-10-16

### Perbaikan sinkron produk (admin → mitra)
- Bandingkan `updated_at` lokal vs cloud
- Toast peringatan jika simpan cloud gagal
- Tombol Sinkron Cloud di admin Produk

## [1.1.0] — 2026-10-16

### Keamanan & fitur
- Password PBKDF2, RLS, Edge Function
- Stok produk, filter pesanan, WhatsApp konfirmasi

## [1.0.0] — sebelumnya
- Storefront, akun, dashboard mitra, portal staff
