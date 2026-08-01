'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Bot, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KasifChatCore } from '@/components/kasif/KasifChatCore';

/**
 * Global floating Kâşif widget. Mounted once in the locale layout so the full
 * Kâşif chat experience (KasifChatCore) is reachable from any page without
 * navigating away, while still linking out to the full-page experience.
 */
export function KasifWidget({ enabled = true }) {
  const t = useTranslations('Kasif');
  const [isOpen, setIsOpen] = React.useState(false);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="fixed bottom-20 right-6 z-[100]"
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="h-16 w-16 rounded-full shadow-lg"
          aria-label={t('widgetOpenLabel')}
        >
          <Bot className="h-8 w-8" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-[100] flex h-[75vh] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between gap-2 border-b p-3">
              <Link
                href="/kasif-deney"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('widgetExpand')}
              </Link>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={t('widgetClose')}
              >
                <X className="h-4 w-4" />
              </Button>
            </header>
            <div className="flex-1 overflow-y-auto p-3">
              <Suspense fallback={null}>
                <KasifChatCore variant="widget" />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
