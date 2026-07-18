import { WandSparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { StudioClient } from '@/components/StudioClient';
import { generatePageMetadata } from '@/utils/seo';
import { requireProAccess } from '@/lib/proAccess';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'StudioPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/studyo' : '/studyo',
  });
}

export default async function StudioPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'StudioPage' });
  await requireProAccess({
    loginMessage: t('loginRequired'),
    proMessage: t('proRequired'),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <WandSparkles className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <div className="rounded-3xl border border-border/50 bg-card/40 p-4 glass-panel sm:p-6">
        <StudioClient />
      </div>
    </div>
  );
}
