import Link from 'next/link';
import { Gavel, Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'TermsPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/kullanim-kosullari' : '/kullanim-kosullari',
  });
}

function TermsSection({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export default async function TermsOfUsePage({ params }) {
  await params;
  const t = await getTranslations('TermsPage');

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Gavel className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button mt-5 min-h-9 rounded-full"
          >
            <Link href="/gizlilik" prefetch={false}>
              <Shield className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('ctaPrivacy')}
            </Link>
          </Button>
        </div>
      </section>

      <Card className="glass-panel border-border/50">
        <CardContent className="space-y-8 p-6 sm:p-8">
          <TermsSection title={t('section1Title')}>{t('section1Body')}</TermsSection>
          <TermsSection title={t('section2Title')}>{t('section2Body')}</TermsSection>
          <TermsSection title={t('section3Title')}>{t('section3Body')}</TermsSection>
          <TermsSection title={t('section4Title')}>{t('section4Body')}</TermsSection>
        </CardContent>
      </Card>
    </div>
  );
}
