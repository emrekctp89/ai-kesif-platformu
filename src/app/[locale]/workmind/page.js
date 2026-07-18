import { FlaskConical } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { WorkflowBuilder } from '@/components/workmind/WorkflowBuilder';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Workmind' });
  const path = locale === 'en' ? '/en/workmind' : '/workmind';

  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path,
    // Beta surface — keep out of aggressive indexing for now
    noindex: true,
  });
}

export default async function WorkmindPage() {
  const t = await getTranslations('Workmind');

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-background">
      <header className="z-10 shrink-0 border-b bg-card/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              <span aria-hidden="true">🧠</span>
              <span>{t('title')}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <FlaskConical className="h-3 w-3" aria-hidden="true" />
                {t('betaBadge')}
              </span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>

        <div
          role="status"
          className="mt-3 flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-100"
        >
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 space-y-0.5">
            <p className="font-semibold leading-snug">{t('betaTitle')}</p>
            <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/85 sm:text-sm">
              {t('betaBody')}
            </p>
          </div>
        </div>
      </header>

      <div className="relative h-full min-h-0 w-full flex-1">
        <WorkflowBuilder />
      </div>
    </div>
  );
}
