'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { requestPasswordReset } from '@/app/actions';
import { AuthShell } from '@/components/auth/AuthShell';
import {
  AuthAlert,
  AuthCard,
  AuthEmailField,
  AuthFooterLink,
  AuthFormFallback,
  AuthHeader,
  AuthSubmitButton,
} from '@/components/auth/auth-ui';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <AuthHeader
        title="Şifreni mi unuttun?"
        description="Endişelenme. E-posta adresini gir; kayıtlıysa sana güvenli bir sıfırlama bağlantısı gönderelim."
      />

      <AuthCard>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/5 px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
          <KeyRound className="h-3.5 w-3.5" />
          Şifre sıfırlama
        </div>

        <form action={requestPasswordReset} className="grid gap-4">
          <AuthEmailField id="forgot-email" />
          <AuthAlert message={message} />
          <AuthSubmitButton idleLabel="Sıfırlama Linki Gönder" pendingLabel="Link gönderiliyor…" />
        </form>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-indigo-500/15 bg-indigo-950/5 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
          <span>
            Güvenlik nedeniyle, e-posta kayıtlı olmasa bile benzer bir yanıt gösterebiliriz. Gelen
            kutunu ve spam klasörünü kontrol et.
          </span>
        </div>
      </AuthCard>

      <AuthFooterLink prompt="Şifreni hatırladın mı?" href="/login" label="Giriş yap" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthFormFallback label="Şifre formu yükleniyor…" />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
