// src/app/actions.js (Son Hali)

// "use server" direktifi dosyanın en başında, tek bir yerde olmalı.
"use server";

// Artık import'lar gelebilir.
import Stripe from "stripe";
//import { createClient } from "@/utils/supabase/server";
import { createClient } from '@/utils/supabase/actions';
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

const GEMINI_EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

// Bir metni, Gemini kullanarak anlamsal bir vektöre dönüştüren yardımcı fonksiyon
// DÜZELTME: Eksik olan getEmbedding yardımcı fonksiyonunu buraya ekliyoruz.
// Bu fonksiyon, bir metni, Gemini kullanarak anlamsal bir vektöre dönüştürür.
// Bu fonksiyon, bir metni, Gemini kullanarak anlamsal bir vektöre dönüştürür.
// Bir metni, Gemini kullanarak anlamsal bir vektöre dönüştüren yardımcı fonksiyon
async function getEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY bulunamadı.");
  const payload = { model: "models/text-embedding-004", content: { parts: [{ text }] } };
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(`Embedding API Hatası: ${errorBody.error?.message}`);
  }
  const result = await response.json();
  if (result.embedding?.value) return result.embedding.value;
  throw new Error("API'den geçerli bir embedding vektörü alınamadı.");
}
// async function getEmbedding(text) {
//   const apiKey = process.env.GEMINI_API_KEY;
//   if (!apiKey) throw new Error("GEMINI_API_KEY bulunamadı. Lütfen .env.local dosyanızı kontrol edin.");
//
//   const payload = {
//     model: "models/text-embedding-004",
//     content: { parts: [{ text }] }
//   };
//
//   const response = await fetch(`${GEMINI_EMBEDDING_API_URL}?key=${apiKey}`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload)
//   });
//
//   const result = await response.json();
//
//   if (!response.ok) {
//     console.error("Gemini Embedding API Hatası:", JSON.stringify(result, null, 2));
//     const errorMessage = result.error?.message || "Bilinmeyen bir API hatası.";
//     throw new Error(`Embedding API Hatası: ${errorMessage}`);
//   }
//
//   if (result.embedding?.value) {
//       return result.embedding.value;
//   } else {
//       // DÜZELTME: API'den neden vektör gelmediğini kontrol et
//       const finishReason = result.candidates?.[0]?.finishReason;
//       if (finishReason === 'SAFETY') {
//           throw new Error("İsteğiniz güvenlik politikalarını ihlal ettiği için işlenemedi.");
//       }
//       console.error("Beklenmedik API Cevabı:", JSON.stringify(result, null, 2));
//       throw new Error("API'den geçerli bir embedding vektörü alınamadı. Lütfen API yapılandırmanızı (faturalandırma, aktif API'ler) kontrol edin.");
//   }
// }

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

  const title = formData.get("title");
  // YENİ: Formdan yazının tipini alıyoruz ('Blog', 'Rehber', 'Makale')
  const type = formData.get("type");

  if (!title || !type) {
    return { error: "Yazı başlığı ve tipi zorunludur." };
  }

  const slug = slugify(title) + "-" + Date.now().toString(36);

  const { data: newPost, error } = await supabase
    .from("posts")
    .insert({
      title,
      slug,
      author_id: user.id,
      content: `# ${title}\n\nBuraya yazınızı yazmaya başlayın...`,
      type, // Yeni yazı tipini veritabanına kaydediyoruz
      status: "Taslak", // Her yeni yazı taslak olarak başlar
    })
    .select("id")
    .single();

  if (error) {
    console.error("Yazı oluşturma hatası:", error);
    return { error: "Yazı oluşturulurken bir hata oluştu." };
  }

  // DEĞİŞİKLİK: Artık her zaman tek ve doğru olan yeni editör sayfasına yönlendiriyoruz.
  redirect(`/admin/posts/${newPost.id}/edit`);
}

// Mevcut bir blog yazısını güncelleyen fonksiyon
// src/app/actions.js dosyasındaki updatePost fonksiyonunu bu kodla değiştirin.

// Mevcut updatePost fonksiyonunu, yeni 'type' alanını da içerecek şekilde güncelliyoruz.
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

  // Önce yazının mevcut durumunu veritabanından çekiyoruz
  const { data: existingPost } = await supabase
    .from("posts")
    .select("published_at")
    .eq("id", id)
    .single();

  const postData = {
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content"),
    description: formData.get("description"),
    featured_image_url: formData.get("featured_image_url"),
    status: formData.get("status"),
    type: formData.get("type"),
    category_id: formData.get("category_id")
      ? parseInt(formData.get("category_id"), 10)
      : null,
    updated_at: new Date().toISOString(),
  };

  // DEĞİŞİKLİK: Eğer yazının durumu "Yayınlandı" ise VE
  // veritabanındaki yayınlanma tarihi boş (null) ise, yayın tarihini ayarla.
  if (postData.status === "Yayınlandı" && !existingPost?.published_at) {
    postData.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("posts").update(postData).eq("id", id);

  if (error) {
    console.error("Yazı güncelleme hatası:", error);
    return { error: `Veritabanı Hatası: ${error.message}` };
  }

  revalidatePath("/admin");
  revalidatePath("/blog");
  revalidatePath(`/blog/${postData.slug}`);

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
  if (!user || user.email !== process.env.ADMIN_EMAIL)
    return { error: "Yetkiniz yok." };

  const supabaseAdmin = createAdminClient();
  const postId = formData.get("postId");
  const tagIds = formData.getAll("tagId").map((id) => parseInt(id, 10));

  if (!postId) return { error: "Yazı ID'si bulunamadı." };

  await supabaseAdmin.from("post_tags").delete().eq("post_id", postId);

  if (tagIds.length > 0) {
    const newLinks = tagIds.map((tagId) => ({
      post_id: postId,
      tag_id: tagId,
    }));
    const { error } = await supabaseAdmin.from("post_tags").insert(newLinks);
    if (error)
      return { error: "Yazı etiketleri güncellenirken bir hata oluştu." };
  }

  revalidatePath(`/admin/posts/${postId}/edit`);
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
  const type = formData.get("type"); // YENİ: Koleksiyon tipini alıyoruz

  const { error } = await supabase
    .from("collections")
    .update({
      title,
      description,
      is_public,
      type, // YENİ
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

  const supabase = createClient(); // Artık doğru istemciyi kullanıyor
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

export async function fetchMoreTools({ page = 0, searchParams }) {
  "use server";

  const supabase = createClient();
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Kullanıcının Pro olup olmadığını kontrol et
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("stripe_price_id")
        .eq("id", user.id)
        .single()
    : { data: null };
  const isProUser =
    !!profile?.stripe_price_id ||
    (user && user.email === process.env.ADMIN_EMAIL);

  // DEĞİŞİKLİK: Artık tüm karmaşık filtreleme mantığı yerine,
  // tek bir akıllı RPC fonksiyonunu çağırıyoruz.
  const { data: tools, error } = await supabase.rpc("get_public_tools", {
    p_page: page,
    p_page_size: ITEMS_PER_PAGE,
    p_search_text: searchParams?.search || null,
    p_category_slug: searchParams?.category || null,
    p_sort_by: searchParams?.sort || "newest",
    p_tags: searchParams?.tags ? searchParams.tags.split(",").map(Number) : [],
    p_pricing_model: searchParams?.pricing || null,
    p_platforms: searchParams?.platforms
      ? searchParams.platforms.split(",")
      : [],
    p_tier: searchParams?.tier || null,
    p_is_pro_user: isProUser,
  });

  if (error) {
    console.error("Araç çekerken hata:", error.message);
    return [];
  }

  return tools;
}

// YENİ: Bir varyantın "gösterim" (impression) sayısını artıran fonksiyon
export async function recordVariantImpression(variantId) {
  "use server";
  if (!variantId) return;
  const supabase = createClient();
  await supabase.rpc("increment_variant_impression", {
    p_variant_id: variantId,
  });
}

// YENİ: Bir varyantın "tıklanma" (click) sayısını artıran fonksiyon
export async function recordVariantClick(variantId) {
  "use server";
  if (!variantId) return;
  const supabase = createClient();
  await supabase.rpc("increment_variant_click", { p_variant_id: variantId });
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

export async function fetchActivityFeed() {
  "use server";

  const supabase = createClient();
  // Mevcut RPC fonksiyonumuzu çağırarak en güncel akışı alıyoruz.
  const { data, error } = await supabase.rpc("get_community_activity_feed");

  if (error) {
    console.error("Aktivite akışı yeniden çekilirken hata:", error);
    return [];
  }
  return data;
}

// Gemini kullanarak metin üreten fonksiyon
export async function generateTextWithGemini(userPrompt) {
  "use server";

  if (!userPrompt) {
    return { error: "Lütfen bir istek girin." };
  }

  try {
    const prompt = `Kullanıcının isteği: "${userPrompt}". Bu isteğe uygun, yaratıcı ve ilgi çekici bir metin oluştur.`;
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return { error: "Gemini API anahtarı bulunamadı." };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { error: "Yapay zeka modelinden hata alındı." };
    }
    const result = await response.json();

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        text: result.candidates[0].content.parts[0].text,
      };
    } else {
      return {
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }
  } catch (e) {
    console.error("Metin üretme hatası:", e);
    return { error: "Metin üretilirken beklenmedik bir hata oluştu." };
  }
}

// Imagen kullanarak görsel üreten fonksiyon
export async function generateImageWithImagen(userPrompt) {
  "use server";

  if (!userPrompt) {
    return { error: "Lütfen bir görsel tarifi girin." };
  }

  try {
    const payload = {
      instances: [{ prompt: userPrompt }],
      parameters: { sampleCount: 1 },
    };
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return { error: "Gemini/Imagen API anahtarı bulunamadı." };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // DEĞİŞİKLİK: Hata kontrolünü daha detaylı hale getiriyoruz.
    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Imagen API Hatası:", errorBody);
      // DETAYLI HATA MESAJINI İSTEMCİYE GÖNDER
      const errorMessage =
        errorBody.error?.message ||
        "Görsel üretme servisinden bilinmeyen bir hata alındı.";
      return { error: `Hata: ${errorMessage}` };
    }
    const result = await response.json();

    if (result.predictions?.[0]?.bytesBase64Encoded) {
      const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
      return { success: true, url: imageUrl };
    } else {
      return { error: "Yapay zeka modelinden bir görsel alınamadı." };
    }
  } catch (e) {
    console.error("Görsel üretme hatası:", e);
    return { error: "Görsel üretilirken beklenmedik bir hata oluştu." };
  }
}

// Yeni bir sohbet başlatan veya mevcut olanı bulan fonksiyon
export async function startConversation(recipientUserId) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login?message=Mesaj göndermek için giriş yapmalısınız.");
  }

  if (user.id === recipientUserId) {
    // Kendine mesaj göndermeyi engellemek için ana sayfaya yönlendirilebilir.
    return redirect("/");
  }

  // Veritabanında oluşturduğumuz özel RPC fonksiyonunu çağırıyoruz.
  const { data: conversationId, error } = await supabase.rpc(
    "create_or_find_conversation",
    {
      p_user1_id: user.id,
      p_user2_id: recipientUserId,
    }
  );

  if (error) {
    console.error("Sohbet başlatma hatası:", error);
    // Hata durumunda kullanıcıyı profiline geri yönlendir
    return redirect("/profile?message=Sohbet başlatılamadı.");
  }

  // Kullanıcıyı oluşturulan veya bulunan sohbetin sayfasına yönlendir
  redirect(`/mesajlar/${conversationId}`);
}

// Bir sohbete yeni bir mesaj gönderen fonksiyon
export async function sendMessage(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Mesaj göndermek için giriş yapmalısınız." };
  }

  const content = formData.get("content");
  const conversationId = formData.get("conversationId");

  if (!content || !conversationId || content.trim() === "") {
    return { error: "Mesaj içeriği boş olamaz." };
  }

  // 1. Yeni mesajı 'messages' tablosuna ekle
  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: content.trim(),
  });

  if (messageError) {
    console.error("Mesaj gönderme hatası:", messageError);
    return { error: "Mesajınız gönderilirken bir hata oluştu." };
  }

  // 2. 'conversations' tablosundaki son mesaj zamanını güncelle.
  // Bu, sohbet listesini en son aktiviteye göre sıralamamızı sağlar.
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Mesajın gönderildiği sohbet sayfasının önbelleğini temizle
  revalidatePath(`/mesajlar/${conversationId}`);
  // Ana mesajlar sayfasını da güncelle (sohbetleri yeniden sıralamak için)
  revalidatePath("/mesajlar");

  return { success: "Mesaj gönderildi." };
}

// Kullanıcıları aramak için kullanılan fonksiyon
export async function searchUsers(searchTerm) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, avatar_url")
    .or(`username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    // Kullanıcının kendi kendini bulmasını engelle
    .neq("id", user.id)
    .limit(5);

  if (error) {
    console.error("Kullanıcı arama hatası:", error);
    return [];
  }
  return data;
}

// Paylaşım menüsü için son sohbetleri getiren fonksiyon
export async function getRecentConversationsForShare() {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. ADIM: Önce, giriş yapmış kullanıcının dahil olduğu sohbetlerin ID'lerini alıyoruz.
  const { data: userConvos, error: userConvosError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (userConvosError || !userConvos || userConvos.length === 0) {
    return []; // Eğer hiç sohbeti yoksa, boş bir liste döndür.
  }

  const conversationIds = userConvos.map((c) => c.conversation_id);

  // 2. ADIM: Bu sohbet ID'lerini kullanarak, bu sohbetlerdeki DİĞER katılımcıların
  // profil bilgilerini çekiyoruz.
  const { data: otherParticipants, error: participantsError } = await supabase
    .from("conversation_participants")
    .select(
      `
            profiles (id, username, avatar_url, email),
            conversations (last_message_at)
        `
    )
    .in("conversation_id", conversationIds)
    .neq("user_id", user.id)
    // En son konuşulan kişiyi en üste getirmek için sıralama yapıyoruz
    .order("last_message_at", {
      referencedTable: "conversations",
      ascending: false,
    })
    .limit(5);

  if (participantsError) {
    console.error(
      "Son sohbetler çekilirken hata (katılımcılar):",
      participantsError
    );
    return [];
  }

  // Sadece profil bilgilerini içeren temiz bir dizi döndürüyoruz.
  return otherParticipants.map((p) => p.profiles);
}

// Bir içeriği birden fazla kullanıcıya mesaj olarak gönderen ana fonksiyon
// Bir içeriği birden fazla kullanıcıya mesaj olarak gönderen ana fonksiyon (GÜNCELLENDİ)
export async function sendMessageWithSharedContent(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user: sender },
  } = await supabase.auth.getUser();

  if (!sender) {
    return { error: "Mesaj göndermek için giriş yapmalısınız." };
  }

  const recipientIds = formData.getAll("recipients");
  const note = formData.get("note");
  const sharedContent = JSON.parse(formData.get("sharedContent"));

  if (!recipientIds || recipientIds.length === 0) {
    return { error: "Lütfen en az bir alıcı seçin." };
  }

  try {
    for (const recipientId of recipientIds) {
      // 1. Sohbeti bul veya oluştur.
      const { data: conversationId, error: convoError } = await supabase.rpc(
        "create_or_find_conversation",
        {
          p_user1_id: sender.id,
          p_user2_id: recipientId,
        }
      );

      if (convoError || !conversationId) {
        console.error("Sohbet oluşturma/bulma hatası:", convoError);
        return { error: "Sohbet odası oluşturulamadı." };
      }

      // 2. Mesajı ekle.
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: sender.id,
        content: note || null,
        shared_content: sharedContent,
      });

      if (messageError) {
        console.error("Mesaj ekleme hatası:", messageError);
        return { error: "Mesaj gönderilirken bir veritabanı hatası oluştu." };
      }

      // 3. Sohbetin son aktivite zamanını güncelle.
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      if (updateError) {
        console.error("Sohbet zamanı güncelleme hatası:", updateError);
        // Bu kritik bir hata değil, mesaj yine de gitti. Sadece logluyoruz.
      }
    }
  } catch (error) {
    console.error("Paylaşım mesajı gönderme hatası (catch):", error);
    return { error: "Mesajlar gönderilirken beklenmedik bir hata oluştu." };
  }

  // Tüm işlemler başarılı olduğunda ana mesajlar sayfasını yenile
  revalidatePath("/mesajlar");
  return { success: "İçerik başarıyla paylaşıldı!" };
}

// Bir sohbet penceresi açıldığında, o sohbetteki mesajları
// okundu olarak işaretleyen yeni bir fonksiyon.
export async function markConversationAsRead(conversationId) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !conversationId) {
    return { error: "Kullanıcı veya sohbet ID'si eksik." };
  }

  const { error } = await supabase.rpc("mark_conversation_as_read", {
    p_conversation_id: conversationId,
    p_user_id: user.id,
  });

  if (error) {
    console.error("Mesajları okundu olarak işaretleme hatası:", error);
    return { error: "Mesajlar okunmuş olarak işaretlenemedi." };
  }

  // DEĞİŞİKLİK: İşlem başarılı olduğunda, sunucu tarafında
  // doğrudan layout'un önbelleğini temizleyerek yenilenmeye zorluyoruz.
  revalidatePath("/mesajlar", "layout");

  return { success: true };
}

// Yeni bir proje oluşturan fonksiyon
export async function createProject(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const title = formData.get("title");
  if (!title) {
    return { error: "Proje başlığı boş olamaz." };
  }

  // Projeye ait benzersiz bir slug oluşturuyoruz
  const slug = slugify(title) + "-" + Date.now().toString(36);

  const { data: newProject, error } = await supabase
    .from("projects")
    .insert({ title, user_id: user.id, description: "" })
    .select("id")
    .single();

  if (error) {
    console.error("Proje oluşturma hatası:", error);
    return { error: "Proje oluşturulurken bir hata oluştu." };
  }

  // Kullanıcıyı, yeni oluşturulan projenin düzenleme sayfasına yönlendir
  redirect(`/profile/projects/${newProject.id}/edit`);
}

// Bir projenin detaylarını güncelleyen fonksiyon
export async function updateProject(formData) {
  "use server";
  const supabase = createClient();

  const id = formData.get("id");
  const title = formData.get("title");
  const description = formData.get("description");

  const { error } = await supabase
    .from("projects")
    .update({ title, description, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Proje güncelleme hatası:", error);
    return { error: "Proje güncellenirken bir hata oluştu." };
  }

  revalidatePath(`/profile/projects/${id}/edit`);
  revalidatePath("/profile");
  return { success: "Proje başarıyla güncellendi." };
}

// Bir projeyi silen fonksiyon
export async function deleteProject(formData) {
  "use server";
  const supabase = createClient();
  const id = formData.get("id");

  // RLS kuralları sayesinde kullanıcı sadece kendi projesini silebilir.
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    console.error("Proje silme hatası:", error);
    return { error: "Proje silinirken bir hata oluştu." };
  }

  // Kullanıcıyı ana profil sayfasına yönlendiriyoruz çünkü proje artık yok.
  redirect("/profile");
}

// Bir projedeki içerikleri (araç, eser, prompt) güncelleyen fonksiyon
export async function updateProjectItems(formData) {
  "use server";
  const supabase = createClient();

  const projectId = formData.get("projectId");
  // Formdan gelen tüm item'ları bir dizi olarak alıyoruz
  const items = JSON.parse(formData.get("items") || "[]"); // [{item_id: 1, item_type: 'tool'}, ...]

  if (!projectId) {
    return { error: "Proje ID'si bulunamadı." };
  }

  // 1. Önce bu projeye ait tüm mevcut içerikleri siliyoruz
  const { error: deleteError } = await supabase
    .from("project_items")
    .delete()
    .eq("project_id", projectId);

  if (deleteError) {
    console.error("Eski proje içerikleri silme hatası:", deleteError);
    return { error: "Proje güncellenirken bir hata oluştu." };
  }

  // 2. Eğer formdan seçilen yeni içerikler varsa, onları ekliyoruz
  if (items.length > 0) {
    const newItems = items.map((item) => ({
      project_id: projectId,
      item_id: item.item_id,
      item_type: item.item_type,
    }));

    const { error: insertError } = await supabase
      .from("project_items")
      .insert(newItems);

    if (insertError) {
      console.error("Yeni proje içerikleri ekleme hatası:", insertError);
      return { error: "Proje güncellenirken bir hata oluştu." };
    }
  }

  revalidatePath(`/profile/projects/${projectId}/edit`);
  return { success: "Projedeki içerikler güncellendi." };
}

// Bir projenin tüm detaylarını (içindeki araçlar, eserler, promptlar)
// AI analizi için çeken bir yardımcı fonksiyon.
async function getProjectDetailsForAI(projectId) {
  const supabase = createClient();

  // Projenin ana bilgilerini çekiyoruz
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("title, description")
    .eq("id", projectId)
    .single();

  if (projectError) throw new Error("Proje bulunamadı.");

  // Projeye eklenmiş tüm içeriklerin listesini çekiyoruz
  const { data: items, error: itemsError } = await supabase
    .from("project_items")
    .select("item_id, item_type")
    .eq("project_id", projectId);

  if (itemsError) throw new Error("Proje içerikleri çekilemedi.");

  // Farklı türdeki içeriklerin detaylarını çekmek için ID'leri grupluyoruz
  const toolIds = items
    .filter((i) => i.item_type === "tool")
    .map((i) => i.item_id);
  const showcaseIds = items
    .filter((i) => i.item_type === "showcase_item")
    .map((i) => i.item_id);
  const promptIds = items
    .filter((i) => i.item_type === "prompt")
    .map((i) => i.item_id);

  // Her bir içerik türü için veritabanından detayları çekiyoruz
  const [{ data: tools }, { data: showcaseItems }, { data: prompts }] =
    await Promise.all([
      supabase.from("tools").select("name, description").in("id", toolIds),
      supabase
        .from("showcase_items")
        .select("title, description")
        .in("id", showcaseIds),
      supabase.from("prompts").select("title, prompt_text").in("id", promptIds),
    ]);

  // Tüm verileri tek bir obje altında birleştiriyoruz
  return {
    project,
    tools: tools || [],
    showcaseItems: showcaseItems || [],
    prompts: prompts || [],
  };
}

// "AI Stratejist" analizini isteyen ana fonksiyon
//export async function getAiProjectStrategy(projectId) {
// "use server";

// if (!projectId) {
//  return { error: "Proje ID'si bulunamadı." };
//}
//
// try {
// 1. Adım: Analiz edilecek tüm proje verisini çek
//  const projectData = await getProjectDetailsForAI(projectId);

// 2. Adım: Gemini için özel ve detaylı prompt'u oluştur
//  const formattedData = `
//     Proje Başlığı: ${projectData.project.title}
//     Proje Açıklaması: ${projectData.project.description}
//
//     Kullanılan Araçlar:
//     ${projectData.tools.map((t) => `- ${t.name}: ${t.description}`).join("\n") || "Yok"}

//    Oluşturulan Eserler:
//    ${projectData.showcaseItems.map((s) => `- ${s.title}: ${s.description}`).join("\n") || "Yok"}

//    Kullanılan Prompt'lar:
//    ${projectData.prompts.map((p) => `- ${p.title}: "${p.prompt_text}"`).join("\n") || "Yok"}
// `;

//  const prompt = `
//    Sen bir proje yönetimi ve yapay zeka stratejistisin. Sana bir kullanıcının projesine eklediği araçların, eserlerin ve prompt'ların bir listesini vereceğim.

//    Proje Verileri:
//    ${formattedData}

//    Görevin: Bu verilere dayanarak, kullanıcının projesini daha da ileriye taşıması için stratejik tavsiyeler sunmaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
// `;

// 3. Adım: Gemini API'sine isteği hazırla ve gönder
//   const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
//   const payload = {
//     contents: chatHistory,
//     generationConfig: {
//       responseMimeType: "application/json",
//       responseSchema: {
//         type: "OBJECT",
//         properties: {
//           project_summary: {
//             type: "STRING",
//             description:
//               "Projenin genel amacını ve durumunu 2 cümleyle özetle.",
//           },
//           strategic_suggestions: {
//            type: "ARRAY",
//             items: { type: "STRING" },
//           description:
//              "Projenin hedefine ulaşması için 3 adet somut ve yaratıcı stratejik öneri sun.",
//          },
//          potential_tools: {
//            type: "ARRAY",
//            items: { type: "STRING" },
//            description:
//               "Bu projeye fayda sağlayabilecek, listede olmayan 2 farklı araç türü öner.",
//           },
//         },
////       },
//     },
//   };

//   const apiKey = process.env.GEMINI_API_KEY;
////   if (!apiKey) return { error: "Gemini API anahtarı bulunamadı." };
////
//    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
//
//   const response = await fetch(apiUrl, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });

//   if (!response.ok) {
//     return { error: `Yapay zeka modelinden hata alındı.` };
//  }

//  const result = await response.json();

//  if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
//   return {
//      success: true,
//     data: JSON.parse(result.candidates[0].content.parts[0].text),
//   };
//  } else {
//    return {
//      error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
//    };
//  }
//  } catch (e) {
////   console.error("AI Stratejist fonksiyonunda genel hata:", e);
//    return { error: "Analiz oluşturulurken beklenmedik bir hata oluştu." };
//  }
//}
// "AI Proje Asistanı" analizini isteyen ana fonksiyon
export async function getAiProjectStrategy(projectId) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Pro özelliği gelecekte ekleneceği için şimdilik sadece giriş kontrolü
    return { error: "Bu özelliği kullanmak için giriş yapmalısınız." };
  }

  if (!projectId) {
    return { error: "Proje ID'si bulunamadı." };
  }

  try {
    // 1. Adım: Analiz edilecek tüm proje verisini, yeni RPC fonksiyonumuzla çek
    const { data: projectData, error: projectError } = await supabase.rpc(
      "get_project_details_for_ai",
      { p_project_id: projectId }
    );

    if (projectError || !projectData) {
      throw new Error("Proje detayları veritabanından alınamadı.");
    }

    // 2. Adım: Gemini için özel ve detaylı prompt'u oluştur
    const formattedData = `
        Proje Başlığı: ${projectData.title}
        Proje Açıklaması: ${projectData.description}

        Projeye Eklenen Araçlar:
        ${projectData.tools?.map((t) => `- ${t.name}: ${t.description}`).join("\n") || "Yok"}

        Projeye Eklenen Eserler:
        ${projectData.showcase_items?.map((s) => `- ${s.title}: ${s.description}`).join("\n") || "Yok"}

        Projeye Eklenen Prompt'lar:
        ${projectData.prompts?.map((p) => `- ${p.title}: "${p.prompt_text}"`).join("\n") || "Yok"}
    `;

    const prompt = `
        Sen bir proje yönetimi ve yapay zeka stratejistisin. Sana bir kullanıcının projesine eklediği araçların, eserlerin ve prompt'ların bir listesini vereceğim. 
        
        PROJE VERİLERİ:
        ${formattedData}

        GÖREVİN: Bu verilere dayanarak, kullanıcının projesini daha da ileriye taşıması için stratejik tavsiyeler sunmaktır. Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
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
            project_summary: {
              type: "STRING",
              description:
                "Projenin genel amacını ve durumunu 2 cümleyle özetle.",
            },
            strategic_suggestions: {
              type: "ARRAY",
              items: { type: "STRING" },
              description:
                "Projenin hedefine ulaşması için 3 adet somut ve yaratıcı stratejik öneri sun.",
            },
            potential_tools: {
              type: "ARRAY",
              items: { type: "STRING" },
              description:
                "Bu projeye fayda sağlayabilecek, listede olmayan 2 farklı araç türü öner.",
            },
          },
          required: [
            "project_summary",
            "strategic_suggestions",
            "potential_tools",
          ],
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
      const errorBody = await response.json();
      return {
        error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}`,
      };
    }

    const result = await response.json();

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        data: JSON.parse(result.candidates[0].content.parts[0].text),
      };
    } else {
      return {
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }
  } catch (e) {
    console.error("AI Stratejist fonksiyonunda genel hata:", e);
    return { error: "Analiz oluşturulurken beklenmedik bir hata oluştu." };
  }
}

// "AI Co-Pilot" analizini isteyen ana fonksiyon
//"AI Co-Pilot" analizini isteyen, sohbet geçmişini hatırlayan ana fonksiyon
// "AI Co-Pilot" analizini isteyen, sohbet geçmişini hatırlayan ana fonksiyon
export async function getAdminCoPilotResponse(userPrompt, history) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Bu özelliği kullanmak için yetkiniz yok." };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data: snapshotData, error: snapshotError } =
      await supabaseAdmin.rpc("get_platform_snapshot");

    if (snapshotError)
      throw new Error(`Platform verileri alınamadı: ${snapshotError.message}`);

    const platformContext = `
        PLATFORMUN ANLIK DURUMU:
        - Toplam Kullanıcı: ${snapshotData.totals.total_users}, Toplam Araç: ${snapshotData.totals.total_tools}, Toplam Yorum: ${snapshotData.totals.total_comments}
    `;

    const chatHistory = history.map((msg) => {
      let contentText =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      return {
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: contentText }],
      };
    });

    const finalSystemPrompt = `Sen, 'AI Keşif Platformu' adlı projenin baş ürün yöneticisisin. Sana platformun anlık verilerini ve önceki konuşmalarımızı sunuyorum. Görevin, tüm bu bağlamı kullanarak, adminin sorduğu son soruya yönelik en akıllı ve uygulanabilir cevabı vermektir. Cevabını SADECE JSON formatında ver.`;

    const finalUserMessage = {
      role: "user",
      parts: [
        {
          text: `${finalSystemPrompt}\n\n${platformContext}\n\nADMİNİN YENİ SORUSU: "${userPrompt}"`,
        },
      ],
    };

    const payload = {
      contents: [...chatHistory, finalUserMessage],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            response_title: { type: "STRING" },
            response_text: {
              type: "STRING",
              description: "Adminin sorusuna doğrudan ve net bir cevap ver.",
            },
            // YENİ: AI'dan, sohbeti devam ettirecek 3 soru önerisi istiyoruz.
            follow_up_questions: {
              type: "ARRAY",
              items: { type: "STRING" },
              description:
                "Adminin bu cevaptan sonra sorabileceği 3 adet mantıklı ve ileriye dönük soru öner.",
            },
          },
          required: ["response_title", "response_text", "follow_up_questions"],
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
      const errorBody = await response.json();
      return {
        error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}`,
      };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        data: JSON.parse(result.candidates[0].content.parts[0].text),
      };
    } else {
      return {
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }
  } catch (e) {
    console.error("AI Co-Pilot fonksiyonunda genel hata:", e.message);
    return {
      error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}`,
    };
  }
}

// "Komut Paleti" için arama yapan fonksiyon
export async function runOmniSearch(query) {
  "use server";

  if (!query) {
    return [];
  }

  const supabase = createClient();
  // Daha önce oluşturduğumuz özel veritabanı fonksiyonunu çağırıyoruz
  const { data, error } = await supabase.rpc("omni_search", {
    p_search_term: query,
  });

  if (error) {
    console.error("Omni-search hatası:", error);
    return [];
  }

  return data;
}

export async function toggleFollowUser(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const targetUserId = formData.get("targetUserId");
  const targetUsername = formData.get("targetUsername");

  if (!targetUserId) {
    return { error: "Hedef kullanıcı ID'si bulunamadı." };
  }

  // Kullanıcının kendi kendini takip etmesini engelle
  if (currentUser.id === targetUserId) {
    return { error: "Kendinizi takip edemezsiniz." };
  }

  // Kullanıcının hedef kullanıcıyı zaten takip edip etmediğini kontrol et
  const { data: existingFollow, error: checkError } = await supabase
    .from("followers")
    .select("*")
    .eq("follower_id", currentUser.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (checkError) {
    console.error("Takip kontrolü hatası:", checkError);
    return { error: "İşlem sırasında bir veritabanı hatası oluştu." };
  }

  if (existingFollow) {
    // Eğer zaten takip ediyorsa, takipten çık (kaydı sil)
    const { error: unfollowError } = await supabase
      .from("followers")
      .delete()
      .match({ follower_id: currentUser.id, following_id: targetUserId });

    if (unfollowError) {
      console.error("Takipten çıkma hatası:", unfollowError);
      return { error: "Takipten çıkılırken bir hata oluştu." };
    }
  } else {
    // Eğer takip etmiyorsa, takip et (yeni kayıt ekle)
    const { error: followError } = await supabase
      .from("followers")
      .insert({ follower_id: currentUser.id, following_id: targetUserId });

    if (followError) {
      console.error("Takip etme hatası:", followError);
      return { error: "Takip edilirken bir hata oluştu." };
    }
  }

  // İlgili profil sayfasının önbelleğini temizleyerek butonun anında güncellenmesini sağla
  if (targetUsername) {
    revalidatePath(`/u/${targetUsername}`);
  }

  return { success: true };
}

// YENİ: Bir yazıya ilgili araçları atayan/kaldıran fonksiyon
// YENİ: Bir yazıya ilgili araçları atayan/kaldıran fonksiyon
// Bir yazıya ilgili araçları atayan fonksiyonu güncelliyoruz.
export async function assignToolsToPost(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL)
    return { error: "Yetkiniz yok." };

  const supabaseAdmin = createAdminClient();
  const postId = formData.get("postId");
  const toolIds = formData.getAll("toolId").map((id) => parseInt(id, 10));

  if (!postId) return { error: "Yazı ID'si bulunamadı." };

  await supabaseAdmin.from("post_tools").delete().eq("post_id", postId);

  if (toolIds.length > 0) {
    const newLinks = toolIds.map((toolId) => ({
      post_id: postId,
      tool_id: toolId,
    }));
    const { error } = await supabaseAdmin.from("post_tools").insert(newLinks);
    if (error)
      return { error: "İlişkili araçlar güncellenirken bir hata oluştu." };
  }

  revalidatePath(`/admin/posts/${postId}/edit`);
  return { success: "Yazının ilişkili araçları güncellendi." };
}

// Basit bir e-posta şablonu
const FeedbackEmail = ({ feedback, userEmail }) => (
  <div>
    <h1>Yeni Geri Bildirim Alındı</h1>
    <p>
      <strong>Gönderen:</strong> {userEmail || "Misafir Kullanıcı"}
    </p>
    <hr />
    <h2>Mesaj:</h2>
    <p style={{ whiteSpace: "pre-wrap" }}>{feedback}</p>
  </div>
);

export async function sendFeedback(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const feedback = formData.get("feedback");

  if (!feedback || feedback.trim() === "") {
    return { error: "Geri bildirim mesajı boş olamaz." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const htmlContent = render(
      <FeedbackEmail feedback={feedback} userEmail={user?.email} />
    );

    await resend.emails.send({
      from: process.env.ADMIN_NOTIF_EMAIL_FROM,
      to: process.env.ADMIN_NOTIF_EMAIL_TO,
      subject: "AI Keşif Platformu - Yeni Geri Bildirim",
      html: htmlContent,
    });
  } catch (emailError) {
    console.error("Geri bildirim gönderme hatası:", emailError);
    return { error: "Geri bildirim gönderilirken bir hata oluştu." };
  }

  return { success: "Geri bildiriminiz için teşekkürler!" };
}

// Bir kod parçasını analiz edip, iyileştirilmiş bir versiyonunu öneren fonksiyon
export async function getAiCodeReview(codeToReview) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Bu özelliği kullanmak için yetkiniz yok." };
  }

  if (!codeToReview || codeToReview.trim().length < 50) {
    return { error: "Lütfen analiz etmek için anlamlı bir kod parçası girin." };
  }

  try {
    const platformContext = `
        PROJENİN TEKNİK YAPISI:
        - Framework: Next.js (App Router)
        - Dil: JavaScript, React
        - Veritabanı: Supabase (PostgreSQL)
        - Stil: Tailwind CSS
        - UI Kütüphanesi: shadcn/ui
        - Sunucu Mantığı: Server Actions (src/app/actions.js içinde)
        - Veri Çekme: Sunucu bileşenleri veya Server Action'lar içinden Supabase istemcisi ile.
    `;

    const prompt = `
        Sen, bu projede çalışan, son derece deneyimli bir Senior Full-Stack Developer'sın. Görevin, sana verilen bir React bileşen kodunu, projenin teknik yapısını dikkate alarak analiz etmek ve iyileştirmektir.

        ${platformContext}

        ANALİZ EDİLECEK KOD:
        \`\`\`jsx
        ${codeToReview}
        \`\`\`

        YAPILACAKLAR:
        1.  Bu kodu performans, okunabilirlik, güvenlik ve en iyi pratikler açısından incele.
        2.  Bulduğun en önemli 3 iyileştirme potansiyelini listele.
        3.  Bu iyileştirmeleri uygulayarak, kodun tamamen yeniden yazılmış (refactored), daha modern ve daha sağlam halini oluştur.
        4.  Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
    `;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            analysis_title: {
              type: "STRING",
              description:
                "Kod incelemesine, içeriği yansıtan kısa bir başlık ver.",
            },
            suggestions: {
              type: "ARRAY",
              items: { type: "STRING" },
              description:
                "Bulduğun en önemli 3 iyileştirme önerisini liste halinde sun.",
            },
            refactored_code: {
              type: "STRING",
              description:
                "Önerileri uygulayarak oluşturduğun, tam ve çalıştırılabilir yeni kod.",
            },
          },
          required: ["analysis_title", "suggestions", "refactored_code"],
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
      const errorBody = await response.json();
      return {
        error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}`,
      };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        data: JSON.parse(result.candidates[0].content.parts[0].text),
      };
    } else {
      return {
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }
  } catch (e) {
    console.error("AI Kod İnceleme fonksiyonunda hata:", e.message);
    return {
      error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}`,
    };
  }
}

// Bir araç için 3 adet alternatif başlık ve açıklama üreten fonksiyon
export async function generateToolVariants(toolId) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Bu özelliği kullanmak için yetkiniz yok." };
  }

  if (!toolId) {
    return { error: "Analiz edilecek araç ID'si bulunamadı." };
  }

  try {
    // 1. Adım: Analiz edilecek aracın mevcut bilgilerini çek
    const { data: tool, error: toolError } = await supabase
      .from("tools")
      .select("name, description")
      .eq("id", toolId)
      .single();

    if (toolError) throw new Error("Araç bilgileri alınamadı.");

    // 2. Adım: Gemini için özel prompt'u oluştur
    const prompt = `
        Sen, teknoloji ürünleri için pazarlama metinleri yazma konusunda uzman bir metin yazarı (copywriter)'sın. Görevin, sana verilen bir yapay zeka aracının orijinal başlığına ve açıklamasına bakarak, kullanıcıların tıklama oranını (CTR) artıracak, daha dikkat çekici ve fayda odaklı 3 adet alternatif başlık ve açıklama çifti üretmektir.

        ORİJİNAL İÇERİK:
        - Başlık: "${tool.name}"
        - Açıklama: "${tool.description}"

        Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
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
            variants: {
              type: "ARRAY",
              description: "3 adet başlık ve açıklama çifti içeren bir dizi.",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  description: { type: "STRING" },
                },
                required: ["title", "description"],
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
      const errorBody = await response.json();
      return {
        error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}`,
      };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const parsedResult = JSON.parse(
        result.candidates[0].content.parts[0].text
      );
      return { success: true, data: parsedResult.variants };
    } else {
      return {
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }
  } catch (e) {
    console.error("AI Varyant Üretme fonksiyonunda hata:", e.message);
    return {
      error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}`,
    };
  }
}
// Bir aracın başlık/açıklama varyantlarını güncelleyen fonksiyon
export async function updateToolVariants(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const toolId = formData.get("toolId");
  // Formdan gelen tüm varyantları JSON olarak alıp ayrıştırıyoruz
  const variants = JSON.parse(formData.get("variants") || "[]");

  if (!toolId) {
    return { error: "Araç ID'si bulunamadı." };
  }

  const supabaseAdmin = createAdminClient();

  // 1. Önce, bu araca ait olan, orijinal OLMAYAN tüm eski varyantları siliyoruz.
  // Bu, temiz bir başlangıç yapmamızı sağlar.
  const { error: deleteError } = await supabaseAdmin
    .from("tool_variants")
    .delete()
    .eq("tool_id", toolId)
    .eq("is_original", false);

  if (deleteError) {
    console.error("Eski varyantları silme hatası:", deleteError);
    return { error: "Varyantlar güncellenirken bir hata oluştu." };
  }

  // 2. Eğer gönderilen yeni varyantlar varsa, onları ekliyoruz.
  if (variants.length > 0) {
    const variantsToInsert = variants.map((v) => ({
      tool_id: toolId,
      title: v.title,
      description: v.description,
      is_active: v.is_active,
      is_original: false, // Bunlar asla orijinal olamaz
    }));

    const { error: insertError } = await supabaseAdmin
      .from("tool_variants")
      .insert(variantsToInsert);

    if (insertError) {
      console.error("Yeni varyantları ekleme hatası:", insertError);
      return { error: "Varyantlar güncellenirken bir hata oluştu." };
    }
  }

  revalidatePath("/admin");
  return { success: "Araç varyantları başarıyla güncellendi." };
}

// Yeni bir ödül ilanı oluşturan fonksiyon
export async function createBounty(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Bu işlem için giriş yapmalısınız." };
  }

  const title = formData.get("title");
  const description = formData.get("description");
  const reward = parseInt(formData.get("reward"), 10);

  if (!title || !reward || reward <= 0) {
    return { error: "Başlık ve geçerli bir ödül puanı zorunludur." };
  }

  // DEĞİŞİKLİK: Kullanıcının admin olup olmadığını kontrol ediyoruz.
  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  // Kullanıcının yeterli puanı olup olmadığını kontrol et (adminler hariç)
  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("reputation_points")
      .eq("id", user.id)
      .single();
    if (!profile || profile.reputation_points < reward) {
      return { error: "Bu ödülü oluşturmak için yeterli itibar puanınız yok." };
    }
  }

  const { data: newBounty, error } = await supabase
    .from("bounties")
    .insert({ title, description, reputation_reward: reward, user_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.error("Ödül oluşturma hatası:", error);
    return { error: "Ödül ilanı oluşturulurken bir hata oluştu." };
  }

  revalidatePath("/odul-avciligi");
  return { success: "Ödül ilanı başarıyla oluşturuldu!" };
}

// ... (diğer fonksiyonlarınız aynı kalıyor)

// Bir ödüle araç öneren fonksiyon
export async function submitToBounty(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Öneri yapmak için giriş yapmalısınız." };

  const bountyId = formData.get("bountyId");
  const toolId = formData.get("toolId");
  const notes = formData.get("notes");

  if (!bountyId || !toolId) return { error: "Gerekli bilgiler eksik." };

  const { error } = await supabase.from("bounty_submissions").insert({
    bounty_id: bountyId,
    tool_id: toolId,
    user_id: user.id,
    notes,
  });

  if (error) {
    // DEĞİŞİKLİK: Veritabanından '23505' (unique_violation) hatası geldiğinde,
    // artık bunun doğru sebebini kullanıcıya gösteriyoruz.
    if (error.code === "23505") {
      return { error: "Bu araç bu ödüle zaten önerilmiş." };
    }
    console.error("Öneri gönderme hatası:", error);
    return { error: "Öneri gönderilirken bir hata oluştu." };
  }

  revalidatePath(`/odul-avciligi/${bountyId}`);
  return { success: "Öneriniz başarıyla gönderildi." };
}

// Bir öneriyi kazanan olarak seçen fonksiyon
export async function acceptBountySubmission(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Bu işlem için giriş yapmalısınız." };

  const submissionId = formData.get("submissionId");
  if (!submissionId) return { error: "Öneri ID'si bulunamadı." };

  // Veritabanında oluşturduğumuz akıllı RPC fonksiyonunu çağırıyoruz
  const { error } = await supabase.rpc("accept_bounty_submission", {
    p_submission_id: submissionId,
    p_bounty_creator_id: user.id,
  });

  if (error) {
    console.error("Öneri kabul etme hatası:", error);
    return { error: error.message }; // Veritabanından gelen net hata mesajını göster
  }

  revalidatePath("/odul-avciligi");
  return { success: "Kazanan öneri seçildi ve ödül dağıtıldı!" };
}

// Yeni bir lansman gönderen fonksiyon
export async function submitLaunch(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Lansman yapmak için giriş yapmalısınız." };
  }

  const toolId = formData.get("toolId");
  const tagline = formData.get("tagline");
  const galleryImages = formData.getAll("galleryImages");

  if (!toolId || !tagline) {
    return { error: "Araç seçimi ve slogan zorunludur." };
  }

  // 1. Galeri görsellerini Supabase Storage'a yükle
  const imageUrls = [];
  for (const imageFile of galleryImages) {
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `${user.id}/launches/${toolId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("launch-gallery-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error("Lansman görseli yükleme hatası:", uploadError);
        return { error: "Görseller yüklenirken bir hata oluştu." };
      }

      const { data } = supabase.storage
        .from("launch-gallery-images")
        .getPublicUrl(filePath);
      imageUrls.push(data.publicUrl);
    }
  }

  // 2. Lansman bilgilerini veritabanına kaydet
  const { data: newLaunch, error: insertError } = await supabase
    .from("launches")
    .insert({
      tool_id: toolId,
      user_id: user.id,
      tagline,
      description: formData.get("description"),
      gallery_image_urls: imageUrls,
      youtube_video_url: formData.get("youtube_video_url"),
      is_approved: false, // Lansmanlar da admin onayı bekleyecek
      vote_count: 1, // Kendi oyuyla başlar
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Lansman kaydetme hatası:", insertError);
    return { error: "Lansmanınız kaydedilirken bir hata oluştu." };
  }

  // Lansmanı yapan kullanıcının, bu lansmanı otomatik olarak oylamasını sağlıyoruz.
  await supabase
    .from("launch_votes")
    .insert({ launch_id: newLaunch.id, user_id: user.id });

  revalidatePath("/launchpad");
  return {
    success:
      "Lansmanınız başarıyla gönderildi! Onaylandıktan sonra yayınlanacaktır.",
  };
}

// Bir lansmanı oylayan/oyunu geri alan fonksiyon
export async function toggleLaunchVote(formData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Oylama yapmak için giriş yapmalısınız." };

  const launchId = formData.get("launchId");
  if (!launchId) return { error: "Lansman ID'si bulunamadı." };

  const { data: existingVote } = await supabase
    .from("launch_votes")
    .select("launch_id")
    .eq("user_id", user.id)
    .eq("launch_id", launchId)
    .maybeSingle();

  if (existingVote) {
    await supabase
      .from("launch_votes")
      .delete()
      .match({ user_id: user.id, launch_id: launchId });
    await supabase.rpc("decrement_launch_vote", { p_launch_id: launchId });
  } else {
    await supabase
      .from("launch_votes")
      .insert({ user_id: user.id, launch_id: launchId });
    await supabase.rpc("increment_launch_vote", { p_launch_id: launchId });
  }

  revalidatePath("/launchpad");
  return { success: true };
}

// YENİ: Bir metni Gemini'nin embedding modelini kullanarak vektöre dönüştüren fonksiyon
async function getEmbeddingForText(text) {
  "use server";
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API anahtarı bulunamadı.");

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const payload = {
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Embedding API Hatası:", await response.text());
      throw new Error("Embedding oluşturulamadı.");
    }

    const result = await response.json();
    return result.embedding.value;
  } catch (error) {
    console.error("Embedding hatası:", error);
    return null;
  }
}

// Bir araç için 3 adet alternatif başlık ve açıklama üreten fonksiyon
//export async function generateToolVariants(toolId) {
//"use server";

//const supabase = createClient();
//const { data: { user } } = await supabase.auth.getUser();
//if (!user || user.email !== process.env.ADMIN_EMAIL) {
// return { error: "Bu özelliği kullanmak için yetkiniz yok." };
//}

//if (!toolId) {
// return { error: "Analiz edilecek araç ID'si bulunamadı." };
//}

//try {
// 1. Adım: Analiz edilecek aracın mevcut bilgilerini çek
//const { data: tool, error: toolError } = await supabase
//    .from('tools')
//    .select('name, description')
//    .eq('id', toolId)
//    .single();

// if (toolError) throw new Error("Araç bilgileri alınamadı.");

// 2. Adım: Gemini için özel prompt'u oluştur
// const prompt = `
//Sen, teknoloji ürünleri için pazarlama metinleri yazma konusunda uzman bir metin yazarı (copywriter)'sın. Görevin, sana verilen bir yapay zeka aracının orijinal başlığına ve açıklamasına bakarak, kullanıcıların tıklama oranını (CTR) artıracak, daha dikkat çekici ve fayda odaklı 3 adet alternatif başlık ve açıklama çifti üretmektir.

// ORİJİNAL İÇERİK:
// - Başlık: "${tool.name}"
// - Açıklama: "${tool.description}"

// Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme.
//  `;

// 3. Adım: Gemini API'sine isteği hazırla ve gönder
//  const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
//  const payload = {
//     contents: chatHistory,
//    generationConfig: {
//       responseMimeType: "application/json",
//     responseSchema: {
//      type: "OBJECT",
//      properties: {
//         "variants": {
//             "type": "ARRAY",
//            "description": "3 adet başlık ve açıklama çifti içeren bir dizi.",
//            "items": {
//                "type": "OBJECT",
//                "properties": {
//                     "title": { "type": "STRING" },
//                     "description": { "type": "STRING" }
//                },
//                "required": ["title", "description"]
//            }
//        }
//     }
//    }
//   }
//  };

//const apiKey = process.env.GEMINI_API_KEY;
// if (!apiKey) return { error: "Gemini API anahtarı bulunamadı." };

// const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

//  const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

//  if (!response.ok) {
//     const errorBody = await response.json();
//    return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
// }

// const result = await response.json();
//  if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
//      const parsedResult = JSON.parse(result.candidates[0].content.parts[0].text);
//     return { success: true, data: parsedResult.variants };
// } else {
//     return { error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı." };
// }

//} catch (e) {
//  console.error("AI Varyant Üretme fonksiyonunda hata:", e.message);
//  return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
// }
//}

// Belirli bir kategori için AI ile yeni araçlar üreten ve onaya sunan fonksiyon
export async function generateToolsWithAi(formData) {
  "use server";

  const supabase = createClient(); // Artık doğru istemciyi kullanıyor
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Bu özelliği kullanmak için yetkiniz yok." };
  }

  const categoryId = formData.get("categoryId");
  const categoryName = formData.get("categoryName");

  if (!categoryId || !categoryName) {
    return { error: "Lütfen bir kategori seçin." };
  }

  try {
    // 1. Adım: Gemini için özel prompt'u oluştur
    const prompt = `
        Sen, yapay zeka araçları konusunda uzman bir teknoloji araştırmacısısın. Görevin, sana verilen kategori için, internetteki en popüler ve GERÇEK 10 adet yapay zeka aracını bulmaktır. Her araç için kısa, dikkat çekici bir açıklama (description) ve aracın resmi web sitesinin linkini (link) bulmalısın.

        KATEGORİ: "${categoryName}"

        Cevabını SADECE aşağıdaki JSON formatında ver. Başka hiçbir metin veya açıklama ekleme. Linklerin geçerli ve çalışır olduğundan emin ol.
    `;

    // 2. Adım: Gemini API'sine isteği hazırla ve gönder
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            tools: {
              type: "ARRAY",
              description: "Bulunan 10 adet araç.",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  description: { type: "STRING" },
                  link: { type: "STRING" },
                },
                required: ["name", "description", "link"],
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
      return { error: `Yapay zeka modelinden hata alındı.` };
    }

    const result = await response.json();
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı.",
      };
    }

    const generatedTools = JSON.parse(
      result.candidates[0].content.parts[0].text
    ).tools;

    // 3. Adım: Akıllı Veritabanı Entegrasyonu
    const supabaseAdmin = createAdminClient();
    const { data: existingTools } = await supabaseAdmin
      .from("tools")
      .select("name, link");
    const existingNames = new Set(
      existingTools.map((t) => t.name.toLowerCase())
    );
    const existingLinks = new Set(existingTools.map((t) => t.link));

    const newToolsToInsert = generatedTools.filter(
      (tool) =>
        !existingNames.has(tool.name.toLowerCase()) &&
        !existingLinks.has(tool.link)
    );

    if (newToolsToInsert.length > 0) {
      const toolsWithSlug = newToolsToInsert.map((tool) => ({
        name: tool.name,
        description: tool.description,
        link: tool.link,
        slug: tool.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
        is_approved: false,
        suggester_email: `ai-factory@${categoryName.toLowerCase()}.com`,
        category_id: categoryId,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("tools")
        .insert(toolsWithSlug);
      if (insertError) throw insertError;
    }

    revalidatePath("/admin");
    return { success: true, count: newToolsToInsert.length };
  } catch (e) {
    console.error("AI Araç Üretme fonksiyonunda hata:", e.message);
    return { error: `Araçlar üretilirken beklenmedik bir hata oluştu.` };
  }
}

// Bir varyantı "kazanan" olarak uygulayan fonksiyon
export async function applyWinningVariant(formData) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Yetkiniz yok." };
  }

  const toolId = formData.get("toolId");
  const newTitle = formData.get("newTitle");
  const newDescription = formData.get("newDescription");

  if (!toolId || !newTitle || !newDescription) {
    return { error: "Gerekli bilgiler eksik." };
  }

  const supabaseAdmin = createAdminClient();

  // 1. Ana 'tools' tablosunu, kazanan varyantın bilgileriyle güncelle
  const { error: updateError } = await supabaseAdmin
    .from("tools")
    .update({ name: newTitle, description: newDescription })
    .eq("id", toolId);

  if (updateError) {
    console.error("Kazanan varyant uygulanırken hata:", updateError);
    return { error: "Araç güncellenirken bir hata oluştu." };
  }

  // 2. Testi sonlandırmak için, bu araca ait tüm A/B testi varyantlarını sil
  // (Orijinal varyantın silinmemesi için bir kural eklenebilir, şimdilik hepsi siliniyor)
  await supabaseAdmin
    .from("tool_variants")
    .delete()
    .eq("tool_id", toolId)
    .eq("is_original", false);

  revalidatePath("/admin");
  return {
    success: "Kazanan varyant başarıyla uygulandı ve test sonlandırıldı.",
  };
}

// Karşılama Asistanı sohbetini yöneten ana fonksiyon
// Karşılama Asistanı sohbetini yöneten ana fonksiyon
export async function handleOnboardingStep(history, userAnswer) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bu işlem için giriş yapmalısınız." };

  try {
    const { data: categories } = await supabase
      .from("categories")
      .select("name");
    const categoryList = categories.map((c) => c.name).join(", ");

    const systemPrompt = `
        Sen, 'AI Keşif Platformu'na yeni katılmış bir kullanıcıyı karşılayan, samimi ve yardımcı bir AI asistanısın. Görevin, kullanıcıya sorular sorarak ilgi alanlarını öğrenmek ve bu bilgilere göre onun platform deneyimini kişiselleştirmektir. Kısa ve net cevaplar ver.

        Sohbet Akışı:
        1.  Kullanıcıya hoş geldin de ve amacını anlat.
        2.  Ona şu kategorilerden hangileriyle ilgilendiğini sor: ${categoryList}.
        3.  Cevabına göre, teşekkür et ve onun için platformu kişiselleştireceğini söyle.
        4.  Son olarak, sohbete "complete" anahtar kelimesini içeren bir JSON cevabı ile son ver.

        KULLANICI İLE ÖNCEKİ KONUŞMA:
        ${JSON.stringify(history)}

        KULLANICININ YENİ CEVABI: "${userAnswer}"

        Şimdi, bu bağlama göre bir sonraki cevabını, SADECE aşağıdaki JSON formatında ver:
    `;

    const chatHistory = [{ role: "user", parts: [{ text: systemPrompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            response_text: { type: "STRING" },
            action: {
              type: "STRING",
              description: "'complete' veya 'continue'",
            },
          },
          required: ["response_text", "action"],
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

    if (!response.ok) return { error: `Yapay zeka modelinden hata alındı.` };

    const result = await response.json();
    const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text);

    // Eğer AI sohbetin bittiğini söylerse, kullanıcının profilini güncelle
    if (aiResponse.action === "complete") {
      const supabaseAdmin = createAdminClient();
      // DEĞİŞİKLİK: Hata kontrolü eklendi
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);

      if (updateError) {
        console.error("Onboarding tamamlama hatası:", updateError);
        // Hata durumunda, istemciye net bir mesaj gönder
        return {
          error:
            "Profiliniz güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        };
      }
      revalidatePath("/");
    }

    return { success: true, data: aiResponse };
  } catch (e) {
    console.error("Onboarding Asistanı hatası:", e.message);
    return { error: `Bir hata oluştu: ${e.message}` };
  }
}

// Bir kullanıcının push bildirim aboneliğini kaydeden fonksiyon
export async function savePushSubscription(subscriptionJSON) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kullanıcı bulunamadı." };

  // DEĞİŞİKLİK: Fonksiyon artık karmaşık bir obje değil,
  // basit bir JSON objesi ('subscriptionJSON') alıyor.
  const { error: upsertError } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        subscription: subscriptionJSON, // Bu JSON objesini doğrudan veritabanına kaydediyoruz.
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("Push aboneliği kaydetme hatası:", upsertError);
    return { error: "Abonelik kaydedilemedi." };
  }

  // Kullanıcının profilindeki ayarı 'true' olarak güncelle
  await supabase
    .from("profiles")
    .update({ wants_push_notifications: true })
    .eq("id", user.id);

  revalidatePath("/profile");
  return { success: true };
}

// deletePushSubscription fonksiyonunda değişiklik yok.

// Bir kullanıcının push bildirim aboneliğini silen fonksiyon
export async function deletePushSubscription() {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Kullanıcı bulunamadı." };

  // 1. Aboneliği 'push_subscriptions' tablosundan sil
  await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

  // 2. Kullanıcının profilindeki ayarı 'false' olarak güncelle
  await supabase
    .from("profiles")
    .update({ wants_push_notifications: false })
    .eq("id", user.id);

  revalidatePath("/profile");
  return { success: true };
}

// Sesli Agent'ın beyni olan ana fonksiyon
export async function getVoiceAgentResponse(userQuery) {
  "use server";

  if (!userQuery) {
    return { error: "Sorgu boş olamaz." };
  }

  try {
    const supabase = createClient();
    
    // 1. ADIM: Kullanıcının sorgusunu bir "anlam vektörüne" dönüştür
    const queryEmbedding = await getEmbedding(userQuery);
    
    // 2. ADIM: Bu vektörü kullanarak, veritabanından AI için gerekli tüm "hafızayı" (bağlamı) çek
    const { data: context, error: contextError } = await supabase.rpc('get_context_for_voice_agent', {
        query_embedding: queryEmbedding
    });

    if (contextError) throw contextError;

    // 3. ADIM (Augmentation): Gemini için, bulduğumuz bu verilerle zenginleştirilmiş özel bir prompt oluştur
    const formattedContext = `
        Platform İstatistikleri: ${JSON.stringify(context.platform_stats)}
        Kullanıcının Sorusuyla En Alakalı Araçlar: ${JSON.stringify(context.relevant_tools)}
    `;

    const prompt = `
        Sen, 'AI Keşif Platformu'nun her şeyini bilen, son derece bilgili ve samimi sesli yardımcı asistanısın. Görevin, sana sunulan bağlamı (platform istatistikleri ve kullanıcının sorusuyla en alakalı araçlar) kullanarak, kullanıcının sorduğu soruya kısa, doğal ve akıcı bir dille sesli olarak cevap vermektir. Eğer kullanıcı "ChatGPT" gibi spesifik bir araç soruyorsa ve bu araç "En Alakalı Araçlar" listesinde görünmüyorsa, bunun yerine ona en yakın alternatifleri öner. Asla "bilmiyorum" deme, her zaman yardımcı olmaya çalış.

        SAĞLANAN BAĞLAM:
        ${formattedContext}

        KULLANICININ SORUSU:
        "${userQuery}"

        Şimdi, bu bilgilere dayanarak kullanıcıya sesli olarak okunacak cevabını oluştur.
    `;

    // 4. ADIM (Generation): Gemini API'sine isteği gönder
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: "Gemini API anahtarı bulunamadı." };
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.json();
        return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return { success: true, text: result.candidates[0].content.parts[0].text };
    } else {
        return { error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı." };
    }

  } catch (e) {
    console.error("Sesli Agent fonksiyonunda hata:", e.message);
    return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
  }
}
// Bir aracın başlık/açıklama varyantlarını AI ile üreten fonksiyon

// "Sesli Agent v2.0"ın beyni olan, gelişmiş sunucu fonksiyonu
// "Sesli Agent v2.0"ın beyni olan, gelişmiş sunucu fonksiyonu
// "Sesli Agent v2.0"ın beyni olan, gelişmiş sunucu fonksiyonu
export async function getAdvancedVoiceAgentResponse(userQuery, history) {
  "use server";

  if (!userQuery) {
    return { error: "Sorgu boş olamaz." };
  }

  try {
    const supabase = createClient();
    
    // 1. ADIM: Kullanıcının sorgusunu bir "anlam vektörüne" dönüştür
    const queryEmbedding = await getEmbedding(userQuery);
    
    // 2. ADIM: Veritabanından AI için gerekli tüm "hafızayı" (bağlamı) çek
    const { data: context, error: contextError } = await supabase.rpc('get_full_context_for_ai', {
        p_query_text: userQuery,
        p_query_embedding: queryEmbedding
    });

    if (contextError) throw contextError;

    // 3. ADIM (Augmentation): Gemini için zenginleştirilmiş prompt oluştur
    const formattedContext = `
        Kullanıcının Sorusuyla İlgili Platform Verileri:
        - Anlamsal Olarak Benzer Araçlar: ${JSON.stringify(context.semantic_tools)}
        - Anahtar Kelime Eşleşmesiyle Bulunan Araç: ${JSON.stringify(context.exact_match_tool)}
        - İlgili Blog Yazıları/Rehberler: ${JSON.stringify(context.relevant_posts)}
    `;

    const prompt = `
        Sen, 'AI Keşif Platformu'nun baş konsiyerjisin. Görevin, sana sunulan platform verilerini ve kullanıcıyla olan konuşma geçmişini sentezleyerek, kullanıcının sorduğu son soruya yönelik en akıllı, en yardımcı ve en insancıl cevabı vermektir. Cevabın, kullanıcıya hem sesli olarak okunacak bir metin hem de görsel olarak gösterilecek tıklanabilir içerik önerileri içermelidir.

        SAĞLANAN BAĞLAM:
        ${formattedContext}

        KULLANICI İLE ÖNCEKİ KONUŞMA:
        ${JSON.stringify(history)}

        KULLANICININ YENİ SORUSU:
        "${userQuery}"

        Şimdi, bu bilgilere dayanarak cevabını SADECE aşağıdaki JSON formatında oluştur:
    `;

    // 4. ADIM (Generation): Gemini API'sine isteği gönder
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "spoken_response": { "type": "STRING" },
                    "suggested_content": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "type": { "type": "STRING" },
                                "title": { "type": "STRING" },
                                "url": { "type": "STRING" }
                            }
                        }
                    }
                },
                required: ["spoken_response"]
            }
        }
    };
    
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (!response.ok) {
        const errorBody = await response.json();
        return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return { success: true, data: JSON.parse(result.candidates[0].content.parts[0].text) };
    } else {
        return { error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı." };
    }

  } catch (e) {
    console.error("Gelişmiş Sesli Agent fonksiyonunda hata:", e.message);
    return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
  }
}
// "AI Konsiyerj"in beyni olan, gelişmiş sunucu fonksiyonu
export async function getAiConciergeResponse(userQuery, history) {
  "use server";
  if (!userQuery) return { error: "Sorgu boş olamaz." };

  try {
    const supabase = createClient();
    const queryEmbedding = await getEmbedding(userQuery);
    const { data: context, error: contextError } = await supabase.rpc('get_full_context_for_ai', {
        p_query_text: userQuery,
        p_query_embedding: queryEmbedding
    });
    if (contextError) throw contextError;

    const formattedContext = `
        Kullanıcının Sorusuyla İlgili Platform Verileri:
        - Anlamsal Olarak Benzer Araçlar: ${JSON.stringify(context.semantic_tools)}
        - Anahtar Kelime Eşleşmesiyle Bulunan Araç: ${JSON.stringify(context.exact_match_tool)}
        - İlgili Blog Yazıları/Rehberler: ${JSON.stringify(context.relevant_posts)}
    `;

    const prompt = `
        Sen, 'AI Keşif Platformu'nun baş konsiyerjisin. Görevin, sana sunulan platform verilerini ve kullanıcıyla olan konuşma geçmişini sentezleyerek, kullanıcının sorduğu son soruya yönelik en akıllı ve en yardımcı cevabı vermektir. Cevabın, kullanıcıya hem okunacak bir metin hem de görsel olarak gösterilecek tıklanabilir içerik önerileri içermelidir.

        SAĞLANAN BAĞLAM: ${formattedContext}
        ÖNCEKİ KONUŞMA: ${JSON.stringify(history)}
        KULLANICININ YENİ SORUSU: "${userQuery}"

        Şimdi, bu bilgilere dayanarak cevabını SADECE aşağıdaki JSON formatında oluştur:
    `;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "spoken_response": { "type": "STRING" },
                    "suggested_content": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": { "type": { "type": "STRING" }, "title": { "type": "STRING" }, "url": { "type": "STRING" } }
                        }
                    }
                },
                required: ["spoken_response"]
            }
        }
    };
    
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (!response.ok) {
        const errorBody = await response.json();
        return { error: `Yapay zeka modelinden hata alındı: ${errorBody.error?.message}` };
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return { success: true, data: JSON.parse(result.candidates[0].content.parts[0].text) };
    } else {
        return { error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı." };
    }
  } catch (e) {
    console.error("AI Konsiyerj fonksiyonunda hata:", e.message);
    return { error: `Analiz oluşturulurken beklenmedik bir hata oluştu: ${e.message}` };
  }
}


// Bir kullanıcının, kendi eserlerinden birini aktif yarışmaya göndermesini sağlar.
export async function submitToShowcaseChallenge(formData) {
  "use server";

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Bu işlem için giriş yapmalısınız." };

  const showcaseItemId = formData.get("showcaseItemId");
  const challengeId = formData.get("challengeId");

  if (!showcaseItemId || !challengeId) {
    return { error: "Gerekli bilgiler eksik." };
  }

  const { error } = await supabase.from("challenge_submissions").insert({
    challenge_id: challengeId,
    showcase_item_id: showcaseItemId,
    user_id: user.id
  });

  if (error) {
    if (error.code === '23505') return { error: "Bu eseri bu yarışmaya zaten göndermişsiniz." };
    console.error("Yarışmaya eser gönderme hatası:", error);
    return { error: "Eser gönderilirken bir hata oluştu." };
  }

  revalidatePath('/yarisma');
  return { success: "Eseriniz başarıyla yarışmaya gönderildi!" };
}

// Bir yarışma gönderisini oylayan/oyunu geri alan fonksiyon
export async function toggleChallengeVote(formData) {
    "use server";
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Oylama yapmak için giriş yapmalısınız." };

    const submissionId = formData.get("submissionId");
    if (!submissionId) return { error: "Gönderim ID'si bulunamadı." };

    const { data: existingVote } = await supabase
        .from("challenge_submission_votes")
        .select('submission_id')
        .eq("user_id", user.id)
        .eq("submission_id", submissionId)
        .maybeSingle();

    if (existingVote) {
        // Oy varsa, sil (tetikleyici sayacı otomatik olarak azaltacak)
        await supabase.from("challenge_submission_votes").delete().match({ user_id: user.id, submission_id: submissionId });
    } else {
        // Oy yoksa, ekle (tetikleyici sayacı otomatik olarak artıracak)
        await supabase.from("challenge_submission_votes").insert({ user_id: user.id, submission_id: submissionId });
    }

    revalidatePath('/yarisma');
    return { success: true };
}

// Adminin manuel olarak yeni bir yarışma oluşturmasını sağlayan fonksiyon
export async function createChallengeManually(formData) {
  "use server";
  
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { error: "Bu işlem için yetkiniz yok." };
  }

  const title = formData.get("title");
  const description = formData.get("description");
  const startDate = formData.get("start_date");
  const endDate = formData.get("end_date");

  if (!title || !startDate || !endDate) {
    return { error: "Başlık, başlangıç ve bitiş tarihleri zorunludur." };
  }

  const { error } = await supabase
    .from("challenges")
    .insert({
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      status: 'Aktif'
    });

  if (error) {
    console.error("Manuel yarışma oluşturma hatası:", error);
    return { error: "Yarışma oluşturulurken bir hata oluştu." };
  }

  revalidatePath('/admin');
  revalidatePath('/yarisma');
  return { success: "Yeni yarışma başarıyla oluşturuldu!" };
}


// Belirli bir konu hakkında AI'dan yarışma fikirleri üreten fonksiyon
export async function generateChallengeIdeasWithAi(topic) {
    "use server";
    if (!topic) return { error: "Lütfen bir konu girin." };

    try {
        const prompt = `
            Sen, yapay zeka ile içerik üreten bir topluluk için YARIŞMA TEMALARI üreten bir yaratıcılık asistanısın. Sana verilen konuya dayanarak, kullanıcıları heyecanlandıracak ve katılıma teşvik edecek, 1 adet dikkat çekici başlık (title) ve 1 adet ilham verici kısa açıklama (description) üret.

            ANA KONU: "${topic}"

            Cevabını SADECE aşağıdaki JSON formatında ver.
        `;

        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = {
            contents: chatHistory,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "title": { "type": "STRING" },
                        "description": { "type": "STRING" }
                    },
                    required: ["title", "description"]
                }
            }
        };

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return { error: "Gemini API anahtarı bulunamadı." };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (!response.ok) return { error: `Yapay zeka modelinden hata alındı.` };

        const result = await response.json();
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return { success: true, data: JSON.parse(result.candidates[0].content.parts[0].text) };
        } else {
            return { error: "Yapay zeka modelinden beklenen formatta bir cevap alınamadı." };
        }
    } catch (e) {
        console.error("Yarışma fikri üretme hatası:", e.message);
        return { error: `Bir hata oluştu.` };
    }
}
