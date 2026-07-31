create table if not exists public.kasif_proactive_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.kasif_proactive_preferences enable row level security;

revoke all on table public.kasif_proactive_preferences from anon, authenticated, service_role;
grant select, insert, update on table public.kasif_proactive_preferences to service_role;

comment on table public.kasif_proactive_preferences is
  'Server-only authenticated user preference for private Kâşif personalization.';
comment on column public.kasif_proactive_preferences.enabled is
  'False means proactive suggestions are disabled for this user.';
