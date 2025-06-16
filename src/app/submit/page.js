import { createClient } from '@/utils/supabase/server';
import SubmitForm from "@/components/SubmitForm";

// Kategorileri veritabanından çeken fonksiyon (Değişiklik yok)
async function getCategories() {
  const supabase = createClient();
  const { data } = await supabase.from("categories").select("id, name");
  return data || [];
}

export default async function SubmitPage() {
  // Sayfa yüklendiğinde kullanıcının oturum bilgisini alıyoruz
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const categories = await getCategories();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Yeni Bir AI Aracı Öner</h1>
        <p className="text-muted-foreground">Keşfettiğiniz harika bir aracı topluluğumuzla paylaşın!</p>
      </div>
      {/* Kullanıcı bilgisini forma prop olarak iletiyoruz */}
      <SubmitForm categories={categories} user={user} />
    </div>
  );
}
