'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { oAuthSignIn, signIn } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import {
  AuthAlert,
  AuthCard,
  AuthEmailField,
  AuthFooterLink,
  AuthFormFallback,
  AuthHeader,
  AuthPasswordField,
  AuthSubmitButton,
  GoogleIcon,
} from '@/components/auth/auth-ui';

function LoginForm() {
  const t = useTranslations('Auth');
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <AuthHeader title={t('loginTitle')} description={t('loginDescription')} />

      <AuthCard>
        <form action={signIn} className="grid gap-4">
          <AuthEmailField id="email" label={t('emailLabel')} placeholder={t('emailPlaceholder')} />
          <AuthPasswordField
            id="password"
            label={t('passwordLabel')}
            autoComplete="current-password"
            helper={
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300"
              >
                {t('loginForgot')}
              </Link>
            }
          />
          <AuthAlert message={message} />
          <AuthSubmitButton idleLabel={t('loginSubmit')} pendingLabel={t('loginPending')} />
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-card px-3 text-muted-foreground">{t('orContinue')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form action={oAuthSignIn.bind(null, 'google')} className="w-full">
            <Button type="submit" variant="outline" className="h-11 w-full font-medium">
              <GoogleIcon className="mr-2 h-4 w-4" />
              {t('google')}
            </Button>
          </form>
          <Button variant="outline" className="h-11 w-full font-medium" asChild>
            <Link href="/sso">
              <Building2 className="mr-2 h-4 w-4" />
              {t('sso')}
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-indigo-500/15 bg-indigo-950/5 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
          <span>{t('loginSecurity')}</span>
        </div>
      </AuthCard>

      <AuthFooterLink prompt={t('loginNoAccount')} href="/signup" label={t('loginSignup')} />
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations('Auth');

  return (
    <AuthShell>
      <Suspense fallback={<AuthFormFallback label={t('loginLoading')} />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
