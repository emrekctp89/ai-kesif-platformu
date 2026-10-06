'use server';

import { runAdvancedOmniSearch } from './ai';
import { createClient } from '@/utils/supabase/actions';
import logger from '@/utils/logger';

export async function runGlobalSearch(query) {
  const term = typeof query === 'string' ? query.trim().slice(0, 200) : '';
  if (term.length < 2) return { results: [], suggestions: [] };

  try {
    const response = await runAdvancedOmniSearch(term);
    if (response && !response.error) return response;
  } catch {
    // Keep tool-name search available when semantic search is unavailable.
  }

  try {
    const supabase = await createClient();
    const pattern = term.replace(/[\\%_]/g, '\\$&');
    const [toolsResponse, postsResponse] = await Promise.all([
      supabase
        .from('tools')
        .select('name, slug, description')
        .eq('is_approved', true)
        .ilike('name', `%${pattern}%`)
        .order('name')
        .limit(10),
      supabase
        .from('posts')
        .select('title, slug, description')
        .eq('status', 'Yayınlandı')
        .ilike('title', `%${pattern}%`)
        .order('published_at', { ascending: false })
        .limit(10),
    ]);
    if (toolsResponse.error && postsResponse.error) throw toolsResponse.error;

    return {
      results: [
        ...(toolsResponse.data || []).map((tool) => ({
          title: tool.name,
          description: tool.description,
          url: `/tool/${encodeURIComponent(tool.slug)}`,
          result_type: 'Tool',
        })),
        ...(postsResponse.data || []).map((post) => ({
          title: post.title,
          description: post.description,
          url: `/blog/${encodeURIComponent(post.slug)}`,
          result_type: 'Post',
        })),
      ],
      suggestions: [],
    };
  } catch (error) {
    logger.error('Global search fallback failed:', error.message);
    return { results: [], suggestions: [], error: 'Arama tamamlanamadı. Lütfen tekrar deneyin.' };
  }
}
