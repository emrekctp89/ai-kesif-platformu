/**
 * Developer API: single approved tool by slug.
 * GET /api/v1/tools/:slug
 * Authorization: Bearer aik_...
 */

import logger from '@/utils/logger';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { authenticateDeveloperRequest } from '@/lib/developerApiAuth';
import {
  TOOL_DETAIL_SELECT,
  V1_RATE_LIMIT_PER_MINUTE,
  formatToolForApi,
  jsonResponse,
  normalizeToolSlug,
  rateLimitHeaders,
  rateLimitResponse,
} from '@/lib/developerApi';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

export async function GET(request, context) {
  try {
    const clientIp = getClientIp(request);
    const rate = await limiter.check(V1_RATE_LIMIT_PER_MINUTE, `v1-tools-detail:${clientIp}`);

    if (!rate.success) {
      return rateLimitResponse(rate);
    }

    const auth = await authenticateDeveloperRequest(request);
    if (!auth.ok) {
      return jsonResponse({ error: auth.error }, auth.status);
    }

    const params = await context?.params;
    const slug = normalizeToolSlug(params?.slug);
    if (!slug) {
      return jsonResponse({ error: 'Invalid tool slug.' }, 400);
    }

    const supabaseAdmin = createAdminClient();
    const { data: tool, error: toolsError } = await supabaseAdmin
      .from('tools')
      .select(TOOL_DETAIL_SELECT)
      .eq('is_approved', true)
      .eq('slug', slug)
      .maybeSingle();

    if (toolsError) {
      throw toolsError;
    }

    if (!tool) {
      return jsonResponse({ error: 'Tool not found.' }, 404, rateLimitHeaders(rate));
    }

    return jsonResponse(
      {
        data: formatToolForApi(tool, { detail: true }),
        meta: {
          slug,
        },
      },
      200,
      rateLimitHeaders(rate)
    );
  } catch (error) {
    logger.error('API v1 tools/[slug] error:', error);
    return jsonResponse({ error: 'Server error.' }, 500);
  }
}
