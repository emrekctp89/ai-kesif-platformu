'use server';

import { createClient } from '@/utils/supabase/actions';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import { GoodbyeEmail } from '@/components/emails/GoodbyeEmail';
import { enforceRateLimit } from '@/utils/antiAbuse';

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function signIn(formData) {
  'use server';

  const email = formData.get('email');
  const password = formData.get('password');

  // Rate Limiting: 5 deneme / 1 dakika
  const rateLimit = await enforceRateLimit('auth-login', { limit: 5, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) {
    const errorMessage = `Çok fazla deneme yaptınız. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`;
    return redirect(`/login?message=${encodeURIComponent(errorMessage)}`);
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    const errorMessage = 'Giriş bilgileri hatalı veya kullanıcı bulunamadı.';
    return redirect(`/login?message=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath('/', 'layout');

  if (data.user.email === process.env.ADMIN_EMAIL) {
    return redirect('/admin');
  }

  return redirect('/');
}

export async function oAuthSignIn(provider) {
  'use server';
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return redirect('/login?message=Could not authenticate with provider');
  }

  return redirect(data.url);
}

export async function signUp(formData) {
  'use server';
  const email = formData.get('email');
  const password = formData.get('password');

  // Rate Limiting: 3 hesap / 1 saat
  const rateLimit = await enforceRateLimit('auth-signup', { limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) {
    const errorMessage = `Çok fazla hesap oluşturma denemesi. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`;
    return redirect(`/signup?message=${encodeURIComponent(errorMessage)}`);
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error || !data.user) {
    const errorMessage =
      'Kullanıcı oluşturulamadı. Şifre en az 6 karakter olmalı veya e-posta zaten kullanımda olabilir.';
    return redirect(`/signup?message=${encodeURIComponent(errorMessage)}`);
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: email,
      subject: "AI Keşif Platformu'na Hoş Geldiniz!",
      react: WelcomeEmail({ userEmail: email }),
    });
  } catch (emailError) {
    console.error('Hoş geldiniz e-postası gönderme hatası:', emailError);
  }

  const successMessage = 'Hesabınızı doğrulamak için e-postanızı kontrol edin.';
  return redirect(`/login?message=${encodeURIComponent(successMessage)}`);
}

export async function requestPasswordReset(formData) {
  'use server';

  const email = formData.get('email');

  // Rate Limiting: 3 sıfırlama isteği / 1 saat
  const rateLimit = await enforceRateLimit('auth-reset-password', {
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    const errorMessage = `Çok fazla şifre sıfırlama isteği. Lütfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar deneyin.`;
    return redirect(`/forgot-password?message=${encodeURIComponent(errorMessage)}`);
  }

  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
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

  const password = formData.get('password');
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/login?message=${encodeURIComponent('Bu işlem için giriş yapmalısınız.')}`);
  }

  const userEmail = user.email;
  const supabaseAdmin = createAdminClient();
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Hesap silme hatası:', deleteError);
    const errorMessage = 'Hesabınız silinirken bir hata oluştu.';
    return redirect(`/profile?message=${encodeURIComponent(errorMessage)}`);
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: userEmail,
      subject: 'Hesabınız Silindi | AI Keşif Platformu',
      react: GoodbyeEmail({ userEmail: userEmail }),
    });
  } catch (emailError) {
    console.error('Veda e-postası gönderme hatası:', emailError);
  }

  const successMessage = 'Hesabınız başarıyla silindi. Gidişinize üzüldük.';
  return redirect(`/?message=${encodeURIComponent(successMessage)}`);
}
