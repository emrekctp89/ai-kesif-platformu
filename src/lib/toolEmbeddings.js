import 'server-only';
import { createAdminClient } from '@/utils/supabase/admin';
import { embedGeminiText } from '@/utils/gemini';

export async function refreshMissingToolEmbeddings({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const supabase = createAdminClient();
  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, name, description')
    .eq('is_approved', true)
    .is('embedding', null)
    .order('id', { ascending: true })
    .limit(safeLimit);
  if (error) throw new Error(`TOOL_EMBEDDING_FETCH_FAILED: ${error.message || error.code}`);

  const results = [];
  for (const tool of tools || []) {
    try {
      const embedding = await embedGeminiText(`${tool.name}. ${tool.description || ''}`);
      const { error: updateError } = await supabase
        .from('tools')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', tool.id);
      if (updateError) throw updateError;
      results.push({ id: tool.id, ok: true });
    } catch (error_) {
      results.push({ id: tool.id, ok: false, error: error_?.message || 'Embedding failed' });
    }
  }
  return {
    scanned: (tools || []).length,
    updated: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    hasMore: (tools || []).length === safeLimit,
    results,
  };
}
