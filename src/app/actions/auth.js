'use server';

import logger from '@/utils/logger';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import { GoodbyeEmail } from '@/components/emails/GoodbyeEmail';
import { enforceRateLimit } from '@/utils/antiAbuse';
import { getAuthCallbackUrl, getPasswordResetUrl } from '@/utils/siteUrl';
import { safeGetUser } from '@/utils/supabase/auth-session';

export async function signOut() {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut();
  } catch (error) {
    logger.error('[signOut] failed:', error?.message || error);
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function signIn(formData) {
  'use server';

  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return redirect(`/login?message=${encodeURIComponent('E-posta ve şifre gereklidir.')}`);
  }

  // Rate Limiting: 5 deneme / 1 dakika
  const rateLimit = await enforceRateLimit('auth-login', { limit: 5, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    const errorMessage = `Çok fazla deneme yaptınız. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`;
    return redirect(`/login?message=${encodeURIComponent(errorMessage)}`);
  }

  const supabase = await createClient();

  let data;
  let error;
  try {
    ({ data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    }));
  } catch (err) {
    logger.error('[signIn] unexpected:', err?.message || err);
    return redirect(
      `/login?message=${encodeURIComponent(
        'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.'
      )}`
    );
  }

  if (error || !data?.user) {
    logger.error('[signIn] auth error:', error?.message || 'no user');
    const errorMessage =
      error?.message === 'Email not confirmed'
        ? 'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.'
        : 'Giriş bilgileri hatalı veya kullanıcı bulunamadı.';
    return redirect(`/login?message=${encodeURIComponent(errorMessage)}`);
  }

  // Ensure session cookie was actually written (getAll/setAll path)
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    logger.error('[signIn] session missing after successful password auth');
    return redirect(
      `/login?message=${encodeURIComponent(
        'Oturum kaydedilemedi. Çerezleri etkinleştirip tekrar deneyin.'
      )}`
    );
  }

  revalidatePath('/', 'layout');

  if (data.user.email === process.env.ADMIN_EMAIL) {
    return redirect('/admin');
  }

  return redirect('/');
}

export async function oAuthSignIn(provider) {
  'use server';
  const supabase = await createClient();
  const redirectTo = await getAuthCallbackUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      // Use the host the user is on (prod custom domain vs preview).
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error || !data?.url) {
    logger.error('[oAuthSignIn] error:', error?.message || 'no url');
    return redirect(
      `/login?message=${encodeURIComponent(
        'Sağlayıcı ile giriş yapılamadı. Lütfen tekrar deneyin.'
      )}`
    );
  }

  return redirect(data.url);
}

export async function signUp(formData) {
  'use server';
  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') || '');

  if (!email || password.length < 8) {
    return redirect(
      `/signup?message=${encodeURIComponent(
        'Geçerli bir e-posta ve en az 8 karakterlik şifre girin.'
      )}`
    );
  }

  // Rate Limiting: 3 hesap / 1 saat
  const rateLimit = await enforceRateLimit('auth-signup', { limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    const errorMessage = `Çok fazla hesap oluşturma denemesi. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`;
    return redirect(`/signup?message=${encodeURIComponent(errorMessage)}`);
  }

  const supabase = await createClient();

  let data;
  let error;
  try {
    const emailRedirectTo = await getAuthCallbackUrl();
    ({ data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    }));
  } catch (err) {
    logger.error('[signUp] unexpected:', err?.message || err);
    return redirect(
      `/signup?message=${encodeURIComponent(
        'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.'
      )}`
    );
  }

  if (error || !data?.user) {
    const errorMessage =
      'Kullanıcı oluşturulamadı. Şifre en az 8 karakter olmalı veya e-posta zaten kullanımda olabilir.';
    return redirect(`/signup?message=${encodeURIComponent(errorMessage)}`);
  }

  try {
    if (process.env.RESEND_API_KEY && process.env.ADMIN_NOTIF_EMAIL_FROM) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.ADMIN_NOTIF_EMAIL_FROM,
        to: email,
        subject: "AI Keşif Platformu'na Hoş Geldiniz!",
        react: WelcomeEmail({ userEmail: email }),
      });
    }
  } catch (emailError) {
    logger.error('Hoş geldiniz e-postası gönderme hatası:', emailError);
  }

  const successMessage = 'Hesabınızı doğrulamak için e-postanızı kontrol edin.';
  return redirect(`/login?message=${encodeURIComponent(successMessage)}`);
}

export async function requestPasswordReset(formData) {
  'use server';

  const email = String(formData.get('email') || '')
    .trim()
    .toLowerCase();

  // Rate Limiting: 3 sıfırlama isteği / 1 saat
  const rateLimit = await enforceRateLimit('auth-reset-password', {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    const errorMessage = `Çok fazla şifre sıfırlama isteği. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`;
    return redirect(`/forgot-password?message=${encodeURIComponent(errorMessage)}`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await getPasswordResetUrl(),
  });

  if (error) {
    const errorMessage = 'Şifre sıfırlama maili gönderilemedi. Lütfen tekrar deneyin.';
    return redirect(`/forgot-password?message=${encodeURIComponent(errorMessage)}`);
  }

  const successMessage = 'Eğer e-posta adresiniz kayıtlıysa, şifre sıfırlama linki gönderildi.';
  return redirect(`/login?message=${encodeURIComponent(successMessage)}`);
}

export async function updatePassword(formData) {
  'use server';

  const password = String(formData.get('password') || '');
  if (password.length < 8) {
    return redirect(
      `/reset-password?message=${encodeURIComponent('Şifre en az 8 karakter olmalıdır.')}`
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    const errorMessage = 'Şifre güncellenemedi. Linkin süresi dolmuş veya geçersiz olabilir.';
    return redirect(`/reset-password?message=${encodeURIComponent(errorMessage)}`);
  }

  const successMessage = 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.';
  return redirect(`/login?message=${encodeURIComponent(successMessage)}`);
}

export async function deleteUser() {
  'use server';
  const supabase = await createClient();
  const { user } = await safeGetUser(supabase);

  if (!user) {
    return redirect(`/login?message=${encodeURIComponent('Bu işlem için giriş yapmalısınız.')}`);
  }

  const userEmail = user.email;

  let deleteError;
  try {
    const supabaseAdmin = createAdminClient();
    ({ error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id));
  } catch (err) {
    logger.error('Hesap silme hatası (admin client):', err?.message || err);
    return redirect(
      `/profile?message=${encodeURIComponent(
        'Hesap silme şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.'
      )}`
    );
  }

  if (deleteError) {
    logger.error('Hesap silme hatası:', deleteError);
    const errorMessage = 'Hesabınız silinirken bir hata oluştu.';
    return redirect(`/profile?message=${encodeURIComponent(errorMessage)}`);
  }

  try {
    if (process.env.RESEND_API_KEY && process.env.ADMIN_NOTIF_EMAIL_FROM) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.ADMIN_NOTIF_EMAIL_FROM,
        to: userEmail,
        subject: 'Hesabınız Silindi | AI Keşif Platformu',
        react: GoodbyeEmail({ userEmail: userEmail }),
      });
    }
  } catch (emailError) {
    logger.error('Veda e-postası gönderme hatası:', emailError);
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  const successMessage = 'Hesabınız başarıyla silindi. Gidişinize üzüldük.';
  return redirect(`/?message=${encodeURIComponent(successMessage)}`);
}
