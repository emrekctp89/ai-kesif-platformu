import Link from 'next/link';
import { Compass, Mail, Rocket, Target, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AboutPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/hakkimizda' : '/hakkimizda',
  });
}

function FeatureCard({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{children}</p>
    </div>
  );
}

export default async function AboutPage({ params }) {
  await params;
  const t = await getTranslations('AboutPage');

  return (
    <div className="mx-auto max-w-4xl space-y-12 pb-10 sm:space-y-16 sm:pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="brand-gradient min-h-11 shadow-md">
              <Link href="/" prefetch={false}>
                <Compass className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaDiscover')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/iletisim" prefetch={false}>
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaContact')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div className="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-6 glass-panel">
          <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
            <Rocket className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
            {t('missionTitle')}
          </h2>
          <p className="leading-relaxed text-muted-foreground">{t('missionBody')}</p>
        </div>
        <div className="space-y-4 rounded-2xl border border-border/50 bg-card/40 p-6 glass-panel">
          <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
            <Target className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
            {t('visionTitle')}
          </h2>
          <p className="leading-relaxed text-muted-foreground">{t('visionBody')}</p>
        </div>
      </section>

      <Card className="glass-panel border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-center text-2xl sm:text-3xl">{t('valuesTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8 sm:grid-cols-3">
          <FeatureCard icon={Users} title={t('valueCommunityTitle')}>
            {t('valueCommunityBody')}
          </FeatureCard>
          <FeatureCard icon={Rocket} title={t('valueDiscoveryTitle')}>
            {t('valueDiscoveryBody')}
          </FeatureCard>
          <FeatureCard icon={Target} title={t('valueAccessTitle')}>
            {t('valueAccessBody')}
          </FeatureCard>
        </CardContent>
      </Card>
    </div>
  );
}
