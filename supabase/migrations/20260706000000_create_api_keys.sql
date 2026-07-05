-- Create api_keys table
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index api_keys_user_id_idx on public.api_keys(user_id);
create index api_keys_key_hash_idx on public.api_keys(key_hash);

-- Enable RLS
alter table public.api_keys enable row level security;

-- RLS Policies
create policy "Users can view their own API keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert their own API keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own API keys"
  on public.api_keys for delete
  using (auth.uid() = user_id);

create policy "Users can update their own API keys"
  on public.api_keys for update
  using (auth.uid() = user_id);
