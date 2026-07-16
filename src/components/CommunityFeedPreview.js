import Link from 'next/link';
import { ArrowRight, Rss } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import { ActivityFeedEventCard, getFeedEventKey } from '@/components/ActivityFeedEventCard';

async function getGeneralFeed(limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_community_activity_feed');

  if (error) {
    console.error('Topluluk akışı özeti çekilirken hata:', error);
    return [];
  }

  return (Array.isArray(data) ? data : []).slice(0, limit);
}

/**
 * Keşfet / Topluluk sayfalarında kısa "Topluluk Akışı" özeti.
 */
export async function CommunityFeedPreview({ limit = 5, className = '' } = {}) {
  const items = await getGeneralFeed(limit);

  if (items.length === 0) return null;

  return (
    <section className={className} aria-labelledby="community-feed-preview-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="community-feed-preview-heading"
            className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            <Rss className="h-7 w-7 text-indigo-600 dark:text-indigo-300" />
            Topluluk Akışı
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Platformdaki son favoriler, yorumlar, eserler ve promptlar.
          </p>
        </div>
        <Button asChild variant="outline" className="self-start sm:self-auto">
          <Link href="/akis">
            Tüm akışı gör
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((event, index) => (
          <ActivityFeedEventCard key={getFeedEventKey(event, index)} event={event} />
        ))}
      </div>

      <div className="mt-5 flex justify-center">
        <Button asChild className="brand-gradient shadow-md">
          <Link href="/akis">
            Canlı akışa git
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
