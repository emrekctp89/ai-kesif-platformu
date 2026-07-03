create table if not exists public.admin_alerts (
  id bigint generated always as identity primary key,
  alert_type text not null,
  description text not null,
  status text not null default 'Açık',
  link text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.admin_alerts
  add column if not exists alert_type text;

alter table public.admin_alerts
  add column if not exists description text;

alter table public.admin_alerts
  add column if not exists status text default 'Açık';

alter table public.admin_alerts
  add column if not exists link text;

alter table public.admin_alerts
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.admin_alerts
  add column if not exists created_at timestamptz not null default now();

alter table public.admin_alerts
  add column if not exists resolved_at timestamptz;

create index if not exists admin_alerts_status_created_at_idx
  on public.admin_alerts(status, created_at desc);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.notifications
  add column if not exists event_type text;

alter table public.notifications
  add column if not exists message text;

alter table public.notifications
  add column if not exists link text;

alter table public.notifications
  add column if not exists is_read boolean not null default false;

alter table public.notifications
  add column if not exists created_at timestamptz not null default now();

create index if not exists notifications_user_unread_created_at_idx
  on public.notifications(user_id, is_read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
