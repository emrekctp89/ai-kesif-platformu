import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
// Yeni PostEditor bileşenini import ediyoruz
import { PostEditor } from "@/components/PostEditor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"; // Card bileşenlerini de import edelim

// Yazıyı, kategorisini ve atanmış etiketlerini çeken güncellenmiş fonksiyon
async function getPost(id) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
            *,
            post_tags ( tags (id, name) )
        `
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }
  return data;
}

// Tüm kategorileri çeken fonksiyon
async function getAllCategories() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    return [];
  }
  return data;
}

// Tüm etiketleri çeken fonksiyon
async function getAllTags() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    return [];
  }
  return data;
}

export default async function EditPostPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  // Gerekli tüm verileri paralel olarak çekiyoruz
  const [post, categories, allTags] = await Promise.all([
    getPost(params.id),
    getAllCategories(),
    getAllTags(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Yazıyı Düzenle</h1>
        <p className="text-muted-foreground">
          "<span className="text-primary font-medium">{post.title}</span>"
          başlıklı yazının içeriğini ve ayarlarını değiştirin.
        </p>
      </div>

      {/* Tüm editör mantığını içeren ana kart */}
      <Card>
        <CardContent className="p-6">
          {/* Tüm verileri, interaktif arayüzü yönetecek olan Client Component'e prop olarak iletiyoruz */}
          <PostEditor post={post} categories={categories} allTags={allTags} />
        </CardContent>
      </Card>
    </div>
  );
}
