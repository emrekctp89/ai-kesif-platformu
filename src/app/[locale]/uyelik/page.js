import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  BadgeCheck,
  Check,
  Compass,
  Crown,
  Lock,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/utils/supabase/server';
import { generatePageMetadata } from '@/utils/seo';
import { ProUpgradeForm } from '@/components/ProUpgradeForm';
import { ManageBillingButton } from '@/components/ManageBillingButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

async function getProducts() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('name');

  if (error) {
    console.error('Failed to load membership products:', error);
    return [];
  }
  return data || [];
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MembershipPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/uyelik' : '/uyelik',
  });
}

function FeatureRow({ included, label }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {included ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
      )}
      <span className={included ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

export default async function PricingPage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const locale = params?.locale;
  const t = await getTranslations({ locale, namespace: 'MembershipPage' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, products] = await Promise.all([
    user
      ? supabase
          .from('profiles')
          .select('stripe_price_id, stripe_current_period_end, stripe_customer_id')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null }),
    getProducts(),
  ]);

  const isAdmin = user?.email === process.env.ADMIN_EMAIL;
  const isProUser = !!profile?.stripe_price_id || isAdmin;
  const proProduct = products.find((product) => product.id === 'prod_pro_membership');
  const price = proProduct?.prices?.[0];
  const currencyCode = price?.currency?.toUpperCase?.() || 'TRY';
  const currencyLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const initialPromoCode = searchParams?.code || searchParams?.promo || '';
  const message = searchParams?.message || '';
  const checkoutSuccess =
    searchParams?.success === '1' || searchParams?.session_id || searchParams?.upgraded === '1';

  const formattedPrice = price
    ? (price.unit_amount / 100).toLocaleString(currencyLocale, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      })
    : null;

  const periodEnd = profile?.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString(currencyLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const freeFeatures = [t('freeFeature1'), t('freeFeature2'), t('freeFeature3'), t('freeFeature4')];
  const proFeatures = [
    t('proFeatureAll'),
    t('proFeatureTools'),
    t('proFeatureBadge'),
    t('proFeatureStudio'),
    t('proFeatureProjects'),
    t('proFeatureSupport'),
  ];

  const highlightFeatures = [
    {
      icon: WandSparkles,
      title: t('featureStudioTitle'),
      body: t('featureStudioBody'),
    },
    {
      icon: Crown,
      title: t('featureToolsTitle'),
      body: t('featureToolsBody'),
    },
    {
      icon: BadgeCheck,
      title: t('featureBadgeTitle'),
      body: t('featureBadgeBody'),
    },
    {
      icon: Sparkles,
      title: t('featureSupportTitle'),
      body: t('featureSupportBody'),
    },
  ];

  const comparisonRows = [
    { label: t('compareDiscovery'), basic: true, pro: true },
    { label: t('compareRatings'), basic: true, pro: true },
    { label: t('compareStudio'), basic: false, pro: true },
    { label: t('compareProTools'), basic: false, pro: true },
    { label: t('compareBadge'), basic: false, pro: true },
  ];

  const faqs = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-12 sm:space-y-16">
      {message ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {message}
        </div>
      ) : null}

      {checkoutSuccess && isProUser ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
        >
          {t('statusProOpen')}
        </div>
      ) : null}

      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Crown className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              t('heroStatTools'),
              t('heroStatStudio'),
              t('heroStatBadge'),
              t('heroStatSupport'),
            ].map((stat) => (
              <div
                key={stat}
                className="rounded-2xl border border-border/50 bg-background/50 px-3 py-3 text-xs font-semibold sm:text-sm"
              >
                {stat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {isProUser ? (
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-amber-400/10 p-6 shadow-md glass-panel sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                {t('statusProTitle')}
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t('statusProBody')}
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {periodEnd ? t('statusProUntil', { date: periodEnd }) : t('statusProOpen')}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild className="brand-gradient min-h-11 shadow-md">
                <Link href="/studyo" prefetch={false}>
                  <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('ctaStudio')}
                </Link>
              </Button>
              {profile?.stripe_customer_id ? <ManageBillingButton /> : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('plansHeading')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            {t('plansSubheading')}
          </p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 md:gap-8">
          <Card className="flex flex-col rounded-2xl border-border/50 shadow-md glass-panel">
            <CardHeader>
              <CardTitle className="text-2xl">{t('freeTitle')}</CardTitle>
              <CardDescription>{t('freeDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-6">
              <div className="text-4xl font-extrabold tracking-tight">{t('freePrice')}</div>
              <ul className="space-y-3">
                {freeFeatures.map((feature) => (
                  <FeatureRow key={feature} included label={feature} />
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {!isProUser ? (
                <Button variant="outline" className="min-h-11 w-full" disabled>
                  {t('currentPlan')}
                </Button>
              ) : (
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <Link href="/" prefetch={false}>
                    <Compass className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('ctaDiscover')}
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>

          {proProduct && price ? (
            <Card className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-primary shadow-xl glass-panel">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-400" />
              <div className="absolute right-4 top-4">
                <Badge className="border-0 bg-gradient-to-r from-indigo-950 to-purple-800 font-semibold text-white shadow-md">
                  <Zap className="mr-1 h-3 w-3" aria-hidden="true" />
                  {t('popular')}
                </Badge>
              </div>
              <CardHeader className="pr-28">
                <CardTitle className="text-2xl">{proProduct.name || t('proTitle')}</CardTitle>
                <CardDescription>{proProduct.description || t('proDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-6">
                <div>
                  <div className="text-4xl font-extrabold tracking-tight">
                    {formattedPrice}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      {t('perMonth')}
                    </span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {proFeatures.map((feature) => (
                    <FeatureRow key={feature} included label={feature} />
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-3">
                {isProUser ? (
                  <Button className="min-h-12 w-full" disabled>
                    <BadgeCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('proActive')}
                  </Button>
                ) : (
                  <ProUpgradeForm
                    priceId={price.id}
                    unitAmount={price.unit_amount}
                    currency={currencyCode}
                    initialPromoCode={initialPromoCode}
                    isLoggedIn={Boolean(user)}
                  />
                )}
              </CardFooter>
            </Card>
          ) : (
            <Card className="flex flex-col rounded-2xl border-dashed border-border/60 shadow-md glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  {t('proUnavailable')}
                </CardTitle>
                <CardDescription>{t('proUnavailableBody')}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline" className="min-h-11 w-full">
                  <Link href="/iletisim" prefetch={false}>
                    {t('ctaDiscover')}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground sm:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('trustSecure')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('trustCancel')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
            {t('trustInstant')}
          </span>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('featuresHeading')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            {t('featuresSubheading')}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {highlightFeatures.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-sm glass-panel sm:p-6"
            >
              <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('compareHeading')}</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/50 shadow-sm glass-panel">
          <div className="grid grid-cols-3 border-b border-border/50 bg-muted/40 px-4 py-3 text-sm font-semibold sm:px-6">
            <div>{t('compareFeature')}</div>
            <div className="text-center">{t('compareBasic')}</div>
            <div className="text-center text-primary">{t('comparePro')}</div>
          </div>
          {comparisonRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 items-center border-b border-border/40 px-4 py-3 text-sm last:border-b-0 sm:px-6"
            >
              <div className="pr-2 font-medium">{row.label}</div>
              <div className="text-center text-muted-foreground">
                {row.basic ? t('compareYes') : t('compareNo')}
              </div>
              <div className="text-center font-semibold text-primary">
                {row.pro ? t('compareYes') : t('compareNo')}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('faqHeading')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            {t('faqSubheading')}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card/30 px-4 glass-panel sm:px-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  );
}
