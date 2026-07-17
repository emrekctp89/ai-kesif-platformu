import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { LayoutGrid, GitCompareArrows } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { HomepageClient } from '@/components/HomepageClient';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { getCategoryConfig, sortCategoriesByCanonicalOrder } from '@/lib/categoryConfig';
import { getSiteOrigin } from '@/utils/siteUrl';

const siteUrl = getSiteOrigin();

async function getCategory(slug) {
  const supabase = await createClient(await cookies());
  const { data } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('slug', slug)
    .maybeSingle();

  return data;
}

async function getCategoryPageData(slug) {
  const supabase = await createClient(await cookies());
  const { fetchMoreTools } = await import('@/app/actions');

  const [category, authResult, initialTools, categoriesResult, tagsResult] = await Promise.all([
    getCategory(slug),
    supabase.auth.getUser(),
    fetchMoreTools({ page: 0, searchParams: { category: slug } }),
    supabase.from('categories').select('name, slug').order('name'),
    supabase.from('tags').select('id, name').order('name'),
  ]);

  if (!category) return null;

  const user = authResult.data.user;
  const { data: favorites } = user
    ? await supabase.from('favorites').select('tool_id').eq('user_id', user.id)
    : { data: [] };

  return {
    category,
    initialData: {
      user,
      favoriteToolIds: new Set(favorites?.map((favorite) => favorite.tool_id) || []),
      initialTools,
      categories: sortCategoriesByCanonicalOrder(categoriesResult.data || []),
      allTags: tagsResult.data || [],
    },
  };
}

export async function generateMetadata({ params }) {
  const { slug, locale } = await params;
  const category = await getCategory(slug);
  const t = await getTranslations({ locale, namespace: 'CategoryDetail' });

  if (!category) {
    return {
      title: 'Kategori bulunamadı',
      robots: { index: false, follow: false },
    };
  }

  const config = getCategoryConfig(category.slug);
  const title = t('metaTitle', { name: category.name });
  const description = config.description || t('metaDescription', { name: category.name });
  const pageUrl = `${siteUrl}${locale === 'en' ? '/en' : ''}/kategori/${category.slug}`;
  const ogImageUrl = `${siteUrl}/opengraph-image`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function CategoryPage({ params }) {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CategoryDetail' });
  const pageData = await getCategoryPageData(slug);

  if (!pageData) notFound();

  const { category, initialData } = pageData;
  const config = getCategoryConfig(category.slug);
  const Icon = config.icon;
  const title = t('metaTitle', { name: category.name });
  const description = config.description || t('fallbackDescription', { name: category.name });
  const categoryUrl = `${siteUrl}${locale === 'en' ? '/en' : ''}/kategori/${category.slug}`;
  const toolsCount = initialData.initialTools?.length || 0;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': categoryUrl,
        name: title,
        description,
        url: categoryUrl,
        inLanguage: locale === 'en' ? 'en-US' : 'tr-TR',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: toolsCount,
          itemListElement: (initialData.initialTools || []).map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: tool.name,
            url: `${siteUrl}/tool/${tool.slug}`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${categoryUrl}#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('breadcrumbHome'),
            item: locale === 'en' ? `${siteUrl}/en` : siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('breadcrumbCategories'),
            item: locale === 'en' ? `${siteUrl}/en/kategori` : `${siteUrl}/kategori`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: category.name,
            item: categoryUrl,
          },
        ],
      },
    ],
  };

  const customHeader = (
    <div className="brand-surface relative mx-auto max-w-4xl overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
        <div className={`rounded-2xl border bg-background p-4 shadow-lg ${config.border}`}>
          <Icon className={`h-10 w-10 ${config.text}`} aria-hidden="true" />
        </div>
        <div>
          <h1
            id="tools-page-title"
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl"
          >
            {category.name}{' '}
            <span className="font-light text-muted-foreground">{t('toolsSuffix')}</span>
          </h1>
          {config.description ? (
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {config.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
            {t('statsTools', { count: toolsCount })}
          </span>
          <Button asChild variant="outline" size="sm" className="glass-button min-h-9 rounded-full">
            <Link href="/kategori" prefetch={false}>
              <LayoutGrid className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('ctaAllCategories')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="glass-button min-h-9 rounded-full">
            <Link href="/karsilastir" prefetch={false}>
              <GitCompareArrows className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('ctaCompare')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <HomepageClient
        initialData={initialData}
        searchParams={{ category: category.slug }}
        fixedSearchParams={{ category: category.slug }}
        pageTitle={title}
        pageDescription={description}
        discoverySections={null}
        customHeader={customHeader}
      />
    </>
  );
}
