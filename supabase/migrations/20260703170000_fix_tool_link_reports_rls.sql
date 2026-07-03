create or replace function public.is_approved_tool_for_link_report(target_tool_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tools
    where tools.id = target_tool_id
      and tools.is_approved = true
  );
$$;

revoke all on function public.is_approved_tool_for_link_report(bigint) from public;
grant execute on function public.is_approved_tool_for_link_report(bigint) to anon, authenticated;

drop policy if exists "Anyone can report approved tool links" on public.tool_link_reports;
create policy "Anyone can report approved tool links"
  on public.tool_link_reports
  for insert
  to anon, authenticated
  with check (public.is_approved_tool_for_link_report(tool_id));
