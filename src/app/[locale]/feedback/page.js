import Link from 'next/link';
import { Mail, MessageSquareHeart } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { FeedbackDialog } from '@/components/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FeedbackPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/feedback' : '/feedback',
  });
}

export default async function FeedbackPage({ params }) {
  await params;
  const t = await getTranslations('FeedbackPage');

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button mt-5 min-h-9 rounded-full"
          >
            <Link href="/iletisim" prefetch={false}>
              <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('ctaContact')}
            </Link>
          </Button>
        </div>
      </section>

      <div className="flex justify-center rounded-3xl border border-border/50 bg-card/40 p-8 glass-panel">
        <FeedbackDialog />
      </div>
    </div>
  );
}
