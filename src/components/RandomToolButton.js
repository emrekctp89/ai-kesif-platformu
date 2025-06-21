"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dice5 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
// DEĞİŞİKLİK: TooltipProvider'ı bu dosyaya geri import ediyoruz
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function RandomToolButton({ user }) {
  const [isHovered, setIsHovered] = useState(false);

  // Eğer kullanıcı giriş yapmamışsa, ipucu gösteren versiyonu render et
  if (!user) {
    return (
      // DEĞİŞİKLİK: Bu bileşenin kendi TooltipProvider'ını ekliyoruz.
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button
                variant="ghost"
                size="icon"
                disabled
                style={{ pointerEvents: "none" }}
              >
                <Dice5 className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Bu özellik için giriş yapmalısınız.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Eğer kullanıcı giriş yapmışsa, normal ve fonksiyonel butonu render et
  return (
    <Button
      asChild
      variant="ghost"
      className="relative overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href="/random-tools" aria-label="Rastgele bir araç keşfet">
        <AnimatePresence>
          {isHovered && (
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="mr-2 text-sm font-semibold"
            >
              Keşfet
            </motion.span>
          )}
        </AnimatePresence>
        <motion.div className="group-hover:animate-none animate-roll">
          <Dice5 className="h-[1.2rem] w-[1.2rem]" />
        </motion.div>
      </Link>
    </Button>
  );
}
