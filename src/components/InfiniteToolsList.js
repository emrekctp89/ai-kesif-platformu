'use client'

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchMoreTools, recordVariantClick } from '@/app/actions';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from '@/components/FavoriteButton';
import { Star, Crown, Gem, Globe, Apple, Bot, Monitor, Pen, ShoppingCart, Heart, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCardSkeleton } from './ToolCardSkeleton';
import { ToolPreviewDialog } from './ToolPreviewDialog';

const tierStyles = {
  'Pro': { badge: "bg-purple-600 text-white hover:bg-purple-700", card: "border-purple-500/50 shadow-lg shadow-purple-500/10", icon: <Crown className="w-4 h-4 mr-1.5" /> },
  'Sponsorlu': { badge: "bg-amber-500 text-white hover:bg-amber-600", card: "border-amber-500/50 shadow-lg shadow-amber-500/10", icon: <Gem className="w-4 h-4 mr-1.5" /> }
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

// Tek bir araç kartını yöneten bileşen
function ToolCard({ tool, user, isFavorited, onPreviewClick }) {
    const isPremium = tool.tier === 'Pro' || tool.tier === 'Sponsorlu';

    return (
        <div 
            onClick={() => onPreviewClick(tool)}
            className={cn("bg-card border rounded-xl p-6 shadow-lg flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer group/card")}
        >
            {user && ( <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}><FavoriteButton toolId={tool.id} toolSlug={tool.slug} isInitiallyFavorited={isFavorited} /></div> )}
            <div className="flex-grow">
                {isPremium && (<Badge className={cn("mb-2 flex w-fit items-center", tierStyles[tool.tier]?.badge)}>{tierStyles[tool.tier]?.icon}{tool.tier}</Badge>)}
                
                <h2 className="text-xl font-bold text-card-foreground group-hover/card:text-primary transition-colors">{tool.name}</h2>

                {/* DEĞİŞİKLİK: Kategori ve Etiket rozetleri geri eklendi */}
                <Link href={`/?category=${tool.category_slug}`} onClick={(e) => e.stopPropagation()} className="inline-block mt-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit block hover:bg-primary hover:text-primary-foreground transition-colors">
                        {tool.category_name}
                    </span>
                </Link>
                
                {tool.tags && tool.tags.length > 0 && (
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
                        <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="font-bold text-foreground">{tool.average_rating.toFixed(1)}</span></div>
                        <div className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-red-500" /><span className="font-bold text-foreground">{tool.total_favorites}</span></div>
                    </div>
                    {tool.pricing_model && <Badge variant="default">{tool.pricing_model}</Badge>}
                 </div>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        {tool.platforms?.map((p, index) => (<span key={`${tool.id}-${p}-${index}`} title={p}>{platformIcons[p] || null}</span>))}
                    </div>
                   <Button asChild size="sm" onClick={(e) => e.stopPropagation()}><a href={tool.link} target="_blank" rel="noopener noreferrer">Ziyaret Et</a></Button>
                 </div>
            </div>
        </div>
    );
}
// Ana "Sonsuz Kaydırma" Listesi
// Ana "Sonsuz Kaydırma" Listesi
export function InfiniteToolsList({ initialTools, user, favoriteToolIds }) {
  const [tools, setTools] = useState(initialTools);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialTools.length > 0);
  const [isLoading, setIsLoading] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.5 });
  const searchParams = useSearchParams();
  const [previewTool, setPreviewTool] = useState(null);

  // Yeni araçları yükleme fonksiyonu (console log ekli)
  const loadMoreTools = useCallback(async () => {
      console.log("🔄 Yeni araçlar yükleniyor... Sayfa:", page);

      setIsLoading(true);
      const paramsAsObject = Object.fromEntries(searchParams.entries());

      const newTools = await fetchMoreTools({ page, searchParams: paramsAsObject });

      console.log("📦 Gelen araçlar:", newTools);

      if (newTools?.length) {
          setPage(prev => prev + 1);

          setTools((prev) => {
              const existingIds = new Set(prev.map(t => t.id));
              const uniqueNewTools = newTools.filter(t => !existingIds.has(t.id));

              console.log("🧠 Eşsiz araçlar eklenecek:", uniqueNewTools);

              return [...prev, ...uniqueNewTools];
          });
      } else {
          console.log("🚫 Yeni araç kalmadı.");
          setHasMore(false);
      }

      setIsLoading(false);
  }, [page, searchParams]);

  // Kullanıcı alt kısmı görünce yeni veriyi tetikler (console log ekli)
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
        console.log("👀 Kullanıcı alt kısmı gördü. Yeni veriler yüklenecek.");
        loadMoreTools();
    }
  }, [inView, hasMore, isLoading, loadMoreTools]);

  // Arama parametreleri değiştiğinde listeyi sıfırlar (console log ekli)
  useEffect(() => {
    console.log("🔁 Arama parametreleri değişti. Liste sıfırlanıyor.");
    setTools(initialTools);
    setPage(1);
    setHasMore(initialTools.length > 0);
  }, [searchParams.toString()]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.map((tool) => (
            <ToolCard 
                key={tool.id}
                tool={tool}
                user={user}
                isFavorited={favoriteToolIds.has(tool.id)}
                onPreviewClick={(tool) => {
                  console.log("👁️ Hızlı bakış açılıyor:", tool.name);
                  setPreviewTool(tool);
                }}
            />
        ))}
      </div>

      {hasMore && (
        <div ref={ref} className="col-span-full mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ToolCardSkeleton />
                <ToolCardSkeleton />
                <ToolCardSkeleton />
            </div>
        </div>
      )}

      {previewTool && (
        <ToolPreviewDialog 
            tool={previewTool}
            isOpen={!!previewTool}
            onClose={() => {
              console.log("❌ Hızlı bakış kapatıldı.");
              setPreviewTool(null);
            }}
        />
      )}
    </>
  );
}
