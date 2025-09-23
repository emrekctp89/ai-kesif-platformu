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
import {
  Bot,
  GitCompareArrows,
  Sparkles,
  Crown,
  Mail,
  Users,
  Trophy,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from './MobileNav'; // Yeni mobil menüyü import ediyoruz


// Korumalı buton için özel bir versiyon oluşturuyoruz
const ProProtectedButton = ({ children, className }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <span tabIndex={0}>
                <Button variant="ghost" disabled style={{ pointerEvents: 'none' }} className={className}>
                    {children}
                </Button>
            </span>
        </TooltipTrigger>
        <TooltipContent>
            <p>Bu özellik Pro üyelere özeldir. <Link
  href="/uyelik"
  className="font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent hover:underline"
>
  Yükseltin
</Link>

</p>
        </TooltipContent>
    </Tooltip>
);
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
        {/* DEĞİŞİKLİK: Yeni "Launchpad" linki eklendi */}
        

        {/* YENİ: Topluluk Keşif Sayfası Linki */}
        
        {/* YENİ: Yarışma Sayfası Linki */}
        
        {/* YENİ: Ödül Avcılığı Sayfası Linki */}
        

    
      </nav>

      {/* Sağ Taraftaki Butonlar */}
      <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary">
                <Link href="/submit">Araç Öner</Link>
              </Button>
            </div>
          <ThemeToggle />
        </div>
    </>
  );
}
