alter table public.tools
  add column if not exists link_check_status text;

alter table public.tools
  add column if not exists link_check_error text;

alter table public.tools
  add column if not exists link_check_http_status integer;

alter table public.tools
  add column if not exists link_checked_at timestamptz;

alter table public.tools
  add column if not exists link_deactivated_at timestamptz;

alter table public.tools
  add column if not exists link_deactivation_reason text;
