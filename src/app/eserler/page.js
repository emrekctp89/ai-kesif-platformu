import { createClient } from "@/utils/supabase/server";
import { ShowcaseGallery } from "@/components/ShowcaseGallery";

async function getPublicShowcaseItems() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_showcase_items");

  if (error) {
    console.error("Herkese açık eserler çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Topluluk Eserleri | AI Keşif Platformu",
  description:
    "Topluluğumuz tarafından yapay zeka araçları kullanılarak yaratılmış ilham verici eserleri keşfedin.",
};

export default async function ShowcasePage() {
  const supabase = createClient();

  // DEĞİŞİKLİK: Kullanıcı bilgisini burada, en üstte bir kez çekiyoruz.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = await getPublicShowcaseItems();

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Topluluk Eserleri
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Kullanıcılarımızın yaratıcılığını ve yapay zekanın gücünü keşfedin.
        </p>
      </div>

      {items.length > 0 ? (
        // Tüm veriyi ve kullanıcı bilgisini Client Component'e aktarıyoruz
        <ShowcaseGallery items={items} user={user} />
      ) : (
        <p className="text-center text-muted-foreground">
          Henüz yayınlanmış bir eser bulunmuyor.
        </p>
      )}
    </div>
  );
}
