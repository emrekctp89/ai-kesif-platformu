import 'server-only';
import { createAdminClient } from '@/utils/supabase/admin';
import { embedGeminiText } from '@/utils/gemini';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const MIN_LIMIT = 1;
const DEFAULT_DELAY_MS = 0;
const MAX_DELAY_MS = 5_000;

function clampLimit(limit) {
  return Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, MIN_LIMIT), MAX_LIMIT);
}

function clampDelayMs(delayMs) {
  const value = Number(delayMs);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_DELAY_MS;
  return Math.min(Math.floor(value), MAX_DELAY_MS);
}

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Coverage snapshot for approved catalog tools.
 * Used by cron reports and the offline backfill script.
 */
export async function getToolEmbeddingCoverage(supabase = createAdminClient()) {
  const approved = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('is_approved', true);

  if (approved.error) {
    throw new Error(
      `TOOL_EMBEDDING_COVERAGE_FAILED: ${approved.error.message || approved.error.code}`
    );
  }

  const missing = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('is_approved', true)
    .is('embedding', null);

  if (missing.error) {
    throw new Error(
      `TOOL_EMBEDDING_COVERAGE_FAILED: ${missing.error.message || missing.error.code}`
    );
  }

  const approvedCount = approved.count || 0;
  const missingCount = missing.count || 0;
  const withEmbedding = Math.max(approvedCount - missingCount, 0);
  const coveragePct =
    approvedCount === 0 ? 100 : Math.round((withEmbedding / approvedCount) * 1000) / 10;

  return {
    approved: approvedCount,
    withEmbedding,
    missing: missingCount,
    coveragePct,
    readyForVectorFallback: approvedCount > 0 && coveragePct >= 95,
  };
}

/**
 * Fill missing embeddings for approved tools (idempotent batch).
 * Daily cron and manual ops backfill both use this path.
 */
export async function refreshMissingToolEmbeddings({
  limit = DEFAULT_LIMIT,
  delayMs = DEFAULT_DELAY_MS,
  includeCoverage = false,
} = {}) {
  const safeLimit = clampLimit(limit);
  const safeDelayMs = clampDelayMs(delayMs);
  const supabase = createAdminClient();
  const coverageBefore = includeCoverage ? await getToolEmbeddingCoverage(supabase) : null;

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
      results.push({ id: tool.id, name: tool.name, ok: true });
    } catch (error_) {
      results.push({
        id: tool.id,
        name: tool.name,
        ok: false,
        error: error_?.message || 'Embedding failed',
      });
    }
    await sleep(safeDelayMs);
  }

  const report = {
    scanned: (tools || []).length,
    updated: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    hasMore: (tools || []).length === safeLimit,
    limit: safeLimit,
    delayMs: safeDelayMs,
    results,
  };

  if (includeCoverage) {
    report.coverageBefore = coverageBefore;
    report.coverageAfter = await getToolEmbeddingCoverage(supabase);
  }

  return report;
}
