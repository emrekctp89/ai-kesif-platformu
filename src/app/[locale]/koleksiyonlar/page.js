import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowRight, Library, Map, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export const revalidate = 3600;

async function getPublicCollections() {
  const supabase = await createClient(await cookies());

  let { data, error } = await supabase
    .from('collections')
    .select(
      `
      title,
      slug,
      description,
      type,
      profiles ( username, email ),
      collection_tools ( count )
    `
    )
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    const fallback = await supabase
      .from('collections')
      .select('title, slug, description, type, profiles ( username, email )')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Herkese açık koleksiyonlar çekilirken hata:', error);
    return [];
  }

  return (data || []).map((collection) => {
    const profile = Array.isArray(collection.profiles)
      ? collection.profiles[0]
      : collection.profiles;
    const countRow = Array.isArray(collection.collection_tools)
      ? collection.collection_tools[0]
      : null;
    return {
      title: collection.title,
      slug: collection.slug,
      description: collection.description,
      type: collection.type,
      author: profile?.username || (profile?.email ? String(profile.email).split('@')[0] : null),
      toolsCount: Number(countRow?.count) || 0,
    };
  });
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CollectionsPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/koleksiyonlar' : '/koleksiyonlar',
  });
}

export default async function CollectionsPage({ params }) {
  await params;
  const t = await getTranslations('CollectionsPage');
  const collections = await getPublicCollections();

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10 sm:space-y-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Library className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 text-base text-muted-foreground sm:text-lg">{t('subtitle')}</p>
          <span className="mt-5 inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold">
            {t('statsCount', { count: collections.length })}
          </span>
        </div>
      </section>

      {collections.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 sm:gap-6">
          {collections.map((collection) => {
            const isPath = collection.type === 'Öğrenme Yolu';
            return (
              <Link
                key={collection.slug}
                href={`/koleksiyonlar/${collection.slug}`}
                className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                prefetch={false}
              >
                <Card className="glass-panel h-full border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isPath ? 'default' : 'secondary'} className="font-semibold">
                        {isPath ? (
                          <>
                            <Map className="mr-1 h-3 w-3" aria-hidden="true" />
                            {t('learningPath')}
                          </>
                        ) : (
                          <>
                            <Library className="mr-1 h-3 w-3" aria-hidden="true" />
                            {t('collection')}
                          </>
                        )}
                      </Badge>
                      {collection.toolsCount > 0 ? (
                        <Badge variant="outline">
                          {t('toolsCount', { count: collection.toolsCount })}
                        </Badge>
                      ) : null}
                    </div>
                    <CardTitle className="text-xl leading-snug transition-colors group-hover:text-primary">
                      {collection.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('createdBy', {
                        name: collection.author || t('unknownAuthor'),
                      })}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {collection.description || t('noDescription')}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {t('openCollection')}
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <Library className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
        </section>
      )}
    </div>
  );
}
