import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import process from 'node:process';
import { installSafeAuthGetUser } from './auth-session';
import { getSupabaseCookieOptions } from '@/utils/siteUrl';

export const createClient = async (cookieStore) => {
  const store = cookieStore ?? (await cookies());

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              store.set(name, value, options);
            });
          } catch {
            // Server Component — middleware yeniler.
          }
        },
      },
    }
  );

  return installSafeAuthGetUser(supabase);
};
