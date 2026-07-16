'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
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
  const checks = useMemo(
    () => [
      { id: 'length', label: 'En az 8 karakter', ok: password.length >= 8 },
      { id: 'letter', label: 'En az bir harf', ok: /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) },
      { id: 'number', label: 'En az bir rakam (önerilir)', ok: /\d/.test(password) },
    ],
    [password]
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
          <CheckCircle2 className={cn('h-3.5 w-3.5', !check.ok && 'opacity-40')} />
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
          aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 8;

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <AuthHeader
        title="Yeni şifre belirle"
        description="Yeni şifreni gir. En az 8 karakter kullanmanı öneririz."
      />

      <AuthCard>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/5 px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
          <KeyRound className="h-3.5 w-3.5" />
          Güvenli güncelleme
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
            label="Yeni şifre"
            value={password}
            onChange={setPassword}
          />
          <ControlledPasswordField
            id="confirm-password"
            name="confirmPassword"
            label="Yeni şifre (tekrar)"
            value={confirm}
            onChange={setConfirm}
          />

          <PasswordStrength password={password} />

          {tooShort ? (
            <p role="alert" className="text-center text-sm text-destructive">
              Şifre en az 8 karakter olmalı.
            </p>
          ) : null}
          {mismatch ? (
            <p role="alert" className="text-center text-sm text-destructive">
              Şifreler eşleşmiyor.
            </p>
          ) : null}

          <AuthAlert message={message} />
          <AuthSubmitButton idleLabel="Şifreyi Güncelle" pendingLabel="Şifre güncelleniyor…" />
        </form>
      </AuthCard>

      <AuthFooterLink prompt="Giriş yapmaya hazır mısın?" href="/login" label="Giriş yap" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthFormFallback label="Şifre formu yükleniyor…" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
