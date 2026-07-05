-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector with schema public;

-- Add embedding column to tools table
alter table public.tools
add column if not exists embedding vector(768);

-- Create an index to speed up similarity search
-- Note: ivfflat or hnsw can be used. For small datasets, exact search is fine without index, 
-- but let's add an HNSW index which is best practice for cosine distance.
create index if not exists tools_embedding_idx 
on public.tools 
using hnsw (embedding vector_cosine_ops);

-- Create a function to search for tools
create or replace function public.match_tools(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  name text,
  slug text,
  description text,
  similarity float
)
language sql
stable
as $$
  select
    tools.id,
    tools.name,
    tools.slug,
    tools.description,
    1 - (tools.embedding <=> query_embedding) as similarity
  from public.tools
  where 1 - (tools.embedding <=> query_embedding) > match_threshold
    and tools.is_approved = true
  order by tools.embedding <=> query_embedding
  limit match_count;
$$;
