import logger from '@/utils/logger';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { authenticateDeveloperRequest } from '@/lib/developerApiAuth';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  TOOL_LIST_SELECT,
  V1_RATE_LIMIT_PER_MINUTE,
  formatToolForApi,
  jsonResponse,
  parsePositiveIntegerParam,
  rateLimitHeaders,
  rateLimitResponse,
} from '@/lib/developerApi';
import { createAdminClient } from '@/utils/supabase/admin';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

export const dynamic = 'force-dynamic';

// Re-export for unit tests that imported from this module.
export { parsePositiveIntegerParam };

export async function GET(request) {
  try {
    const clientIp = getClientIp(request);
    const rate = await limiter.check(V1_RATE_LIMIT_PER_MINUTE, `v1-tools:${clientIp}`);

    if (!rate.success) {
      return rateLimitResponse(rate);
    }

    const auth = await authenticateDeveloperRequest(request);
    if (!auth.ok) {
      return jsonResponse({ error: auth.error }, auth.status);
    }

    const supabaseAdmin = createAdminClient();
    const url = new URL(request.url);
    const safeLimit = parsePositiveIntegerParam(url.searchParams.get('limit'), DEFAULT_PAGE_SIZE, {
      max: MAX_PAGE_SIZE,
    });
    const safePage = parsePositiveIntegerParam(url.searchParams.get('page'), 1);
    const q = String(url.searchParams.get('q') || '')
      .trim()
      .slice(0, 120);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    let query = supabaseAdmin
      .from('tools')
      .select(TOOL_LIST_SELECT, { count: 'exact' })
      .eq('is_approved', true);

    if (q) {
      // Simple ILIKE search — full Kâşif ranking is available on POST /api/v1/kasif/recommend
      const pattern = `%${q.replace(/[%_,]/g, '')}%`;
      query = query.or(`name.ilike.${pattern},description.ilike.${pattern},slug.ilike.${pattern}`);
    }

    const {
      data: tools,
      error: toolsError,
      count,
    } = await query.order('created_at', { ascending: false }).range(from, to);

    if (toolsError) {
      throw toolsError;
    }

    const formattedTools = (tools || []).map((tool) => formatToolForApi(tool)).filter(Boolean);
    const total = count || 0;

    return jsonResponse(
      {
        data: formattedTools,
        meta: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit) || 0,
          q: q || null,
        },
      },
      200,
      rateLimitHeaders(rate)
    );
  } catch (error) {
    logger.error('API v1 tools error:', error);
    return jsonResponse({ error: 'Server error.' }, 500);
  }
}
