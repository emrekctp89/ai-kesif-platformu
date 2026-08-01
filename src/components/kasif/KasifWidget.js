'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Bot, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KasifChatCore } from '@/components/kasif/KasifChatCore';

// Pages that already render the full Kâşif experience — hide the floating
// widget there so the chat isn't shown twice.
const KASIF_PAGE_PATTERN = /^\/(en\/)?kasif(-deney)?(\/|$)/;

/**
 * Global floating Kâşif widget. Mounted once in the locale layout so the full
 * Kâşif chat experience (KasifChatCore) is reachable from any page without
 * navigating away, while still linking out to the full-page experience.
 */
export function KasifWidget({ enabled = true }) {
  const t = useTranslations('Kasif');
  const tc = useTranslations('Common');
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  if (!enabled) return null;
  if (KASIF_PAGE_PATTERN.test(pathname || '')) return null;

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="fixed bottom-6 right-6 z-[100]"
      >
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            aria-label={t('widgetOpenLabel')}
            title={t('widgetOpenLabel')}
          >
            <Bot className="h-7 w-7" />
          </Button>
        )}
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="dialog"
            aria-modal="false"
            aria-label={t('title')}
            className="fixed bottom-4 right-4 z-[100] flex h-[min(38rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl"
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
              <div className="flex min-w-0 items-center gap-2">
                <Bot className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">{t('title')}</p>
                  <Link
                    href="/kasif"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('widgetExpand')}
                  </Link>
                </div>
              </div>
              <Button
                onClick={() => setIsOpen(false)}
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label={tc('close')}
              >
                <X className="h-4 w-4" />
              </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <KasifChatCore compact showHeader={false} showStarters maxStarters={4} autoFocus />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
