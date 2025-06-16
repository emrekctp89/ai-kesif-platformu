import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";

async function getTrendingData() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_trending_tools");
  if (error) {
    console.error("Trend olan araçlar çekilirken hata:", error);
    return [];
  }
  return data;
}

export async function TrendingTools() {
  const trendingTools = await getTrendingData();

  // DEĞİŞİKLİK: Eğer trend olan araç yoksa, bir hata/bilgi mesajı göster.
  if (!trendingTools || trendingTools.length === 0) {
    return (
      <div className="my-12 p-4 text-center bg-muted rounded-lg">
        <p className="text-muted-foreground">
          "Haftanın Trendleri" bölümü için yeterli veri bulunamadı. <br />
          (Veritabanınızda son 7 günde favoriye eklenmiş, en az 1 onaylanmış
          araç olmalı)
        </p>
      </div>
    );
  }

  return (
    <div className="my-12">
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4 flex items-center gap-3">
        <Flame className="w-7 h-7 text-orange-500" />
        Haftanın Trendleri
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {trendingTools.map((tool) => (
          <Link key={tool.id} href={`/tool/${tool.slug}`} className="group">
            <Card className="h-full hover:border-primary hover:bg-muted/50 transition-all overflow-hidden">
              <CardContent className="p-4">
                <h3 className="text-md font-semibold group-hover:text-primary truncate">
                  {tool.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {tool.category_name}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                  <span className="text-orange-500">🔥</span>
                  <span className="font-bold">
                    {tool.favorite_count} favori
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
