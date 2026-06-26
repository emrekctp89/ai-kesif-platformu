import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Zap } from "lucide-react"; // Zap ikonu "Günün Aracı" temasını güçlendirir
import ToolIcon from "@/components/ToolIcon";
import { TrackedExternalLink } from "@/components/TrackedExternalLink";

// Veritabanındaki RPC fonksiyonunu çağıran fonksiyon
async function getToolOfTheDayData() {
  const supabase = createClient(await cookies());
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
        <CardContent className="grid items-center gap-6 p-5 sm:p-6 md:grid-cols-2 md:gap-8 md:p-8">
          {/* Sol Taraf: Açıklamalar */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-primary sm:text-lg">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>GÜNÜN ARACI</span>
            </div>
            <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              <ToolIcon name={tool.name} link={tool.link} className="h-8 w-8 sm:h-9 sm:w-9" />
              {tool.name}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base md:text-lg">{tool.description}</p>
            <div className="flex items-center gap-4 pt-2">
              <Button asChild className="w-full bg-green-600 hover:bg-green-700 sm:w-auto" size="lg">
                <TrackedExternalLink
                  href={tool.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  eventName="official_site_click"
                  eventParameters={{
                    source: "tool_of_the_day",
                    tool_slug: tool.slug,
                    category: tool.category_slug,
                  }}
                >
                  İncele & Keşfet
                </TrackedExternalLink>
              </Button>
              
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
