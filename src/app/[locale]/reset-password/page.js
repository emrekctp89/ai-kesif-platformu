'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { updatePassword } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import {
  AuthAlert,
  AuthCard,
  AuthFooterLink,
  AuthFormFallback,
  AuthHeader,
  AuthSubmitButton,
} from '@/components/auth/auth-ui';
import { cn } from '@/lib/utils';

function PasswordStrength({ password }) {
  const t = useTranslations('Auth');
  const checks = useMemo(
    () => [
      { id: 'length', label: t('resetCheckLength'), ok: password.length >= 8 },
      {
        id: 'letter',
        label: t('resetCheckLetter'),
        ok: /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password),
      },
      { id: 'number', label: t('resetCheckNumber'), ok: /\d/.test(password) },
    ],
    [password, t]
  );

  if (!password) return null;

  return (
    <ul className="space-y-1.5 rounded-xl border bg-muted/30 px-3 py-2.5">
      {checks.map((check) => (
        <li
          key={check.id}
          className={cn(
            'flex items-center gap-2 text-xs',
            check.ok ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'
          )}
        >
          <CheckCircle2
            className={cn('h-3.5 w-3.5', !check.ok && 'opacity-40')}
            aria-hidden="true"
          />
          {check.label}
        </li>
      ))}
    </ul>
  );
}

function ControlledPasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
}) {
  const t = useTranslations('Auth');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={8}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 pl-10 pr-11"
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={showPassword ? t('hidePassword') : t('showPassword')}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const t = useTranslations('Auth');
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 8;

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <AuthHeader title={t('resetTitle')} description={t('resetDescription')} />

      <AuthCard>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/5 px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          {t('resetChip')}
        </div>

        <form
          action={updatePassword}
          className="grid gap-4"
          onSubmit={(event) => {
            if (password !== confirm || password.length < 8) {
              event.preventDefault();
            }
          }}
        >
          <ControlledPasswordField
            id="password"
            name="password"
            label={t('resetPassword')}
            value={password}
            onChange={setPassword}
          />
          <ControlledPasswordField
            id="confirm-password"
            name="confirmPassword"
            label={t('resetConfirm')}
            value={confirm}
            onChange={setConfirm}
          />

          <PasswordStrength password={password} />

          {tooShort ? (
            <p role="alert" className="text-center text-sm text-destructive">
              {t('resetTooShort')}
            </p>
          ) : null}
          {mismatch ? (
            <p role="alert" className="text-center text-sm text-destructive">
              {t('resetMismatch')}
            </p>
          ) : null}

          <AuthAlert message={message} />
          <AuthSubmitButton idleLabel={t('resetSubmit')} pendingLabel={t('resetPending')} />
        </form>
      </AuthCard>

      <AuthFooterLink prompt={t('resetReady')} href="/login" label={t('resetLogin')} />
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations('Auth');

  return (
    <AuthShell>
      <Suspense fallback={<AuthFormFallback label={t('resetLoading')} />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
