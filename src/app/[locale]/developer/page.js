import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Code2, KeyRound } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { DeveloperPortalClient } from '@/components/DeveloperPortalClient';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'DeveloperPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/developer' : '/developer',
    noindex: true,
  });
}

export default async function DeveloperPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'DeveloperPage' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/developer&message=${encodeURIComponent(t('loginRequired'))}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Code2 className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {t('subtitle')}
              </p>
              <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {t('docsHint')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-3xl border border-border/50 bg-card/40 p-4 glass-panel sm:p-6">
        <DeveloperPortalClient />
      </div>
    </div>
  );
}
