"use server";

import { createClient } from "@/utils/supabase/actions";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { slugify } from "@/utils/slugify";

export async function addCategory(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const name = formData.get("name");
  if (!name) {
    return { error: "Kategori adı boş olamaz." };
  }

  const slug = slugify(name);

  const { error } = await supabase.from("categories").insert({ name, slug });

  if (error) {
    if (error.code === "23505") {
      return { error: "Bu kategori adı veya slug zaten mevcut." };
    }
    console.error("Kategori ekleme hatası:", error);
    return { error: "Kategori eklenirken bir hata oluştu." };
  }

  revalidatePath("/admin");
  return { success: "Kategori başarıyla eklendi." };
}

export async function updateCategory(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const id = formData.get("id");
  const name = formData.get("name");

  if (!id || !name) {
    return { error: "Gerekli bilgiler eksik." };
  }

  const slug = slugify(name);

  const { error } = await supabase
    .from("categories")
    .update({ name, slug })
    .eq("id", id);

  if (error) {
    console.error("Kategori güncelleme hatası:", error);
    return { error: "Kategori güncellenirken bir hata oluştu." };
  }

  revalidatePath("/admin");
  return { success: "Kategori başarıyla güncellendi." };
}

export async function deleteCategory(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const id = formData.get("id");

  if (!id) {
    return { error: "Kategori ID'si bulunamadı." };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("Kategori silme hatası:", error);
    return {
      error:
        "Kategori silinirken bir hata oluştu. Bu kategoriye ait araçlar olabilir.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: "Kategori başarıyla silindi." };
}

export async function addTag(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const name = formData.get("name");
  if (!name) {
    return { error: "Etiket adı boş olamaz." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("tags")
    .insert({ name: name.trim() });

  if (error) {
    if (error.code === "23505") {
      return { error: "Bu etiket zaten mevcut." };
    }
    console.error("Etiket ekleme hatası:", error);
    return { error: "Etiket eklenirken bir veritabanı hatası oluştu." };
  }

  revalidatePath("/admin");
  return { success: "Etiket başarıyla eklendi." };
}

export async function deleteTag(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const id = formData.get("id");
  if (!id) {
    return { error: "Etiket ID'si bulunamadı." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("tags").delete().eq("id", id);

  if (error) {
    console.error("Etiket silme hatası:", error);
    return { error: "Etiket silinirken bir veritabanı hatası oluştu." };
  }

  revalidatePath("/admin");
  return { success: "Etiket başarıyla silindi." };
}

export async function assignTagsToTool(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const supabaseAdmin = createAdminClient();
  const toolId = formData.get("toolId");
  const tagIds = formData.getAll("tagId").map((id) => parseInt(id, 10));

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  const { error: deleteError } = await supabaseAdmin
    .from("tool_tags")
    .delete()
    .eq("tool_id", toolId);

  if (deleteError) {
    console.error("Eski etiketleri silme hatası:", deleteError);
    return { error: "Etiketler güncellenirken bir veritabanı hatası oluştu." };
  }

  if (tagIds.length > 0) {
    const newLinks = tagIds.map((tagId) => ({
      tool_id: toolId,
      tag_id: tagId,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("tool_tags")
      .insert(newLinks);

    if (insertError) {
      console.error("Yeni etiketleri ekleme hatası:", insertError);
      return {
        error: "Etiketler güncellenirken bir veritabanı hatası oluştu.",
      };
    }
  }

  revalidatePath("/admin");
  return { success: "Aracın etiketleri başarıyla güncellendi." };
}
