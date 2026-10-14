-- =====================================================
-- GLOWNESS SHOP — Amankan tabel app_storage (Supabase)
-- Jalankan di: Supabase Dashboard → SQL Editor
-- =====================================================

-- Pastikan tabel ada
CREATE TABLE IF NOT EXISTS app_storage (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Aktifkan RLS
ALTER TABLE app_storage ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama yang terlalu terbuka (jika ada)
DROP POLICY IF EXISTS "public write" ON app_storage;
DROP POLICY IF EXISTS "public update" ON app_storage;
DROP POLICY IF EXISTS "public read" ON app_storage;
DROP POLICY IF EXISTS "Enable read access for all users" ON app_storage;
DROP POLICY IF EXISTS "Enable insert for all users" ON app_storage;
DROP POLICY IF EXISTS "Enable update for all users" ON app_storage;

-- Baca publik (produk, settings, dll) — aman untuk storefront
CREATE POLICY "public read"
ON app_storage
FOR SELECT
USING (true);

-- PENTING:
-- Jangan buat policy INSERT / UPDATE / DELETE untuk role anon.
-- Semua penulisan data (order, user, saldo) sebaiknya lewat
-- Supabase Edge Function dengan SERVICE ROLE KEY (rahasia).
--
-- Service role otomatis bypass RLS — tidak perlu policy write di sini.

-- Cek status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'app_storage';
