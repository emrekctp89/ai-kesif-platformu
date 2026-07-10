'use client';

import * as React from 'react';
import { Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { subscribeToNewsletter } from '@/app/actions/subscribe';

export function NewsletterSignup({ className = '' }) {
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

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-8 sm:p-12 glass-panel glow-effect ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20 shadow-inner">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
          Yapay Zeka Gelişmelerini Kaçırmayın
        </h2>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground mb-8">
          En yeni AI araçları, rehberler ve sektördeki güncel gelişmeler her hafta e-posta kutunuza
          gelsin. Spam yok, sadece değer üretiyoruz.
        </p>

        {status.type === 'success' ? (
          <div className="mx-auto flex max-w-md items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <p className="font-medium text-left">{status.message}</p>
          </div>
        ) : (
          <form action={handleSubmit} className="mx-auto max-w-md">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                name="email"
                type="email"
                placeholder="E-posta adresiniz..."
                required
                className="h-12 min-w-0 flex-auto rounded-xl bg-background/50 border-primary/20 focus-visible:ring-primary/30"
                disabled={isPending}
              />
              <Button
                type="submit"
                className="h-12 rounded-xl sm:w-auto w-full transition-all"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Abone Ol
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {status.type === 'error' && (
              <p className="mt-3 text-sm text-destructive text-left pl-2">{status.message}</p>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              İstediğiniz zaman abonelikten çıkabilirsiniz. Bilgileriniz 3. şahıslarla paylaşılmaz.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
