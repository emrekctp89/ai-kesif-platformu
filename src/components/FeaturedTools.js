import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
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
        {featuredTools.map((tool, index) => (
          <Card
            key={tool.id ?? tool.slug ?? `featured-${index}`}
            className="group relative h-full overflow-hidden border border-indigo-500/20 bg-slate-950 text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-[0_8px_30px_rgb(99,102,241,0.2)]"
          >
            {/* Aurora / cam efekt katmanları */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-slate-950 to-purple-900/40" />
            <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-indigo-600/30 blur-3xl transition-all duration-500 group-hover:bg-indigo-500/40" />
            <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-purple-600/30 blur-3xl transition-all duration-500 group-hover:bg-purple-500/40" />

            <CardContent className="relative z-10 flex h-full flex-col p-6">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Öne Çıkan
                  </Badge>
                  {tool.tier ? (
                    <Badge variant="secondary" className="bg-white/15 text-white hover:bg-white/20">
                      {tool.tier}
                    </Badge>
                  ) : null}
                </div>
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
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="bg-white text-slate-950 hover:bg-white/90"
                  >
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
