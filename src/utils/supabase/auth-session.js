/**
 * Auth session helpers — invalid sessions must not 500 the app,
 * and valid chunked cookies must never be deleted by mistake.
 */

/** Cookie names used by @supabase/ssr for the current project. */
export function isSupabaseAuthCookie(name) {
  if (!name?.startsWith('sb-')) return false;
  return (
    name.includes('auth-token') ||
    name.includes('code-verifier') ||
    name.includes('auth-code') ||
    name.endsWith('-auth-token')
  );
}

/**
 * Only clear cookies for fatal session errors — never on network blips.
 * Over-clearing after login makes "login succeeds then instantly logs out".
 */
export function shouldClearSessionOnAuthError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '').toLowerCase();

  if (
    code === 'refresh_token_not_found' ||
    code === 'session_not_found' ||
    code === 'bad_jwt' ||
    code === 'invalid_jwt'
  ) {
    return true;
  }

  return (
    message.includes('refresh token not found') ||
    message.includes('invalid refresh token') ||
    message.includes('invalid jwt') ||
    message.includes('jwt expired')
  );
}

/**
 * Clears Supabase auth cookies on a NextResponse (and optionally request jar).
 */
export function clearSupabaseAuthCookies(request, response) {
  const cookies = request.cookies.getAll();
  for (const { name } of cookies) {
    if (!isSupabaseAuthCookie(name)) continue;
    try {
      request.cookies.delete(name);
    } catch {
      try {
        request.cookies.set(name, '');
      } catch {
        // request cookie jar may be read-only in some runtimes
      }
    }
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
    });
  }
}

/**
 * Safe getUser — never throws. Returns { user, error }.
 */
export async function safeGetUser(supabase) {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { user: null, error };
    }
    return { user: data?.user ?? null, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

/**
 * Patch supabase.auth.getUser so invalid refresh tokens never throw /
 * crash Server Components or actions (would surface as HTTP 500).
 */
export function installSafeAuthGetUser(supabase) {
  if (!supabase?.auth || supabase.auth.__safeGetUserPatched) {
    return supabase;
  }

  const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

  supabase.auth.getUser = async (...args) => {
    try {
      const result = await originalGetUser(...args);
      if (!result?.data) {
        return { data: { user: null }, error: result?.error ?? null };
      }
      return result;
    } catch (error) {
      console.error('[supabase.auth.getUser] recovered from error:', error?.message || error);
      return { data: { user: null }, error };
    }
  };

  supabase.auth.__safeGetUserPatched = true;
  return supabase;
}
