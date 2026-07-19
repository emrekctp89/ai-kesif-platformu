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
