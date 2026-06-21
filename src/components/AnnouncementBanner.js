"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X } from "lucide-react";
import { Button } from "./ui/button";
import { FeedbackDialog } from "./FeedbackDialog"; // Yeni bileşeni import ediyoruz

const ANNOUNCEMENT_ID = "welcome-banner-v1";

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(ANNOUNCEMENT_ID);
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(ANNOUNCEMENT_ID, "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4"
        >
          <div className="container mx-auto">
            <div
              role="region"
              aria-label="Geliştirme duyurusu"
              className="flex items-start justify-between gap-2 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:items-center sm:gap-4 sm:p-4"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
                <div className="hidden rounded-full bg-primary/10 p-2 sm:block">
                  <Megaphone aria-hidden="true" className="h-5 w-5 text-primary" />
                </div>
                <p className="line-clamp-3 text-xs leading-5 text-muted-foreground sm:line-clamp-none sm:text-sm">
                  <span className="font-semibold text-foreground">
                    Geliştirme Notu:
                  </span>{" "}
                  Platformumuz henüz çok yeni ve sürekli olarak yeni özellikler
                  ekleniyor. Bir sorunla karşılaşırsanız veya bir fikriniz
                  varsa, bizimle paylaşmaktan çekinmeyin!
                </p>
                {/* DEĞİŞİKLİK: Geri bildirim butonu fare üzerine gelince görünüyor */}
                <div className="hidden sm:block">
                <AnimatePresence>
                  {isHovered && <FeedbackDialog />}
                </AnimatePresence>
                </div>
              </div>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
              >
                <X aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Kapat</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
