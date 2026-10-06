'use server';

import { rankTools, understandQuestion } from '@/lib/kasif/engine';
import { expandSearchTerms } from '@/lib/kasif/retrieval';
import { createClient } from '@/utils/supabase/actions';
import logger from '@/utils/logger';

function buildSearchFilter(terms, fields) {
  const safeTerms = [
    ...new Set(
      terms
        .flatMap((value) => String(value || '').split(/\s+/))
        .map((value) => value.replace(/[^\p{L}\p{N}-]/gu, ''))
        .filter((value) => value.length >= 2)
    ),
  ].slice(0, 14);

  return safeTerms.flatMap((term) => fields.map((field) => `${field}.ilike.%${term}%`)).join(',');
}

export async function runGlobalSearch(query) {
  const term = typeof query === 'string' ? query.trim().slice(0, 200) : '';
  if (term.length < 2) return { results: [], suggestions: [] };

  try {
    const supabase = await createClient();
    const intent = understandQuestion(term);
    const searchTerms = [term, ...expandSearchTerms(term)];
    const toolFilter = buildSearchFilter(searchTerms, ['name', 'description', 'category_name']);
    const postFilter = buildSearchFilter(searchTerms, ['title', 'description']);
    const [toolsResponse, postsResponse] = await Promise.all([
      toolFilter
        ? supabase
            .from('tools_with_ratings')
            .select(
              'id, name, slug, link, description, pricing_model, is_featured, average_rating, total_ratings, category_name'
            )
            .eq('is_approved', true)
            .or(toolFilter)
            .limit(250)
        : Promise.resolve({ data: [], error: null }),
      postFilter
        ? supabase
            .from('posts')
            .select('title, slug, description')
            .eq('status', 'Yayınlandı')
            .or(postFilter)
            .order('published_at', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (toolsResponse.error && postsResponse.error) throw toolsResponse.error;

    const rankedTools = rankTools(
      (toolsResponse.data || []).map((tool) => ({
        ...tool,
        category: tool.category_name ? { name: tool.category_name } : null,
      })),
      intent,
      10
    );

    return {
      results: [
        ...rankedTools.map(({ record: tool }) => ({
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
    logger.error('Kâşif global search failed:', error.message);
    return { results: [], suggestions: [], error: 'Arama tamamlanamadı. Lütfen tekrar deneyin.' };
  }
}
