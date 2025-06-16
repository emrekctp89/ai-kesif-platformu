import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import AuthButton from "./AuthButton";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { RandomToolButton } from "./RandomToolButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Yeni bileşenlerimizi import ediyoruz
import { NotificationCenter } from "./NotificationCenter";
import { getNotifications } from "@/app/actions";

// Header artık bir asenkron Server Component
export default async function Header() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user && user.email === process.env.ADMIN_EMAIL;

  // Header yüklendiğinde, bildirimleri sunucuda çekiyoruz.
  const { notifications, unreadCount } = await getNotifications();

  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-foreground"
        >
          AI Keşif
        </Link>
        <TooltipProvider delayDuration={100}>
          <nav className="flex items-center gap-1 md:gap-2 flex-wrap justify-end">
            <Button asChild variant="ghost">
              <Link href="/eserler">Eserler</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/leaderboard">Liderlik Tablosu</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="relative px-6 py-3 font-semibold text-primary hover:text-primary-dark transition-colors duration-300 border-b-2 border-transparent hover:border-primary"
            >
              <Link href="/karsilastir" className="relative z-10">
                Karşılaştır
              </Link>
            </Button>

            {user ? (
              <Button
                asChild
                className="font-semibold text-white bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 bg-[size:300%_auto] animate-breathing-glow hover:opacity-90"
              >
                <Link href="/tavsiye">AI Tavsiye</Link>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      className="font-semibold"
                      disabled
                      style={{ pointerEvents: "none" }}
                    >
                      AI Tavsiye
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bu özellik için giriş yapmalısınız.</p>
                </TooltipContent>
              </Tooltip>
            )}

            <RandomToolButton user={user} />
            <Button asChild variant="secondary">
              <Link href="/submit">Araç Öner</Link>
            </Button>

            {isAdmin && (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin">Yönetim</Link>
                </Button>
              </>
            )}

            <div className="flex items-center">
              {/* YENİ: Bildirim Merkezi'ni buraya ekliyoruz */}
              <NotificationCenter
                initialNotifications={notifications}
                unreadCount={unreadCount}
                user={user}
              />
              <AuthButton />
              <ThemeToggle />
            </div>
          </nav>
        </TooltipProvider>
      </div>
    </header>
  );
}
