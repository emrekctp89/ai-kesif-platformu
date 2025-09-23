'use client';

import * as React from 'react';
import Link from 'next/link';
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Star, Crown, Gem, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from './ui/button';
import { ToolPreviewDialog } from './ToolPreviewDialog';

const tierStyles = {
  Pro: {
    badge: "bg-purple-600 text-white hover:bg-purple-700 border-purple-700",
    card: "border-purple-500/50 shadow-lg shadow-purple-500/10",
    icon: <Crown className="w-4 h-4 mr-1.5" />,
  },
  Sponsorlu: {
    badge: "bg-amber-500 text-white hover:bg-amber-600 border-amber-600",
    card: "border-amber-500/50 shadow-lg shadow-amber-500/10",
    icon: <Gem className="w-4 h-4 mr-1.5" />,
  },
};

export function FeaturedTools() {
  const [featuredTools, setFeaturedTools] = React.useState([]);
  const [selectedTool, setSelectedTool] = React.useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  React.useEffect(() => {
    async function fetchFeaturedTools() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tools_with_ratings")
        .select("*")
        .eq("is_approved", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Öne çıkan araçlar çekilirken hata:", error);
        return;
      }
      setFeaturedTools(data);
    }

    fetchFeaturedTools();
  }, []);

  if (!featuredTools || featuredTools.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
        Öne Çıkan Araçlar
      </h2>
      <Carousel
        opts={{
          align: "start",
          loop: featuredTools.length > 2,
        }}
        className="w-full"
      >
        <CarouselContent>
          {featuredTools.map((tool) => {
            const isPremium = tool.tier === "Pro" || tool.tier === "Sponsorlu";
            return (
              <CarouselItem key={tool.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1 h-full">
                  <Card className={cn("h-full group", isPremium && tierStyles[tool.tier]?.card)}>
                    <CardContent className="relative flex flex-col items-start justify-between p-6 h-full">
                      <div>
                        {isPremium && (
                          <Badge className={cn("mb-2 flex w-fit items-center", tierStyles[tool.tier]?.badge)}>
                            {tierStyles[tool.tier]?.icon}
                            {tool.tier}
                          </Badge>
                        )}
                        <Link href={`/?category=${tool.category_slug}`} className="inline-block">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground w-fit mb-2 block hover:bg-primary hover:text-primary-foreground transition-colors">
                            {tool.category_name}
                          </span>
                        </Link>
                        <Link href={`/tool/${tool.slug}`} className="group">
                          <h3 className="text-lg font-semibold group-hover:text-primary">
                            {tool.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {tool.description}
                        </p>
                      </div>

                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTool(tool);
                            setIsPreviewOpen(true);
                          }}
                          variant="secondary"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Hızlı Bakış
                        </Button>
                      </div>

                  
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>

      {selectedTool && (
        <ToolPreviewDialog
          tool={selectedTool}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}

