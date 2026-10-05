'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Globe2, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';

const SESSION_KEY = 'english-experience-notice-v1';

export function EnglishExperienceNotice() {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const continueRef = useRef(null);

  useEffect(() => {
    if (locale !== 'en') {
      setOpen(false);
      return;
    }
    try {
      setOpen(sessionStorage.getItem(SESSION_KEY) !== 'dismissed');
    } catch {
      setOpen(true);
    }
  }, [locale]);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, 'dismissed');
    } catch {
      /* Keep the notice usable when browser storage is unavailable. */
    }
  }

  if (locale !== 'en') return null;
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[110] backdrop-blur-sm"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.95) 100%)',
          }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[111] w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/15 bg-black/65 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-9"
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            continueRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById('main-content')?.focus();
          }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80">
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" /> English · Work in progress
          </div>
          <Dialog.Title className="max-w-sm text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Our English experience is still growing
          </Dialog.Title>
          <Dialog.Description className="mt-4 text-sm leading-7 text-white/75 sm:text-base">
            Some pages and content are still being translated and improved. For the most complete
            experience, explore the Turkish version—or continue in English.
          </Dialog.Description>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              ref={continueRef}
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Continue in English <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link
              href={pathname || '/'}
              locale="tr"
              onClick={dismiss}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore in Turkish
            </Link>
          </div>
          <Dialog.Close
            aria-label="Close notice"
            className="absolute right-4 top-4 rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
