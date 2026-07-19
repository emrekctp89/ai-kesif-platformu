-- Content creator program: admin-approved users may submit editorial drafts.

alter table public.profiles
  add column if not exists is_content_creator boolean not null default false;

alter table public.profiles
  add column if not exists content_creator_since timestamptz;

alter table public.profiles
  add column if not exists content_creator_note text;

comment on column public.profiles.is_content_creator is
  'Admin-approved creator who may submit blog/guide drafts for review.';

create index if not exists profiles_is_content_creator_idx
  on public.profiles (is_content_creator)
  where is_content_creator = true;

alter table public.posts
  add column if not exists submitted_at timestamptz;

alter table public.posts
  add column if not exists review_note text;

comment on column public.posts.submitted_at is
  'When a content creator submitted the draft for admin review.';
