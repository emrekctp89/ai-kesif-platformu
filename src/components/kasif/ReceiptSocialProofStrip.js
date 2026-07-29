'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Users, Timer, CheckCircle2, Package } from 'lucide-react';

/**
 * Compact anonymous milestone counters for Kâşif landing / receipt page.
 */
export function ReceiptSocialProofStrip({
  windowDays = 30,
  className = '',
  compact = false,
  showEmpty = false,
  showPackLeaders = true,
  packLeadersLimit = 3,
}) {
  const t = useTranslations('Kasif');
  const locale = useLocale();
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    const days = Math.min(90, Math.max(1, Number(windowDays) || 30));

    (async () => {
      setStatus('loading');
      try {
        const res = await fetch(`/api/kasif/receipt-stats?windowDays=${days}`, {
          credentials: 'omit',
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data?.stats) {
          setStatus('error');
          setStats(null);
          return;
        }
        setStats(data.stats);
        setStatus('ready');
      } catch {
        if (!cancelled) {
          setStatus('error');
          setStats(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  if (status === 'loading') {
    if (compact) return null;
    return (
      <div
        className={`rounded-2xl border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground ${className}`}
        aria-busy="true"
      >
        {t('job.receiptSocialLoading')}
      </div>
    );
  }

  if (status === 'error' || !stats) {
    return null;
  }

  if (!stats.visible) {
    if (!showEmpty) return null;
    return (
      <div
        className={`rounded-2xl border bg-card/60 px-4 py-3 text-xs text-muted-foreground ${className}`}
      >
        {t('job.receiptSocialEmpty')}
      </div>
    );
  }

  const packLeaders = showPackLeaders
    ? (Array.isArray(stats.topPacks) ? stats.topPacks : [])
        .filter((p) => p?.packId && Number(p.count) > 0)
        .slice(0, Math.max(1, Math.min(5, Number(packLeadersLimit) || 3)))
    : [];

  const packBase = locale === 'en' ? '/en/kasif' : '/kasif';

  const shell = compact
    ? `inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground ${className}`
    : `rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 sm:px-5 ${className}`;

  return (
    <div className={shell} role="status" aria-live="polite">
      {!compact ? (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {t('job.receiptSocialTitle')}
        </p>
      ) : null}
      <p
        className={
          compact ? 'inline-flex items-center gap-1.5' : 'text-sm font-medium text-foreground'
        }
      >
        <Users
          className="inline h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        {t('job.receiptSocialLine', {
          days: stats.windowDays,
          firstResults: stats.firstResults,
          jobDones: stats.jobDones,
        })}
      </p>
      <div
        className={
          compact
            ? 'contents'
            : 'mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'
        }
      >
        {stats.avgMinutesToFirstResult != null ? (
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3 w-3 shrink-0" aria-hidden="true" />
            {t('job.receiptSocialAvg', { minutes: stats.avgMinutesToFirstResult })}
          </span>
        ) : null}
        {stats.doneOfFirstResult != null ? (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
            {t('job.receiptSocialDoneRate', { rate: stats.doneOfFirstResult })}
          </span>
        ) : null}
      </div>
      {packLeaders.length > 0 ? (
        <div
          className={
            compact
              ? 'inline-flex flex-wrap items-center gap-1.5'
              : 'mt-2 flex flex-wrap items-center gap-1.5'
          }
        >
          {!compact ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Package className="h-3 w-3" aria-hidden="true" />
              {t('job.receiptSocialPacks')}:
            </span>
          ) : (
            <Package className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          {packLeaders.map((pack) => (
            <Link
              key={pack.packId}
              href={`${packBase}?pack=${encodeURIComponent(pack.packId)}&runner=1`}
              prefetch={false}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-background/70 px-2 py-0.5 font-mono text-[10px] font-medium text-foreground transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10"
              title={t('job.receiptSocialPackHint', { pack: pack.packId, count: pack.count })}
            >
              {pack.packId}
              <span className="text-muted-foreground">×{pack.count}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
