/**
 * Shared helpers for `/api/v1/*` developer routes.
 */

export const JSON_HEADERS = { 'Content-Type': 'application/json' };
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const V1_RATE_LIMIT_PER_MINUTE = 30;

/** Public list projection for approved tools. */
export const TOOL_LIST_SELECT =
  'id, name, slug, description, website_url, pricing_type, is_verified, created_at, category:categories(name, slug)';

/** Slightly richer projection for single-tool detail. */
export const TOOL_DETAIL_SELECT =
  'id, name, slug, description, website_url, pricing_type, is_verified, created_at, updated_at, category:categories(name, slug)';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/**
 * @param {unknown} value
 * @returns {string|null} normalized slug or null if invalid
 */
export function normalizeToolSlug(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 120);
  if (!slug || !SLUG_RE.test(slug)) return null;
  return slug;
}

/**
 * Flatten nested category for a stable public API shape.
 * @param {object|null|undefined} tool
 * @param {{ detail?: boolean }} [opts]
 */
export function formatToolForApi(tool, opts = {}) {
  if (!tool || typeof tool !== 'object') return null;
  const base = {
    id: tool.id,
    name: tool.name,
    slug: tool.slug,
    description: tool.description ?? null,
    website_url: tool.website_url ?? null,
    pricing_type: tool.pricing_type ?? null,
    is_verified: Boolean(tool.is_verified),
    created_at: tool.created_at ?? null,
    category: tool.category?.name || null,
    category_slug: tool.category?.slug || null,
  };
  if (opts.detail) {
    return {
      ...base,
      updated_at: tool.updated_at ?? null,
      url: tool.slug ? `/tool/${tool.slug}` : null,
    };
  }
  return base;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {{ min?: number, max?: number }} [opts]
 */
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

/**
 * @param {unknown} payload
 * @param {number} [status]
 * @param {Record<string, string>} [headers]
 */
export function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}

/**
 * @param {{ limit: number, remaining: number, reset: number }} rate
 */
export function rateLimitHeaders(rate) {
  return {
    'X-RateLimit-Limit': String(rate.limit),
    'X-RateLimit-Remaining': String(Math.max(0, rate.remaining ?? 0)),
  };
}

/**
 * Standard 429 payload for v1 routes.
 * @param {{ limit: number, remaining?: number, reset: number }} rate
 */
export function rateLimitResponse(rate) {
  const retryAfter = Math.max(Math.ceil((rate.reset - Date.now()) / 1000), 1);
  return jsonResponse(
    {
      error: 'Too many requests. Please wait a minute.',
      retryAfter,
    },
    429,
    {
      ...rateLimitHeaders({ ...rate, remaining: 0 }),
      'Retry-After': String(retryAfter),
    }
  );
}
