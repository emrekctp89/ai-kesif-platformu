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

// -----------------------------
// Tek bir araç kartı (DÜZELTİLMİŞ HALİ)
// -----------------------------
// SADECE TEST AMAÇLIDIR
export default function ToolCard({ tool }) {
  if (!tool || !tool.name) return null;

  return (
    <div className="border p-4 m-2 bg-gray-800">
      <Link href={`/tool/${tool.slug}`} className="block w-full h-full">
        <h2 className="font-bold text-xl text-white">{tool.name}</h2>
        <p className="text-gray-300">Detay sayfasına gitmek için buraya tıkla.</p>
      </Link>
    </div>
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