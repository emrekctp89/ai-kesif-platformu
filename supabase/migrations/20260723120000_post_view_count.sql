-- Public blog view counter for creator analytics.

alter table public.posts
  add column if not exists view_count integer not null default 0;

comment on column public.posts.view_count is
  'Approximate public page views for published posts (incremented via RPC).';

create index if not exists posts_view_count_idx
  on public.posts (view_count desc)
  where status = 'Yayınlandı';

create or replace function public.increment_post_view(p_slug text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    return 0;
  end if;

  update public.posts
  set view_count = coalesce(view_count, 0) + 1
  where slug = trim(p_slug)
    and status = 'Yayınlandı'
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

revoke all on function public.increment_post_view(text) from public;
grant execute on function public.increment_post_view(text) to anon, authenticated, service_role;
