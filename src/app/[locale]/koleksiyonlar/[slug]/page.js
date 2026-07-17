import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Library, Star, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import ToolIcon from '@/components/ToolIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export const revalidate = 3600;

async function getCollectionDetails(slug) {
  const supabase = await createClient(await cookies());

  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select(
      `
      title,
      description,
      type,
      slug,
      profiles ( username, email ),
      collection_tools ( tool_id, notes )
    `
    )
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle();

  if (collectionError || !collection) return null;

  const toolIds = (collection.collection_tools || []).map((item) => item.tool_id);

  if (toolIds.length === 0) {
    return { collection, tools: [] };
  }

  const { data: tools, error: toolsError } = await supabase
    .from('tools_with_ratings')
    .select(
      'id, name, name_en, slug, description, description_en, link, average_rating, total_ratings, category_name, tags, pricing_model'
    )
    .in('id', toolIds)
    .eq('is_approved', true);

  if (toolsError) {
    console.error('Koleksiyon araçları çekilirken hata:', toolsError);
    return { collection, tools: [] };
  }

  const orderMap = new Map(toolIds.map((id, index) => [id, index]));
  const toolsWithNotes = (tools || [])
    .map((tool) => {
      const collectionInfo = collection.collection_tools.find((item) => item.tool_id === tool.id);
      return {
        ...tool,
        user_notes: collectionInfo?.notes || '',
      };
    })
    .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return { collection, tools: toolsWithNotes };
}

function authorLabel(profiles, unknown) {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  if (profile?.username) return profile.username;
  if (profile?.email) return String(profile.email).split('@')[0];
  return unknown;
}

function formatRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(1);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => {
      if (typeof tag === 'string') return { id: tag, name: tag };
      if (tag?.name) return { id: tag.id || tag.name, name: tag.name };
      return null;
    })
    .filter(Boolean);
}

export async function generateMetadata(props) {
  const params = await props.params;
  const { slug, locale } = params;
  const result = await getCollectionDetails(slug);
  if (!result) return { title: 'Not found' };

  return generatePageMetadata({
    title: result.collection.title,
    description: result.collection.description,
    path: locale === 'en' ? `/en/koleksiyonlar/${slug}` : `/koleksiyonlar/${slug}`,
  });
}

export default async function CollectionDetailPage(props) {
  const params = await props.params;
  const { slug, locale } = params;
  const t = await getTranslations({ locale, namespace: 'CollectionDetail' });
  const useEn = locale === 'en';
  const result = await getCollectionDetails(slug);
  if (!result) notFound();

  const { collection, tools } = result;
  const author = authorLabel(collection.profiles, t('unknownAuthor'));

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/koleksiyonlar" prefetch={false}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('backToList')}
        </Link>
      </Button>

      <header className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-lg glass-panel sm:p-8">
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold">
            <Library className="h-4 w-4" aria-hidden="true" />
            {collection.type || 'Koleksiyon'}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {collection.title}
          </h1>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('createdBy', { name: author })}
          </div>
          {collection.description ? (
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {collection.description}
            </p>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="collection-tools-heading">
        <h2 id="collection-tools-heading" className="mb-5 text-2xl font-bold tracking-tight">
          {t('toolsHeading')}
          <span className="ml-2 text-base font-normal text-muted-foreground">({tools.length})</span>
        </h2>

        {tools.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
            {t('emptyTools')}
          </p>
        ) : (
          <div className="space-y-4">
            {tools.map((tool, index) => {
              const displayName = useEn && tool.name_en ? tool.name_en : tool.name;
              const displayDescription =
                useEn && tool.description_en ? tool.description_en : tool.description;
              const rating = formatRating(tool.average_rating);
              const tags = normalizeTags(tool.tags);

              return (
                <Card
                  key={tool.id}
                  className="glass-panel overflow-hidden border-border/50 transition-shadow hover:shadow-md"
                >
                  <CardContent className="grid gap-0 p-0 md:grid-cols-3">
                    <div className="border-b border-border/50 bg-muted/30 p-5 md:border-b-0 md:border-r">
                      <h3 className="mb-2 text-sm font-semibold">
                        {t('curatorNote', { index: index + 1 })}
                      </h3>
                      <p className="text-sm italic leading-6 text-muted-foreground">
                        {tool.user_notes || t('noNote')}
                      </p>
                    </div>

                    <div className="space-y-3 p-5 md:col-span-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <ToolIcon
                            name={displayName}
                            link={tool.link}
                            className="h-10 w-10 shrink-0"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/tool/${tool.slug}`}
                              prefetch={false}
                              className="text-lg font-bold tracking-tight hover:text-primary hover:underline"
                            >
                              {displayName}
                            </Link>
                            {tool.category_name ? (
                              <p className="text-xs text-muted-foreground">{tool.category_name}</p>
                            ) : null}
                          </div>
                        </div>
                        {rating ? (
                          <div className="flex shrink-0 items-center gap-1 text-sm">
                            <Star
                              className="h-4 w-4 fill-amber-400 text-amber-400"
                              aria-hidden="true"
                            />
                            <span className="font-bold">{rating}</span>
                          </div>
                        ) : null}
                      </div>

                      {tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.slice(0, 6).map((tag) => (
                            <Badge key={tag.id} variant="outline" className="text-[10px]">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {displayDescription || ''}
                      </p>

                      <Button asChild variant="outline" size="sm" className="min-h-9">
                        <Link href={`/tool/${tool.slug}`} prefetch={false}>
                          {t('viewTool')}
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
