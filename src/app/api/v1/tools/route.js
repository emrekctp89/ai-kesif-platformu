import logger from '@/utils/logger';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { createAdminClient } from '@/utils/supabase/admin';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// Initialization moved inside the handler to prevent build-time errors
export const dynamic = 'force-dynamic';

export function parsePositiveIntegerParam(
  value,
  fallback,
  { min = 1, max = Number.MAX_SAFE_INTEGER } = {}
) {
  const parsed = Number.parseInt(value || '', 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}

export async function GET(request) {
  try {
    // Rate limit check — 30 requests per minute per IP
    const clientIp = getClientIp(request);
    const { success: rateLimitOk, limit: rateMax, reset } = await limiter.check(30, clientIp);

    if (!rateLimitOk) {
      const retryAfter = Math.max(Math.ceil((reset - Date.now()) / 1000), 1);

      return jsonResponse(
        {
          error: 'Çok fazla istek gönderildi. Lütfen bir dakika bekleyin.',
          retryAfter,
        },
        429,
        {
          'X-RateLimit-Limit': String(rateMax),
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(retryAfter),
        }
      );
    }

    // We use the admin client because we need to query without RLS for API keys
    const supabaseAdmin = createAdminClient();
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Eksik veya geçersiz Authorization başlığı.' }, 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token.startsWith('aik_')) {
      return jsonResponse({ error: 'Geçersiz API Anahtarı formatı.' }, 401);
    }

    // Hash the provided token to compare with database
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data: apiKey, error: apiKeyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id')
      .eq('key_hash', keyHash)
      .single();

    if (apiKeyError || !apiKey) {
      return jsonResponse({ error: 'Geçersiz veya iptal edilmiş API Anahtarı.' }, 401);
    }

    // Update last_used_at in the background (fire and forget)
    supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          logger.error('API v1 tools: last_used_at update failed:', updateError);
        }
      })
      .catch((updateError) => {
        logger.error('API v1 tools: last_used_at update failed:', updateError);
      });

    // Fetch approved tools
    const url = new URL(request.url);
    const safeLimit = parsePositiveIntegerParam(url.searchParams.get('limit'), DEFAULT_PAGE_SIZE, {
      max: MAX_PAGE_SIZE,
    });
    const safePage = parsePositiveIntegerParam(url.searchParams.get('page'), 1);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const {
      data: tools,
      error: toolsError,
      count,
    } = await supabaseAdmin
      .from('tools')
      .select(
        'id, name, slug, description, website_url, pricing_type, is_verified, created_at, category:categories(name, slug)',
        { count: 'exact' }
      )
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (toolsError) {
      throw toolsError;
    }

    // Flatten category for simpler API response
    const formattedTools = (tools || []).map((tool) => ({
      ...tool,
      category: tool.category?.name || null,
      category_slug: tool.category?.slug || null,
    }));

    const total = count || 0;

    return jsonResponse({
      data: formattedTools,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    logger.error('API v1 tools error:', error);
    return jsonResponse({ error: 'Sunucu hatası.' }, 500);
  }
}
