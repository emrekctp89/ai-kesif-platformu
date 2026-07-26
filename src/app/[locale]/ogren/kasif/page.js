import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { generatePageMetadata } from '@/utils/seo';
import { getSiteOrigin } from '@/utils/siteUrl';
import KasifLearnPathClient from '@/components/learn/KasifLearnPathClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LearnKasif' });
  const path = locale === 'en' ? '/en/ogren/kasif' : '/ogren/kasif';

  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path,
  });
}

export default async function KasifLearnPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LearnKasif' });
  const siteUrl = getSiteOrigin();
  const url = `${siteUrl}${locale === 'en' ? '/en/ogren/kasif' : '/ogren/kasif'}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: t('title'),
    description: t('subtitle'),
    url,
    inLanguage: locale === 'en' ? 'en-US' : 'tr-TR',
    provider: {
      '@type': 'Organization',
      name: 'AI Keşif Platformu',
      url: siteUrl,
    },
    educationalLevel: 'Beginner',
    timeRequired: 'PT45M',
    isPartOf: {
      '@type': 'CollectionPage',
      name: locale === 'en' ? 'AI Learning Hub' : 'AI Öğrenme Merkezi',
      url: `${siteUrl}${locale === 'en' ? '/en/ogren' : '/ogren'}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">{t('loading')}</div>
        }
      >
        <KasifLearnPathClient />
      </Suspense>
    </>
  );
}
