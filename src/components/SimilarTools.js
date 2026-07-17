import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import ToolIcon from '@/components/ToolIcon';

async function getSimilarTools(currentTool, labels) {
  const similarToolSelect =
    'id, name, name_en, slug, description, description_en, link, category_id';
  const similarToolLimit = 6;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  let query = supabase
    .from('tools')
    .select(similarToolSelect)
    .eq('is_approved', true)
    .neq('id', currentTool.id)
    .limit(similarToolLimit);

  if (currentTool.category_id) {
    query = query.eq('category_id', currentTool.category_id);
  }

  let { data, error } = await query;

  if (!error && (!data || data.length === 0) && currentTool.category_id) {
    const fallback = await supabase
      .from('tools')
      .select(similarToolSelect)
      .eq('is_approved', true)
      .neq('id', currentTool.id)
      .limit(similarToolLimit);

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Benzer araçlar çekilirken hata:', error);
    return [];
  }

  return (data || []).map((tool) => ({
    ...tool,
    reason: tool.category_id === currentTool.category_id ? labels.reasonSame : labels.reasonAlt,
  }));
}

export async function SimilarTools({ currentTool }) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'ToolDetail' });
  const useEn = locale === 'en';

  const similarTools = await getSimilarTools(currentTool, {
    reasonSame: t('similarReasonSame'),
    reasonAlt: t('similarReasonAlt'),
  });

  if (similarTools.length === 0) {
    return null;
  }

  return (
    <div id="tool-similar" className="scroll-mt-36 space-y-4 sm:scroll-mt-40 sm:space-y-6">
      <div>
        <h2
          id="similar-tools-heading"
          className="flex items-center gap-2 text-xl font-bold sm:gap-3 sm:text-2xl"
        >
          <Lightbulb className="h-5 w-5 text-primary sm:h-7 sm:w-7" aria-hidden="true" />
          {t('similarHeading')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('similarSubheading')}</p>
      </div>
      <Carousel
        opts={{
          align: 'start',
          loop: similarTools.length > 3,
        }}
        className="w-full"
        aria-labelledby="similar-tools-heading"
      >
        <CarouselContent>
          {similarTools.map((tool) => {
            const displayName = useEn && tool.name_en ? tool.name_en : tool.name;
            const displayDescription =
              useEn && tool.description_en ? tool.description_en : tool.description;

            return (
              <CarouselItem key={tool.slug} className="md:basis-1/2 lg:basis-1/3">
                <div className="h-full p-1">
                  <Card className="glass-panel flex h-full flex-col border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                      <CardTitle className="text-base leading-tight sm:text-lg">
                        <Link
                          href={`/tool/${tool.slug}`}
                          className="flex items-center gap-2.5 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          prefetch={false}
                        >
                          <ToolIcon
                            name={displayName}
                            link={tool.link}
                            className="h-8 w-8 shrink-0"
                          />
                          <span className="line-clamp-2">{displayName}</span>
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0 sm:p-5 sm:pt-0">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {displayDescription || t('similarFallbackDesc')}
                      </p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        <span className="font-semibold text-foreground">{t('similarWhy')}</span>{' '}
                        {tool.reason}
                      </p>
                      <Button asChild variant="outline" size="sm" className="mt-auto w-full">
                        <Link href={`/tool/${tool.slug}`} prefetch={false}>
                          {t('viewDetails')}
                          <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}
