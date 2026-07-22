import Link from 'next/link';
import {
  ArrowRight,
  BrainCircuit,
  Compass,
  FlaskConical,
  GraduationCap,
  Home,
  LayoutGrid,
  Newspaper,
  PauseCircle,
  Sparkles,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

const FEATURE_ICONS = {
  discover: Compass,
  randomTools: Compass,
  showcase: Compass,
  community: Compass,
  feed: Compass,
  leaderboard: Compass,
  launchpad: Compass,
  challenge: Compass,
  bounties: Compass,
  collections: Compass,
};

/**
 * @param {{ featureKey: string, path: string }} opts
 */
export async function softLandingMetadata({ featureKey, path, locale }) {
  const t = await getTranslations({ locale, namespace: 'SoftLanding' });
  const tn = await getTranslations({ locale, namespace: 'Navigation' });
  const featureLabel = tn(featureKey);
  return generatePageMetadata({
    title: t('metaTitle', { feature: featureLabel }),
    description: t('metaDescription', { feature: featureLabel }),
    path: locale === 'en' ? `/en${path}` : path,
    noindex: true,
  });
}

/**
 * Soft landing for temporarily paused public surfaces.
 * @param {{ featureKey: keyof typeof FEATURE_ICONS | string, path: string }} props
 */
export async function SoftLandingPage({ featureKey, path }) {
  const t = await getTranslations('SoftLanding');
  const tn = await getTranslations('Navigation');
  const featureLabel = tn(featureKey);
  const Icon = FEATURE_ICONS[featureKey] || PauseCircle;

  const hubs = [
    {
      href: '/ogren',
      title: tn('learn'),
      body: t('hubLearnBody'),
      icon: GraduationCap,
      primary: true,
    },
    {
      href: '/workmind',
      title: tn('workmind'),
      body: t('hubWorkmindBody'),
      icon: BrainCircuit,
      primary: true,
    },
    {
      href: '/blog',
      title: tn('blog'),
      body: t('hubBlogBody'),
      icon: Newspaper,
    },
    {
      href: '/arastirma',
      title: tn('research'),
      body: t('hubResearchBody'),
      icon: FlaskConical,
    },
    {
      href: '/tavsiye',
      title: tn('aiRecommend'),
      body: t('hubRecommendBody'),
      icon: Sparkles,
    },
    {
      href: '/kategori',
      title: tn('categories'),
      body: t('hubCategoriesBody'),
      icon: LayoutGrid,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10 sm:space-y-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <PauseCircle className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border bg-background/80 shadow-sm">
            <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('title', { feature: featureLabel })}
          </h1>
          <p className="mx-auto mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle', { feature: featureLabel })}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{t('body')}</p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="brand-gradient min-h-12 rounded-2xl px-6 font-semibold shadow-md"
            >
              <Link href="/ogren" prefetch={false}>
                <GraduationCap className="mr-2 h-5 w-5" aria-hidden="true" />
                {tn('learn')}
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="glass-button min-h-12 rounded-2xl px-6 font-semibold"
            >
              <Link href="/workmind" prefetch={false}>
                <BrainCircuit className="mr-2 h-5 w-5" aria-hidden="true" />
                {tn('workmind')}
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="min-h-12 rounded-2xl px-6">
              <Link href="/" prefetch={false}>
                <Home className="mr-2 h-5 w-5" aria-hidden="true" />
                {tn('home')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="soft-landing-hubs">
        <div className="mb-5 text-center sm:text-left">
          <h2
            id="soft-landing-hubs"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {t('hubsHeading')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('hubsSubheading')}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hubs.map(({ href, title, body, icon: HubIcon, primary }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card
                className={`glass-panel h-full border-border/50 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ${
                  primary ? 'ring-1 ring-primary/20' : ''
                }`}
              >
                <CardHeader className="space-y-3 pb-2">
                  <div className="w-fit rounded-xl border bg-background p-2.5 shadow-sm">
                    <HubIcon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base group-hover:text-primary sm:text-lg">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{body}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {t('hubCta')}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">{t('footnote', { path })}</p>
    </div>
  );
}
