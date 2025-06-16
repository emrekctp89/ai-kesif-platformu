import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

async function getFeaturedTools() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tools_with_ratings")
    .select("*")
    .eq("is_approved", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Öne çıkan araçlar çekilirken hata:", error);
    return [];
  }
  return data;
}

export async function FeaturedTools() {
  const featuredTools = await getFeaturedTools();

  if (!featuredTools || featuredTools.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
        Öne Çıkan Araçlar
      </h2>
      <Carousel
        opts={{
          align: "start",
          loop: featuredTools.length > 2,
        }}
        className="w-full"
      >
        <CarouselContent>
          {featuredTools.map((tool) => (
            <CarouselItem key={tool.id} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1 h-full">
                <Card className="h-full">
                  <CardContent className="flex flex-col items-start justify-between p-6 h-full">
                    <div>
                      {/* KATEGORİ ARTIK TIKLANABİLİR */}
                      <Link
                        href={`/?category=${tool.category_slug}`}
                        className="inline-block"
                      >
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit mb-2 block hover:bg-primary hover:text-primary-foreground transition-colors">
                          {tool.category_name}
                        </span>
                      </Link>
                      <Link href={`/tool/${tool.slug}`} className="group">
                        <h3 className="text-lg font-semibold group-hover:text-primary">
                          {tool.name}
                        </h3>
                      </Link>
                      {/* ETİKETLER ARTIK TIKLANABİLİR */}
                      {tool.tags && tool.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tool.tags.slice(0, 2).map((tag) => (
                            <Link key={tag.id} href={`/?tags=${tag.id}`}>
                              <Badge
                                variant="outline"
                                className="hover:bg-accent hover:border-primary transition-colors"
                              >
                                {tag.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-4 pt-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="text-yellow-400"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      <span className="font-bold text-foreground">
                        {tool.average_rating.toFixed(1)}
                      </span>
                      <span>({tool.total_ratings})</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}
