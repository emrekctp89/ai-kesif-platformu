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
    console.error('[middleware] auth session refresh failed:', error?.message || error);
  }

  // 4. Security headers
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js.*|workbox-.*|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|rss\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
