/*
 * ---------------------------------------------------
 * 1. YENİ BİLEŞEN: src/components/BadgesShowcase.js
 * Bu, kazanılan rozetleri şık ikonlarla gösterir.
 * ---------------------------------------------------
 */
"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Handshake,
  MessageSquare,
  Heart,
  Star,
  Image,
  Library,
  Trophy,
  Award,
  Flame,
  Crown,
  Medal,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";

// icon_name'i gerçek bir ikona dönüştüren yardımcı obje
const iconMap = {
  Handshake,
  MessageSquare,
  Heart,
  Star,
  Image,
  Library,
  Trophy,
  Flame,
  Award,
  Crown,
  Medal,
  Gem,
};

// Rozet seviyesine göre renk belirleyen yardımcı obje
const tierColors = {
  bronze:
    "bg-orange-200 border-orange-400 text-orange-800 dark:bg-orange-900/50 dark:border-orange-700 dark:text-orange-300",
  silver:
    "bg-slate-200 border-slate-400 text-slate-800 dark:bg-slate-700/50 dark:border-slate-500 dark:text-slate-300",
  gold: "bg-yellow-200 border-yellow-400 text-yellow-800 dark:bg-yellow-700/50 dark:border-yellow-500 dark:text-yellow-300",
};

export function BadgesShowcase({ badges }) {
  if (!badges || badges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Henüz hiç rozet kazanılmadı.
      </p>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-wrap gap-3">
        {badges.map((badge, index) => {
          const IconComponent = iconMap[badge.icon_name] || Award;
          const tierClass = tierColors[badge.tier] || tierColors.bronze;

          return (
            <Tooltip key={index}>
              <TooltipTrigger>
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-transform hover:scale-110",
                    tierClass
                  )}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-bold">{badge.name}</p>
                <p className="text-xs">{badge.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
