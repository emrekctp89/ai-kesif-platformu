// src/app/submit/page.js

import { supabase } from "@/lib/supabaseClient";
import SubmitForm from "@/components/SubmitForm";

// Kategorileri veritabanından çekelim ki formda listeleyebilelim
async function getCategories() {
  const { data } = await supabase.from("categories").select("id, name");
  return data || [];
}

export default async function SubmitPage() {
  const categories = await getCategories();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Yeni Araç Öner</h1>
      {/* Form component'ini burada gösteriyoruz ve kategorileri prop olarak iletiyoruz */}
      <SubmitForm categories={categories} />
    </div>
  );
}