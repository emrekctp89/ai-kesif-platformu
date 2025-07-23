"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/FavoriteButton";
import { Star, Crown, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordVariantImpression, recordVariantClick } from "@/app/actions";

// Seviyelere göre stiller
const tierStyles = {
  Pro: {
    badge: "bg-purple-600 text-white hover:bg-purple-700",
    card: "border-purple-500/50 shadow-lg shadow-purple-500/10",
    icon: <Crown className="w-4 h-4 mr-1.5" />,
  },
  Sponsorlu: {
    badge: "bg-amber-500 text-white hover:bg-amber-600",
    card: "border-amber-500/50 shadow-lg shadow-amber-500/10",
    icon: <Gem className="w-4 h-4 mr-1.5" />,
  },
};

// Tek bir araç kartını yöneten, artık A/B testi yapabilen akıllı bileşen
function ToolCard({ tool, user, isFavorited }) {
  const router = useRouter();
  const [displayedVariant, setDisplayedVariant] = React.useState(null);

  // Bu useEffect, bileşen ilk render edildiğinde çalışır.
  // A/B testi için gösterilecek varyantı seçer ve gösterimini kaydeder.
  React.useEffect(() => {
    const originalVariant = {
      id: `original-${tool.id}`,
      title: tool.name,
      description: tool.description,
    };

    const activeVariants = tool.tool_variants.filter((v) => v.is_active);

    // Eğer test edilecek aktif varyantlar varsa, orijinali de listeye ekle ve rastgele birini seç
    if (activeVariants.length > 0) {
      const allTestableVariants = [originalVariant, ...activeVariants];
      const randomIndex = Math.floor(
        Math.random() * allTestableVariants.length
      );
      const selectedVariant = allTestableVariants[randomIndex];
      setDisplayedVariant(selectedVariant);

      // Seçilen varyant orijinal değilse, gösterimini kaydet
      if (selectedVariant.id !== `original-${tool.id}`) {
        recordVariantImpression(selectedVariant.id);
      }
    } else {
      // Aktif varyant yoksa, sadece orijinali göster
      setDisplayedVariant(originalVariant);
    }
  }, [tool]);

  // Kart tıklandığında çalışacak fonksiyon
  const handleCardClick = () => {
    // Tıklanan varyant orijinal değilse, tıklamasını kaydet
    if (displayedVariant && displayedVariant.id !== `original-${tool.id}`) {
      recordVariantClick(displayedVariant.id);
    }
    // Kullanıcıyı aracın detay sayfasına yönlendir
    router.push(`/tool/${tool.slug}`);
  };

  if (!displayedVariant) {
    return null; // Varyant henüz seçilmediyse hiçbir şey gösterme
  }

  const isPremium = tool.tier === "Pro" || tool.tier === "Sponsorlu";

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-6 shadow-lg flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        isPremium && tierStyles[tool.tier]?.card
      )}
    >
      {user && (
        <div className="absolute top-4 right-4 z-10">
          <FavoriteButton
            toolId={tool.id}
            toolSlug={tool.slug}
            isInitiallyFavorited={isFavorited}
          />
        </div>
      )}
      <div className="flex-grow">
        {isPremium && (
          <Badge
            className={cn(
              "mb-2 flex w-fit items-center",
              tierStyles[tool.tier]?.badge
            )}
          >
            {tierStyles[tool.tier]?.icon}
            {tool.tier}
          </Badge>
        )}

        {/* Kartın tıklanabilir ana alanı */}
        <div onClick={handleCardClick} className="cursor-pointer group">
          <h2 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
            {displayedVariant.title}
          </h2>
          <p className="text-muted-foreground text-sm my-4 line-clamp-2">
            {displayedVariant.description}
          </p>
        </div>

        {tool.tags && tool.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 my-3">
            {tool.tags.map((tag) => (
              <Link key={tag.id} href={`/?tags=${tag.id}`}>
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
      </div>
      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="font-bold text-foreground">
            {tool.average_rating.toFixed(1)}
          </span>
          <span>({tool.total_ratings} oy)</span>
        </div>
        <Button asChild size="sm">
          <a href={tool.link} target="_blank" rel="noopener noreferrer">
            Ziyaret Et
          </a>
        </Button>
      </div>
    </div>
  );
}

// Ana Araç Listesi Bileşeni
// Bu bileşen artık bir Server Component değil, Client Component olmalı.
// Bu yüzden, veri çekme mantığını bir üst bileşene (page.js) taşımamız gerekecek.
export function ToolsList({ tools, user, favoriteToolIds }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {tools.map((tool) => (
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
