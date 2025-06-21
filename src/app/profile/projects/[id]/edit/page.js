import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ProjectEditor } from "@/components/ProjectEditor";

// Bir projeyi, içindeki tüm item'larla birlikte çeken fonksiyon
async function getProjectDetails(id, userId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(`*, project_items (item_id, item_type)`)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    notFound();
  }
  return data;
}

// Seçim menüleri için gerekli tüm içerikleri çeken fonksiyonlar
async function getAllTools(userId) {
  const supabase = createClient();
  const { data } = await supabase
    .from("tools")
    .select("id, name")
    .eq("is_approved", true);
  return data || [];
}
async function getAllShowcaseItems(userId) {
  const supabase = createClient();
  const { data } = await supabase
    .from("showcase_items")
    .select("id, title")
    .eq("user_id", userId)
    .eq("is_approved", true);
  return data || [];
}
async function getAllPrompts(userId) {
  const supabase = createClient();
  const { data } = await supabase
    .from("prompts")
    .select("id, title")
    .eq("user_id", userId);
  return data || [];
}

export default async function EditProjectPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Gerekli tüm verileri paralel olarak çekiyoruz
  const [project, allTools, allShowcaseItems, allPrompts] = await Promise.all([
    getProjectDetails(params.id, user.id),
    getAllTools(user.id),
    getAllShowcaseItems(user.id),
    getAllPrompts(user.id),
  ]);

  return (
    <div className="container mx-auto max-w-6xl py-8">
      <h1 className="text-3xl font-bold mb-6">
        Projeyi Yönet: <span className="text-primary">{project.title}</span>
      </h1>

      <ProjectEditor
        project={project}
        allTools={allTools}
        allShowcaseItems={allShowcaseItems}
        allPrompts={allPrompts}
      />
    </div>
  );
}
