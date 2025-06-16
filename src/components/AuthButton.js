import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default async function AuthButton() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    // Eğer kullanıcı giriş yapmışsa, "Profilim" ve "Çıkış Yap" butonlarını gösterir.
    <div className="flex items-center gap-2">
      <Button asChild variant="secondary">
        <Link href="/profile">Profilim</Link>
      </Button>
      <form action={signOut}>
        <Button variant="outline">Çıkış Yap</Button>
      </form>
    </div>
  ) : (
    // Eğer kullanıcı giriş yapmamışsa, sadece "Giriş Yap" butonunu gösterir.
    <Button asChild>
      <Link href="/login">Giriş Yap</Link>
    </Button>
  );
}
