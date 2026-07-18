import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { LayoutGrid, GitCompareArrows } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { HomepageClient } from '@/components/HomepageClient';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import {
  filterPrimaryCategories,
  getCategoryConfig,
  sortCategoriesByCanonicalOrder,
} from '@/lib/categoryConfig';
import { resolvePrimarySlug } from '@/lib/categoryTaxonomy';
import { getSiteOrigin } from '@/utils/siteUrl';

const siteUrl = getSiteOrigin();

async function getCategory(slug) {
  const supabase = await createClient(await cookies());
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();

  return data;
}

async function getApprovedToolCountForCategory(categoryId) {
  if (!categoryId) return 0;
  const supabase = await createClient(await cookies());
  const { count, error } = await supabase
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('is_approved', true);

  if (error) {
    console.error('Kategori araç sayısı okunamadı:', error.message);
    return 0;
  }

  return count ?? 0;
}

async function getCategoryPageData(slug) {
  const supabase = await createClient(await cookies());
  const { fetchMoreTools } = await import('@/app/actions');

  const category = await getCategory(slug);
  if (!category) return null;

  const [authResult, initialTools, categoriesResult, tagsResult, toolsCount] = await Promise.all([
    supabase.auth.getUser(),
    fetchMoreTools({ page: 0, searchParams: { category: slug } }),
    supabase.from('categories').select('name, slug').order('name'),
    supabase.from('tags').select('id, name').order('name'),
    getApprovedToolCountForCategory(category.id),
  ]);

  const user = authResult.data.user;
  const { data: favorites } = user
    ? await supabase.from('favorites').select('tool_id').eq('user_id', user.id)
    : { data: [] };

  return {
    category,
    toolsCount,
    initialData: {
      user,
      favoriteToolIds: favorites?.map((favorite) => favorite.tool_id).filter(Boolean) || [],
      initialTools,
      categories: sortCategoriesByCanonicalOrder(
        filterPrimaryCategories(categoriesResult.data || [])
      ),
      allTags: tagsResult.data || [],
      stats: {
        toolCount: toolsCount,
        categoryCount: 1,
      },
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
  const primarySlug = resolvePrimarySlug(slug);
  if (primarySlug && primarySlug !== slug) {
    redirect(locale === 'en' ? `/en/kategori/${primarySlug}` : `/kategori/${primarySlug}`);
  }

  const t = await getTranslations({ locale, namespace: 'CategoryDetail' });
  const pageData = await getCategoryPageData(slug);

  if (!pageData) notFound();

  const { category, initialData, toolsCount } = pageData;
  const config = getCategoryConfig(category.slug);
  const Icon = config.icon;
  const title = t('metaTitle', { name: category.name });
  const description = config.description || t('fallbackDescription', { name: category.name });
  const categoryUrl = `${siteUrl}${locale === 'en' ? '/en' : ''}/kategori/${category.slug}`;

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
    <div className="brand-surface relative overflow-hidden rounded-2xl border border-border/40 px-4 py-3.5 shadow-sm glass-panel sm:px-5 sm:py-4">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div
            className={`shrink-0 rounded-xl border bg-background p-2.5 shadow-sm ${config.border}`}
          >
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${config.text}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 text-left">
            <h1
              id="tools-page-title"
              className="truncate text-lg font-extrabold tracking-tight text-foreground sm:text-xl md:text-2xl"
            >
              {category.name}{' '}
              <span className="font-light text-muted-foreground">{t('toolsSuffix')}</span>
            </h1>
            {config.description ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {config.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="inline-flex min-h-8 items-center rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-semibold sm:text-sm">
            {t('statsTools', { count: toolsCount })}
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button h-8 min-h-8 rounded-full px-3 text-xs"
          >
            <Link href="/kategori" prefetch={false}>
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t('ctaAllCategories')}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button h-8 min-h-8 rounded-full px-3 text-xs"
          >
            <Link href="/karsilastir" prefetch={false}>
              <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
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
