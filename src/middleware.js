import logger from '@/utils/logger';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import {
  clearSupabaseAuthCookies,
  safeGetUser,
  shouldClearSessionOnAuthError,
} from './utils/supabase/auth-session';
import { getSupabaseCookieOptions } from './utils/siteUrl';

// 1. Initialize next-intl middleware with routing config
const intlMiddleware = createIntlMiddleware(routing);

/**
 * HTTP headers only accept ByteString (code points ≤ 255).
 * IDN hosts like aikeşif.com must be converted to ASCII punycode via URL API.
 */
function toHeaderSafeOrigin(raw) {
  if (!raw) return null;
  const trimmed = String(raw)
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === '*') return null;

  try {
    const withProto =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
    const origin = new URL(withProto).origin; // non-ASCII host → punycode
    // Final guard: reject any remaining non-Latin-1 characters
    if ([...origin].some((ch) => ch.charCodeAt(0) > 255)) return null;
    return origin;
  } catch {
    return null;
  }
}

export async function middleware(request) {
  // 1b. Supabase PKCE sometimes returns `?code=` on Site URL root.
  const { pathname, searchParams } = request.nextUrl;
  const authCode = searchParams.get('code');
  if (authCode && (pathname === '/' || pathname === '/en' || pathname === '/tr')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith('/en') ? '/en/auth/callback' : '/auth/callback';
    return NextResponse.redirect(url);
  }

  // 2. Run next-intl first — must keep this response (locale rewrite).
  let response = intlMiddleware(request);

  // 3. Supabase session refresh on top of the intl response (do NOT replace it).
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookieOptions: getSupabaseCookieOptions(),
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Mutate request so downstream RSC sees refreshed tokens in this pass
              request.cookies.set(name, value);
              // Persist on the intl response (never swap for NextResponse.next())
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await safeGetUser(supabase);
    // Only wipe cookies on fatal auth errors — not every error / missing session.
    if (shouldClearSessionOnAuthError(error)) {
      clearSupabaseAuthCookies(request, response);
    }
  } catch (error) {
    logger.error('[middleware] auth session refresh failed:', error?.message || error);
  }

  // 4. Security headers — CORS (header values must be ByteString / Latin-1)
  // NEXT_PUBLIC_SITE_URL may contain IDN (e.g. aikeşif.com); convert via URL.origin → punycode.
  const allowedOrigin = toHeaderSafeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  );
  if (allowedOrigin && allowedOrigin !== '*') {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 5. Hardening headers — XSS, Clickjacking, MIME-sniffing protection
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|offline\\.html|sw\\.js.*|workbox-.*|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|rss\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
