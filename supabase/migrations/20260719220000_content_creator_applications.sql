-- Creator application pitch + timestamp for non-approved users.

alter table public.profiles
  add column if not exists content_creator_applied_at timestamptz;

alter table public.profiles
  add column if not exists content_creator_pitch text;

comment on column public.profiles.content_creator_applied_at is
  'When the user requested content creator access.';

comment on column public.profiles.content_creator_pitch is
  'Short pitch from the user for creator access.';

create index if not exists profiles_content_creator_applied_pending_idx
  on public.profiles (content_creator_applied_at desc)
  where content_creator_applied_at is not null
    and is_content_creator = false;
