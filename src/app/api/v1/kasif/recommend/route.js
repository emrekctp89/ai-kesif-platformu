/**
 * Developer API: Kâşif tool recommendations.
 *
 * POST /api/v1/kasif/recommend
 * Authorization: Bearer aik_...
 * Body: { question: string, limit?: number, locale?: 'tr'|'en', history?: {role,content}[] }
 */

import logger from '@/utils/logger';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { authenticateDeveloperRequest } from '@/lib/developerApiAuth';
import {
  V1_RATE_LIMIT_PER_MINUTE,
  jsonResponse,
  parsePositiveIntegerParam,
  rateLimitHeaders,
  rateLimitResponse,
} from '@/lib/developerApi';
import { kasifConfig } from '@/lib/kasif/config';
import { getKasifRecommendations } from '@/lib/kasif/integrations';

export const dynamic = 'force-dynamic';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).flatMap((message) => {
    const role =
      message?.role === 'assistant' ? 'assistant' : message?.role === 'user' ? 'user' : null;
    const content = String(message?.content || '')
      .trim()
      .slice(0, 800);
    return role && content ? [{ role, content }] : [];
  });
}

export async function POST(request) {
  try {
    if (!kasifConfig.enabled) {
      return jsonResponse({ error: 'Kâşif is currently disabled.' }, 503);
    }

    const clientIp = getClientIp(request);
    const rate = await limiter.check(V1_RATE_LIMIT_PER_MINUTE, `v1-kasif:${clientIp}`);

    if (!rate.success) {
      return rateLimitResponse(rate);
    }

    const auth = await authenticateDeveloperRequest(request);
    if (!auth.ok) {
      return jsonResponse({ error: auth.error }, auth.status);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }

    const question = String(body?.question || body?.q || '')
      .trim()
      .slice(0, 800);
    if (question.length < 3) {
      return jsonResponse(
        { error: 'question must be between 3 and 800 characters.' },
        400
      );
    }

    const limit = parsePositiveIntegerParam(body?.limit, 5, { min: 1, max: 10 });
    const locale = String(body?.locale || 'tr').startsWith('en') ? 'en' : 'tr';
    const history = normalizeHistory(body?.history);

    const { recommendations, intent } = await getKasifRecommendations(
      question,
      history,
      limit,
      locale
    );

    return jsonResponse(
      {
        data: {
          question,
          locale,
          recommendations: (recommendations || []).map((item) => ({
            name: item.name,
            slug: item.slug,
            reason: item.reason,
            score: item.score,
            url: item.slug ? `/tool/${item.slug}` : null,
          })),
          intent: intent
            ? {
                goals: intent.goals || [],
                concepts: intent.concepts || [],
                pricingPreference: intent.pricingPreference || null,
              }
            : null,
        },
        meta: {
          engine: 'kasif',
          count: recommendations?.length || 0,
          limit,
        },
      },
      200,
      rateLimitHeaders(rate)
    );
  } catch (error) {
    logger.error('API v1 kasif/recommend error:', error);
    if (error instanceof Error && error.message === 'KASIF_DISABLED') {
      return jsonResponse({ error: 'Kâşif is currently disabled.' }, 503);
    }
    return jsonResponse({ error: 'Server error.' }, 500);
  }
}

/** Lightweight discovery for docs / health. */
export async function GET() {
  return jsonResponse({
    endpoint: 'POST /api/v1/kasif/recommend',
    auth: 'Authorization: Bearer aik_…',
    body: {
      question: 'string (3–800)',
      limit: '1–10 (default 5)',
      locale: 'tr | en',
      history: 'optional [{ role, content }]',
    },
    engine: 'kasif',
    enabled: kasifConfig.enabled,
  });
}
