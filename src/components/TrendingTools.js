import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import ToolIcon from '@/components/ToolIcon';

async function getTrendingData() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.rpc('get_trending_tools');
  if (error) {
    logger.error('Trend olan araçlar çekilirken hata:', error);
    return [];
  }
  return data;
}

/**
 * @param {{ emptyMode?: 'hide' | 'message' }} props
 * emptyMode: 'hide' (default) — veri yoksa hiçbir şey render etme
 *            'message' — bilgilendirici empty state göster
 */
export async function TrendingTools({ emptyMode = 'hide' } = {}) {
  const trendingTools = await getTrendingData();

  if (!trendingTools || trendingTools.length === 0) {
    if (emptyMode === 'message') {
      return (
        <div className="my-12 rounded-lg bg-muted p-4 text-center">
          <p className="text-muted-foreground">
            Haftanın Trendleri bölümü için yeterli veri bulunamadı. <br />
            (Veritabanınızda son 7 günde favoriye eklenmiş, en az 1 onaylanmış araç olmalı)
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <section className="mb-4" aria-labelledby="trending-tools-heading">
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div>
          <h2
            id="trending-tools-heading"
            className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground"
          >
            <Flame className="h-7 w-7 text-orange-500" aria-hidden="true" />
            Haftanın Trendleri
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Son günlerde en çok favoriye eklenen araçlar
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {trendingTools.map((tool) => (
          <Link
            key={tool.id}
            href={`/tool/${tool.slug}`}
            className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
            prefetch={false}
          >
            <Card className="glass-panel h-full overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
              <CardContent className="p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold sm:text-base group-hover:text-primary">
                  <ToolIcon name={tool.name} link={tool.link} className="h-6 w-6 shrink-0" />
                  <span className="truncate">{tool.name}</span>
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">{tool.category_name}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span aria-hidden="true">🔥</span>
                  <span className="font-bold">{tool.favorite_count} favori</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
