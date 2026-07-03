create table if not exists public.tool_link_reports (
  id bigint generated always as identity primary key,
  tool_id bigint not null references public.tools(id) on delete cascade,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reporter_email text,
  reported_url text not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists tool_link_reports_status_created_at_idx
  on public.tool_link_reports(status, created_at desc);

create index if not exists tool_link_reports_tool_id_idx
  on public.tool_link_reports(tool_id);

alter table public.tool_link_reports enable row level security;

drop policy if exists "Anyone can report approved tool links" on public.tool_link_reports;
create policy "Anyone can report approved tool links"
  on public.tool_link_reports
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.tools
      where tools.id = tool_link_reports.tool_id
        and tools.is_approved = true
    )
  );

-- Reports are reviewed through service-role server actions/admin pages.
-- No public SELECT/UPDATE/DELETE policy is intentionally defined.
