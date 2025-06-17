import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
// Yeni ve gelişmiş PostEditor bileşenini import ediyoruz
import { PostEditor } from "@/components/PostEditor";

// Düzenlenecek olan belirli bir yazıyı, ID'sine göre çeken fonksiyon
async function getPost(id) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*") // Düzenleme için tüm sütunları seçiyoruz
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound(); // Yazı bulunamazsa 404 sayfasına yönlendir
  }
  return data;
}

export default async function EditPostPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin kontrolü
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  // Veritabanından düzenlenecek olan yazının verilerini çekiyoruz
  const post = await getPost(params.id);

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Yazıyı Düzenle</h1>
        <p className="text-muted-foreground">
          "<span className="text-primary font-medium">{post.title}</span>"
          başlıklı yazının içeriğini ve ayarlarını değiştirin.
        </p>
      </div>

      {/* Tüm interaktif düzenleme mantığını, veriyle birlikte
              PostEditor istemci bileşenine devrediyoruz.
            */}
      <PostEditor post={post} />
    </div>
  );
}
