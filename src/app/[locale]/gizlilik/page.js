import Link from 'next/link';
import { Cookie, Database, Mail, ShieldCheck, UserCog } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PrivacyPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/gizlilik' : '/gizlilik',
  });
}

function PolicySection({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-3 text-xl font-semibold tracking-tight">
        <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <p className="leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export default async function PrivacyPolicyPage({ params }) {
  await params;
  const t = await getTranslations('PrivacyPage');

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 text-base text-muted-foreground sm:text-lg">
            {t('lastUpdated')}
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

      <Card className="glass-panel border-border/50">
        <CardContent className="space-y-8 p-6 sm:p-8">
          <PolicySection icon={ShieldCheck} title={t('sectionSecurityTitle')}>
            {t('sectionSecurityBody')}
          </PolicySection>
          <PolicySection icon={Database} title={t('sectionDataTitle')}>
            {t('sectionDataBody')}
          </PolicySection>
          <PolicySection icon={UserCog} title={t('sectionUseTitle')}>
            {t('sectionUseBody')}
          </PolicySection>
          <PolicySection icon={Cookie} title={t('sectionCookiesTitle')}>
            {t('sectionCookiesBody')}
          </PolicySection>
        </CardContent>
      </Card>
    </div>
  );
}
