create table public.tool_outbound_clicks (
  id bigint generated always as identity primary key,
  tool_id bigint not null references public.tools(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  destination_url text not null,
  placement text not null default 'unknown',
  referrer_path text,
  locale text,
  created_at timestamptz not null default now(),
  constraint tool_outbound_clicks_placement_length check (char_length(placement) between 1 and 80),
  constraint tool_outbound_clicks_locale_length check (locale is null or char_length(locale) <= 12)
);

create index tool_outbound_clicks_tool_created_at_idx
  on public.tool_outbound_clicks (tool_id, created_at desc);

create index tool_outbound_clicks_created_at_idx
  on public.tool_outbound_clicks (created_at desc);

alter table public.tool_outbound_clicks enable row level security;

-- Clicks are written and read only by trusted server-side service-role code.
-- No browser-facing RLS policy is intentionally defined.
revoke all on table public.tool_outbound_clicks from anon, authenticated;
revoke all on sequence public.tool_outbound_clicks_id_seq from anon, authenticated;

create view public.tool_outbound_click_summary
with (security_invoker = true)
as
select
  clicks.tool_id,
  tools.name as tool_name,
  tools.slug as tool_slug,
  count(*)::bigint as click_count,
  count(*) filter (where clicks.created_at >= now() - interval '24 hours')::bigint as clicks_24h,
  count(*) filter (where clicks.created_at >= now() - interval '7 days')::bigint as clicks_7d,
  count(*) filter (where clicks.created_at >= now() - interval '30 days')::bigint as clicks_30d,
  max(clicks.created_at) as last_clicked_at
from public.tool_outbound_clicks as clicks
join public.tools on tools.id = clicks.tool_id
group by clicks.tool_id, tools.name, tools.slug;

revoke all on table public.tool_outbound_click_summary from anon, authenticated;
grant select, insert on table public.tool_outbound_clicks to service_role;
grant usage, select on sequence public.tool_outbound_clicks_id_seq to service_role;
grant select on table public.tool_outbound_click_summary to service_role;
