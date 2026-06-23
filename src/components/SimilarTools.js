import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

async function getSimilarTools(currentTool) {
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
    .from("tools")
    .select("id, name, slug, description, category_id")
    .eq("is_approved", true)
    .neq("id", currentTool.id)
    .limit(3);

  if (currentTool.category_id) {
    query = query.eq("category_id", currentTool.category_id);
  }

  let { data, error } = await query;

  if (!error && (!data || data.length === 0) && currentTool.category_id) {
    const fallback = await supabase
      .from("tools")
      .select("id, name, slug, description, category_id")
      .eq("is_approved", true)
      .neq("id", currentTool.id)
      .limit(3);

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error("Benzer araçlar çekilirken hata:", error);
    return [];
  }

  return (data || []).map((tool) => ({
    ...tool,
    reason:
      tool.category_id === currentTool.category_id
        ? "Aynı kategoride benzer bir kullanım alanı sunuyor."
        : "Keşif listenizi tamamlayabilecek alternatif bir yapay zeka aracı.",
  }));
}

export async function SimilarTools({ currentTool }) {
  const similarTools = await getSimilarTools(currentTool);

  if (similarTools.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold sm:gap-3 sm:text-2xl">
          <Lightbulb className="h-5 w-5 text-primary sm:h-7 sm:w-7" />
          Bunları da Beğenebilirsiniz
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Karar vermeden önce aynı kullanım alanındaki alternatifleri hızlıca karşılaştır.
        </p>
      </div>
      <Carousel
        opts={{
          align: "start",
          loop: similarTools.length > 2,
        }}
        className="w-full"
      >
        <CarouselContent>
          {similarTools.map((tool) => (
            <CarouselItem key={tool.slug} className="md:basis-1/2 lg:basis-1/3">
              <div className="h-full p-1">
                <Card className="flex h-full flex-col transition-all hover:border-primary hover:shadow-sm">
                  <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                    <CardTitle className="text-base leading-tight sm:text-lg">
                      <Link
                        href={`/tool/${tool.slug}`}
                        className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {tool.name}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0 sm:p-5 sm:pt-0">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {tool.description || "Bu araç, keşif listeniz için iyi bir alternatif olabilir."}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Neden Benzer?
                      </span>{" "}
                      {tool.reason}
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-auto w-full">
                      <Link href={`/tool/${tool.slug}`}>
                        Detayları gör
                        <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
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
