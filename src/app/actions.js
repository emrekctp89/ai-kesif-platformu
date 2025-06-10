// src/app/actions.js

"use server"; // Bu ifadenin en üstte olması zorunludur!

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitTool(formData) {
  const name = formData.get("name");
  const link = formData.get("link");
  const description = formData.get("description");
  const category_id = formData.get("category_id");

  // Basit bir doğrulama
  if (!name || !link || !category_id) {
    return { message: "Lütfen gerekli alanları doldurun." };
  }

  const { error } = await supabase
    .from("tools")
    .insert([{ name, link, description, category_id, is_approved: false }]); // Yeni araçlar onaysız olarak eklenecek

  if (error) {
    console.error(error);
    return { message: "Veritabanına eklenirken bir hata oluştu." };
  }

  // Başarılı olursa:
  revalidatePath("/"); // Ana sayfadaki verilerin yeniden çekilmesini sağla
  redirect("/"); // Kullanıcıyı ana sayfaya yönlendir
}