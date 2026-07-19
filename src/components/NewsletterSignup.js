'use client';

import * as React from 'react';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { subscribeToNewsletter } from '@/app/actions/subscribe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * @param {{ className?: string, compact?: boolean, title?: string, description?: string }} props
 */
export function NewsletterSignup({
  className = '',
  compact = false,
  title = 'Yapay Zeka Gelişmelerini Kaçırmayın',
  description = 'En yeni AI araçları, rehberler ve sektördeki güncel gelişmeler her hafta e-posta kutunuza gelsin. Spam yok, sadece değer üretiyoruz.',
}) {
  const [isPending, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState({ type: 'idle', message: '' });

  async function handleSubmit(formData) {
    setStatus({ type: 'idle', message: '' });

    startTransition(async () => {
      const result = await subscribeToNewsletter(formData);

      if (result.error) {
        setStatus({ type: 'error', message: result.error });
      } else {
        setStatus({ type: 'success', message: result.message });
      }
    });
  }

  const formId = compact ? 'newsletter-email-compact' : 'newsletter-email';

  if (compact) {
    return (
      <div className={cn('mx-auto w-full max-w-xl', className)}>
        {status.type === 'success' ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-left font-medium">{status.message}</p>
          </div>
        ) : (
          <form action={handleSubmit}>
            <label htmlFor={formId} className="sr-only">
              E-posta adresiniz
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={formId}
                name="email"
                type="email"
                placeholder="E-posta adresiniz..."
                required
                className="h-12 min-w-0 flex-auto rounded-xl border-primary/20 bg-background/80 focus-visible:ring-primary/30"
                disabled={isPending}
                aria-describedby={
                  status.type === 'error'
                    ? 'newsletter-help-compact newsletter-error-compact'
                    : 'newsletter-help-compact'
                }
                aria-invalid={status.type === 'error' ? true : undefined}
              />
              <Button
                type="submit"
                className="brand-gradient h-12 w-full rounded-xl sm:w-auto"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                    <span className="sr-only">Abonelik gönderiliyor</span>
                  </>
                ) : (
                  <>
                    Abone Ol
                    <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            {status.type === 'error' && (
              <p
                id="newsletter-error-compact"
                role="alert"
                className="mt-2 text-left text-sm text-destructive"
              >
                {status.message}
              </p>
            )}
            <p id="newsletter-help-compact" className="mt-2 text-xs text-muted-foreground">
              İstediğiniz zaman çıkabilirsiniz. Bilgileriniz paylaşılmaz.
            </p>
          </form>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'brand-surface glass-panel glow-effect relative overflow-hidden rounded-3xl p-8 sm:p-12',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4 shadow-inner ring-1 ring-primary/20">
            <Mail className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
        </div>

        <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">{description}</p>

        {status.type === 'success' ? (
          <div
            role="status"
            className="mx-auto flex max-w-md items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
            <p className="text-left font-medium">{status.message}</p>
          </div>
        ) : (
          <form action={handleSubmit} className="mx-auto max-w-md">
            <label htmlFor={formId} className="sr-only">
              E-posta adresiniz
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id={formId}
                name="email"
                type="email"
                placeholder="E-posta adresiniz..."
                required
                className="h-12 min-w-0 flex-auto rounded-xl border-primary/20 bg-background/50 focus-visible:ring-primary/30"
                disabled={isPending}
                aria-describedby={
                  status.type === 'error' ? 'newsletter-help newsletter-error' : 'newsletter-help'
                }
                aria-invalid={status.type === 'error' ? true : undefined}
              />
              <Button
                type="submit"
                className="brand-gradient h-12 w-full rounded-xl transition-all sm:w-auto"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                    <span className="sr-only">Abonelik gönderiliyor</span>
                  </>
                ) : (
                  <>
                    Abone Ol
                    <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {status.type === 'error' && (
              <p
                id="newsletter-error"
                role="alert"
                className="mt-3 pl-2 text-left text-sm text-destructive"
              >
                {status.message}
              </p>
            )}

            <p id="newsletter-help" className="mt-4 text-xs text-muted-foreground">
              İstediğiniz zaman abonelikten çıkabilirsiniz. Bilgileriniz 3. şahıslarla paylaşılmaz.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
