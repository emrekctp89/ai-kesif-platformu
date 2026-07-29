alter table public.kasif_interactions
  add column if not exists embedding vector(768);

create table if not exists public.kasif_goal_candidates (
  id uuid primary key default gen_random_uuid(),
  signature text not null unique,
  label text not null,
  keywords text[] not null default '{}',
  sample_questions text[] not null default '{}',
  interaction_ids uuid[] not null default '{}',
  occurrence_count integer not null default 0 check (occurrence_count >= 0),
  average_similarity real not null default 0 check (average_similarity between 0 and 1),
  centroid vector(768),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kasif_goal_candidates_status_count_idx
  on public.kasif_goal_candidates (status, occurrence_count desc, last_seen_at desc);

alter table public.kasif_goal_candidates enable row level security;
revoke all on public.kasif_goal_candidates from anon, authenticated;
revoke all on public.kasif_goal_candidates from service_role;
grant select, insert, update on public.kasif_goal_candidates to service_role;

comment on table public.kasif_goal_candidates is
  'Weekly embedding clusters proposed for human review before Kâşif lexicon changes.';
