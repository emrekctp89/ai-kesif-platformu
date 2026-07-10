import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Zap } from 'lucide-react'; // Zap ikonu "Günün Aracı" temasını güçlendirir
import ToolIcon from '@/components/ToolIcon';
import { TrackedExternalLink } from '@/components/TrackedExternalLink';

// Veritabanındaki RPC fonksiyonunu çağıran fonksiyon
async function getToolOfTheDayData() {
  const supabase = await createClient(await cookies());
  // RPC ile özel fonksiyonumuzu çağırıyoruz ve tek bir sonuç bekliyoruz.
  const { data, error } = await supabase.rpc('get_tool_of_the_day').single();

  if (error) {
    console.error('Günün aracı çekilirken hata:', error);
    return null;
  }
  return data;
}

export async function ToolOfTheDay() {
  const tool = await getToolOfTheDayData();

  // Eğer günün aracı bulunamazsa, bu bölümü hiç gösterme
  if (!tool) {
    return null;
  }

  return (
    <div className="mb-12 relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl" />
      <Card className="relative w-full glass-panel border-2 border-primary/30 shadow-2xl overflow-hidden rounded-3xl">
        <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
        <CardContent className="relative grid items-center gap-6 p-6 sm:p-8 md:grid-cols-2 md:gap-10 md:p-10 z-10">
          {/* Sol Taraf: Açıklamalar */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-bold text-primary shadow-inner">
              <Zap className="h-4 w-4 animate-bounce" />
              <span>GÜNÜN ARACI</span>
            </div>
            <h2 className="flex items-center gap-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              <div className="p-3 bg-background rounded-2xl shadow-lg border border-border/50 animate-float">
                <ToolIcon name={tool.name} link={tool.link} className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {tool.name}
              </span>
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              {tool.description}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button
                asChild
                className="w-full sm:w-auto shadow-xl hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                size="lg"
              >
                <TrackedExternalLink
                  href={tool.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  eventName="official_site_click"
                  eventParameters={{
                    source: 'tool_of_the_day',
                    tool_slug: tool.slug,
                    category: tool.category_slug,
                  }}
                  className="font-semibold px-8"
                >
                  İncele & Keşfet
                </TrackedExternalLink>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto glass-button">
                <Link href={`/tool/${tool.slug}`}>Detayları Gör</Link>
              </Button>
            </div>
          </div>
          {/* Sağ Taraf: Etiketler ve Kategori */}
          <div className="hidden md:flex flex-col items-end justify-center">
            <div className="glass-panel p-6 rounded-2xl w-full max-w-sm backdrop-blur-xl">
              <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                Kategori
              </p>
              <Link href={`/kategori/${tool.category_slug}`}>
                <Badge className="text-sm py-1.5 px-3 bg-secondary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer text-secondary-foreground">
                  {tool.category_name}
                </Badge>
              </Link>

              {tool.tags && tool.tags.length > 0 && (
                <>
                  <p className="text-sm font-semibold mt-6 mb-2 text-muted-foreground uppercase tracking-wider">
                    Öne Çıkan Etiketler
                  </p>
                  <div className="flex flex-wrap gap-2 justify-start">
                    {tool.tags.slice(0, 5).map((tag) => (
                      <Link key={tag.id} href={`/?tags=${tag.id}`}>
                        <Badge
                          variant="outline"
                          className="hover:bg-accent hover:border-primary transition-all cursor-pointer bg-background/50"
                        >
                          {tag.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
