import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ToolIcon from '@/components/ToolIcon';
import { TrackedExternalLink } from '@/components/TrackedExternalLink';

async function getFeaturedTools() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('tools_with_ratings')
    .select('id, name, slug, description, link, tier, category_name, category_slug')
    .eq('is_approved', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Öne çıkan araçlar çekilirken hata:', error);
    return [];
  }

  return data || [];
}

export async function FeaturedTools() {
  const featuredTools = await getFeaturedTools();

  if (featuredTools.length === 0) return null;

  return (
    <section className="mb-12" aria-labelledby="featured-tools-heading">
      <h2
        id="featured-tools-heading"
        className="mb-4 text-2xl font-bold tracking-tight text-foreground"
      >
        Öne Çıkan Araçlar
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featuredTools.map((tool) => (
          <Card
            key={tool.id}
            className="h-full border-none bg-gradient-to-r from-[#7F00FF] via-[#00BFFF] to-[#FF1493] text-white shadow-lg"
          >
            <CardContent className="flex h-full flex-col p-6">
              <div>
                {tool.tier && (
                  <Badge variant="secondary" className="mb-3">
                    {tool.tier}
                  </Badge>
                )}
                <Link href={`/tool/${tool.slug}`} prefetch={false}>
                  <h3 className="flex items-center gap-2 text-lg font-semibold hover:underline">
                    <ToolIcon
                      name={tool.name}
                      link={tool.link}
                      className="h-6 w-6 border-white/30 bg-white/15"
                    />
                    {tool.name}
                  </h3>
                </Link>
                <p className="mt-2 line-clamp-3 text-sm text-white/85">{tool.description}</p>
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <Link
                  href={`/kategori/${tool.category_slug}`}
                  prefetch={false}
                  className="text-xs font-medium text-white/90 hover:underline"
                >
                  {tool.category_name}
                </Link>
                {tool.link && (
                  <Button asChild size="sm" variant="secondary">
                    <TrackedExternalLink
                      href={tool.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      eventName="official_site_click"
                      eventParameters={{
                        source: 'featured_tools',
                        tool_slug: tool.slug,
                        category: tool.category_slug,
                      }}
                    >
                      Ziyaret Et
                    </TrackedExternalLink>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
