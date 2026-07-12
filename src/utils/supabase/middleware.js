import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import {
  clearSupabaseAuthCookies,
  safeGetUser,
  shouldClearSessionOnAuthError,
} from './auth-session';

/**
 * Lightweight session refresh helper (legacy import path).
 * Prefer the combined intl+auth middleware in src/middleware.js.
 */
export async function updateSession(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await safeGetUser(supabase);
    if (shouldClearSessionOnAuthError(error)) {
      clearSupabaseAuthCookies(request, response);
    }
  } catch (error) {
    console.error('[updateSession] failed:', error?.message || error);
  }

  return response;
}
