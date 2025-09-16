// src/app/karsilastir/page.js
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { ToolSelectForComparison } from "@/components/ToolSelectForComparison";
import { AiComparison } from "@/components/AiComparison";
import { Suspense } from "react";

// URL'den gelen araç slug'larına göre verileri çeken fonksiyon
async function getComparisonData(toolSlugs) {
  if (!toolSlugs || toolSlugs.length === 0) {
    return [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("tools_with_ratings")
    .select("*")
    .in("slug", toolSlugs);

  if (error) {
    console.error("Karşılaştırma verisi çekilirken hata:", error);
    return [];
  }

  return toolSlugs
    .map((slug) => data.find((tool) => tool.slug === slug))
    .filter(Boolean);
}

// Tüm araçları seçme menüsü için çeken fonksiyon
async function getAllToolsForSelect() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tools")
    .select("name, slug")
    .eq("is_approved", true)
    .order("name");

  if (error) {
    console.error("Tüm araçlar çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Araçları Karşılaştır | AI Keşif Platformu",
  description:
    "Yapay zeka araçlarını yan yana karşılaştırarak ihtiyaçlarınıza en uygun olanı bulun.",
};

export default async function ComparePage({ searchParams }) {
  const toolSlugs = searchParams.tools ? searchParams.tools.split(",") : [];
  const [comparedTools, allTools] = await Promise.all([
    getComparisonData(toolSlugs),
    getAllToolsForSelect(),
  ]);

  return (
    <div className="container mx-auto max-w-7xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          AI Karşılaştırma Arenası
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
          Karşılaştırmak istediğiniz araçları seçin ve özelliklerini, puanlarını
          ve yapay zekanın analizini görün.
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <Suspense fallback={<div>Yükleniyor...</div>}>
          <ToolSelectForComparison
            allTools={allTools}
            selectedSlugs={toolSlugs}
          />
        </Suspense>
      </div>

      {/* AI Karşılaştırma Bölümü */}
      {comparedTools.length > 1 && (
        <div className="mb-12">
          <AiComparison tools={comparedTools} />
        </div>
      )}

      {/* Karşılaştırma Tablosu */}
      {comparedTools.length > 0 ? (
        <div
          className="space-y-8 md:space-y-0 md:grid md:gap-8"
          style={{
            gridTemplateColumns: `repeat(${comparedTools.length}, minmax(0, 1fr))`,
          }}
        >
          {comparedTools.map((tool) => (
            <div key={tool.id}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-2xl">{tool.name}</CardTitle>
                  <CardDescription>{tool.category_name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold">
                      {tool.average_rating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({tool.total_ratings} oy)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground min-h-[60px]">
                    {tool.description}
                  </p>
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Etiketler</h4>
                    <div className="flex flex-wrap gap-2">
                      {tool.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Fiyatlandırma</h4>
                    <p>{tool.pricing_model || "Belirtilmemiş"}</p>
                  </div>
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Platformlar</h4>
                    <div className="flex flex-wrap gap-2">
                      {tool.platforms?.map((p) => (
                        <Badge key={p} variant="outline">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            Lütfen karşılaştırmak için yukarıdan en az iki araç seçin.
          </p>
        </div>
      )}
    </div>
  );
}
