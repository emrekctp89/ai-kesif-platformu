-- Lightweight key/value ops settings (service role / admin client only).
-- Used for Kâşif soft-landing winner pin without editing env vars.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null
);

alter table public.app_settings enable row level security;

-- No public policies: access only via service role (createAdminClient).

comment on table public.app_settings is
  'Platform ops flags (e.g. kasif_soft_landing_pin). Not user-facing.';
