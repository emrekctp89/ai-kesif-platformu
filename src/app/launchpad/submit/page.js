import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { LaunchForm } from "@/components/LaunchForm";

// Kullanıcının, daha önce lansmanını yapmadığı, onaylanmış araçlarını çeken fonksiyon
async function getLaunchableTools(userId) {
  const supabase = createClient();

  // DEĞİŞİKLİK: 'launches' tablosunda zaten var olan tool_id'leri bir alt sorguyla buluyoruz.
  const { data: launchedToolIds, error: launchedError } = await supabase
    .from("launches")
    .select("tool_id");

  if (launchedError) {
    console.error("Lansmanı yapılmış araçlar çekilirken hata:", launchedError);
    return [];
  }

  // Bu ID'leri bir diziye dönüştürüyoruz.
  const idsToExclude = launchedToolIds.map((item) => item.tool_id);

  // Şimdi ana sorgumuzu yapıyoruz.
  let query = supabase
    .from("tools")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_approved", true);

  // Eğer hariç tutulacak araçlar varsa, .not() filtresini kullanıyoruz.
  if (idsToExclude.length > 0) {
    query = query.not("id", "in", `(${idsToExclude.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Lansmanı yapılabilecek araçlar çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Yeni Lansman | AI Keşif Platformu",
};

export default async function SubmitLaunchPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=Lansman yapmak için giriş yapmalısınız.");
  }

  const userTools = await getLaunchableTools(user.id);

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Yeni Lansmanını Yap
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Yapay zeka aracını topluluğumuza duyur ve ilk geri bildirimleri al.
        </p>
      </div>
      <LaunchForm userTools={userTools} />
    </div>
  );
}
