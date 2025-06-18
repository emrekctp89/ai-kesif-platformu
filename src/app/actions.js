// src/app/actions.js (Son Hali)

// "use server" direktifi dosyanın en başında, tek bir yerde olmalı.
"use server";

// Artık import'lar gelebilir.
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
//import { createClient } from '@/utils/supabase/actions';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { NewToolSuggestionEmail } from "@/components/emails/NewToolSuggestionEmail";
import { WelcomeEmail } from "@/components/emails/WelcomeEmail"; // Yeni e-posta şablonunu import ediyoruz
import { GoodbyeEmail } from "@/components/emails/GoodbyeEmail"; // Yeni şablonu import ediyoruz
//import { createAdminClient } from "@/utils/supabase/admin"; // Yeni admin istemcisini import ediyoruz
import { ContactFormEmail } from "@/components/emails/ContactFormEmail"; // Yeni şablonu import edeceğiz
import { createAdminClient } from "@/utils/supabase/admin"; // Özel admin istemcisini import ediyoruz
import { WeeklyNewsletterEmail } from "@/components/emails/WeeklyNewsletterEmail";
// Node'un renderToString fonksiyonunu kullanacağız
import { render } from "@react-email/render";

const ITEMS_PER_PAGE = 12; // Ana sayfadaki sayfa başına araç sayısıyla aynı olmalı

// Stripe istemcisini başlatıyoruz
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-04-10",
});

// Bu fonksiyon Türkçe karakterleri URL uyumlu hale getirir.
function slugify(text) {
  const a =
    "àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;";
  const b =
    "aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------";
  const p = new RegExp(a.split("").join("|"), "g");

  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(p, (c) => b.charAt(a.indexOf(c)))
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function submitTool(formData) {
  "use server";

  const supabase = createClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = formData.get("name");
  const link = formData.get("link");
  const description = formData.get("description");
  const category_id = formData.get("category_id");
  // Formdan gelen misafir e-postasını alıyoruz.
  const suggester_email_from_form = formData.get("suggester_email");

  // DEĞİŞİKLİK: E-posta göndermek için doğru adresi belirliyoruz.
  const final_suggester_email = user ? user.email : suggester_email_from_form;

  if (!name || !link || !category_id || !final_suggester_email) {
    const errorMessage = "Lütfen tüm zorunlu alanları doldurun.";
    return redirect(`/submit?message=${encodeURIComponent(errorMessage)}`);
  }

  const slug = slugify(name);

  const toolData = {
    name,
    slug,
    link,
    description,
    category_id,
    user_id: user?.id,
    // Veritabanına da doğru e-postayı kaydediyoruz.
    suggester_email: final_suggester_email,
    is_approved: false,
  };

  const { error } = await supabase.from("tools").insert([toolData]);

  if (error) {
    let errorMessage = "Bir hata oluştu, lütfen tekrar deneyin.";
    if (error.code === "23505") {
      errorMessage = "Bu araç zaten önerilmiş veya bu isim kullanılıyor.";
    }
    return redirect(`/submit?message=${encodeURIComponent(errorMessage)}`);
  }

  try {
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: process.env.ADMIN_NOTIF_EMAIL_TO,
      subject: `Yeni Araç Önerisi: ${name}`,
      // E-posta şablonuna artık hem e-postayı hem de kullanıcının durumunu gönderiyoruz.
      react: NewToolSuggestionEmail({
        toolName: name,
        toolLink: link,
        toolDescription: description,
        suggesterEmail: final_suggester_email,
        isLoggedInUser: !!user, // user objesi varsa true, yoksa false gönderir.
      }),
    });
  } catch (emailError) {
    console.error("E-posta gönderme hatası:", emailError);
  }

  const successMessage =
    "Öneriniz için teşekkürler! İncelendikten sonra sitemize eklenecektir.";
  return redirect(`/?message=${encodeURIComponent(successMessage)}`);
}

// -- ARAÇ ÖNERİSİ ONAYLANDIĞINDA --
// Admin bir aracın önerisini onayladığında, öneren kişiye +25 Puan
export async function approveTool(formData) {
  "use server";
  const supabaseAdmin = createAdminClient();
  const toolId = formData.get("toolId");

  const { error } = await supabaseAdmin
    .from("tools")
    .update({ is_approved: true })
    .eq("id", toolId);

  if (error) return { error: "Araç onaylanırken bir hata oluştu." };

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: "Araç başarıyla onaylandı." };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function signIn(formData) {
  "use server";

  const email = formData.get("email");
  const password = formData.get("password");
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    const errorMessage = "Giriş bilgileri hatalı veya kullanıcı bulunamadı.";
    // Hata mesajını URL'e uygun hale getiriyoruz
    return redirect(`/login?message=${encodeURIComponent(errorMessage)}`);
  }

  // Giriş başarılı olduğunda, bir sonraki sayfa yüklenmeden önce
  // layout'u (özellikle Header'daki AuthButton'ı) yeniden doğrulamaya zorluyoruz.
  revalidatePath("/", "layout");

  // Kullanıcının admin olup olmadığını kontrol ediyoruz
  if (data.user.email === process.env.ADMIN_EMAIL) {
    return redirect("/admin");
  }

  // Normal kullanıcıları ana sayfaya yönlendiriyoruz
  return redirect("/");
}

export async function oAuthSignIn(provider) {
  "use server";
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return redirect("/login?message=Could not authenticate with provider");
  }

  return redirect(data.url);
}

export async function signUp(formData) {
  "use server";
  const email = formData.get("email");
  const password = formData.get("password");
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error || !data.user) {
    const errorMessage =
      "Kullanıcı oluşturulamadı. Şifre en az 6 karakter olmalı veya e-posta zaten kullanımda olabilir.";
    return redirect(`/signup?message=${encodeURIComponent(errorMessage)}`);
  }

  // Kayıt başarılıysa, hoş geldiniz e-postası göndermeyi dene
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: email,
      subject: "AI Keşif Platformu'na Hoş Geldiniz!",
      react: WelcomeEmail({ userEmail: email }),
    });
  } catch (emailError) {
    console.error("Hoş geldiniz e-postası gönderme hatası:", emailError);
  }

  const successMessage = "Hesabınızı doğrulamak için e-postanızı kontrol edin.";
  return redirect(`/login?message=${encodeURIComponent(successMessage)}`);
}

export async function requestPasswordReset(formData) {
  "use server";

  const email = formData.get("email");
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  // Hata durumunda mesajı URL uyumlu hale getiriyoruz
  if (error) {
    const errorMessage =
      "Şifre sıfırlama maili gönderilemedi. Lütfen tekrar deneyin.";
    return redirect(
      `/forgot-password?message=${encodeURIComponent(errorMessage)}`
    );
  }

  // Başarı durumunda da mesajı URL uyumlu hale getiriyoruz
  const successMessage =
    "Eğer e-posta adresiniz kayıtlıysa, şifre sıfırlama linki gönderildi.";
  return redirect(`/login?message=${encodeURIComponent(successMessage)}`);
}

export async function updatePassword(formData) {
  "use server";

  const password = formData.get("password");
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    const errorMessage =
      "Şifre güncellenemedi. Linkin süresi dolmuş veya geçersiz olabilir.";
    // Mesajı URL uyumlu hale getiriyoruz
    return redirect(
      `/reset-password?message=${encodeURIComponent(errorMessage)}`
    );
  }

  const successMessage =
    "Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.";
  // Mesajı URL uyumlu hale getiriyoruz
  return redirect(`/login?message=${encodeURIComponent(successMessage)}`);
}

// -- ARAÇ PUANLAMA --
// Kullanıcı bir araca puan verdiğinde çalışır (+1 Puan, sadece ilk oylamada)
export async function rateTool(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Puan vermek için giriş yapmalısınız." };

  const toolId = formData.get("toolId");
  const rating = formData.get("rating");

  // Veritabanında oluşturduğumuz akıllı fonksiyonu çağırıyoruz.
  const { error } = await supabase.rpc("upsert_rating_and_award_points", {
    p_tool_id: toolId,
    p_user_id: user.id,
    p_rating: rating,
  });

  if (error) {
    console.error("Puanlama ve puan verme hatası:", error);
    return { error: "İşlem sırasında bir hata oluştu." };
  }

  revalidatePath(`/tool/${formData.get("toolSlug")}`);
  return { success: "Oyunuz kaydedildi." };
}

export async function deleteUser() {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(
      `/login?message=${encodeURIComponent("Bu işlem için giriş yapmalısınız.")}`
    );
  }

  const userEmail = user.email; // E-postayı, kullanıcı silinmeden önce bir değişkene kaydediyoruz.
  const supabaseAdmin = createAdminClient();
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
    user.id
  );

  if (deleteError) {
    console.error("Hesap silme hatası:", deleteError);
    const errorMessage = "Hesabınız silinirken bir hata oluştu.";
    return redirect(`/profile?message=${encodeURIComponent(errorMessage)}`);
  }

  // Hesap silme başarılıysa, veda e-postası göndermeyi dene
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: userEmail, // Kaydettiğimiz e-posta adresini kullanıyoruz
      subject: "Hesabınız Silindi | AI Keşif Platformu",
      react: GoodbyeEmail({ userEmail: userEmail }),
    });
  } catch (emailError) {
    console.error("Veda e-postası gönderme hatası:", emailError);
  }

  const successMessage = "Hesabınız başarıyla silindi. Gidişinize üzüldük.";
  return redirect(`/?message=${encodeURIComponent(successMessage)}`);
}

export async function toggleFavorite(toolId, toolSlug, isFavorited) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  if (isFavorited) {
    // Eğer araç zaten favorilerdeyse, siliyoruz.
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("tool_id", toolId);

    if (error) {
      console.error("Favori silme hatası:", error);
      return { error: "Araç favorilerden çıkarılırken bir hata oluştu." };
    }

    // İlgili sayfaların önbelleğini temizliyoruz
    revalidatePath(`/tool/${toolSlug}`);
    revalidatePath("/profile");

    return { success: "removed" };
  } else {
    // Eğer araç favorilerde değilse, ekliyoruz.
    const { error } = await supabase.from("favorites").insert({
      user_id: user.id,
      tool_id: toolId,
    });

    if (error) {
      console.error("Favori ekleme hatası:", error);
      return { error: "Araç favorilere eklenirken bir hata oluştu." };
    }

    // İlgili sayfaların önbelleğini temizliyoruz
    revalidatePath(`/tool/${toolSlug}`);
    revalidatePath("/profile");

    return { success: "added" };
  }
}

export async function toggleFeatured(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sadece admin bu işlemi yapabilir
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const toolId = formData.get("toolId");
  // Gelen değer 'true' ise boolean true'ya, değilse false'a çeviriyoruz
  const newStatus = formData.get("isFeatured") === "true";

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  const { error } = await supabase
    .from("tools")
    .update({ is_featured: newStatus })
    .eq("id", toolId);

  if (error) {
    console.error("Öne çıkan durumu güncelleme hatası:", error);
    return { error: "Durum güncellenirken bir hata oluştu." };
  }

  // Admin ve ana sayfanın önbelleğini temizle
  revalidatePath("/admin");
  revalidatePath("/");

  return {
    success: `Durum ${newStatus ? "öne çıkan" : "normal"} olarak güncellendi.`,
  };
}

// -- YORUM EKLEME --
// Bu fonksiyon artık sadece yorumu ekler. Puanlama, trigger tarafından yapılır.
export async function addComment(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Yorum yapmak için giriş yapmalısınız." };

  const content = formData.get("content");
  const toolId = formData.get("toolId");

  if (!content || content.trim() === "") return { error: "Yorum boş olamaz." };

  const { error } = await supabase
    .from("comments")
    .insert({ content, tool_id: toolId, user_id: user.id });

  if (error) return { error: "Yorumunuz eklenirken bir hata oluştu." };

  revalidatePath(`/tool/${formData.get("toolSlug")}`);
  return { success: "Yorumunuz başarıyla eklendi." };
}

export async function deleteComment(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const commentId = formData.get("commentId");

  if (!commentId) {
    return { error: "Yorum ID'si bulunamadı." };
  }

  // Yorumu silerken, güvenlik kuralının (RLS) sadece
  // yorumun sahibinin bu işlemi yapabilmesini sağladığından emin oluyoruz.
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id); // EKSTRA GÜVENLİK: Sadece kendi yorumunu silebilsin.

  if (error) {
    console.error("Yorum silme hatası:", error);
    return { error: "Yorum silinirken bir hata oluştu." };
  }

  // Profil sayfasının önbelleğini temizleyerek listenin anında güncellenmesini sağlıyoruz.
  revalidatePath("/profile");

  return { success: "Yorum başarıyla silindi." };
}

// Bir aracı düzenlemek/güncellemek için kullanılan fonksiyon
export async function updateTool(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  // Formdan güncellenecek verileri alıyoruz
  const toolId = formData.get("toolId");
  const name = formData.get("name");
  const link = formData.get("link");
  const description = formData.get("description");
  const category_id = formData.get("category_id");
  const pricing_model = formData.get("pricing_model");
  const platforms = formData.getAll("platforms");
  const tier = formData.get("tier"); // YENİ: Seviye bilgisini formdan alıyoruz

  if (!toolId || !name || !link || !category_id) {
    return { error: "Tüm zorunlu alanlar doldurulmalıdır." };
  }

  // Veritabanında güncellenecek obje
  const updatedData = {
    name,
    link,
    description,
    category_id,
    pricing_model: pricing_model || null,
    platforms,
    tier, // YENİ: Güncellenecek veriye ekliyoruz
  };

  const { error } = await supabase
    .from("tools")
    .update(updatedData)
    .eq("id", toolId);

  if (error) {
    console.error("Araç güncelleme hatası:", error);
    return { error: "Araç güncellenirken bir hata oluştu." };
  }

  // İlgili tüm sayfaların önbelleğini temizliyoruz
  revalidatePath("/admin");
  revalidatePath("/");

  const { data: tool } = await supabase
    .from("tools")
    .select("slug")
    .eq("id", toolId)
    .single();
  if (tool) {
    revalidatePath(`/tool/${tool.slug}`);
  }

  return { success: "Araç başarıyla güncellendi." };
}

// Bir aracı silmek için kullanılan fonksiyon
export async function deleteTool(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sadece adminin bu işlemi yapabildiğinden emin oluyoruz
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const toolId = formData.get("toolId");

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  // Veritabanından ilgili aracı siliyoruz
  // Veritabanı kurallarımız (ON DELETE CASCADE) sayesinde, bu araca ait tüm puanlar,
  // favoriler ve yorumlar da otomatik olarak silinecektir.
  const { error } = await supabase.from("tools").delete().eq("id", toolId);

  if (error) {
    console.error("Araç silme hatası:", error);
    return { error: "Araç silinirken bir hata oluştu." };
  }

  // Admin ve ana sayfanın önbelleğini temizliyoruz
  revalidatePath("/admin");
  revalidatePath("/");

  return { success: "Araç başarıyla silindi." };
}

// Yeni bir kategori ekleyen fonksiyon
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

  const slug = slugify(name); // slugify fonksiyonumuzun bu dosyada olduğunu varsayıyoruz

  const { error } = await supabase.from("categories").insert({ name, slug });

  if (error) {
    if (error.code === "23505") {
      // unique constraint hatası
      return { error: "Bu kategori adı veya slug zaten mevcut." };
    }
    console.error("Kategori ekleme hatası:", error);
    return { error: "Kategori eklenirken bir hata oluştu." };
  }

  revalidatePath("/admin");
  return { success: "Kategori başarıyla eklendi." };
}

// Mevcut bir kategoriyi güncelleyen fonksiyon
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

// Bir kategoriyi silen fonksiyon
// DİKKAT: Bu kategoriye ait tüm araçlar da veritabanından silinecektir (ON DELETE CASCADE).
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
  revalidatePath("/"); // Ana sayfayı da güncelle
  return { success: "Kategori başarıyla silindi." };
}

export async function updateAvatar(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const file = formData.get("avatar");
  if (!file || file.size === 0) {
    return { error: "Lütfen bir dosya seçin." };
  }

  const fileExt = file.name.split(".").pop();
  // Dosya adını da benzersiz yapmak için zaman damgası ekliyoruz
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Avatar yükleme hatası:", uploadError);
    return { error: "Avatar yüklenirken bir hata oluştu." };
  }

  // Yüklenen dosyanın genel URL'ini alıyoruz
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  // Veritabanına bu yeni, benzersiz URL'i kaydediyoruz
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (profileError) {
    console.error("Profil güncelleme hatası:", profileError);
    // Yükleme başarılı ama profil güncellenemediyse, yüklenen dosyayı sil
    await supabase.storage.from("avatars").remove([filePath]);
    return { error: "Profil fotoğrafı güncellenirken bir hata oluştu." };
  }

  revalidatePath("/profile");

  return { success: "Profil fotoğrafınız başarıyla güncellendi." };
}

// Yeni bir etiket ekleyen fonksiyon
// Yeni bir etiket ekleyen fonksiyon
export async function addTag(formData) {
  "use server";

  // 1. Önce normal istemci ile işlemi kimin tetiklediğini kontrol et
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // "Kapıdaki Güvenlik" kontrolümüz
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const name = formData.get("name");
  if (!name) {
    return { error: "Etiket adı boş olamaz." };
  }

  // 2. Güvenlik kontrolü geçildikten sonra, YAZMA İŞLEMİ İÇİN ADMIN CLIENT KULLAN
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

// Mevcut bir etiketi silen fonksiyon
export async function deleteTag(formData) {
  "use server";

  // 1. Önce normal istemci ile işlemi kimin tetiklediğini kontrol et
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

  // 2. Güvenlik kontrolü geçildikten sonra, SİLME İŞLEMİ İÇİN ADMIN CLIENT KULLAN
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("tags").delete().eq("id", id);

  if (error) {
    console.error("Etiket silme hatası:", error);
    return { error: "Etiket silinirken bir veritabanı hatası oluştu." };
  }

  revalidatePath("/admin");
  return { success: "Etiket başarıyla silindi." };
}

// Bir araca etiket atayan/kaldıran fonksiyon
export async function assignTagsToTool(formData) {
  "use server";

  // 1. Önce normal istemci ile işlemi kimin tetiklediğini kontrol et
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  // 2. Güvenlik kontrolü geçildikten sonra, YAZMA/SİLME İŞLEMLERİ İÇİN ADMIN CLIENT KULLAN
  const supabaseAdmin = createAdminClient();
  const toolId = formData.get("toolId");
  const tagIds = formData.getAll("tagId").map((id) => parseInt(id, 10));

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  // 1. Önce bu araca ait tüm mevcut etiketleri SÜPER ADMIN YETKİSİYLE siliyoruz
  const { error: deleteError } = await supabaseAdmin
    .from("tool_tags")
    .delete()
    .eq("tool_id", toolId);

  if (deleteError) {
    console.error("Eski etiketleri silme hatası:", deleteError);
    return { error: "Etiketler güncellenirken bir veritabanı hatası oluştu." };
  }

  // 2. Eğer formdan seçilen yeni etiketler varsa, onları SÜPER ADMIN YETKİSİYLE ekliyoruz
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

// Önce, AI modeline göndermek için tüm araçları çeken bir yardımcı fonksiyon
async function getAllToolsForAI() {
  const supabase = createClient();
  // Veritabanından sadece AI'ın ihtiyaç duyacağı temel bilgileri çekiyoruz
  const { data, error } = await supabase
    .from("tools")
    .select("name, slug, description")
    .eq("is_approved", true);

  if (error) {
    console.error("AI için araçlar çekilirken hata:", error);
    return [];
  }
  return data;
}

// Ana Tavsiye Fonksiyonu
export async function getAiRecommendation(userPrompt) {
  "use server";

  if (!userPrompt) {
    return { success: false, error: "Lütfen bir istek girin." };
  }

  try {
    // 1. Adım: Veritabanından tüm araçları çek
    const allTools = await getAllToolsForAI();
    if (allTools.length === 0) {
      return { success: false, error: "Veritabanında hiç araç bulunamadı." };
    }

    // 2. Adım: Gemini için özel prompt'u oluştur
    const formattedTools = allTools
      .map((t) => `- ${t.name} (${t.slug}): ${t.description}`)
      .join("\n");
    const prompt = `
          Bir "AI Araçları Keşif Platformu" için tavsiye motorusun. Kullanıcının isteğine göre, aşağıdaki listeden en uygun 3 aracı seçmelisin.
          
          Kullanıcının isteği: "${userPrompt}"

          Mevcut Araç Listesi:
          ${formattedTools}

          Görevin: Kullanıcının isteğine en uygun 3 aracı seçmek ve her biri için neden uygun olduğunu TEK bir cümle ile açıklamaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin ekleme.
      `;

    // 3. Adım: Gemini'den yapılandırılmış JSON cevabı isteme
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            recommendations: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  slug: { type: "STRING" },
                  reason: { type: "STRING" },
                },
                required: ["name", "slug", "reason"],
              },
            },
          },
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY; // Bu boş kalacak, Canvas çalışma zamanında kendi anahtarını kullanacak.
    if (!apiKey) {
      return { success: false, error: "Gemini API anahtarı bulunamadı." };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // 4. Adım: Gemini API'ye isteği gönder
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Hatası:", errorBody);
      return {
        success: false,
        error: `Yapay zeka modelinden bir hata alındı. (Status: ${response.status})`,
      };
    }

    const result = await response.json();

    // 5. Adım: Gelen cevabı işle ve döndür
    if (
      result.candidates &&
      result.candidates[0].content &&
      result.candidates[0].content.parts[0].text
    ) {
      const textResponse = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(textResponse);
      return { success: true, data: parsedJson.recommendations };
    } else {
      return {
        success: false,
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }
  } catch (e) {
    console.error("Tavsiye fonksiyonunda genel hata:", e);
    return {
      success: false,
      error: "Tavsiye alınırken beklenmedik bir hata oluştu.",
    };
  }
}

export async function sendContactMessage(formData) {
  "use server";

  const name = formData.get("name");
  const senderEmail = formData.get("email");
  const message = formData.get("message");

  if (!name || !senderEmail || !message) {
    return { error: "Lütfen tüm alanları doldurun." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: process.env.ADMIN_NOTIF_EMAIL_TO,
      subject: `AI Keşif Platformu - Yeni İletişim Formu Mesajı`,
      react: ContactFormEmail({
        name,
        senderEmail,
        message,
      }),
    });
  } catch (error) {
    console.error("İletişim formu e-postası gönderme hatası:", error);
    return { error: "Mesajınız gönderilirken bir hata oluştu." };
  }

  // Artık redirect yerine başarılı bir JSON objesi döndürüyoruz.
  return {
    success: "Mesajınız için teşekkürler! En kısa sürede size geri döneceğiz.",
  };
}

// AI modeline göndermek için, mevcut araç HARİÇ diğer tüm araçları çeken bir fonksiyon
async function getOtherToolsForAI(currentToolId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tools")
    .select("name, slug, description")
    .eq("is_approved", true)
    .neq("id", currentToolId); // Mevcut aracı listeden çıkar

  if (error) {
    console.error("AI için diğer araçlar çekilirken hata:", error);
    return [];
  }
  return data;
}

// Benzer Araçları getiren ana fonksiyon
export async function getSimilarTools(currentTool) {
  "use server";

  if (!currentTool) {
    return { success: false, error: "Mevcut araç bilgisi eksik." };
  }

  try {
    // 1. Adım: Karşılaştırma yapılacak diğer araçları çek
    const otherTools = await getOtherToolsForAI(currentTool.id);
    if (otherTools.length === 0) {
      return {
        success: false,
        error: "Karşılaştırılacak başka araç bulunamadı.",
      };
    }

    // 2. Adım: Gemini için özel prompt'u oluştur
    const formattedTools = otherTools
      .map((t) => `- ${t.name} (${t.slug}): ${t.description}`)
      .join("\n");
    const prompt = `
            Bir "AI Araçları Keşif Platformu" için tavsiye motorusun. Sana verilen bir araca en çok benzeyen veya onu tamamlayan 3 aracı, aşağıdaki listeden seçmelisin.

            Referans Araç: 
            - Adı: "${currentTool.name}"
            - Açıklaması: "${currentTool.description}"

            Karşılaştırılacak Diğer Araçların Listesi:
            ${formattedTools}

            Görevin: Referans araca en çok benzeyen veya onu tamamlayan en iyi 3 aracı seçmek ve her biri için neden benzer/tamamlayıcı olduğunu TEK bir cümle ile açıklamaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
        `;

    // 3. Adım: Gemini API'sine isteği hazırla ve gönder
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            similar_tools: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  slug: { type: "STRING" },
                  reason: { type: "STRING" },
                },
                required: ["name", "slug", "reason"],
              },
            },
          },
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Gemini API anahtarı bulunamadı." };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Hatası (Benzer Araçlar):", errorBody);
      return { success: false, error: "Yapay zeka modelinden hata alındı." };
    }

    const result = await response.json();

    // 4. Adım: Gelen cevabı işle ve döndür
    if (
      result.candidates &&
      result.candidates[0].content &&
      result.candidates[0].content.parts[0].text
    ) {
      const textResponse = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(textResponse);
      return { success: true, data: parsedJson.similar_tools || [] };
    } else {
      return {
        success: false,
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }
  } catch (e) {
    console.error("Benzer araçlar fonksiyonunda genel hata:", e);
    return {
      success: false,
      error: "Tavsiye alınırken beklenmedik bir hata oluştu.",
    };
  }
}

export async function getRandomTool() {
  "use server";

  const supabase = createClient();

  // PostgreSQL'in kendi RANDOM() fonksiyonunu kullanarak
  // veritabanından rastgele bir tane onaylanmış araç çekiyoruz.
  // Bu, en verimli ve en doğru yöntemdir.
  const { data, error } = await supabase
    .from("tools")
    .select("slug")
    .eq("is_approved", true)
    .order("random()") // PostgreSQL'e özel rastgele sıralama
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Rastgele araç çekilirken hata:", error);
    // Hata durumunda veya araç bulunamazsa ana sayfaya yönlendir
    return redirect("/");
  }

  // Kullanıcıyı bulunan rastgele aracın detay sayfasına yönlendir
  return redirect(`/tool/${data.slug}`);
}

export async function createPost(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  // DEĞİŞİKLİK: 'title' değişkenini formdan burada alıyoruz.
  const title = formData.get("title");
  if (!title) {
    return { error: "Yazı başlığı boş olamaz." };
  }

  // slugify fonksiyonumuzun bu dosyada olduğunu varsayıyoruz
  const slug = slugify(title);

  const { data: newPost, error } = await supabase
    .from("posts")
    .insert({
      title, // Artık bu değişken tanımlı ve doğru.
      slug,
      author_id: user.id,
      content: "# Yeni Yazı Başlığı\n\nBuraya yazınızı yazmaya başlayın...",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Yazı oluşturma hatası:", error);
    return { error: "Yazı oluşturulurken bir hata oluştu." };
  }

  // Admini, yeni oluşturulan yazının düzenleme sayfasına yönlendir
  redirect(`/admin/blog/${newPost.id}/edit`);
}

// Mevcut bir blog yazısını güncelleyen fonksiyon
// src/app/actions.js dosyasındaki updatePost fonksiyonunu bu kodla değiştirin.

export async function updatePost(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const id = formData.get("id");
  const title = formData.get("title");
  const slug = formData.get("slug");
  const content = formData.get("content");
  const description = formData.get("description");
  const featured_image_url = formData.get("featured_image_url");
  const status = formData.get("status");
  const category_id = formData.get("category_id");

  const postData = {
    title,
    slug,
    content,
    description,
    featured_image_url,
    status,
    category_id: category_id ? parseInt(category_id, 10) : null,
    updated_at: new Date().toISOString(),
  };

  if (status === "Yayınlandı" && !formData.get("was_published_before")) {
    postData.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("posts").update(postData).eq("id", id);

  // DEĞİŞİKLİK: Hata kontrolünü daha detaylı hale getiriyoruz.
  if (error) {
    console.error("Yazı güncelleme hatası:", error);
    // DETAYLI HATA MESAJINI İSTEMCİYE GÖNDER
    return { error: `Veritabanı Hatası: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);

  return { success: "Yazı başarıyla güncellendi." };
}

// Bir blog yazısını silen fonksiyon
export async function deletePost(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const id = formData.get("id");
  const slug = formData.get("slug");

  if (!id) {
    return { error: "Yazı ID'si bulunamadı." };
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    console.error("Yazı silme hatası:", error);
    return { error: "Yazı silinirken bir hata oluştu." };
  }

  revalidatePath("/admin");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`); // Bu slug artık olmayacak ama cache'i temizlemek iyidir

  return { success: "Yazı başarıyla silindi." };
}

// Bir yazıya etiket atayan/kaldıran fonksiyon
export async function assignTagsToPost(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sadece admin yetkisiyle çalışır
  if (!user || !user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const postId = formData.get("postId");
  // Formdan gelen tüm tagId'leri bir dizi olarak alıyoruz
  const tagIds = formData.getAll("tagId").map((id) => parseInt(id, 10));

  if (!postId) {
    return { error: "Yazı ID'si bulunamadı." };
  }

  // 1. Önce bu yazıya ait tüm mevcut etiket bağlantılarını siliyoruz
  const { error: deleteError } = await supabase
    .from("post_tags")
    .delete()
    .eq("post_id", postId);

  if (deleteError) {
    console.error("Eski etiketleri silme hatası:", deleteError);
    return { error: "Etiketler güncellenirken bir hata oluştu." };
  }

  // 2. Eğer formdan seçilen yeni etiketler varsa, onları ekliyoruz
  if (tagIds.length > 0) {
    const newLinks = tagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
    }));

    const { error: insertError } = await supabase
      .from("post_tags")
      .insert(newLinks);

    if (insertError) {
      console.error("Yeni etiketleri ekleme hatası:", insertError);
      return { error: "Etiketler güncellenirken bir hata oluştu." };
    }
  }

  revalidatePath("/admin");
  return { success: "Yazının etiketleri başarıyla güncellendi." };
}

export async function togglePostPublish(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const postId = formData.get("postId");
  const newStatus =
    formData.get("isPublished") === "true" ? "Yayınlandı" : "Taslak";

  const postData = {
    status: newStatus,
  };

  // Eğer yazı ilk defa yayınlanıyorsa, yayınlanma tarihini de ayarla
  if (newStatus === "Yayınlandı") {
    postData.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("posts")
    .update(postData)
    .eq("id", postId)
    .select("slug") // slug'ı alıyoruz
    .single();

  if (error) {
    console.error("Yayın durumu güncelleme hatası:", error);
    return { error: "Durum güncellenirken bir hata oluştu." };
  }

  revalidatePath("/admin");
  revalidatePath("/blog");

  return { success: `Yazının durumu "${newStatus}" olarak güncellendi.` };
}

export async function createCollection(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Bu işlem için giriş yapmalısınız." };

  const title = formData.get("title");
  if (!title) return { error: "Koleksiyon başlığı boş olamaz." };

  const slug = slugify(title) + "-" + Date.now().toString(36); // Slug'ın benzersiz olması için zaman damgası ekliyoruz

  const { data: newCollection, error } = await supabase
    .from("collections")
    .insert({ title, slug, user_id: user.id, description: "" })
    .select("id")
    .single();

  if (error) {
    console.error("Koleksiyon oluşturma hatası:", error);
    return { error: "Koleksiyon oluşturulurken bir hata oluştu." };
  }

  // Kullanıcıyı, yeni oluşturulan koleksiyonun düzenleme sayfasına yönlendir
  redirect(`/profile/collections/${newCollection.id}/edit`);
}

// Bir koleksiyonun detaylarını güncelleyen fonksiyon
export async function updateCollection(formData) {
  "use server";
  const supabase = createClient();

  const id = formData.get("id");
  const title = formData.get("title");
  const description = formData.get("description");
  const is_public = formData.get("is_public") === "true";

  const { error } = await supabase
    .from("collections")
    .update({
      title,
      description,
      is_public,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Koleksiyon güncelleme hatası:", error);
    return { error: "Koleksiyon güncellenirken bir hata oluştu." };
  }

  revalidatePath("/profile");
  revalidatePath(`/collections/${formData.get("slug")}`);
  return { success: "Koleksiyon başarıyla güncellendi." };
}

// Bir koleksiyonu silen fonksiyon
export async function deleteCollection(formData) {
  "use server";
  const supabase = createClient();
  const id = formData.get("id");

  const { error } = await supabase.from("collections").delete().eq("id", id);

  if (error) {
    console.error("Koleksiyon silme hatası:", error);
    return { error: "Koleksiyon silinirken bir hata oluştu." };
  }

  revalidatePath("/profile");
  return { success: "Koleksiyon başarıyla silindi." };
}

// Bir koleksiyondaki araçları güncelleyen fonksiyon
export async function updateCollectionTools(formData) {
  "use server";
  const supabase = createClient();

  const collectionId = formData.get("collectionId");
  const toolData = JSON.parse(formData.get("tools")); // [{tool_id: 1, notes: '...'}, ...]

  // 1. Önce bu koleksiyona ait tüm mevcut araçları siliyoruz
  const { error: deleteError } = await supabase
    .from("collection_tools")
    .delete()
    .eq("collection_id", collectionId);

  if (deleteError) {
    console.error("Eski koleksiyon araçlarını silme hatası:", deleteError);
    return { error: "Koleksiyondaki araçlar güncellenirken bir hata oluştu." };
  }

  // 2. Eğer formdan seçilen yeni araçlar varsa, onları ekliyoruz
  if (toolData.length > 0) {
    const newLinks = toolData.map((item) => ({
      collection_id: collectionId,
      tool_id: item.tool_id,
      notes: item.notes,
    }));

    const { error: insertError } = await supabase
      .from("collection_tools")
      .insert(newLinks);

    if (insertError) {
      console.error("Yeni koleksiyon araçlarını ekleme hatası:", insertError);
      return {
        error: "Koleksiyondaki araçlar güncellenirken bir hata oluştu.",
      };
    }
  }

  revalidatePath(`/profile/collections/${collectionId}/edit`);
  revalidatePath(`/collections/${formData.get("slug")}`);
  return { success: "Koleksiyondaki araçlar güncellendi." };
}

// Yeni bir prompt gönderen fonksiyon
// Yeni bir prompt gönderildiğinde +10 puan kazandıran güncellenmiş fonksiyon
// -- PROMPT GÖNDERME --
// Kullanıcı yeni bir prompt paylaştığında çalışır (+10 Puan)
// -- PROMPT GÖNDERME --
// Bu fonksiyon artık sadece prompt'u ve ilk oyunu ekler. Puanlama, trigger tarafından yapılır.
export async function submitPrompt(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Prompt göndermek için giriş yapmalısınız." };

  const title = formData.get("title");
  const prompt_text = formData.get("prompt_text");
  const notes = formData.get("notes");
  const tool_id = formData.get("toolId");

  if (!title || !prompt_text || !tool_id)
    return { error: "Başlık, prompt ve araç seçimi zorunludur." };

  const { data: newPrompt, error: insertError } = await supabase
    .from("prompts")
    .insert({
      title,
      prompt_text,
      notes,
      tool_id,
      user_id: user.id,
      vote_count: 1,
    })
    .select("id")
    .single();

  if (insertError) return { error: "Prompt gönderilirken bir hata oluştu." };

  await supabase
    .from("prompt_votes")
    .insert({ prompt_id: newPrompt.id, user_id: user.id });

  revalidatePath(`/tool/${formData.get("toolSlug")}`);
  return { success: "Prompt başarıyla gönderildi!" };
}

// Bir prompt oylandığında, prompt'un sahibine +5 puan kazandıran güncellenmiş fonksiyon
export async function togglePromptVote(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Oylama yapmak için giriş yapmalısınız." };

  const promptId = formData.get("promptId");
  const { data: existingVote } = await supabase
    .from("prompt_votes")
    .select("prompt_id")
    .eq("user_id", user.id)
    .eq("prompt_id", promptId)
    .maybeSingle();

  if (existingVote) {
    await supabase
      .from("prompt_votes")
      .delete()
      .match({ user_id: user.id, prompt_id: promptId });
  } else {
    await supabase
      .from("prompt_votes")
      .insert({ user_id: user.id, prompt_id: promptId });
  }

  revalidatePath(`/tool/${formData.get("toolSlug")}`);
  return { success: true };
}

export async function deletePrompt(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const promptId = formData.get("promptId");

  if (!promptId) {
    return { error: "Prompt ID'si bulunamadı." };
  }

  // Veritabanı güvenlik kurallarımız (RLS) bu işlemi zaten koruyor,
  // ama ekstra bir güvenlik katmanı olarak burada da kontrol ediyoruz.
  const { error } = await supabase
    .from("prompts")
    .delete()
    .eq("id", promptId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Prompt silme hatası:", error);
    return { error: "Prompt silinirken bir hata oluştu." };
  }

  // İlgili tüm sayfaların önbelleğini temizle
  revalidatePath("/profile");
  if (formData.get("toolSlug")) {
    revalidatePath(`/tool/${formData.get("toolSlug")}`);
  }

  return { success: "Prompt başarıyla silindi." };
}

// Bir eseri gönderen/güncelleyen ana fonksiyon
export async function submitShowcaseItem(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Eser göndermek için giriş yapmalısınız." };
  }

  const title = formData.get("title");
  const description = formData.get("description");
  const contentType = formData.get("content_type");
  const imageFile = formData.get("image");
  const contentText = formData.get("content_text");

  if (!title || !contentType) {
    return { error: "Başlık ve içerik türü zorunludur." };
  }

  let imageUrl = null;

  // Eğer içerik türü "Görsel" ise, dosyayı yükle
  if (contentType === "Görsel") {
    if (!imageFile || imageFile.size === 0) {
      return { error: "Görsel içerik türü için bir dosya seçmelisiniz." };
    }

    const fileExt = imageFile.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("showcase-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error("Eser görseli yükleme hatası:", uploadError);
      return { error: "Görsel yüklenirken bir hata oluştu." };
    }

    imageUrl = supabase.storage.from("showcase-images").getPublicUrl(filePath)
      .data.publicUrl;
  }

  // Veritabanına kaydedilecek obje
  const showcaseData = {
    title,
    description,
    content_type: contentType,
    content_text: contentType !== "Görsel" ? contentText : null,
    image_url: imageUrl,
    user_id: user.id,
    is_approved: false, // Eserler de admin onayı bekleyecek
  };

  const { error: insertError } = await supabase
    .from("showcase_items")
    .insert([showcaseData]);

  if (insertError) {
    console.error("Eser kaydetme hatası:", insertError);
    if (imageUrl) {
      await supabase.storage
        .from("showcase-images")
        .remove([imageUrl.split("/").slice(-2).join("/")]);
    }
    return { error: "Eseriniz kaydedilirken bir hata oluştu." };
  }

  // İşlem başarılı olduğunda profil sayfasını ve eserler sayfasını yenile
  revalidatePath("/profile");
  revalidatePath("/eserler");

  return {
    success:
      "Eseriniz başarıyla gönderildi! Onaylandıktan sonra yayınlanacaktır.",
  };
}

// Bir eseri silen fonksiyon
export async function deleteShowcaseItem(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const itemId = formData.get("itemId");
  const imageUrl = formData.get("imageUrl");

  if (!itemId) {
    return { error: "Eser ID'si bulunamadı." };
  }

  // 1. Önce veritabanındaki kaydı siliyoruz.
  // RLS kuralları sadece kullanıcının kendi eserini silebilmesini garantiler.
  const { error: dbError } = await supabase
    .from("showcase_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (dbError) {
    console.error("Eser silme veritabanı hatası:", dbError);
    return { error: "Eser silinirken bir veritabanı hatası oluştu." };
  }

  // 2. Veritabanı kaydı başarıyla silindikten sonra, eğer varsa Storage'daki görseli siliyoruz.
  if (imageUrl) {
    try {
      const filePath = new URL(imageUrl).pathname.split("/showcase-images/")[1];
      await supabase.storage.from("showcase-images").remove([filePath]);
    } catch (storageError) {
      console.error("Eser görseli silme hatası:", storageError);
      // Bu kritik bir hata değil, kayıt veritabanından silindi. Sadece logluyoruz.
    }
  }

  revalidatePath("/profile");
  revalidatePath("/eserler");

  return { success: "Eser başarıyla silindi." };
}

// -- ESER ONAYLAMA --
// Bu fonksiyon artık sadece onay durumunu günceller. Puanlama ve bildirim, trigger tarafından yapılır.
export async function approveShowcaseItem(formData) {
  "use server";
  const supabaseAdmin = createAdminClient();
  const itemId = formData.get("itemId");

  const { error } = await supabaseAdmin
    .from("showcase_items")
    .update({ is_approved: true })
    .eq("id", itemId);

  if (error) return { error: "Eser onaylanırken bir hata oluştu." };

  revalidatePath("/admin");
  revalidatePath("/eserler");
  return { success: "Eser başarıyla onaylandı ve yayınlandı." };
}

// Bir eserin detaylarını güncelleyen fonksiyon (admin için)
export async function updateShowcaseItem(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const itemId = formData.get("itemId");
  const title = formData.get("title");
  const description = formData.get("description");
  const contentText = formData.get("content_text");

  if (!itemId || !title) {
    return { error: "ID ve başlık zorunludur." };
  }

  // Veritabanında güncellenecek obje
  const updateData = {
    title,
    description,
    content_text: contentText,
  };

  // Veritabanındaki ilgili eseri güncelliyoruz.
  // RLS kuralları, kullanıcının sadece kendi eserini güncelleyebilmesini sağlar.
  const { error } = await supabase
    .from("showcase_items")
    .update(updateData)
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Eser güncelleme hatası:", error);
    return { error: "Eser güncellenirken bir hata oluştu." };
  }

  // İlgili sayfaları yenileyerek değişikliğin anında görünmesini sağlıyoruz.
  revalidatePath("/profile");
  revalidatePath("/eserler");

  return { success: "Eser başarıyla güncellendi." };
}

// Bir esere etiket atayan/kaldıran fonksiyon
export async function assignTagsToShowcaseItem(formData) {
  "use server";
  // Bu fonksiyonun içine etiket atama mantığı eklenecek.
  // Şimdilik iskelet olarak bırakıyoruz.
  return { success: "Etiket atama fonksiyonu henüz aktif değil." };
}

// Bir esere yeni bir yorum ekleyen fonksiyon
export async function addShowcaseComment(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Yorum yapmak için giriş yapmalısınız." };
  }

  const content = formData.get("content");
  const itemId = formData.get("itemId");

  if (!content || content.trim() === "") {
    return { error: "Yorum boş olamaz." };
  }
  if (!itemId) {
    return { error: "Eser bilgisi eksik." };
  }

  const { error } = await supabase.from("showcase_comments").insert({
    content: content,
    item_id: itemId,
    user_id: user.id,
  });

  if (error) {
    console.error("Eser yorumu ekleme hatası:", error);
    return { error: "Yorumunuz eklenirken bir hata oluştu." };
  }

  revalidatePath("/eserler");
  return { success: "Yorumunuz başarıyla eklendi." };
}

// Bir kullanıcının kendi yorumunu silen fonksiyon
export async function deleteShowcaseComment(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const commentId = formData.get("commentId");
  if (!commentId) {
    return { error: "Yorum ID'si bulunamadı." };
  }

  const { error } = await supabase
    .from("showcase_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id); // Ekstra güvenlik: Sadece kendi yorumunu silebilsin.

  if (error) {
    console.error("Eser yorumu silme hatası:", error);
    return { error: "Yorum silinirken bir hata oluştu." };
  }

  revalidatePath("/eserler");
  return { success: "Yorum başarıyla silindi." };
}

export async function toggleShowcaseVote(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oylama yapmak için giriş yapmalısınız." };
  }

  const itemId = formData.get("itemId");
  if (!itemId) {
    return { error: "Eser ID'si bulunamadı." };
  }

  // DEĞİŞİKLİK: Sunucu artık kararı kendi veriyor.
  // 1. Önce, kullanıcının zaten oy verip vermediğini kontrol et.
  const { data: existingVote } = await supabase
    .from("showcase_votes")
    .select("item_id")
    .eq("user_id", user.id)
    .eq("item_id", itemId)
    .maybeSingle();

  const supabaseAdmin = createAdminClient();
  let finalError;

  if (existingVote) {
    // Eğer oy varsa, SİL.
    const { error: deleteError } = await supabase
      .from("showcase_votes")
      .delete()
      .match({ user_id: user.id, item_id: itemId });
    if (!deleteError) {
      const { error: countError } = await supabaseAdmin.rpc(
        "decrement_showcase_vote",
        { p_item_id: itemId }
      );
      finalError = countError;
    } else {
      finalError = deleteError;
    }
  } else {
    // Eğer oy yoksa, EKLE.
    const { error: insertError } = await supabase
      .from("showcase_votes")
      .insert({ user_id: user.id, item_id: itemId });
    if (!insertError) {
      const { error: countError } = await supabaseAdmin.rpc(
        "increment_showcase_vote",
        { p_item_id: itemId }
      );
      finalError = countError;
    } else {
      finalError = insertError;
    }
  }

  if (finalError) {
    console.error("Eser oylama hatası:", finalError);
    return { error: `Hata: ${finalError.message}` };
  }

  revalidatePath("/eserler");
  return { success: true };
}

export async function getShowcaseItemDetails(itemId) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Eserin yorumlarını, yorumu yapanların profilleriyle birlikte çekiyoruz.
  const { data: comments } = await supabase
    .from("showcase_comments")
    .select(`*, profiles(email, avatar_url)`)
    .eq("item_id", itemId)
    .order("created_at", { ascending: true });

  // 2. Giriş yapmış olan kullanıcının bu esere oy verip vermediğini kontrol ediyoruz.
  let isVoted = false;
  if (user) {
    const { data: vote } = await supabase
      .from("showcase_votes")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .single();
    if (vote) {
      isVoted = true;
    }
  }

  // Hem yorumları hem de kullanıcının oy durumunu geri döndürüyoruz.
  return { comments: comments || [], isVoted };
}

export async function updateUserProfile(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const username = formData.get("username");
  const bio = formData.get("bio");

  // Kullanıcı adı için temel bir doğrulama yapıyoruz.
  if (username && !/^[a-z0-9_-]{3,15}$/.test(username)) {
    return {
      error:
        "Kullanıcı adı 3-15 karakter arasında olmalı ve sadece küçük harf, sayı, - veya _ içerebilir.",
    };
  }

  // Veritabanında güncellenecek obje
  const profileData = {
    username: username,
    bio: bio,
    updated_at: new Date().toISOString(), // Profilin ne zaman güncellendiğini de kaydedebiliriz.
  };

  const { error } = await supabase
    .from("profiles")
    .update(profileData)
    .eq("id", user.id);

  if (error) {
    // Eğer hata '23505' ise, bu 'username'in zaten alınmış olduğu anlamına gelir.
    if (error.code === "23505") {
      return {
        error: "Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane deneyin.",
      };
    }
    console.error("Profil güncelleme hatası:", error);
    return { error: "Profiliniz güncellenirken bir hata oluştu." };
  }

  // Profil sayfası ve yeni herkese açık profil sayfasının önbelleğini temizle
  revalidatePath("/profile");
  if (username) {
    revalidatePath(`/u/${username}`);
  }

  return { success: "Profiliniz başarıyla güncellendi." };
}

export async function getAiComparison(tools) {
  "use server";

  if (!tools || tools.length < 2) {
    return { error: "Lütfen karşılaştırmak için en az 2 araç seçin." };
  }

  try {
    // 1. Adım: AI modeline göndermek için araç bilgilerini formatla
    const formattedTools = tools
      .map(
        (t, i) =>
          `Araç ${i + 1}:\n- Adı: ${t.name}\n- Açıklaması: ${t.description}\n- Fiyatlandırma: ${t.pricing_model || "Belirtilmemiş"}\n- Puanı: ${t.average_rating.toFixed(1)} (${t.total_ratings} oy)`
      )
      .join("\n\n");

    // 2. Adım: Gemini için özel prompt'u oluştur
    const prompt = `
        Sen bir AI ürünleri konusunda uzman bir teknoloji analistisin. Sana verilen iki veya daha fazla yapay zeka aracını objektif bir şekilde karşılaştırman gerekiyor.
        
        Karşılaştırılacak Araçlar:
        ${formattedTools}

        Görevin: Bu araçları analiz ederek, hangisinin hangi tür kullanıcılar için daha uygun olduğunu, güçlü ve zayıf yönlerini belirten bir analiz yazısı yazmaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;

    // 3. Adım: Gemini API'sine isteği hazırla ve gönder
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            comparison_summary: { type: "STRING" },
            detailed_analysis: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  tool_name: { type: "STRING" },
                  best_for: { type: "STRING" },
                  pros: { type: "ARRAY", items: { type: "STRING" } },
                  cons: { type: "ARRAY", items: { type: "STRING" } },
                },
                required: ["tool_name", "best_for", "pros", "cons"],
              },
            },
          },
        },
      },
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: "Gemini API anahtarı bulunamadı." };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini Karşılaştırma Hatası:", errorBody);
      return { error: `Yapay zeka modelinden hata alındı.` };
    }

    const result = await response.json();

    if (
      result.candidates &&
      result.candidates[0].content &&
      result.candidates[0].content.parts[0].text
    ) {
      const textResponse = result.candidates[0].content.parts[0].text;
      return { success: true, data: JSON.parse(textResponse) };
    } else {
      return {
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }
  } catch (e) {
    console.error("Karşılaştırma fonksiyonunda genel hata:", e);
    return { error: "Analiz oluşturulurken beklenmedik bir hata oluştu." };
  }
}

export async function deleteUserFromAdmin(formData) {
  "use server";

  // 1. İşlemi yapmaya çalışan kişinin admin olup olmadığını kontrol et
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

  // Adminin kendi kendini silmesini engelle
  if (user.id === userIdToDelete) {
    return { error: "Admin kendi hesabını bu panelden silemez." };
  }

  // 2. Silme işlemini, tüm RLS kurallarını bypass eden "Süper Admin" istemcisiyle yap
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

  if (error) {
    console.error("Admin panelinden kullanıcı silme hatası:", error);
    return { error: "Kullanıcı silinirken bir hata oluştu." };
  }

  // İşlem başarılı olduğunda ilgili sayfaları yenile
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { success: "Kullanıcı başarıyla silindi." };
}

// Kullanıcının son 10 bildirimini çeken fonksiyon
export async function getNotifications() {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { notifications: [], unreadCount: 0 };

  const { data, error, count } = await supabase
    .from("notifications")
    .select("*", { count: "exact" }) // 'exact' ile okunmamış sayısını al
    .eq("user_id", user.id)
    .eq("is_read", false); // Sadece okunmamışları say

  const { data: notificationsData, error: notificationsError } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || notificationsError) {
    console.error("Bildirimleri çekerken hata:", error || notificationsError);
    return { notifications: [], unreadCount: 0 };
  }

  return { notifications: notificationsData, unreadCount: count || 0 };
}

// Kullanıcının tüm bildirimlerini okundu olarak işaretleyen fonksiyon
export async function markNotificationsAsRead() {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false); // Sadece okunmamışları güncelle

  revalidatePath("/", "layout"); // Header'ı yenilemek için
}

// Bülten için veriyi çeken fonksiyon
export async function previewNewsletter() {
  "use server";

  // DEĞİŞİKLİK: Bu fonksiyon artık HTML oluşturmuyor, sadece ham veriyi çekiyor.
  try {
    const supabaseAdmin = createAdminClient();

    const { data: newsletterData, error } = await supabaseAdmin.rpc(
      "get_weekly_newsletter_data"
    );

    if (error || !newsletterData) {
      console.error("Bülten verisi çekilirken hata:", error);
      return {
        error: "Bülten verisi oluşturulurken bir veritabanı hatası oluştu.",
      };
    }

    return { success: true, data: newsletterData };
  } catch (e) {
    console.error("previewNewsletter hatası:", e);
    return { error: "Önizleme verisi alınırken beklenmedik bir hata oluştu." };
  }
}

// Bülteni tüm kullanıcılara gönderen nihai fonksiyon
export async function sendNewsletter() {
  "use server";

  if (!process.env.SUPABASE_SERVICE_KEY || !process.env.RESEND_API_KEY) {
    return { error: "Gerekli API anahtarları yapılandırılmamış." };
  }

  const supabaseAdmin = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  // 1. Önce veriyi çekiyoruz
  const { data: newsletterData, error: dataError } = await supabaseAdmin.rpc(
    "get_weekly_newsletter_data"
  );
  if (dataError || !newsletterData) {
    return { error: "Bülten içeriği oluşturulamadı." };
  }

  // 2. E-posta gönderiminden hemen önce HTML'i sunucuda render ediyoruz.
  const htmlContent = render(
    <WeeklyNewsletterEmail newsletterData={newsletterData} />
  );

  // 3. Tüm kullanıcıların e-posta adreslerini çekiyoruz
  const { data: users, error: userError } = await supabaseAdmin
    .from("profiles")
    .select("email");

  if (userError || !users || users.length === 0) {
    return { error: "Gönderilecek kullanıcı bulunamadı." };
  }
  const recipients = users.map((u) => u.email);

  // 4. Bülteni gönderiyoruz
  try {
    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: recipients,
      subject: "AI Keşif Platformu | Haftalık Bülten",
      html: htmlContent,
    });
  } catch (emailError) {
    console.error("Bülten gönderme hatası:", emailError);
    return { error: "Bülten gönderilirken bir hata oluştu." };
  }

  return {
    success: `${recipients.length} kullanıcıya bülten başarıyla gönderildi.`,
  };
}

export async function uploadBlogImage(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const file = formData.get("image");
  if (!file || file.size === 0) {
    return { error: "Lütfen bir dosya seçin." };
  }

  // Dosya yolunu oluşturuyoruz (kullanıcı/zaman_damgası.uzantı)
  const fileExt = file.name.split(".").pop();
  const filePath = `public/${user.id}/${Date.now()}.${fileExt}`;

  // Dosyayı 'blog-images' bucket'ına yüklüyoruz
  const { error: uploadError } = await supabase.storage
    .from("blog-images")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Blog görseli yükleme hatası:", uploadError);
    return { error: "Görsel yüklenirken bir hata oluştu." };
  }

  // Yüklenen dosyanın genel URL'ini alıp geri döndürüyoruz
  const { data } = supabase.storage.from("blog-images").getPublicUrl(filePath);

  return { success: true, url: data.publicUrl };
}

export async function fetchMoreTools({ page = 1, searchParams }) {
  "use server";

  const supabase = createClient();

  const from = page * ITEMS_PER_PAGE; // Sayfa 1'den başladığı için, offset'i direkt sayfa ile çarpıyoruz
  const to = from + ITEMS_PER_PAGE - 1;

  // URL parametrelerinden tüm filtreleri alıyoruz
  const categorySlug = searchParams?.category;
  const searchText = searchParams?.search;
  const sortBy = searchParams?.sort || "newest";
  const selectedTags = searchParams?.tags
    ? searchParams.tags.split(",").map(Number)
    : [];
  const pricingModel = searchParams?.pricing;
  const selectedPlatforms = searchParams?.platforms
    ? searchParams.platforms.split(",")
    : [];

  let query = supabase
    .from("tools_with_ratings")
    .select("*") // 'count' burada gerekli değil, sadece veri çekiyoruz
    .eq("is_approved", true);

  // Tüm filtreleri sorguya uyguluyoruz
  if (categorySlug) query = query.eq("category_slug", categorySlug);
  if (searchText)
    query = query.or(
      `name.ilike.%${searchText}%,description.ilike.%${searchText}%`
    );
  if (selectedTags.length > 0) {
    const tagsToFilter = JSON.stringify(selectedTags.map((id) => ({ id })));
    query = query.contains("tags", tagsToFilter);
  }
  if (pricingModel) query = query.eq("pricing_model", pricingModel);
  if (selectedPlatforms.length > 0)
    query = query.contains("platforms", selectedPlatforms);

  switch (sortBy) {
    case "rating":
      query = query.order("average_rating", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "popularity":
      query = query.order("total_ratings", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.range(from, to);

  const { data: tools, error } = await query;

  if (error) {
    console.error("Daha fazla araç çekerken hata:", error.message);
    return []; // Hata durumunda boş bir dizi döndür
  }

  return tools;
}

// Kullanıcıyı Stripe ödeme sayfasına yönlendiren fonksiyon
export async function createCheckoutSession(formData) {
  "use server";
  console.log("--- createCheckoutSession Aksiyonu Başladı ---");

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("-> Kullanıcı bulunamadı, login sayfasına yönlendiriliyor.");
      return redirect("/login");
    }
    console.log(`-> Kullanıcı doğrulandı: ${user.email}`);

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    console.log(
      "-> Profil verisi çekildi. Mevcut Stripe Müşteri ID:",
      profile?.stripe_customer_id
    );

    const priceId = formData.get("priceId");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    console.log(`-> Fiyat ID: ${priceId}, Site URL: ${siteUrl}`);

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      console.log(
        "-> Stripe müşteri ID'si yok, yeni bir tane oluşturuluyor..."
      );
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabaseUUID: user.id },
      });
      customerId = customer.id;
      console.log("-> Yeni Stripe müşteri ID'si oluşturuldu:", customerId);

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      console.log("-> Profil, yeni Stripe müşteri ID'si ile güncellendi.");
    }

    console.log("-> Stripe ödeme oturumu oluşturuluyor...");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/uyelik`,
    });
    console.log("✅ Stripe oturumu başarıyla oluşturuldu. Yönlendiriliyor...");

    return redirect(session.url);
  } catch (error) {
    console.error("!!! createCheckoutSession HATASI:", error);
    const errorMessage = "Ödeme sayfasına yönlendirilirken bir hata oluştu.";
    return redirect(`/uyelik?message=${encodeURIComponent(errorMessage)}`);
  }
}
