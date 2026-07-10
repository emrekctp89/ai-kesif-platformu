// src/components/ToolCard.js

'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import FavoriteButton from '@/components/FavoriteButton'; // Bu dosya yolunun doğru olduğunu varsayıyoruz
import {
  Star,
  Heart,
  Crown,
  Gem,
  Globe,
  Apple,
  Bot,
  Monitor,
  Pen,
  ShoppingCart,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ToolIcon from '@/components/ToolIcon';
import { TrackedExternalLink } from '@/components/TrackedExternalLink';
import { useTranslations } from 'next-intl';

// Bu sabitleri de bileşenin kendi dosyasına taşıyoruz
const tierStyles = {
  Pro: {
    badge: 'bg-purple-600 text-white hover:bg-purple-700',
    icon: <Crown className="w-4 h-4 mr-1.5" />,
  },
  Sponsorlu: {
    badge: 'bg-amber-500 text-white hover:bg-amber-600',
    icon: <Gem className="w-4 h-4 mr-1.5" />,
  },
};

const platformIcons = {
  Web: <Globe className="w-4 h-4" />,
  iOS: <Apple className="w-4 h-4" />,
  Android: <Bot className="w-4 h-4" />,
  Windows: <Monitor className="w-4 h-4" />,
  macOS: <Monitor className="w-4 h-4" />,
  Linux: <Pen className="w-4 h-4" />,
  'Chrome Uzantısı': <ShoppingCart className="w-4 h-4" />,
};

const ratingCache = new Map();
const favoritesCache = new Map();

// -----------------------------
// Tek bir araç kartı (DÜZELTİLMİŞ HALİ)
// -----------------------------
export default function ToolCard({ tool }) {
  const tc = useTranslations('Common');
  const tt = useTranslations('Tool');

  if (!tool || !tool.name) return null;

  const isPremium = tool.tier === 'Pro' || tool.tier === 'Sponsorlu' || tool.is_promoted;

  const getBadgeStyle = () => {
    if (tool.is_promoted || tool.tier === 'Sponsorlu') return tierStyles['Sponsorlu'];
    if (tool.tier === 'Pro') return tierStyles['Pro'];
    return {
      badge: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
      icon: <Star className="w-4 h-4 mr-1.5" />,
    };
  };

  const getBadgeText = () => {
    if (tool.is_promoted) return tc('promoted');
    if (tool.tier === 'Sponsorlu') return tc('promoted');
    if (tool.tier === 'Pro') return tc('pro');
    return tool.tier;
  };

  // DEĞİŞİKLİK 1: Ana sarmalayıcıyı <div onClick> yerine <Link> yapın.
  return (
    <Link
      href={`/tool/${tool.slug}`}
      className={cn(
        'glow-effect relative block p-6 rounded-xl border shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden group',
        {
          'border-purple-500/40 shadow-purple-500/20 hover:border-purple-400/60 bg-card':
            tool.tier === 'Pro' && !tool.is_promoted,
          'border-amber-500/40 shadow-amber-500/20 hover:border-amber-400/60 bg-card':
            tool.tier === 'Sponsorlu' || tool.is_promoted,
          'border-border/50 shadow-sm glass-panel hover:border-primary/30':
            !tool.tier && !tool.is_promoted,
        }
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative flex flex-col h-full z-10">
        {/* Premium Badge */}
        {isPremium && (
          <Badge
            className={`mb-2 flex w-fit items-center px-3 py-1 rounded-full ${getBadgeStyle().badge}`}
          >
            {getBadgeStyle().icon} {getBadgeText()}
          </Badge>
        )}

        {/* Araç Adı */}
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ToolIcon name={tool.name} link={tool.link} />
          {tool.name}
        </h2>

        {/* Kategori */}
        <div className="my-2">
          {/* DEĞİŞİKLİK 2: İçteki Link'e tıklamanın dış Link'i tetiklemesini engellemek için stopPropagation ekleyin. */}
          <Link
            href={`/kategori/${tool.category_slug}`}
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
              <Link key={tag.id} href={`/?tags=${tag.id}`} onClick={(e) => e.stopPropagation()}>
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
            {tool.platforms &&
              tool.platforms.slice(0, 3).map((platform) => (
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
              <TrackedExternalLink
                href={tool.link}
                target="_blank"
                rel="noopener noreferrer"
                eventName="official_site_click"
                eventParameters={{
                  source: 'legacy_tool_card',
                  tool_slug: tool.slug,
                  category: tool.category_slug,
                }}
                className="px-3 py-1 text-sm"
              >
                {tt('visitSite')}
              </TrackedExternalLink>
            </Button>
          )}
        </div>
      </div>
    </Link> // DEĞİŞİKLİK 4: div yerine Link'i kapatın.
  );
}
