import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { CoPilotClient } from "@/components/CoPilotClient";

export const metadata = {
  title: "Admin Co-Pilot | AI Keşif Platformu",
};

export default async function CoPilotPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Bu sayfayı sadece admin görebilir
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect("/login");
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <CoPilotClient />
    </div>
  );
}
