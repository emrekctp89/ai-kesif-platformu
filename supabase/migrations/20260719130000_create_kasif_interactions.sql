create table if not exists public.kasif_interactions (
  id uuid primary key default gen_random_uuid(),
  feedback_token uuid not null default gen_random_uuid(),
  question text not null check (char_length(question) between 3 and 800),
  answer text not null,
  source_ids text[] not null default '{}',
  intent jsonb not null default '{}'::jsonb,
  confidence real not null default 0 check (confidence between 0 and 1),
  feedback smallint check (feedback in (-1, 1)),
  created_at timestamptz not null default now(),
  feedback_at timestamptz
);

alter table public.kasif_interactions enable row level security;
revoke all on public.kasif_interactions from anon, authenticated;
revoke all on public.kasif_interactions from service_role;
grant select, insert, update on public.kasif_interactions to service_role;

create index if not exists kasif_interactions_created_at_idx
  on public.kasif_interactions (created_at desc);
create index if not exists kasif_interactions_feedback_idx
  on public.kasif_interactions (feedback) where feedback is not null;
