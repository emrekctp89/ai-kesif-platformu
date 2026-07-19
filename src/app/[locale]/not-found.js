import Link from 'next/link';
import { AlertTriangle, Home, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('NotFoundPage');

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="brand-surface relative w-full max-w-lg overflow-hidden rounded-3xl p-8 text-center shadow-xl glass-panel sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-destructive/10 blur-3xl" />
        <div className="relative z-10 space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/20 blur-xl" />
              <AlertTriangle
                className="relative h-16 w-16 text-destructive sm:h-20 sm:w-20"
                aria-hidden="true"
              />
            </div>
          </div>

          <div>
            <div className="brand-chip mb-3 inline-flex items-center rounded-full px-3 py-1 text-sm font-bold shadow-inner">
              {t('heroChip')}
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              404
            </h1>
            <p className="mt-2 text-xl font-semibold text-muted-foreground">{t('title')}</p>
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground">{t('body')}</p>
            <p className="text-sm text-muted-foreground">{t('hint')}</p>
          </div>

          <div className="space-y-2 rounded-2xl bg-muted/50 p-4 text-left text-sm">
            <p className="font-semibold text-foreground">{t('tipsTitle')}</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• {t('tip1')}</li>
              <li>• {t('tip2')}</li>
              <li>• {t('tip3')}</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button asChild className="brand-gradient min-h-11 gap-2 shadow-md">
              <Link href="/" prefetch={false}>
                <Home className="h-4 w-4" aria-hidden="true" />
                {t('ctaHome')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="glass-button min-h-11 gap-2">
              <Link href="/ogren" prefetch={false}>
                <Search className="h-4 w-4" aria-hidden="true" />
                {t('ctaDiscover')}
              </Link>
            </Button>
          </div>

          <p className="border-t border-border/50 pt-4 text-xs text-muted-foreground">
            {t('helpPrefix')}{' '}
            <Link href="/iletisim" className="text-primary hover:underline" prefetch={false}>
              {t('helpLink')}
            </Link>{' '}
            {t('helpSuffix')}
          </p>
        </div>
      </div>
    </div>
  );
}
