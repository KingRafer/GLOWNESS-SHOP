# Deploy GLOWNESS SHOP ke Vercel

Panduan singkat dari zip → live di Vercel.

---

## A. Deploy dari zip (Vercel CLI) — disarankan

### 1. Extract zip
```bash
unzip GLOWNESS-SHOP-vercel.zip
cd GLOWNESS-SHOP-main
```

### 2. Install Vercel CLI (sekali saja)
```bash
npm install -g vercel
```

### 3. Login
```bash
vercel login
```
Ikuti link di terminal, login dengan akun Vercel/GitHub/email.

### 4. Deploy
```bash
vercel
```

Jawaban yang disarankan saat ditanya:
| Pertanyaan | Jawaban |
|------------|---------|
| Set up and deploy? | **Y** |
| Which scope? | akun Anda |
| Link to existing project? | **N** (pertama kali) |
| Project name? | `glowness-shop` (atau bebas) |
| Directory? | `./` (Enter) |
| Want to modify settings? | **N** |

### 5. Production deploy
```bash
vercel --prod
```

Selesai. URL muncul di terminal, contoh:
`https://glowness-shop-xxx.vercel.app`

---

## B. Deploy lewat GitHub (opsional, untuk update mudah)

1. Buat repo baru di GitHub (bisa private).
2. Di folder project:
```bash
git init
git add .
git commit -m "GLOWNESS SHOP production"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```
3. Buka [vercel.com/new](https://vercel.com/new) → Import repo → Deploy.
4. Framework Preset: **Other**. Build Command kosong. Output kosong / `.`

---

## C. Setelah live — checklist penting

### 1. Supabase (wajib jika pakai cloud)
- Buka Supabase → SQL Editor
- Jalankan file `sql/secure-rls.sql` (hapus public write)
- Pastikan `SUPABASE_URL` & `SUPABASE_ANON_KEY` di `assets/js/app.js` benar
- Uncomment script Supabase di `index.html` jika mau sync cloud

### 2. Akun demo (localStorage / seed)
- Owner: `owner@glowness.id` / `owner123`
- Admin: `admin@glowness.id` / `admin123`
- Password sudah di-hash otomatis saat pertama load

### 3. (Opsional) Isi key di `assets/js/app.js`
- `MIDTRANS_CLIENT_KEY`
- `GOOGLE_CLIENT_ID`
- `EMAILJS_*`

### 4. Domain sendiri (opsional)
Vercel → Project → Settings → Domains → Add domain

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Halaman putih | Hard refresh (Ctrl+Shift+R). Cek Console browser. |
| Produk 0 | Pastikan `seed-from-supabase.json` ikut ter-deploy. Buka URL `/seed-from-supabase.json` harus 200. |
| Login gagal | Pastikan password demo benar; clear localStorage lalu reload. |
| CLI error login | `vercel logout` lalu `vercel login` lagi. |

---

## File penting di zip ini

| File | Fungsi |
|------|--------|
| `index.html` | Entry point |
| `assets/js/app.js` | Aplikasi (password sudah di-hash) |
| `seed-from-supabase.json` | Data awal (produk, user, order) |
| `vercel.json` | Header keamanan + cache |
| `sql/secure-rls.sql` | Amankan Supabase RLS |
| `DEPLOY-VERCEL.md` | Panduan ini |
