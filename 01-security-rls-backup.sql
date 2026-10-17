-- =====================================================
-- GLOWNESS SHOP — Keamanan: Schema + RLS + Backup + Audit
-- Jalankan di: Supabase Dashboard → SQL Editor (sekali)
-- =====================================================

-- 1) Tabel penyimpanan utama
CREATE TABLE IF NOT EXISTS app_storage (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 2) Tabel audit penulisan (siapa/kapan/key apa)
CREATE TABLE IF NOT EXISTS app_storage_audit (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  action text NOT NULL DEFAULT 'upsert',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_storage_audit_created ON app_storage_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_storage_audit_key ON app_storage_audit (key);

-- 3) Tabel backup snapshot
CREATE TABLE IF NOT EXISTS app_backups (
  id bigserial PRIMARY KEY,
  label text,
  snapshot jsonb NOT NULL,
  key_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_backups_created ON app_backups (created_at DESC);

-- 4) Aktifkan RLS
ALTER TABLE app_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_storage_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_backups ENABLE ROW LEVEL SECURITY;

-- 5) Hapus policy lama yang berbahaya
DROP POLICY IF EXISTS "public write" ON app_storage;
DROP POLICY IF EXISTS "public update" ON app_storage;
DROP POLICY IF EXISTS "public read" ON app_storage;
DROP POLICY IF EXISTS "Enable read access for all users" ON app_storage;
DROP POLICY IF EXISTS "Enable insert for all users" ON app_storage;
DROP POLICY IF EXISTS "Enable update for all users" ON app_storage;
DROP POLICY IF EXISTS "Enable delete for all users" ON app_storage;

-- 6) Policy app_storage
-- Baca: publik (storefront butuh produk/settings; arsitektur KV saat ini juga load users di client)
-- CATATAN: idealnya login pindah ke server agar oliv_users tidak public-readable.
CREATE POLICY "anon_select_app_storage"
ON app_storage FOR SELECT
TO anon, authenticated
USING (true);

-- TIDAK ADA policy INSERT/UPDATE/DELETE untuk anon/authenticated.
-- Penulisan HANYA lewat service_role (Edge Function).

-- 7) Audit & backup: tidak bisa dibaca/tulis oleh anon
-- (service_role bypass RLS secara default)

DROP POLICY IF EXISTS "anon_select_audit" ON app_storage_audit;
DROP POLICY IF EXISTS "anon_select_backups" ON app_backups;
-- sengaja tidak membuat policy → anon tertolak total

-- 8) Fungsi helper: buat backup (bisa dipanggil service_role / SQL cron)
CREATE OR REPLACE FUNCTION public.create_app_backup(p_label text DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snap jsonb;
  cnt int;
  new_id bigint;
BEGIN
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb), count(*)
    INTO snap, cnt
  FROM app_storage;

  INSERT INTO app_backups (label, snapshot, key_count)
  VALUES (COALESCE(p_label, 'manual-' || to_char(now(), 'YYYYMMDD-HH24MISS')), snap, cnt)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Hanya service_role / owner yang boleh eksekusi
REVOKE ALL ON FUNCTION public.create_app_backup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_app_backup(text) TO service_role;

-- 9) Opsional: simpan max 30 backup terakhir (pangkas otomatis)
CREATE OR REPLACE FUNCTION public.prune_app_backups(keep_n int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted int;
BEGIN
  WITH doomed AS (
    SELECT id FROM app_backups
    ORDER BY created_at DESC
    OFFSET greatest(keep_n, 1)
  )
  DELETE FROM app_backups b USING doomed d WHERE b.id = d.id;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.prune_app_backups(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_app_backups(int) TO service_role;

-- 10) Verifikasi
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('app_storage', 'app_storage_audit', 'app_backups');
