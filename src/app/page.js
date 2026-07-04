import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { HomepageClient } from '@/components/HomepageClient';
import { FeaturedTools } from '@/components/FeaturedTools';
import { ToolOfTheDay } from '@/components/ToolOfTheDay';
import { SpeedInsights } from '@vercel/speed-insights/next';

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aikeşif.com').origin;

// Bu fonksiyon, sayfa için gerekli olan tüm verileri sunucuda tek seferde çeker.
async function getPageData(searchParams) {
  const supabase = createClient(await cookies());

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

  const favoriteToolIds = new Set(favorites?.map((f) => f.tool_id) || []);

  return {
    user,
    favoriteToolIds,
    initialTools,
    categories: categoriesResult.data || [],
    allTags: tagsResult.data || [],
  };
}

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  // Tüm verileri sunucuda çekiyoruz
  const initialData = await getPageData(resolvedSearchParams);

  // Keşif bölümlerini burada, bir Server Component olarak oluşturuyoruz
  const discoverySections = (
    <div className="space-y-12">
      <ToolOfTheDay />
      <FeaturedTools />
      <SpeedInsights />
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
      <HomepageClient
        initialData={initialData}
        searchParams={resolvedSearchParams}
        discoverySections={discoverySections}
      />
    </>
  );
}
