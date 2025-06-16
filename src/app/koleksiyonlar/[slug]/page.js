import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Star } from "lucide-react";

// DEĞİŞİKLİK: Veri çekme mantığını daha sağlam hale getiriyoruz.
async function getCollectionDetails(slug) {
  const supabase = createClient();

  // 1. ADIM: Koleksiyonun ana bilgilerini ve içindeki araç-not ilişkilerini çek.
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select(
      `
            title,
            description,
            profiles (email),
            collection_tools ( tool_id, notes )
        `
    )
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (collectionError || !collection) {
    notFound();
  }

  // Koleksiyondaki araçların ID'lerini bir diziye topla.
  const toolIds = collection.collection_tools.map((item) => item.tool_id);

  // Eğer koleksiyonda hiç araç yoksa, boş bir diziyle devam et.
  if (toolIds.length === 0) {
    return { collection, tools: [] };
  }

  // 2. ADIM: Topladığımız ID'leri kullanarak, o araçların tüm detaylarını çek.
  const { data: tools, error: toolsError } = await supabase
    .from("tools_with_ratings")
    .select("*")
    .in("id", toolIds);

  if (toolsError) {
    console.error("Koleksiyon araçları çekilirken hata:", toolsError);
    return { collection, tools: [] };
  }

  // Her araca, kullanıcı notunu da ekleyerek veriyi birleştiriyoruz.
  const toolsWithNotes = tools.map((tool) => {
    const collectionInfo = collection.collection_tools.find(
      (item) => item.tool_id === tool.id
    );
    return {
      ...tool,
      user_notes: collectionInfo?.notes || "",
    };
  });

  return { collection, tools: toolsWithNotes };
}

export async function generateMetadata({ params }) {
  const { collection } = await getCollectionDetails(params.slug);
  return {
    title: `${collection.title} | AI Keşif Platformu`,
    description: collection.description,
  };
}

export default async function CollectionDetailPage({ params }) {
  const { collection, tools } = await getCollectionDetails(params.slug);

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          {collection.title}
        </h1>
        <div className="flex items-center justify-center pt-4">
          <Users className="w-4 h-4 mr-2 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Oluşturan: {collection.profiles.email}
          </span>
        </div>
        {collection.description && (
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            {collection.description}
          </p>
        )}
      </header>

      <div className="space-y-8">
        {tools.map((tool, index) => (
          <Card key={tool.id} className="overflow-hidden">
            <div className="grid md:grid-cols-3">
              <div className="md:col-span-1 bg-muted/50 p-6">
                <h3 className="font-semibold text-lg mb-2">
                  Küratörün Notu #{index + 1}
                </h3>
                <p className="text-sm text-muted-foreground italic">
                  {tool.user_notes || "Bu araç için özel bir not eklenmemiş."}
                </p>
              </div>

              <div className="md:col-span-2 p-6">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/tool/${tool.slug}`} className="group">
                    <h2 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                      {tool.name}
                    </h2>
                  </Link>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0 ml-2 pt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-foreground">
                      {tool.average_rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                {tool.tags && tool.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tool.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {tool.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
