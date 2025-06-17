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
import { Star, Crown, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

// Seviyelere göre özel stiller ve ikonlar
const tierStyles = {
  Pro: {
    badge: "bg-purple-600 text-white hover:bg-purple-700 border-purple-700",
    card: "border-purple-500/50 shadow-lg shadow-purple-500/10",
    icon: <Crown className="w-4 h-4 mr-1.5" />,
  },
  Sponsorlu: {
    badge: "bg-amber-500 text-white hover:bg-amber-600 border-amber-600",
    card: "border-amber-500/50 shadow-lg shadow-amber-500/10",
    icon: <Gem className="w-4 h-4 mr-1.5" />,
  },
};

// Veritabanından öne çıkan araçları çeken fonksiyon (Değişiklik yok)
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
          {featuredTools.map((tool) => {
            const isPremium = tool.tier === "Pro" || tool.tier === "Sponsorlu";
            return (
              <CarouselItem key={tool.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1 h-full">
                  {/* DEĞİŞİKLİK: Kartın kendisine özel bir stil ekliyoruz */}
                  <Card
                    className={cn(
                      "h-full",
                      isPremium && tierStyles[tool.tier]?.card
                    )}
                  >
                    <CardContent className="flex flex-col items-start justify-between p-6 h-full">
                      <div>
                        {/* YENİ: Pro veya Sponsorlu rozetini ekliyoruz */}
                        {isPremium && (
                          <Badge
                            className={cn(
                              "mb-2 flex w-fit items-center",
                              tierStyles[tool.tier]?.badge
                            )}
                          >
                            {tierStyles[tool.tier]?.icon}
                            {tool.tier}
                          </Badge>
                        )}
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
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-4 pt-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold text-foreground">
                          {tool.average_rating.toFixed(1)}
                        </span>
                        <span>({tool.total_ratings} oy)</span>
                      </div>
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
