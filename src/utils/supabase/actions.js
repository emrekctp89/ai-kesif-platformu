import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { installSafeAuthGetUser } from './auth-session';
import { getSupabaseCookieOptions } from '@/utils/siteUrl';

// Optional cookieStore arg is ignored (kept for call-site compatibility).
export const createClient = async (_cookieStore) => {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — middleware will refresh session.
          }
        },
      },
    }
  );

  return installSafeAuthGetUser(supabase);
};
