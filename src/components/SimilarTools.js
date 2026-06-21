import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-8">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <Lightbulb className="w-7 h-7 text-primary" />
        Bunları da Beğenebilirsiniz
      </h2>
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
              <div className="p-1 h-full">
                <Card className="h-full hover:border-primary transition-all">
                  <CardHeader>
                    <CardTitle>
                      <Link
                        href={`/tool/${tool.slug}`}
                        className="hover:underline"
                      >
                        {tool.name}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Neden Benzer?
                      </span>{" "}
                      {tool.reason}
                    </p>
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
