import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { PostEditor } from "@/components/PostEditor";

// Tüm gerekli verileri çeken fonksiyonlar
async function getPost(id) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`*, post_tools(tools(id, name)), post_tags(tags(id, name))`)
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  return data;
}

async function getAllTools() {
  const supabase = createClient();
  const { data } = await supabase
    .from("tools")
    .select("id, name")
    .eq("is_approved", true)
    .order("name");
  return data || [];
}

async function getAllTags() {
  const supabase = createClient();
  const { data } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });
  return data || [];
}

async function getAllCategories() {
  const supabase = createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  return data || [];
}

export default async function EditPostPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect("/");

  // Gerekli tüm verileri paralel olarak çekiyoruz
  const [post, allTools, allTags, allCategories] = await Promise.all([
    getPost(params.id),
    getAllTools(),
    getAllTags(),
    getAllCategories(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">İçeriği Düzenle</h1>
        <p className="text-muted-foreground">
          &quot;{post.title}&quot; başlıklı içeriğin detaylarını ve ayarlarını
          değiştirin.
        </p>
      </div>
      {/* Tüm verileri, interaktif arayüzü yönetecek olan Client Component'e aktarıyoruz */}
      <PostEditor
        post={post}
        allTools={allTools}
        allTags={allTags}
        allCategories={allCategories}
      />
    </div>
  );
}
