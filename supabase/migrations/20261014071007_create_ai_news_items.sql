-- Curated AI news metadata imported from explicitly allow-listed RSS/Atom feeds.
-- We store short excerpts and link to the original publisher; article bodies are not copied.
create table if not exists public.ai_news_items (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  source_name text not null,
  source_url text not null,
  title text not null,
  summary text,
  article_url text not null,
  image_url text,
  published_at timestamptz not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_news_items_source_id_length check (char_length(source_id) between 1 and 80),
  constraint ai_news_items_title_length check (char_length(title) between 1 and 500),
  constraint ai_news_items_summary_length check (summary is null or char_length(summary) <= 1000),
  constraint ai_news_items_article_url_unique unique (article_url)
);

create index if not exists idx_ai_news_items_published
  on public.ai_news_items (published_at desc)
  where is_published = true;

alter table public.ai_news_items enable row level security;

drop policy if exists "Public can read published AI news" on public.ai_news_items;
create policy "Public can read published AI news"
  on public.ai_news_items
  for select
  to anon, authenticated
  using (is_published = true);

-- Service-role writes only. Explicit grants keep the public Data API contract narrow.
revoke all on table public.ai_news_items from anon, authenticated;
grant select on table public.ai_news_items to anon, authenticated;
grant all on table public.ai_news_items to service_role;

create or replace function public.update_ai_news_items_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.update_ai_news_items_updated_at() from public;

drop trigger if exists tr_ai_news_items_updated_at on public.ai_news_items;
create trigger tr_ai_news_items_updated_at
  before update on public.ai_news_items
  for each row
  execute function public.update_ai_news_items_updated_at();
