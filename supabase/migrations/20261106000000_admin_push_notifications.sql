-- GLOWNESS SHOP: storage untuk Web Push admin.
-- Jalankan di Supabase SQL Editor sebelum deploy Edge Function admin-push.
create table if not exists public.admin_push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_push_sent (
  order_id text primary key,
  sent_at timestamptz not null default now()
);

alter table public.admin_push_subscriptions enable row level security;
alter table public.admin_push_sent enable row level security;

-- Tidak ada policy untuk anon/authenticated. Hanya service_role Edge Function
-- yang dapat membaca/menulis tabel ini.
