alter table public.tools
add column if not exists is_promoted boolean not null default false,
add column if not exists promoted_until timestamptz;

-- Add an index for querying promoted tools efficiently
create index if not exists tools_is_promoted_idx on public.tools(is_promoted) where is_promoted = true;
