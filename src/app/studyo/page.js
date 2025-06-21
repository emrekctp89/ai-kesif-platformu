import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { StudioClient } from "@/components/StudioClient"; // Yeni Client Component'imizi import ediyoruz

export const metadata = {
  title: "AI İçerik Stüdyosu | AI Keşif Platformu",
  description:
    "Yapay zeka modellerini kullanarak kendi metinlerinizi ve görsellerinizi yaratın.",
};

export default async function StudioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Bu sayfayı sadece giriş yapmış kullanıcılar görebilir.
  if (!user) {
    redirect("/login?message=AI Stüdyosunu kullanmak için giriş yapmalısınız.");
  }

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          AI İçerik Stüdyosu
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Yaratıcılığınızı serbest bırakın. Fikirlerinizi metinlere ve
          görsellere dönüştürün.
        </p>
      </div>
      <StudioClient />
    </div>
  );
}
