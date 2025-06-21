import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Map } from "lucide-react";

// "Rehber" tipindeki blog yazılarını çeken fonksiyon
async function getGuides() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("title, slug, description, featured_image_url")
    .eq("status", "Yayınlandı")
    .eq("type", "Rehber")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Rehberler çekilirken hata:", error);
    return [];
  }
  return data;
}

// "Öğrenme Yolu" tipindeki koleksiyonları çeken fonksiyon
async function getLearningPaths() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("title, slug, description, profiles(username)")
    .eq("is_public", true)
    .eq("type", "Öğrenme Yolu")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Öğrenme yolları çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Öğren | AI Keşif Platformu",
  description:
    "Yapay zeka araçlarını kullanmayı öğrenmek için uygulamalı rehberler ve uzmanlar tarafından hazırlanmış öğrenme yolları.",
};

export default async function LearningHubPage() {
  const [guides, learningPaths] = await Promise.all([
    getGuides(),
    getLearningPaths(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4 space-y-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          AI Öğrenme Merkezi
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
          Sadece keşfetmeyin, aynı zamanda ustalaşın. Adım adım rehberler ve
          uzmanlar tarafından hazırlanan öğrenme yollarıyla yapay zeka
          becerilerinizi geliştirin.
        </p>
      </div>

      {/* Öğrenme Yolları Bölümü */}
      {learningPaths.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-3">
            <Map className="w-8 h-8 text-primary" />
            Öğrenme Yolları
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learningPaths.map((path) => (
              <Link
                key={path.slug}
                href={`/koleksiyonlar/${path.slug}`}
                className="group"
              >
                <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary">
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary">
                      {path.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {path.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Oluşturan: {path.profiles.username}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Uygulamalı Rehberler Bölümü */}
      {guides.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Uygulamalı Rehberler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {guides.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group"
              >
                <Card className="h-full overflow-hidden transition-all hover:border-primary">
                  {post.featured_image_url && (
                    <div className="aspect-video overflow-hidden relative">
                      <Image
                        src={post.featured_image_url}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 text-sm">
                      {post.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
