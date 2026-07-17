'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FutureAiGlyph } from '@/components/FutureAiGlyph';
import { cn } from '@/lib/utils';

export function isSuccessMessage(message) {
  if (!message) return false;
  const lower = message.toLocaleLowerCase('tr-TR');
  const en = message.toLocaleLowerCase('en-US');
  return (
    lower.includes('gönder') ||
    lower.includes('başar') ||
    lower.includes('doğrula') ||
    lower.includes('kontrol edin') ||
    lower.includes('kayıtlıysa') ||
    lower.includes('kayıt') ||
    en.includes('sent') ||
    en.includes('success') ||
    en.includes('check your') ||
    en.includes('verify')
  );
}

export function AuthBrandLink({ className }) {
  return (
    <Link
      href="/"
      className={cn(
        'mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-950/5 px-3 py-1.5 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-950/10 dark:text-indigo-200',
        className
      )}
    >
      <FutureAiGlyph className="h-5 w-5" />
      AI Keşif
    </Link>
  );
}

export function AuthAlert({ message }) {
  if (typeof message !== 'string' || message.length === 0) return null;
  const success = isSuccessMessage(message);

  return (
    <p
      role="alert"
      className={cn(
        'rounded-xl border px-3 py-2.5 text-center text-sm leading-5',
        success
          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-destructive/25 bg-destructive/10 text-destructive'
      )}
    >
      {message}
    </p>
  );
}

export function AuthSubmitButton({ idleLabel, pendingLabel }) {
  const t = useTranslations('Auth');
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="brand-gradient h-11 w-full text-base font-semibold shadow-md"
      disabled={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel || t('processing')}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  );
}

export function AuthEmailField({
  id = 'email',
  name = 'email',
  label,
  placeholder,
  autoComplete = 'email',
  value,
  onChange,
}) {
  const t = useTranslations('Auth');
  const fieldLabel = label ?? t('emailLabel');
  const fieldPlaceholder = placeholder ?? t('emailPlaceholder');

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{fieldLabel}</Label>
      <div className="relative">
        <Mail
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="email"
          name={name}
          placeholder={fieldPlaceholder}
          autoComplete={autoComplete}
          required
          className="h-11 pl-10"
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export function AuthPasswordField({
  id = 'password',
  name = 'password',
  label,
  autoComplete = 'current-password',
  minLength,
  helper,
}) {
  const t = useTranslations('Auth');
  const [showPassword, setShowPassword] = useState(false);
  const fieldLabel = label ?? t('passwordLabel');

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{fieldLabel}</Label>
        {helper}
      </div>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className="h-11 pl-10 pr-11"
        />
        <button
          type="button"
          onClick={() => setShowPassword((value) => !value)}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={showPassword ? t('hidePassword') : t('showPassword')}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.9 2.3 2.8 6.4 2.8 11.5S6.9 20.7 12 20.7c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

export function AuthFormFallback({ label }) {
  const t = useTranslations('Auth');

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      <LoaderCircle className="mx-auto mb-3 h-5 w-5 animate-spin" />
      {label || t('formLoading')}
    </div>
  );
}

export function AuthCard({ children, className }) {
  return (
    <div
      className={cn(
        'glass-panel rounded-3xl border border-border/60 bg-card/85 p-6 shadow-xl backdrop-blur-sm sm:p-8',
        className
      )}
    >
      {children}
    </div>
  );
}

export function AuthHeader({ title, description, align = 'responsive' }) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col',
        align === 'center' && 'items-center text-center',
        align === 'left' && 'items-start text-left',
        align === 'responsive' && 'items-center text-center lg:items-start lg:text-left'
      )}
    >
      <AuthBrandLink />
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AuthFooterLink({ prompt, href, label, align = 'responsive' }) {
  return (
    <p
      className={cn(
        'mt-6 text-sm text-muted-foreground',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        align === 'responsive' && 'text-center lg:text-left'
      )}
    >
      {prompt ? <>{prompt} </> : null}
      <Link
        href={href}
        className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
      >
        {label}
      </Link>
    </p>
  );
}
