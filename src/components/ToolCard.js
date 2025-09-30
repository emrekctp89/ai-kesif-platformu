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

// Bileşeni "export" ile dışa aktarıyoruz
export default function ToolCard({ tool }) {
  const router = useRouter();
  if (!tool || !tool.name) return null;

  const isPremium = tool.tier === "Pro" || tool.tier === "Sponsorlu";

  return (
    <div
      onClick={() => router.push(`/tool/${tool.slug}`)}
      className={cn(
        "relative p-6 rounded-xl border shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer overflow-hidden",
        {
           "border-purple-400/40 shadow-purple-400/20 hover:shadow-purple-500/40 bg-card": tool.tier === "Pro",
      "border-amber-400/40 shadow-amber-400/20 hover:shadow-amber-500/40 bg-card": tool.tier === "Sponsorlu",
      // default AI araçlar için koyu lacivert tema
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

        {/* Açıklama */}
        <p className="text-muted-foreground text-sm mt-4 line-clamp-3 min-h-[72px]">
          {tool.description}
        </p>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            {/* platform ikonları */}
          </div>

          {tool.link && (
            <Button
              asChild
              size="sm"
              className="hover:bg-primary/80 transition-colors"
              onClick={(e) => e.stopPropagation()} // Kart tıklamasını engelle
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
    </div>
  );
}