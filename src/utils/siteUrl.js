/**
 * Public site origin helpers for OAuth, email links, SEO.
 *
 * SEO and other public URLs use one canonical production origin.
 *
 * Local dev always prefers localhost:3005 so callbacks don't bounce to prod.
 */

export const PRODUCTION_SITE_ORIGIN = 'https://www.xn--aikeif-zjb.com';

function withProtocol(raw, fallbackProto = 'https') {
  if (!raw) return null;
  const trimmed = String(raw).trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${fallbackProto}://${trimmed}`;
}

function toOrigin(raw, fallbackProto = 'https') {
  try {
    const url = withProtocol(raw, fallbackProto);
    if (!url) return null;
    return new URL(url).origin; // non-ASCII hosts → punycode
  } catch {
    return null;
  }
}

/**
 * Env-based origin (no request context). Safe for build-time / emails.
 */
export function getSiteOrigin() {
  if (process.env.NODE_ENV === 'development') {
    return (
      toOrigin(
        process.env.NEXT_PUBLIC_DEV_SITE_URL ||
          process.env.NEXT_PUBLIC_SITE_URL_DEV ||
          'http://localhost:3005',
        'http'
      ) || 'http://localhost:3005'
    );
  }

  return PRODUCTION_SITE_ORIGIN;
}

/**
 * Prefer the host the user is currently on (critical for multi-domain prod).
 * Falls back to env origin when headers are unavailable.
 */
export async function getRequestOrigin() {
  if (process.env.NODE_ENV === 'development') {
    return getSiteOrigin();
  }

  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host) {
      const origin = toOrigin(`${proto}://${host}`, proto);
      if (origin) return origin;
    }
  } catch {
    // headers() outside a request — fall through
  }

  return getSiteOrigin();
}

export async function getAuthCallbackUrl() {
  return `${await getRequestOrigin()}/auth/callback`;
}

export async function getPasswordResetUrl() {
  return `${await getRequestOrigin()}/reset-password`;
}

/** Cookie options for Supabase SSR on HTTPS production. */
export function getSupabaseCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    path: '/',
    sameSite: 'lax',
    // Required for browsers to store session cookies on HTTPS
    secure: isProd,
  };
}
