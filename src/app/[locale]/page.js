import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { HomepageClient } from '@/components/HomepageClient';
import { FeaturedTools } from '@/components/FeaturedTools';
import { ToolOfTheDay } from '@/components/ToolOfTheDay';
import { CategoryGrid } from '@/components/CategoryGrid';
import { sortCategoriesByCanonicalOrder } from '@/lib/categoryConfig';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getTranslations } from 'next-intl/server';
import { getSiteOrigin } from '@/utils/siteUrl';

const siteUrl = getSiteOrigin();

// Bu fonksiyon, sayfa için gerekli olan tüm verileri sunucuda tek seferde çeker.
async function getPageData(searchParams) {
  const supabase = await createClient(await cookies());

  const { fetchMoreTools } = await import('@/app/actions');
  const [authResult, initialTools, categoriesResult, tagsResult] = await Promise.all([
    supabase.auth.getUser(),
    fetchMoreTools({ page: 0, searchParams }),
    supabase.from('categories').select('name, slug').order('name'),
    supabase.from('tags').select('id, name').order('name'),
  ]);

  const user = authResult.data.user;
  const { data: favorites } = user
    ? await supabase.from('favorites').select('tool_id').eq('user_id', user.id)
    : { data: [] };

  // Client Component props must be serializable — pass an array, not a Set.
  const favoriteToolIds = favorites?.map((f) => f.tool_id).filter(Boolean) || [];

  return {
    user,
    favoriteToolIds,
    initialTools,
    categories: sortCategoriesByCanonicalOrder(categoriesResult.data || []),
    allTags: tagsResult.data || [],
  };
}

export default async function HomePage(props) {
  const { searchParams, params } = props;
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  const t = await getTranslations({ locale, namespace: 'Hero' });

  // Tüm verileri sunucuda çekiyoruz
  const initialData = await getPageData(resolvedSearchParams);

  // Keşif bölümlerini Server Component olarak oluşturuyoruz.
  // Keys: RSC → Client prop geçişinde React list uyarısını önler.
  const discoverySections = (
    <div key="discovery-sections" className="space-y-12">
      <CategoryGrid key="category-grid" categories={initialData.categories} />
      <ToolOfTheDay key="tool-of-the-day" />
      <FeaturedTools key="featured-tools" />
      <SpeedInsights key="speed-insights" />
    </div>
  );

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'AI Keşif',
        url: siteUrl,
        logo: `${siteUrl}/favicon.ico`,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'AI Keşif Platformu',
        url: siteUrl,
        inLanguage: 'tr-TR',
        publisher: {
          '@id': `${siteUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteUrl}/?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  // Hem verileri HEM DE hazır oluşturulmuş sunucu bileşenlerini
  // interaktif mantığı yönetecek olan Client Component'e aktarıyoruz.
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      {/* Bug fix: HomepageClient useSearchParams() kullanıyor, Next.js bunun
          bir Suspense sınırı içinde olmasını gerektiriyor. */}
      <Suspense fallback={null}>
        <HomepageClient
          initialData={initialData}
          searchParams={resolvedSearchParams}
          discoverySections={discoverySections}
          pageTitle={t('title')}
          pageDescription={t('subtitle')}
        />
      </Suspense>
    </>
  );
}
