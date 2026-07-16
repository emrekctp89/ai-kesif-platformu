import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { HomepageClient } from '@/components/HomepageClient';
import { getCategoryConfig } from '@/lib/categoryConfig';

const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aikeşif.com').origin;

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
      categories: categoriesResult.data || [],
      allTags: tagsResult.data || [],
    },
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return {
      title: 'Kategori bulunamadı',
      robots: { index: false, follow: false },
    };
  }

  const title = `${category.name} Yapay Zeka Araçları`;
  const description = `${category.name} kategorisindeki güncel yapay zeka araçlarını keşfedin, özelliklerini inceleyin ve ihtiyacınıza uygun çözümü bulun.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/kategori/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/kategori/${category.slug}`,
      type: 'website',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: `${category.name} yapay zeka araçları - AI Keşif`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const pageData = await getCategoryPageData(slug);

  if (!pageData) notFound();

  const { category, initialData } = pageData;
  const title = `${category.name} Yapay Zeka Araçları`;
  const description = `${category.name} alanındaki araçları karşılaştırın ve işinize en uygun yapay zeka çözümünü keşfedin.`;
  const categoryUrl = `${siteUrl}/kategori/${category.slug}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': categoryUrl,
        name: title,
        description,
        url: categoryUrl,
        inLanguage: 'tr-TR',
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: initialData.initialTools.length,
          itemListElement: initialData.initialTools.map((tool, index) => ({
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
            name: 'Ana Sayfa',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: category.name,
            item: categoryUrl,
          },
        ],
      },
    ],
  };

  const config = getCategoryConfig(category.slug);
  const Icon = config.icon;

  const customHeader = (
    <div className="flex flex-col items-center justify-center space-y-4 pb-2">
      <div
        className={`p-4 rounded-2xl bg-background border ${config.border} shadow-lg shadow-${config.color}-500/10`}
      >
        <Icon className={`w-10 h-10 ${config.text}`} />
      </div>
      <div>
        <h1
          id="tools-page-title"
          className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          {category.name} <span className="font-light text-muted-foreground">Araçları</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
          {config.description}
        </p>
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
