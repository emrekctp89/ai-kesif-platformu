create table if not exists public.tool_comments (
  id bigint generated always as identity primary key,
  tool_id bigint not null references public.tools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.tool_comments enable row level security;

-- Policies
create policy "Anyone can read tool_comments"
  on public.tool_comments for select
  using (true);

create policy "Authenticated users can insert tool_comments"
  on public.tool_comments for insert
  with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Users can update their own comments"
  on public.tool_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.tool_comments for delete
  using (auth.uid() = user_id);

-- Enable realtime for tool_comments
begin;
  -- remove the supabase_realtime publication if it exists (it's built-in, but we just add our table to it)
  -- The standard way to enable realtime for a table in Supabase is to add it to the supabase_realtime publication.
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.tool_comments;

-- Also create a view with user profiles for easier querying
create or replace view public.tool_comments_with_users as
select
  tc.id,
  tc.tool_id,
  tc.user_id,
  tc.content,
  tc.created_at,
  tc.updated_at,
  p.full_name,
  p.avatar_url
from public.tool_comments tc
left join public.profiles p on tc.user_id = p.id;
