import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { CollectionEditor } from "@/components/CollectionEditor";

// Koleksiyonu, içindeki araçlar ve notlarla birlikte çeken fonksiyon
async function getCollection(id, userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(
      `
            *,
            collection_tools ( tool_id, notes )
        `
    )
    .eq("id", id)
    .eq("user_id", userId) // Sadece kullanıcının kendi koleksiyonunu getirmesini sağlar
    .single();

  if (error || !data) {
    notFound();
  }
  return data;
}

// Tüm onaylanmış araçları çeken fonksiyon
async function getAllTools() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tools")
    .select("id, name")
    .eq("is_approved", true)
    .order("name", { ascending: true });

  if (error) {
    return [];
  }
  return data;
}

export default async function EditCollectionPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [collection, allTools] = await Promise.all([
    getCollection(params.id, user.id),
    getAllTools(),
  ]);

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <h1 className="text-3xl font-bold mb-6">Koleksiyonu Düzenle</h1>
      <CollectionEditor collection={collection} allTools={allTools} />
    </div>
  );
}
