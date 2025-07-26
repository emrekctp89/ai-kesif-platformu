import { createClient } from "@/utils/supabase/server";
import { approveTool, approveShowcaseItem } from "@/app/actions";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeaturedToggle } from "@/components/FeaturedToggle";
import { EditToolDialog } from "@/components/EditToolDialog";
import { DeleteToolButton } from "@/components/DeleteToolButton";
import { TagManager } from "@/components/TagManager";
import { BlogManager } from "@/components/BlogManager";
import { CategoryManager } from "@/components/CategoryManager";
// Yeni Bülten Yönetim bileşenini import ediyoruz
import { NewsletterManager } from "@/components/NewsletterManager";
import { AiToolFactory } from "@/components/AiToolFactory"; // Yeni bileşeni import ediyoruz
import { ChallengeManager } from '@/components/ChallengeManager'; // Yeni bileşeni import ediyoruz
import { ChallengeEditor } from "../../components/ChallengeEditor.js";
import { ChallengeClient } from "../../components/ChallengeClient.js";



// ... (Tüm veri çekme fonksiyonlarınız burada - değişiklik yok) ...
async function getUnapprovedTools() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .eq("is_approved", false)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Onaylanmamış araçları çekerken hata:", error);
    return [];
  }
  return data;
}
// DEĞİŞİKLİK: getApprovedTools fonksiyonu artık bizim akıllı RPC fonksiyonumuzu çağırıyor.
async function getApprovedTools() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_admin_approved_tools");
  if (error) {
    console.error("Onaylanmış araçları çekerken hata:", error);
    return [];
  }
  return data;
}
async function getCategories() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("Kategorileri çekerken hata:", error);
    return [];
  }
  return data;
}
async function getAllTags() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.error("Tüm etiketleri çekerken hata:", error);
    return [];
  }
  return data;
}
async function getAllPosts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, slug, status")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Tüm yazıları çekerken hata:", error);
    return [];
  }
  return data;
}
async function getUnapprovedShowcaseItems() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("showcase_items")
    .select(`id, title, image_url, profiles ( email )`)
    .eq("is_approved", false)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Onaylanmamış eserleri çekerken hata:", error);
    return [];
  }
  return data;
}
// YENİ: Admin panelinde gösterilecek tüm yarışmaları çeken fonksiyon
async function getAllChallenges() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('start_date', { ascending: false });
    
    if (error) {
        console.error("Tüm yarışmalar çekilirken hata:", error);
        return [];
    }
    return data;
}

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/");
  }

  const [
    unapprovedTools,
    approvedTools,
    categories,
    allTags,
    allPosts,
    unapprovedShowcaseItems,
          challenges // <-- Yeni veri

  ] = await Promise.all([
    getUnapprovedTools(),
    getApprovedTools(),
    getCategories(),
    getAllTags(),
    getAllPosts(),
    getUnapprovedShowcaseItems(),
        getAllChallenges() // <-- Yeni fonksiyonu çağırıyoruz

  ]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Admin Paneli</h1>

      {/* YENİ: Haftalık Bülten Yönetim Kartı */}
      <Card>
        <CardHeader>
          <CardTitle>Haftalık Bülten Yönetimi</CardTitle>
          <CardDescription>
            Son bir haftanın en popüler içeriklerini toplayan bir bülten
            oluşturun, önizleyin ve tüm kayıtlı kullanıcılara gönderin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewsletterManager />
        </CardContent>
      </Card>
      
        {/* DEĞİŞİKLİK: ChallengeManager'a artık doğru veriyi gönderiyoruz */}
        <ChallengeManager challenges={challenges} />
        
        
      {/* YENİ: AI İçerik Fabrikası Paneli */}
      <AiToolFactory categories={categories} />


      {/* Onay Bekleyen Eserler Kartı */}
      <Card>
        <CardHeader>
          <CardTitle>
            Onay Bekleyen Eserler ({unapprovedShowcaseItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unapprovedShowcaseItems.length > 0 ? (
            <div className="space-y-4">
              {unapprovedShowcaseItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-muted p-4 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                    />
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Gönderen: {item.profiles?.email || "Bilinmiyor"}
                      </p>
                    </div>
                  </div>
                  <form action={approveShowcaseItem}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <Button type="submit" className="w-full sm:w-auto">
                      Onayla
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Onay bekleyen eser bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blog Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <BlogManager posts={allPosts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kategori & Etiket Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <TagManager tags={allTags} />
          <div className="my-6" />
          <CategoryManager categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Onay Bekleyen Araçlar ({unapprovedTools.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unapprovedTools.length > 0 ? (
            <div className="space-y-4">
              {unapprovedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-muted p-4 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold">{tool.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tool.suggester_email}
                    </p>
                    <a
                      href={tool.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Siteyi Görüntüle
                    </a>
                  </div>
                  <form action={approveTool}>
                    <input type="hidden" name="toolId" value={tool.id} />
                    <Button
                      type="submit"
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Onayla
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Onay bekleyen araç bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onaylanmış Araçları Yönet</CardTitle>
        </CardHeader>
        <CardContent>
          {approvedTools.length > 0 ? (
            <div className="space-y-4">
              {approvedTools.map((tool) => (
                <div
                  key={tool.id}
                  className="p-4 rounded-lg border flex flex-wrap justify-between items-center gap-4"
                >
                  <h3 className="font-semibold">{tool.name}</h3>
                  <div className="flex items-center gap-2">
                    <FeaturedToggle
                      toolId={tool.id}
                      isFeatured={tool.is_featured}
                    />
                    <EditToolDialog
                      tool={tool}
                      categories={categories}
                      allTags={allTags}
                    />
                    <DeleteToolButton toolId={tool.id} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Henüz onaylanmış araç bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
