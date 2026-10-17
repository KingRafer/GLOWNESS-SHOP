# Keamanan GLOWNESS SHOP — RLS, Edge Function, Backup

Ikuti urutan di bawah (±20–40 menit).

---

## 1. Jalankan SQL di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) → project Anda  
2. **SQL Editor** → New query  
3. Copy seluruh isi file `sql/01-security-rls-backup.sql`  
4. **Run**

Hasil yang diharapkan:
- Tabel: `app_storage`, `app_storage_audit`, `app_backups`
- RLS aktif
- **Tidak ada** policy INSERT/UPDATE untuk role `anon`

---

## 2. Buat secret Edge Function

Dashboard → **Project Settings** → **Edge Functions** → Secrets (atau CLI):

| Nama | Isi |
|------|-----|
| `SUPABASE_URL` | URL project (sudah sering otomatis) |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** key (Settings → API) — **JANGAN** taruh di frontend |
| `STORAGE_WRITE_SECRET` | String acak panjang, contoh: `openssl rand -hex 24` |

---

## 3. Deploy Edge Functions

Install CLI (sekali):

```bash
npm i -g supabase
supabase login
supabase link --project-ref KODE_PROJECT_ANDA
```

Deploy:

```bash
cd GLOWNESS-SHOP-main
supabase functions deploy storage-write --no-verify-jwt
supabase functions deploy backup-create --no-verify-jwt
```

`--no-verify-jwt` dipakai karena toko masih SPA publik (nanti bisa diperketat dengan auth user).

---

## 4. Isi secret di frontend (app.js)

Di `assets/js/app.js`:

```js
const STORAGE_WRITE_SECRET = 'ISI_SAMA_DENGAN_SECRET_DI_SUPABASE';
```

Harus **sama** dengan `STORAGE_WRITE_SECRET` di Edge Function secrets.

> Ini bukan service_role. Ini “kunci tulis” agar orang random tidak bisa panggil function Anda.  
> Untuk keamanan maksimal jangka panjang: pindahkan auth & tulis order ke login server-side.

---

## 5. Redeploy Vercel

Push perubahan `app.js` + folder `supabase/` + `sql/` ke GitHub → Vercel redeploy.

---

## 6. Jadwalkan backup harian

**Opsi A — Supabase Scheduled Function** (jika tersedia di plan Anda):  
panggil `backup-create` setiap hari jam 02:00.

**Opsi B — cron eksternal** (cron-job.org / GitHub Actions):

```bash
curl -X POST "https://PROJECT.supabase.co/functions/v1/backup-create" \
  -H "Authorization: Bearer ANON_KEY" \
  -H "apikey: ANON_KEY" \
  -H "x-glowness-secret: SECRET_ANDA" \
  -H "Content-Type: application/json" \
  -d '{"label":"daily"}'
```

**Opsi C — manual di SQL Editor:**

```sql
SELECT create_app_backup('manual-cek');
SELECT id, label, key_count, created_at FROM app_backups ORDER BY created_at DESC LIMIT 10;
```

---

## 7. Uji

1. Buka toko → buat pesanan / ubah produk  
2. Supabase → Table `app_storage` → data berubah  
3. Table `app_storage_audit` → ada baris baru  
4. Coba **tanpa** secret (atau secret salah) → harus **401**

---

## Apa yang sudah lebih aman?

| Sebelum | Sesudah |
|---------|---------|
| Anon bisa INSERT/UPDATE langsung | Anon **tidak bisa** tulis tabel |
| Tulis dari browser pakai anon key | Tulis lewat **Edge Function + service role** |
| Tidak ada jejak | **Audit log** tiap tulis |
| Tidak ada backup | **Snapshot** + prune 30 terakhir |

## Batasan yang masih ada (jujur)

- Login masih di client (hash password tetap ikut ter-download jika policy SELECT publik).  
  Langkah berikutnya: **auth server-side** (Fase 0 lanjutan / Fase 1).
- `STORAGE_WRITE_SECRET` di frontend bisa dibaca orang teknis — jauh lebih baik daripada public write, tapi bukan setara backend penuh.

---

## Restore dari backup (darurat)

```sql
-- Lihat backup
SELECT id, label, key_count, created_at FROM app_backups ORDER BY created_at DESC;

-- Restore (ganti ID)
DO $$
DECLARE
  snap jsonb;
  k text;
  v jsonb;
BEGIN
  SELECT snapshot INTO snap FROM app_backups WHERE id = 1; -- ganti id
  FOR k, v IN SELECT * FROM jsonb_each(snap)
  LOOP
    INSERT INTO app_storage(key, value, updated_at)
    VALUES (k, v, now())
    ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
  END LOOP;
END $$;
```
