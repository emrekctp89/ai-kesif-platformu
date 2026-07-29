alter table public.kasif_interactions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists kasif_interactions_user_created_idx
  on public.kasif_interactions (user_id, created_at desc)
  where user_id is not null;

create table if not exists public.kasif_proactive_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  suggestion_key text not null,
  event_type text not null check (event_type in ('shown', 'clicked', 'dismissed')),
  tool_slug text not null,
  context_interaction_id uuid references public.kasif_interactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists kasif_proactive_events_user_created_idx
  on public.kasif_proactive_events (user_id, created_at desc);
create unique index if not exists kasif_proactive_events_once_idx
  on public.kasif_proactive_events (user_id, suggestion_key, event_type);

alter table public.kasif_proactive_events enable row level security;
revoke all on table public.kasif_proactive_events from anon, authenticated, service_role;
grant select, insert on table public.kasif_proactive_events to service_role;

comment on column public.kasif_interactions.user_id is
  'Authenticated owner used only for private, server-side Kâşif personalization.';
comment on table public.kasif_proactive_events is
  'Server-only delivery feedback for Kâşif proactive recommendations.';
