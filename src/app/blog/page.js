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

// Veritabanından yayınlanmış tüm yazıları çeken fonksiyon
async function getPublishedPosts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("title, slug, description, featured_image_url, published_at")
    // DEĞİŞİKLİK: 'is_published' yerine yeni 'status' sütununa göre filtreliyoruz
    .eq("status", "Yayınlandı")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Yazılar çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Blog | AI Keşif Platformu",
  description:
    "Yapay zeka dünyasındaki en son haberler, makaleler ve araç incelemeleri.",
};

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Blog & Haberler
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Yapay zeka dünyasından en son gelişmeler, derinlemesine analizler ve
          araç incelemeleri.
        </p>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
              <Card className="h-full overflow-hidden transition-all hover:border-primary">
                {post.featured_image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground pt-2">
                    {new Date(post.published_at).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3">
                    {post.description || ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          Henüz yayınlanmış bir yazı bulunmuyor.
        </p>
      )}
    </div>
  );
}
