import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = requestUrl.searchParams.get('next') || '/';
  const origin = requestUrl.origin;

  const safeNext =
    typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//')
      ? nextPath
      : '/';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
        return NextResponse.redirect(
          `${origin}/login?message=${encodeURIComponent(
            'Giriş tamamlanamadı. Lütfen tekrar deneyin.'
          )}`
        );
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    } catch (error) {
      console.error('[auth/callback] unexpected error:', error?.message || error);
      return NextResponse.redirect(
        `${origin}/login?message=${encodeURIComponent('Giriş sırasında bir hata oluştu.')}`
      );
    }
  }

  // No code — send to login rather than a silent home redirect
  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent('Oturum kodu bulunamadı. Lütfen tekrar giriş yapın.')}`
  );
}
