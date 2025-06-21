"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationCenter } from "./NotificationCenter";
import { UserNav } from "./UserNav";
import { RandomToolButton } from "./RandomToolButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "./ui/badge";
// İkonları import ediyoruz
import { Bot, GitCompareArrows, Sparkles, Crown, Mail } from "lucide-react";

// Misafir kullanıcılar için ipucu gösteren korumalı bir buton bileşeni
const ProtectedButton = ({ children, className, variant = "ghost" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span tabIndex={0}>
        <Button
          variant={variant}
          disabled
          style={{ pointerEvents: "none" }}
          className={className}
        >
          {children}
        </Button>
      </span>
    </TooltipTrigger>
    <TooltipContent>
      <p>Bu özellik için giriş yapmalısınız.</p>
    </TooltipContent>
  </Tooltip>
);

// Bu, tüm interaktif navigasyon mantığını yöneten ana istemci bileşenidir.
export function HeaderNav({
  user,
  isAdmin,
  isProUser,
  notifications,
  unreadCount,
  totalUnreadMessages,
  profile,
}) {
  return (
    <>
      {/* Ana Navigasyon Linkleri (Sol Taraf) */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <Link
          href="/"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Tüm Araçlar
        </Link>
        <Link
          href="/eserler"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Eserler
        </Link>
        <Link
          href="/blog"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Blog
        </Link>
        {user && (
          <Link
            href="/akis"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Akış
          </Link>
        )}
      </nav>

      {/* Sağ Taraftaki Butonlar */}
      <div className="ml-auto flex items-center gap-2">
        <TooltipProvider delayDuration={100}>
          {/* AI ve Aksiyon Butonları Grubu */}
          <div className="hidden lg:flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/karsilastir">
                <GitCompareArrows className="w-4 h-4 mr-2" />
                Karşılaştır
              </Link>
            </Button>

            {user ? (
              <Button asChild variant="ghost">
                <Link href="/studyo">
                  <Bot className="w-4 h-4 mr-2" />
                  Stüdyo
                </Link>
              </Button>
            ) : (
              <ProtectedButton variant="ghost">
                <Bot className="w-4 h-4 mr-2" />
                Stüdyo
              </ProtectedButton>
            )}

            {user ? (
              <Button
                asChild
                className="font-semibold text-white bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 bg-[size:300%_auto] animate-breathing-glow hover:opacity-90"
              >
                <Link href="/tavsiye">AI Tavsiye</Link>
              </Button>
            ) : (
              <ProtectedButton className="font-semibold">
                AI Tavsiye
              </ProtectedButton>
            )}

            <RandomToolButton user={user} />
          </div>
        </TooltipProvider>

        {/* Kullanıcı Giriş/Profil ve Tema Kontrolleri */}
        <div className="flex items-center">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" className="relative">
                <Link href="/mesajlar" aria-label="Mesajlar">
                  <Mail className="h-[1.2rem] w-[1.2rem]" />
                  {totalUnreadMessages > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute top-1 right-1 h-4 w-4 p-0 flex items-center justify-center text-xs"
                    >
                      {totalUnreadMessages}
                    </Badge>
                  )}
                </Link>
              </Button>
              <NotificationCenter
                initialNotifications={notifications}
                unreadCount={unreadCount}
                user={user}
              />
              <UserNav
                user={user}
                profile={profile}
                isProUser={isProUser}
                isAdmin={isAdmin}
              />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary">
                <Link href="/submit">Araç Öner</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Giriş Yap</Link>
              </Button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}
