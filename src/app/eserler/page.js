import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, Code, Image as ImageIcon } from "lucide-react";
import { ShowcaseGallery } from "@/components/ShowcaseGallery";
import { ShowcaseFilters } from "@/components/ShowcaseFilters"; // Yeni filtre bileşenini import ediyoruz

// Fonksiyon artık filtre parametrelerini alıyor
async function getPublicShowcaseItems(searchParams) {
  const supabase = createClient();
  const contentType = searchParams.contentType || null;
  const toolId = searchParams.toolId || null;
  const sortBy = searchParams.sortBy || "newest";

  const { data, error } = await supabase.rpc("get_public_showcase_items", {
    p_content_type: contentType,
    p_tool_id: toolId,
    p_sort_by: sortBy,
  });

  if (error) {
    console.error("Herkese açık eserler çekilirken hata:", error);
    return [];
  }
  return data;
}

// Filtre menüsü için tüm araçları çeken fonksiyon
async function getAllToolsForSelect() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tools")
    .select("id, name")
    .eq("is_approved", true)
    .order("name");
  if (error) {
    console.error("Filtre için araçlar çekilirken hata:", error);
    return [];
  }
  return data;
}

export const metadata = {
  title: "Topluluk Eserleri | AI Keşif Platformu",
  description:
    "Topluluğumuz tarafından yapay zeka araçları kullanılarak yaratılmış ilham verici eserleri keşfedin.",
};

export default async function ShowcasePage({ searchParams }) {
  const [items, allTools, user] = await Promise.all([
    getPublicShowcaseItems(searchParams),
    getAllToolsForSelect(),
    createClient()
      .auth.getUser()
      .then((res) => res.data.user),
  ]);

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

      {/* YENİ: Gelişmiş Filtreleme Bölümü */}
      <div className="mb-12">
        <ShowcaseFilters allTools={allTools} />
      </div>

      {items.length > 0 ? (
        <ShowcaseGallery items={items} user={user} />
      ) : (
        <p className="text-center text-muted-foreground py-16">
          Aradığınız kriterlere uygun bir eser bulunamadı.
        </p>
      )}
    </div>
  );
}
