"use server";

import { createClient } from "@/utils/supabase/actions";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deleteUserFromAdmin(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Bu işlem için yetkiniz yok." };
  }

  const userIdToDelete = formData.get("userId");
  if (!userIdToDelete) {
    return { error: "Kullanıcı ID'si bulunamadı." };
  }

  if (user.id === userIdToDelete) {
    return { error: "Admin kendi hesabını bu panelden silemez." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

  if (error) {
    console.error("Admin panelinden kullanıcı silme hatası:", error);
    return { error: "Kullanıcı silinirken bir hata oluştu." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { success: "Kullanıcı başarıyla silindi." };
}

export async function updateAdminAlertStatus(formData) {
  "use server";
  
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const alertId = formData.get("alertId");
  const newStatus = formData.get("newStatus");

  if (!alertId || !newStatus) {
    return { error: "Gerekli bilgiler eksik." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("admin_alerts")
    .update({ 
        status: newStatus,
        resolved_at: new Date().toISOString() 
    })
    .eq("id", alertId);

  if (error) {
    console.error("Uyarı durumu güncellenirken hata:", error);
    return { error: "Uyarı durumu güncellenemedi." };
  }

  revalidatePath("/admin");
  return { success: "Uyarı durumu güncellendi." };
}
