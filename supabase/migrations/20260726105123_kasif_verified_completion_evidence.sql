create table if not exists public.kasif_completion_claims (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references public.kasif_interactions(id) on delete cascade,
  tool_slug text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint kasif_completion_claims_tool_slug_check
    check (tool_slug = any (array[
      'hoppycopy', 'adcreative', 'ahrefs-nsfeya', 'google-trends-e1d1nu', 'anyword',
      'copymatic', 'paragraphai', 'longshotai', 'youwrite-ct3syc', 'optimizely',
      'bloomreach', 'demandbase', 'domo', 'callrail', 'adext-ai'
    ]))
);

create index if not exists kasif_completion_claims_interaction_idx
  on public.kasif_completion_claims (interaction_id, created_at desc);
create index if not exists kasif_completion_claims_expiry_idx
  on public.kasif_completion_claims (expires_at)
  where used_at is null;

create table if not exists public.kasif_completion_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.kasif_completion_claims(id) on delete restrict,
  interaction_id uuid not null references public.kasif_interactions(id) on delete cascade,
  provider text not null,
  partner_event_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  payload_hash text not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, partner_event_id),
  unique (claim_id)
);

create index if not exists kasif_completion_events_interaction_idx
  on public.kasif_completion_events (interaction_id, verified_at desc);

alter table public.kasif_completion_claims enable row level security;
alter table public.kasif_completion_events enable row level security;

revoke all on table public.kasif_completion_claims from anon, authenticated;
revoke all on table public.kasif_completion_events from anon, authenticated;
grant select, insert, update on table public.kasif_completion_claims to service_role;
grant select, insert on table public.kasif_completion_events to service_role;

create or replace function public.record_kasif_verified_completion(
  p_token_hash text,
  p_provider text,
  p_partner_event_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_payload_hash text,
  p_funnel jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.kasif_completion_claims%rowtype;
  v_verified_at timestamptz := now();
begin
  if exists (
    select 1 from public.kasif_completion_events
    where provider = p_provider and partner_event_id = p_partner_event_id
  ) then
    return 'duplicate';
  end if;

  select * into v_claim
  from public.kasif_completion_claims
  where token_hash = p_token_hash and tool_slug = p_provider
  for update;

  if not found or v_claim.used_at is not null or v_claim.expires_at < v_verified_at then
    return 'invalid_claim';
  end if;

  insert into public.kasif_completion_events (
    claim_id, interaction_id, provider, partner_event_id, event_type,
    occurred_at, payload_hash, verified_at
  ) values (
    v_claim.id, v_claim.interaction_id, p_provider, p_partner_event_id, p_event_type,
    p_occurred_at, p_payload_hash, v_verified_at
  );

  update public.kasif_interactions
  set funnel = p_funnel
  where id = v_claim.interaction_id;

  update public.kasif_completion_claims
  set used_at = v_verified_at
  where id = v_claim.id;

  return 'verified';
exception
  when unique_violation then
    return 'duplicate';
end;
$$;

revoke all on function public.record_kasif_verified_completion(
  text, text, text, text, timestamptz, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_kasif_verified_completion(
  text, text, text, text, timestamptz, text, jsonb
) to service_role;

comment on table public.kasif_completion_claims is
  'Short-lived, opaque completion claims issued by Kâşif. Service role only.';
comment on table public.kasif_completion_events is
  'Minimal signed partner completion evidence. Raw webhook payloads and claim tokens are not stored.';
