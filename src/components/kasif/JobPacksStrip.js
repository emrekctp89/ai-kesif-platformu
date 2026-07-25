'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Layers3, Sparkles } from 'lucide-react';
import { listJobPacks, buildPackWorkmindUrl } from '@/lib/kasif/jobPacks';
import { trackEvent } from '@/utils/analytics';

/**
 * Job pack launcher strip for /kasif (P4 orchestration layer).
 */
export function JobPacksStrip({ locale = 'tr', onAskPack, compact = false }) {
  const t = useTranslations('Kasif');
  const packs = listJobPacks(locale);

  return (
    <section
      aria-labelledby="kasif-packs-heading"
      className={
        compact
          ? 'rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3'
          : 'rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-background to-violet-500/10 p-5 shadow-sm sm:p-6'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl">
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('packs.eyebrow')}
          </p>
          <h2 id="kasif-packs-heading" className="text-sm font-semibold sm:text-base">
            {t('packs.title')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t('packs.description')}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-amber-500" aria-hidden="true" />
          {t('packs.layerBadge')}
        </span>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => (
          <li
            key={pack.id}
            className="flex flex-col rounded-2xl border bg-background/90 p-3 shadow-sm transition-colors hover:border-amber-500/40"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold leading-snug">{pack.title}</h3>
                {pack.proHint ? (
                  <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                    {t('packs.proHint')}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pack.summary}</p>
              <ol className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {pack.stepLabels.slice(0, 3).map((label, index) => (
                  <li key={`${pack.id}-${index}`}>
                    {index + 1}. {label}
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  trackEvent('kasif_pack_ask', { pack_id: pack.id });
                  onAskPack?.(pack);
                }}
                className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                {t('packs.askKasif')}
              </button>
              <Link
                href={buildPackWorkmindUrl(pack, { locale })}
                onClick={() => trackEvent('kasif_pack_workmind', { pack_id: pack.id })}
                className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {t('packs.openWorkmind')}
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Compact pack suggestion after a recommendation turn.
 */
export function JobPackSuggestion({ pack, locale = 'tr', interactionId, feedbackToken }) {
  const t = useTranslations('Kasif');
  if (!pack) return null;

  return (
    <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
      <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
        {t('packs.matchedTitle')}
      </p>
      <p className="mt-0.5 text-sm font-medium">{pack.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{pack.summary}</p>
      <Link
        href={buildPackWorkmindUrl(pack, { locale, interactionId, feedbackToken })}
        onClick={() =>
          trackEvent('kasif_pack_matched_workmind', {
            pack_id: pack.id,
            goals: pack.goals?.join(',') || undefined,
          })
        }
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        {t('packs.runPack')}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
