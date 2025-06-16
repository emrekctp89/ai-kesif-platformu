import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Zap } from "lucide-react"; // Zap ikonu "Günün Aracı" temasını güçlendirir

// Veritabanındaki RPC fonksiyonunu çağıran fonksiyon
async function getToolOfTheDayData() {
  const supabase = createClient();
  // RPC ile özel fonksiyonumuzu çağırıyoruz ve tek bir sonuç bekliyoruz.
  const { data, error } = await supabase.rpc("get_tool_of_the_day").single();

  if (error) {
    console.error("Günün aracı çekilirken hata:", error);
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
    <div className="mb-12">
      <Card className="w-full bg-gradient-to-br from-primary/10 via-background to-background border-2 border-primary/50 shadow-lg">
        <CardContent className="p-8 grid md:grid-cols-2 gap-8 items-center">
          {/* Sol Taraf: Açıklamalar */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary font-bold text-lg">
              <Zap className="w-6 h-6" />
              <span>GÜNÜN ARACI</span>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
              {tool.name}
            </h2>
            <p className="text-muted-foreground text-lg">{tool.description}</p>
            <div className="flex items-center gap-4 pt-2">
              <Button asChild size="lg">
                <Link href={`/tool/${tool.slug}`}>İncele & Keşfet</Link>
              </Button>
              <div className="flex items-center gap-1.5 text-sm">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-foreground">
                  {tool.average_rating.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({tool.total_ratings} oy)
                </span>
              </div>
            </div>
          </div>
          {/* Sağ Taraf: Etiketler ve Kategori */}
          <div className="hidden md:flex flex-col items-end justify-center">
            <div className="bg-card/50 p-6 rounded-lg border">
              <p className="font-semibold mb-3 text-foreground">Kategori:</p>
              <Badge variant="secondary" className="text-md">
                {tool.category_name}
              </Badge>

              {tool.tags && tool.tags.length > 0 && (
                <>
                  <p className="font-semibold mt-6 mb-3 text-foreground">
                    Etiketler:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {tool.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
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
