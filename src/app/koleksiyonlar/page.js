import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";

// Veritabanından herkese açık tüm koleksiyonları çeken fonksiyon
async function getPublicCollections() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(
      `
            title,
            slug,
            description,
            profiles ( email )
        `
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Herkese açık koleksiyonlar çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Koleksiyonlar | AI Keşif Platformu",
  description:
    "Topluluk tarafından oluşturulmuş, belirli ihtiyaçlara yönelik en iyi yapay zeka araçları koleksiyonlarını ve rehberlerini keşfedin.",
};

export default async function CollectionsPage() {
  const collections = await getPublicCollections();

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Topluluk Koleksiyonları
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Kullanıcılarımızın belirli ihtiyaçlar için özenle hazırladığı araç
          listelerini ve rehberlerini keşfedin.
        </p>
      </div>

      {collections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collections.map((collection) => (
            <Link
              key={collection.slug}
              href={`/koleksiyonlar/${collection.slug}`}
              className="group"
            >
              <Card className="h-full overflow-hidden transition-all hover:border-primary">
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {collection.title}
                  </CardTitle>
                  <div className="flex items-center pt-2">
                    <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Oluşturan: {collection.profiles.email}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">
                    {collection.description || "Açıklama bulunmuyor."}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          Henüz yayınlanmış bir koleksiyon bulunmuyor.
        </p>
      )}
    </div>
  );
}
