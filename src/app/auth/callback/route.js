// src/app/auth/callback/route.js

import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Kullanıcıyı, giriş işlemi tamamlandıktan sonra ana sayfaya yönlendirir.
  return NextResponse.redirect(requestUrl.origin)
}