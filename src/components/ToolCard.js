// src/components/ToolCard.js

"use client";

import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import FavoriteButton from '@/components/FavoriteButton'; // Bu dosya yolunun doğru olduğunu varsayıyoruz
import { Star, Heart, Crown, Gem, Globe, Apple, Bot, Monitor, Pen, ShoppingCart, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Bu sabitleri de bileşenin kendi dosyasına taşıyoruz
const tierStyles = {
  'Pro': { badge: "bg-purple-600 text-white hover:bg-purple-700", icon: <Crown className="w-4 h-4 mr-1.5" /> },
  'Sponsorlu': { badge: "bg-amber-500 text-white hover:bg-amber-600", icon: <Gem className="w-4 h-4 mr-1.5" /> }
};

const platformIcons = {
    Web: <Globe className="w-4 h-4" />,
    iOS: <Apple className="w-4 h-4" />,
    Android: <Bot className="w-4 h-4" />,
    Windows: <Monitor className="w-4 h-4" />,
    macOS: <Monitor className="w-4 h-4" />,
    Linux: <Pen className="w-4 h-4" />,
    'Chrome Uzantısı': <ShoppingCart className="w-4 h-4" />
};

const ratingCache = new Map();
const favoritesCache = new Map();

// -----------------------------
// Tek bir araç kartı (DÜZELTİLMİŞ HALİ)
// -----------------------------
export default function ToolCard({ tool }) {
  // router'a artık burada ihtiyacımız yok.
  // const router = useRouter(); 
  if (!tool || !tool.name) return null;

  const isPremium = tool.tier === "Pro" || tool.tier === "Sponsorlu";

  // DEĞİŞİKLİK 1: Ana sarmalayıcıyı <div onClick> yerine <Link> yapın.
  return (
    <Link
      href={`/tool/${tool.slug}`}
      className={cn(
        "relative block p-6 rounded-xl border shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden",
        {
          "border-purple-400/40 shadow-purple-400/20 hover:shadow-purple-500/40 bg-card": tool.tier === "Pro",
          "border-amber-400/40 shadow-amber-400/20 hover:shadow-amber-500/40 bg-card": tool.tier === "Sponsorlu",
          "border-blue-800/50 shadow-blue-900/30 hover:shadow-blue-700/50 bg-blue-950": !tool.tier
        }
      )}
    >
      <div className="flex flex-col h-full">
        {/* Premium Badge */}
        {isPremium && (
         <Badge className={`mb-2 flex w-fit items-center px-3 py-1 rounded-full ${tierStyles[tool.tier]?.badge || "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"}`}>
            {tierStyles[tool.tier]?.icon || <Star className="w-4 h-4 mr-1.5" />} {tool.tier}
          </Badge>
        )}

        {/* Araç Adı */}
        <h2 className="text-xl font-bold">{tool.name}</h2>

        {/* Kategori */}
        <div className="my-2">
          {/* DEĞİŞİKLİK 2: İçteki Link'e tıklamanın dış Link'i tetiklemesini engellemek için stopPropagation ekleyin. */}
          <Link 
            href={`/?category=${tool.category_slug}`} 
            className="inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit hover:bg-primary hover:text-primary-foreground transition-colors"> 
              {tool.category_name}
            </span>
          </Link>
        </div>

        {/* Etiketler */}
        {tool.tags && tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 my-3">
            {tool.tags.map((tag) => ( 
              // DEĞİŞİKLİK 3: Etiket Link'lerine de stopPropagation ekleyin.
              <Link 
                key={tag.id} 
                href={`/?tags=${tag.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  variant="outline"
                  className="hover:bg-accent hover:border-primary transition-colors"
                >
                  {tag.name}  
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Açıklama */}
        <p className="text-muted-foreground text-sm mt-4 line-clamp-3 min-h-[72px]">
          {tool.description}
        </p>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            {/* platform ikonları */}
            {tool.platforms && tool.platforms.slice(0, 3).map((platform) => (
              <span key={platform} title={platform}>
                {platformIcons[platform] || <Eye className="w-4 h-4" />}
              </span>
            ))}
            {tool.platforms && tool.platforms.length > 3 && (
              <span className="text-xs">+{tool.platforms.length - 3}</span>
            )}
          </div>

          {/* Ziyaret Et butonu zaten doğru yapılandırılmış, onClick={(e) => e.stopPropagation()} içeriyor. */}
          {tool.link && (
            <Button
              asChild
              size="sm"
              className="hover:bg-primary/80 transition-colors"
              onClick={(e) => e.stopPropagation()} // Bu zaten vardı ve doğruydu.
            >
              <Link
                href={tool.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-sm"
              >
                Ziyaret Et
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Link> // DEĞİŞİKLİK 4: div yerine Link'i kapatın.
  );
}
