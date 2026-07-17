import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Check, Sparkles, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ProUpgradeForm } from '@/components/ProUpgradeForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

async function getProducts() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('name');

  if (error) {
    console.error('Ürünler çekilirken hata:', error);
    return [];
  }
  return data;
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

export default async function PricingPage(props) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const locale = params?.locale;
  const t = await getTranslations({ locale, namespace: 'MembershipPage' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/login?message=${encodeURIComponent(t('loginRequired'))}`);
  }

  const products = await getProducts();
  const proProduct = products.find((p) => p.id === 'prod_pro_membership');
  const initialPromoCode = searchParams?.code || searchParams?.promo || '';
  const message = searchParams?.message || '';
  const price = proProduct?.prices?.[0];
  const currency = locale === 'en' ? 'en-US' : 'tr-TR';

  const freeFeatures = [t('freeFeature1'), t('freeFeature2'), t('freeFeature3'), t('freeFeature4')];
  const proFeatures = [
    t('proFeatureAll'),
    t('proFeatureTools'),
    t('proFeatureBadge'),
    t('proFeatureStudio'),
    t('proFeatureSupport'),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-10">
      {message ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {message}
        </div>
      ) : null}

      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
        <Card className="glass-panel rounded-2xl border-border/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">{t('freeTitle')}</CardTitle>
            <CardDescription>{t('freeDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold">{t('freePrice')}</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full min-h-11" disabled>
              {t('currentPlan')}
            </Button>
          </CardFooter>
        </Card>

        {proProduct && price ? (
          <Card className="relative overflow-hidden rounded-2xl border-2 border-primary shadow-xl glass-panel">
            <div className="absolute right-0 top-0 m-4">
              <Badge className="font-semibold">
                <Zap className="mr-1 h-3 w-3" aria-hidden="true" />
                {t('popular')}
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">{proProduct.name}</CardTitle>
              <CardDescription>{proProduct.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">
                {(price.unit_amount / 100).toLocaleString(currency, {
                  style: 'currency',
                  currency: 'TRY',
                })}
                <span className="text-sm font-normal text-muted-foreground">{t('perMonth')}</span>
              </div>
              <ul className="space-y-2 text-sm">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 font-semibold">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <ProUpgradeForm
                priceId={price.id}
                unitAmount={price.unit_amount}
                initialPromoCode={initialPromoCode}
              />
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
