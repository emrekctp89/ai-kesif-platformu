import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Dices, RefreshCw, Star } from 'lucide-react';

import ToolIcon from '@/components/ToolIcon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export const dynamic = 'force-dynamic';

async function getThreeRandomTools() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.rpc('get_random_tools', {
    result_limit: 3,
  });

  if (error) {
    console.error('Rastgele araçlar çekilirken hata:', error);
    return [];
  }
  return data || [];
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

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generatePageMetadata({
    title: locale === 'en' ? 'Random tools' : 'Rastgele Araç Keşfi',
    description:
      locale === 'en'
        ? 'Discover random AI tools hand-picked for you.'
        : 'Sizin için özel olarak seçilmiş rastgele yapay zeka araçlarını keşfedin.',
    path: locale === 'en' ? '/en/random-tools' : '/random-tools',
  });
}

export default async function RandomToolsPage({ params }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  const randomTools = await getThreeRandomTools();

  const copy = {
    chip: isEn ? 'Lucky draw' : 'Şanslı seçim',
    title: isEn ? 'Random tools for you' : 'Sizin için seçilmiş rastgele araçlar',
    subtitle: isEn
      ? 'Stumble upon hidden gems from the catalog.'
      : 'Platformumuzdaki gizli kalmış cevherleri şans eseri keşfedin.',
    again: isEn ? 'Draw again' : 'Yeniden çek',
    empty: isEn
      ? 'Could not load random tools. Try again.'
      : 'Rastgele araçlar getirilirken bir sorun oluştu.',
    explore: isEn ? 'View details' : 'Detayı gör',
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold">
            <Dices className="h-4 w-4" aria-hidden="true" />
            {copy.chip}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {copy.title}
          </h1>
          <p className="mx-auto mt-4 text-base text-muted-foreground sm:text-lg">{copy.subtitle}</p>
          <Button asChild className="brand-gradient mt-6 min-h-11 shadow-md">
            <Link href="/random-tools" prefetch={false}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              {copy.again}
            </Link>
          </Button>
        </div>
      </section>

      {randomTools.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {randomTools.map((tool) => {
            const rating = formatRating(tool.average_rating);
            const tags = normalizeTags(tool.tags);
            return (
              <Card
                key={tool.id}
                className="glass-panel flex h-full flex-col border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <CardContent className="flex h-full flex-col p-5 sm:p-6">
                  <div className="mb-3 flex items-start gap-3">
                    <ToolIcon name={tool.name} link={tool.link} className="h-11 w-11 shrink-0" />
                    <div className="min-w-0">
                      {tool.category_name ? (
                        <Badge variant="secondary" className="mb-1.5">
                          {tool.category_name}
                        </Badge>
                      ) : null}
                      <Link
                        href={`/tool/${tool.slug}`}
                        prefetch={false}
                        className="block text-lg font-bold leading-snug hover:text-primary hover:underline"
                      >
                        {tool.name}
                      </Link>
                    </div>
                  </div>

                  {tags.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {tags.slice(0, 3).map((tag) => (
                        <Badge key={tag.id} variant="outline" className="text-[10px]">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  <p className="mb-4 line-clamp-3 flex-1 text-sm text-muted-foreground">
                    {tool.description || ''}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3">
                    {rating ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Star
                          className="h-4 w-4 fill-amber-400 text-amber-400"
                          aria-hidden="true"
                        />
                        <span className="font-bold">{rating}</span>
                        <span className="text-muted-foreground">({tool.total_ratings || 0})</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <Button asChild variant="outline" size="sm" className="min-h-9">
                      <Link href={`/tool/${tool.slug}`} prefetch={false}>
                        {copy.explore}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <Dices className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">{copy.empty}</p>
          <Button asChild className="brand-gradient mt-6 min-h-11">
            <Link href="/random-tools" prefetch={false}>
              {copy.again}
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}
