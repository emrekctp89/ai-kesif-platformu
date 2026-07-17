import Link from 'next/link';
import { MessageSquare, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';

export default async function MessagesPage({ params }) {
  await params;
  const t = await getTranslations('MessagesPage');

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center sm:p-10">
      <div className="brand-surface relative max-w-md overflow-hidden rounded-3xl p-8 shadow-lg glass-panel">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-background shadow-sm">
            <MessageSquare className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('title')}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{t('body')}</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild variant="outline" className="glass-button min-h-11">
              <Link href="/topluluk" prefetch={false}>
                <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaCommunity')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
