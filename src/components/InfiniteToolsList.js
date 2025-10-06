'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchMoreTools } from '@/app/actions';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from '@/components/FavoriteButton';
import { Star, Crown, Gem, Globe, Apple, Bot, Monitor, Pen, ShoppingCart, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCardSkeleton } from './ToolCardSkeleton';
import { createClient } from '@/utils/supabase/client';
// import { ToolPreviewDialog } from './ToolPreviewDialog';

const tierStyles = {
  'Pro': { badge: "bg-purple-600 text-white hover:bg-purple-700", icon: <Crown className="w-4 h-4 mr-1.5" /> },
  'Sponsorlu': { badge: "bg-amber-500 text-white hover:bg-amber-600", icon: <Gem className="w-4 h-4 mr-1.5" /> },
  'default': { 
    badge: "bg-blue-900 text-white hover:bg-blue-800", 
    icon: null // default araçlarda ikon yok
  }
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

// -----------------------------
// Tek bir araç kartı (DÜZELTİLMİŞ HALİ)
// -----------------------------
export default function ToolCard({ tool }) {
  // router'a artık burada ihtiyacımız yok.
  // const router = useRouter(); 
  if (!tool || !tool.name) return null;

    console.log("Tool slug:", tool.slug, "Tool name:", tool.name);


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



// -----------------------------
// Sonsuz Kaydırma Listesi
// -----------------------------
export function InfiniteToolsList({ initialTools, user, favoriteToolIds }) {
  const [tools, setTools] = useState(initialTools || []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialTools?.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.5 });
  const searchParams = useSearchParams();
  const [previewTool, setPreviewTool] = useState(null);

  const loadMoreTools = useCallback(async () => {
    setIsLoading(true);

    const paramsAsObject = Object.fromEntries(searchParams.entries());

    try {
      const newTools = await fetchMoreTools({ page, searchParams: paramsAsObject });

      if (newTools?.length) {
        setPage(prev => prev + 1);
        setTools(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const uniqueNewTools = newTools.filter(t => !existingIds.has(t.id));
          const mergedTools = [...prev, ...uniqueNewTools];

          // Popülerliğe göre yeniden sırala
          return mergedTools.sort((a, b) => b.popularity_score - a.popularity_score);
        });
      } else {
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, searchParams]);

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMoreTools();
    }
  }, [inView, hasMore, isLoading, loadMoreTools]);

  useEffect(() => {
    setTools(initialTools || []);
    setPage(1);
    setHasMore(initialTools?.length > 0);
  }, [searchParams.toString(), initialTools]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {tools.map(tool => (
          <ToolCard 
            key={tool.id}
            tool={tool}
            user={user}
            isFavorited={favoriteToolIds?.has(tool.id)}
            onPreviewClick={setPreviewTool}
          />
        ))}
      </div>

      {hasMore && (
        <div ref={ref} className="col-span-full mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <ToolCardSkeleton />
            <ToolCardSkeleton />
            <ToolCardSkeleton />
          </div>
        </div>
      )}

      {/*{previewTool && (
        <ToolPreviewDialog
          tool={previewTool}
          isOpen={!!previewTool}
          onClose={() => setPreviewTool(null)} 
        /> 
      )}  */}
    </>
  );
}

// Ana Araç Listesi Bileşeni
// Bu bileşen artık bir Server Component değil, Client Component olmalı.
// Bu yüzden, veri çekme mantığını bir üst bileşene (page.js) taşımamız gerekecek.
// ToolsList
export function ToolsList({ tools, user, favoriteToolIds }) {
  const sortedTools = [...tools].sort((a, b) => b.popularity_score - a.popularity_score);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {sortedTools.map(tool => (
        <ToolCard
          key={tool.id}
          tool={tool}
          user={user}
          isFavorited={favoriteToolIds.has(tool.id)}
        />
      ))}
    </div>
  );
}
// Artık veri çekme mantığını bu bileşene taşımıyoruz.
// Veri çekme işlemi, bu bileşeni kullanan üst bileşen tarafından yapılmalı.
// Bu bileşen sadece verilen "tools" verisini alıp görüntülemekle sorumlu.
