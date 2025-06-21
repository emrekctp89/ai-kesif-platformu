"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function CommandHint() {
  const [isVisible, setIsVisible] = useState(false);

  // Sayfa yüklendikten 3 saniye sonra ipucunu göster
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2 px-3 text-xs font-medium text-muted-foreground shadow-md">
            <span>Hızlı Arama</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">Ctrl</span>K
            </kbd>
            /
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">Cmd</span>K
            </kbd>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
