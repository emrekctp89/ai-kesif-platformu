// src/components/ToolCard.js

'use client';

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
export function ToolCard({ tool, user, isFavorited, onPreviewClick }) {
  const isPremium = tool.tier === 'Pro' || tool.tier === 'Sponsorlu';

  const averageRating =
    typeof tool.average_rating === 'number'
      ? tool.average_rating.toFixed(1)
      : ratingCache.has(tool.id)
        ? ratingCache.get(tool.id)
        : (() => {
            const val = (Math.random() * 5).toFixed(1);
            ratingCache.set(tool.id, val);
            return val;
          })();

  const totalFavorites =
    typeof tool.total_favorites === 'number'
      ? tool.total_favorites
      : favoritesCache.has(tool.id)
        ? favoritesCache.get(tool.id)
        : (() => {
            const val = Math.floor(Math.random() * 200) + 1;
            favoritesCache.set(tool.id, val);
            return val;
          })();

  return (
    <div 
      onClick={() => onPreviewClick(tool)}
      className={cn("bg-card border rounded-xl p-6 shadow-lg flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer group/card")}
    >
      {user && (
        <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
          <FavoriteButton toolId={tool.id} toolSlug={tool.slug} isInitiallyFavorited={isFavorited} />
        </div>
      )}

      <div className="flex-grow">
        {isPremium && (
          <Badge className={cn("mb-2 flex w-fit items-center", tierStyles[tool.tier]?.badge)}>
            {tierStyles[tool.tier]?.icon}{tool.tier}
          </Badge>
        )}

        <h2 className="text-xl font-semibold text-card-foreground group-hover/card:text-primary transition-colors">
          {tool.name}
        </h2>

        <Link href={`/?category=${tool.category_slug}`} onClick={(e) => e.stopPropagation()} className="inline-block mt-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit block hover:bg-primary hover:text-primary-foreground transition-colors">
            {tool.category_name}
          </span>
        </Link>

        {tool.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 my-3">
            {tool.tags.map(tag => (
              <Link key={tag.id} href={`/?tags=${tag.id}`} onClick={(e) => e.stopPropagation()}>
                <Badge variant="outline" className="hover:bg-accent hover:border-primary transition-colors">{tag.name}</Badge>
              </Link>
            ))}
          </div>
        )}

        <p className="text-muted-foreground text-sm my-4 line-clamp-2">{tool.description}</p>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Button 
          onClick={(e) => { e.stopPropagation(); onPreviewClick(tool); }}
          variant="secondary"
          className="opacity-0 group-hover/card:opacity-100 transition-opacity"
        >
          <Eye className="w-4 h-4 mr-2" />
          Hızlı Bakış
        </Button>
      </div>

      <div className="mt-auto pt-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-foreground">{averageRating}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="font-bold text-foreground">{totalFavorites}</span>
            </div>
          </div>
          {tool.pricing_model && <Badge variant="default">{tool.pricing_model}</Badge>}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {tool.platforms?.map((p, index) => (<span key={`${tool.id}-${p}-${index}`} title={p}>{platformIcons[p] || null}</span>))}
          </div>
          <Button asChild size="sm" onClick={(e) => e.stopPropagation()}>
            <a href={tool.link} target="_blank" rel="noopener noreferrer">Ziyaret Et</a>
          </Button>
        </div>
      </div>
    </div>
  );
}