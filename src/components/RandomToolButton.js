"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dice5 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function RandomToolButton({ user }) {
  const [isHovered, setIsHovered] = useState(false);

  if (!user) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* DEĞİŞİKLİK: Butonu bir span ile sarıyoruz */}
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
    );
  }

  // Giriş yapmış kullanıcı için normal buton
  return (
    <Button
      asChild
      variant="ghost"
      className="relative overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href="/random-tools"
        aria-label="Rastgele bir araç keşfet"
        className="flex items-center gap-2"
      >
        <AnimatePresence>
          {isHovered && (
            <motion.span
              key="text"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="text-sm font-semibold text-primary"
            >
              Keşfet
            </motion.span>
          )}
        </AnimatePresence>

        {/* İkonun da yumuşakça hafif sağa kayması */}
        <motion.div
          key="icon"
          initial={{ x: 0 }}
          animate={{ x: isHovered ? 4 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <Dice5 className="h-[1.2rem] w-[1.2rem]" />
        </motion.div>
      </Link>
    </Button>
  );
}
