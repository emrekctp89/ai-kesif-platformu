import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Veritabanından 3 rastgele araç çeken fonksiyonu güncelliyoruz
async function getThreeRandomTools() {
  const supabase = createClient();

  // DEĞİŞİKLİK: Artık RPC (Remote Procedure Call) ile özel fonksiyonumuzu çağırıyoruz.
  const { data, error } = await supabase.rpc("get_random_tools", {
    result_limit: 3,
  });

  if (error) {
    console.error("Rastgele araçlar çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Rastgele Araç Keşfi | AI Keşif Platformu",
  description:
    "Sizin için özel olarak seçilmiş rastgele yapay zeka araçlarını keşfedin.",
};

export default async function RandomToolsPage() {
  const randomTools = await getThreeRandomTools();

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Sizin İçin Seçilmiş Rastgele Araçlar
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Platformumuzdaki gizli kalmış cevherleri şans eseri keşfedin.
        </p>
      </div>

      {randomTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {randomTools.map((tool) => (
            <div
              key={tool.id}
              className="bg-card border rounded-xl p-6 shadow-lg flex flex-col transition hover:shadow-xl hover:-translate-y-1 h-full"
            >
              <div className="flex-grow">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit mb-3 block">
                  {tool.category_name}
                </span>
                <Link href={`/tool/${tool.slug}`} className="group">
                  <h2 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                    {tool.name}
                  </h2>
                </Link>
                {tool.tags && tool.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 my-3">
                    {tool.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-muted-foreground text-sm mt-2 mb-4 line-clamp-3">
                  {tool.description}
                </p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
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
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          Rastgele araçlar getirilirken bir sorun oluştu.
        </p>
      )}
    </div>
  );
}
