'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Sparkles, X } from 'lucide-react';
import {
  hasSeenProPackOnboarding,
  markProPackOnboardingSeen,
  pickLocale,
  PRO_PACK_ONBOARDING_STEPS,
} from '@/lib/kasif/packOnboarding';
import { trackEvent } from '@/utils/analytics';

/**
 * Lightweight first-run tour when opening a Pro pack runner.
 */
export function ProPackOnboarding({ locale = 'tr', packId = '', enabled = true }) {
  const t = useTranslations('Kasif');
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (hasSeenProPackOnboarding()) return;
    setOpen(true);
    trackEvent('kasif_pro_onboarding_show', { pack_id: packId || undefined });
  }, [enabled, packId]);

  if (!open || !enabled) return null;

  const step = PRO_PACK_ONBOARDING_STEPS[stepIndex] || PRO_PACK_ONBOARDING_STEPS[0];
  const isLast = stepIndex >= PRO_PACK_ONBOARDING_STEPS.length - 1;

  function dismiss(final = false) {
    markProPackOnboardingSeen(final ? 'complete' : 'dismiss');
    setOpen(false);
    trackEvent(final ? 'kasif_pro_onboarding_complete' : 'kasif_pro_onboarding_dismiss', {
      pack_id: packId || undefined,
      step: step.id,
    });
  }

  function next() {
    if (isLast) {
      dismiss(true);
      return;
    }
    setStepIndex((i) => i + 1);
  }

  return (
    <div
      className="mb-3 rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-background to-violet-500/10 p-3 shadow-sm"
      role="dialog"
      aria-label={t('packs.onboardingTitle')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('packs.onboardingEyebrow')}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{t('packs.onboardingTitle')}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t('packs.onboardingSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismiss(false)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t('packs.onboardingSkip')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ol className="mt-3 flex flex-wrap gap-1.5">
        {PRO_PACK_ONBOARDING_STEPS.map((s, i) => (
          <li
            key={s.id}
            className={`inline-flex h-1.5 w-8 rounded-full ${
              i <= stepIndex ? 'bg-amber-500' : 'bg-muted'
            }`}
            aria-hidden="true"
          />
        ))}
      </ol>

      <div className="mt-3 rounded-xl border bg-background/80 px-3 py-2.5">
        <p className="text-xs font-semibold text-foreground">{pickLocale(step.title, locale)}</p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {pickLocale(step.body, locale)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => dismiss(false)}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          {t('packs.onboardingSkip')}
        </button>
        <button
          type="button"
          onClick={next}
          className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
        >
          {isLast ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t('packs.onboardingDone')}
            </>
          ) : (
            t('packs.onboardingNext')
          )}
        </button>
      </div>
    </div>
  );
}
