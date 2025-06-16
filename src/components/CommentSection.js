import { createClient } from "@/utils/supabase/server";
// Yeni UI bileşenimizi import ediyoruz
import { CommentsUI } from "./CommentsUI";

// Bu ana bileşen, bir Server Component olarak kalır.
// Görevi: veritabanından veriyi çekmek ve Client Component'e aktarmak.
export default async function CommentSection({ toolId, toolSlug }) {
  const supabase = createClient();

  // Veriyi çekiyoruz
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // DEĞİŞİKLİK: Kullanıcı profillerini çekerken artık 'username'i de istiyoruz.
  const { data: comments } = await supabase
    .from("comments")
    .select(`*, profiles ( username, email, avatar_url )`) // 'username' eklendi
    .eq("tool_id", toolId)
    .order("created_at", { ascending: false });

  // Veriyi, interaktif arayüzü yönetecek olan Client Component'e prop olarak iletiyoruz.
  return (
    <CommentsUI
      user={user}
      comments={comments || []}
      toolId={toolId}
      toolSlug={toolSlug}
    />
  );
}
