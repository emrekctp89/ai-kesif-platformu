create or replace function public.get_popular_fallback_content()
returns table (
  result_type text,
  title text,
  description text,
  url text,
  image_url text,
  relevance_score double precision
)
language plpgsql
stable
as $$
begin
  return query
  with popular_tools as (
    select
      'tool'::text as result_type,
      t.name::text as title,
      t.description::text,
      ('/tool/' || t.slug)::text as url,
      null::text as image_url,
      0.4::double precision as relevance_score
    from public.tools_with_ratings t
    where t.is_approved = true
    order by t.total_ratings desc, t.average_rating desc
    limit 2
  ),
  recent_posts as (
    select
      'post'::text as result_type,
      p.title::text,
      p.description::text,
      ('/blog/' || p.slug)::text as url,
      p.featured_image_url::text as image_url,
      0.3::double precision as relevance_score
    from public.posts p
    where p.status = 'Yayınlandı'
    order by p.published_at desc
    limit 2
  )
  select * from popular_tools
  union all
  select * from recent_posts;
end;
$$;
