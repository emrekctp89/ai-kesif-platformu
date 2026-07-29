create table if not exists public.kasif_lexicon_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null check (char_length(alias) between 3 and 80),
  target_type text not null check (target_type in ('goal', 'concept')),
  target_key text not null,
  confidence real not null check (confidence between 0 and 1),
  observations integer not null default 1 check (observations > 0),
  source text not null check (source in ('partner', 'gemini')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  example_question text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (alias, target_type, target_key)
);

create index if not exists kasif_lexicon_aliases_active_idx
  on public.kasif_lexicon_aliases (status, target_type, target_key);

alter table public.kasif_lexicon_aliases enable row level security;
revoke all on public.kasif_lexicon_aliases from anon, authenticated;
revoke all on public.kasif_lexicon_aliases from service_role;
grant select, insert, update on public.kasif_lexicon_aliases to service_role;

comment on table public.kasif_lexicon_aliases is
  'Validated user phrases mapped by low-confidence LLM fallback to canonical Kâşif goals/concepts.';
