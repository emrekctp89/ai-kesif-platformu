import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import process from 'node:process';
// Bu istemci, sunucu bileşenlerinde kullanılmak üzere tasarlanmıştır.
// Tarayıcı bileşenlerinde kullanılmamalıdır, çünkü tarayıcıda cookies erişimi yoktur.

export const createClient = async (cookieStore) => {
  const store = cookieStore ?? (await cookies());

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return store.get(name)?.value;
        },
        set(name, value, options) {
          try {
            store.set({ name, value, ...options });
          } catch (_error) {
            // Server Component'ten çağrıldığında bu hata olabilir,
            // middleware oturumu tazelediği için güvenle görmezden gelinebilir.
          }
        },
        remove(name, options) {
          try {
            store.delete({ name, ...options });
          } catch (_error) {
            // Server Component'ten çağrıldığında bu hata olabilir,
            // middleware oturumu tazelediği için güvenle görmezden gelinebilir.
          }
        },
      },
    }
  );
};
