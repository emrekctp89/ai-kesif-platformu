'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Layers3, Lock, Sparkles } from 'lucide-react';
import { listJobPacks, buildPackWorkmindUrl, isRunnablePack } from '@/lib/kasif/jobPacks';
import { buildPackPaywall } from '@/lib/kasif/packAccess';
import { trackEvent } from '@/utils/analytics';
import { PackRunnerPanel } from '@/components/kasif/PackRunnerPanel';

/**
 * Job pack launcher strip for /kasif (P4 orchestration layer).
 * Deep link: ?pack=seo-brief&runner=1 opens the pack runner panel.
 */
export function JobPacksStrip({
  locale = 'tr',
  onAskPack,
  compact = false,
  initialPackId = null,
  initialOpenRunner = false,
}) {
  const t = useTranslations('Kasif');
  const packs = listJobPacks(locale);
  const [access, setAccess] = useState(null);
  const safeInitial =
    initialPackId && isRunnablePack(initialPackId) ? String(initialPackId).trim() : null;
  const [runnerPackId, setRunnerPackId] = useState(
    initialOpenRunner && safeInitial ? safeInitial : null
  );
  const [highlightPackId, setHighlightPackId] = useState(safeInitial);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (typeof fetch !== 'function') return;
        const res = await fetch('/api/kasif/pack-access');
        if (!active || !res?.ok) return;
        const data = await res.json();
        if (active && data) setAccess(data);
      } catch {
        // offline / test env
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  // React to deep-link changes (learn path → /kasif?pack=&runner=1)
  useEffect(() => {
    if (!safeInitial) return;
    setHighlightPackId(safeInitial);
    if (initialOpenRunner) {
      setRunnerPackId(safeInitial);
      trackEvent('kasif_pack_runner_deep_link', { pack_id: safeInitial });
      window.setTimeout(() => {
        document.getElementById('kasif-pack-runner')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 120);
    } else {
      window.setTimeout(() => {
        document.getElementById(`kasif-pack-${safeInitial}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 80);
    }
  }, [safeInitial, initialOpenRunner]);

  function packLocked(packId) {
    const decision = access?.packs?.[packId];
    if (!decision) return false;
    return decision.allowed === false;
  }

  function lockReason(packId) {
    return access?.packs?.[packId]?.reason || null;
  }

  const quotaEmpty =
    access &&
    !access.isPro &&
    access.isAuthenticated &&
    access.freeRunsLeft != null &&
    access.freeRunsLeft <= 0;

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
          {access && !access.isPro && access.freeRunsLeft != null && access.freeRunsLeft > 0 ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {t('packs.quotaHint', {
                left: access.freeRunsLeft,
                total: access.freeProPackQuota ?? 2,
              })}
            </p>
          ) : null}
          {quotaEmpty ? (
            <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-4 text-amber-950 dark:text-amber-100">
              <p className="font-semibold">{t('packs.paywallQuotaTitle')}</p>
              <p className="mt-0.5 opacity-90">{t('packs.quotaEmptyHint')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href={locale === 'en' ? '/en/uyelik' : '/uyelik'}
                  className="font-semibold text-primary hover:underline"
                  onClick={() => trackEvent('kasif_pack_quota_upgrade_click')}
                >
                  {t('packs.upgradeCta')}
                </Link>
                <Link
                  href={
                    locale === 'en'
                      ? '/en/kasif?pack=seo-brief&runner=1'
                      : '/kasif?pack=seo-brief&runner=1'
                  }
                  className="font-semibold text-primary hover:underline"
                  onClick={() => trackEvent('kasif_pack_quota_free_runner_click')}
                >
                  {t('packs.paywallTryFreeRunner')}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          <Sparkles className="h-3 w-3 text-amber-500" aria-hidden="true" />
          {t('packs.layerBadge')}
        </span>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => {
          const locked = packLocked(pack.id);
          const reason = lockReason(pack.id);
          const paywall = locked
            ? buildPackPaywall(locale, reason || 'pro_required', { packId: pack.id })
            : null;
          return (
            <li
              key={pack.id}
              id={`kasif-pack-${pack.id}`}
              className={`flex flex-col rounded-2xl border bg-background/90 p-3 shadow-sm transition-colors hover:border-amber-500/40 ${
                highlightPackId === pack.id ? 'border-violet-500/50 ring-2 ring-violet-500/25' : ''
              } ${locked ? 'opacity-95' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug">{pack.title}</h3>
                  {pack.proHint ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                      {locked ? <Lock className="h-2.5 w-2.5" aria-hidden="true" /> : null}
                      {t('packs.proHint')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pack.summary}</p>
                {locked ? (
                  <p className="mt-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    {reason === 'login_required'
                      ? t('packs.lockedHintLogin')
                      : t('packs.lockedHintQuota')}
                  </p>
                ) : null}
                <ol className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {pack.stepLabels.slice(0, 3).map((label, index) => (
                    <li key={`${pack.id}-${index}`}>
                      {index + 1}. {label}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {locked && paywall ? (
                  <>
                    <Link
                      href={paywall.ctaHref}
                      onClick={() =>
                        trackEvent('kasif_pack_locked_click', {
                          pack_id: pack.id,
                          reason,
                        })
                      }
                      className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-100"
                    >
                      <Lock className="h-3 w-3" aria-hidden="true" />
                      {t(paywall.ctaKey)}
                    </Link>
                    <Link
                      href={paywall.secondaryHref}
                      onClick={() =>
                        trackEvent('kasif_pack_locked_free_alt', {
                          pack_id: pack.id,
                          reason,
                        })
                      }
                      className="inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      {t(paywall.secondaryKey)}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </>
                ) : (
                  <>
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
                    {isRunnablePack(pack.id) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRunnerPackId((current) => (current === pack.id ? null : pack.id));
                          trackEvent('kasif_pack_runner_open', { pack_id: pack.id });
                        }}
                        className="inline-flex min-h-8 w-full items-center justify-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold text-violet-900 dark:text-violet-100"
                      >
                        {t('packs.runnerOpen')}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {runnerPackId && isRunnablePack(runnerPackId) && !packLocked(runnerPackId) ? (
        <div id="kasif-pack-runner" className="scroll-mt-24">
          <PackRunnerPanel locale={locale} packId={runnerPackId} />
        </div>
      ) : null}
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
