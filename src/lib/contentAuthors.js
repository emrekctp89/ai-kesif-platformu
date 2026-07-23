/**
 * Attach profile author cards to post rows (author_id → profiles).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{ author_id?: string|null }>} posts
 */
export async function attachAuthorsToPosts(supabase, posts) {
  const list = Array.isArray(posts) ? posts : [];
  if (!list.length) return list;

  const ids = [
    ...new Set(
      list.map((p) => p.author_id).filter((id) => typeof id === 'string' && id.length > 0)
    ),
  ];
  if (!ids.length) {
    return list.map((p) => ({ ...p, author: null }));
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, reputation_points')
    .in('id', ids);

  if (error) {
    return list.map((p) => ({ ...p, author: null }));
  }

  const map = new Map((data || []).map((row) => [row.id, row]));
  return list.map((post) => ({
    ...post,
    author: post.author_id ? map.get(post.author_id) || null : null,
  }));
}

/**
 * Display label for a post author.
 * @param {{ author?: { username?: string|null }|null, author_name?: string|null }} post
 * @param {string} [fallback]
 */
export function authorDisplayName(post, fallback = 'AI Keşif') {
  const username = post?.author?.username;
  if (username && String(username).trim()) return String(username).trim();
  if (post?.author_name && String(post.author_name).trim()) return String(post.author_name).trim();
  return fallback;
}

/**
 * Attach tag lists to posts via post_tags.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{ id?: number|string }>} posts
 */
export async function attachTagsToPosts(supabase, posts) {
  const list = Array.isArray(posts) ? posts : [];
  if (!list.length) return list;

  const ids = [...new Set(list.map((p) => p.id).filter((id) => id != null && id !== ''))];
  if (!ids.length) {
    return list.map((p) => ({ ...p, tags: Array.isArray(p.tags) ? p.tags : [] }));
  }

  const { data, error } = await supabase
    .from('post_tags')
    .select('post_id, tag_id, tags(id, name)')
    .in('post_id', ids);

  if (error) {
    return list.map((p) => ({ ...p, tags: Array.isArray(p.tags) ? p.tags : [] }));
  }

  const map = new Map();
  for (const row of data || []) {
    const postId = row.post_id;
    if (!map.has(postId)) map.set(postId, []);
    const tag = row.tags;
    if (tag?.id != null) {
      map.get(postId).push({ id: tag.id, name: tag.name || String(tag.id) });
    } else if (row.tag_id != null) {
      map.get(postId).push({ id: row.tag_id, name: String(row.tag_id) });
    }
  }

  return list.map((post) => ({
    ...post,
    tags: map.get(post.id) || [],
  }));
}

/**
 * Unique tags used by a post list (for filter dropdowns).
 * @param {Array<{ tags?: Array<{ id: number|string, name: string }> }>} posts
 */
export function collectTagsFromPosts(posts) {
  const map = new Map();
  for (const post of posts || []) {
    for (const tag of post.tags || []) {
      if (tag?.id != null && !map.has(tag.id)) {
        map.set(tag.id, { id: tag.id, name: tag.name || String(tag.id) });
      }
    }
  }
  return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
}

/**
 * Attach related tools (post_tools → tools) to a single post or list.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{ id?: number|string }>| { id?: number|string }} posts
 * @returns {Promise<Array>}
 */
export async function attachRelatedToolsToPosts(supabase, posts) {
  const list = Array.isArray(posts) ? posts : posts ? [posts] : [];
  if (!list.length) return list;

  const ids = [...new Set(list.map((p) => p.id).filter((id) => id != null && id !== ''))];
  if (!ids.length) {
    return list.map((p) => ({ ...p, relatedTools: [] }));
  }

  const { data, error } = await supabase
    .from('post_tools')
    .select(
      'post_id, tool_id, tools(id, name, slug, description, logo_url, link, tier, is_featured, is_promoted)'
    )
    .in('post_id', ids);

  if (error) {
    return list.map((p) => ({ ...p, relatedTools: [] }));
  }

  const map = new Map();
  for (const row of data || []) {
    const postId = row.post_id;
    if (!map.has(postId)) map.set(postId, []);
    const tool = row.tools;
    if (tool?.id != null && tool?.slug) {
      map.get(postId).push(tool);
    }
  }

  return list.map((post) => ({
    ...post,
    relatedTools: map.get(post.id) || [],
  }));
}

/**
 * Public published posts by a profile author (for creator profile section).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} authorId
 * @param {{ limit?: number }} [opts]
 */
export async function getPublishedPostsByAuthor(supabase, authorId, opts = {}) {
  if (!authorId) return [];
  const limit = Math.min(Math.max(Number(opts.limit) || 6, 1), 24);
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, slug, description, type, published_at, featured_image_url')
    .eq('author_id', authorId)
    .eq('status', 'Yayınlandı')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

/**
 * Published posts linked to a tool via post_tools (tool detail page).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string|number} toolId
 * @param {{ limit?: number }} [opts]
 */
export async function getPublishedPostsForTool(supabase, toolId, opts = {}) {
  if (toolId == null || toolId === '') return [];
  const limit = Math.min(Math.max(Number(opts.limit) || 4, 1), 12);

  const { data: links, error: linkError } = await supabase
    .from('post_tools')
    .select('post_id')
    .eq('tool_id', toolId)
    .limit(80);

  if (linkError || !links?.length) return [];

  const postIds = [...new Set(links.map((row) => row.post_id).filter((id) => id != null))];
  if (!postIds.length) return [];

  const { data: posts, error: postError } = await supabase
    .from('posts')
    .select('id, title, slug, description, type, published_at, featured_image_url')
    .in('id', postIds)
    .eq('status', 'Yayınlandı')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (postError) return [];
  return posts || [];
}
