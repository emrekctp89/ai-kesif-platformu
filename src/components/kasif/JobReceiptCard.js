'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { buildClientJobReceipt } from '@/lib/kasif/jobReceipt';

/**
 * Shareable milestone card after first_result / job_done.
 */
export function JobReceiptCard({
  interactionId,
  feedbackToken,
  source = null,
  goals = [],
  minutes = null,
  firstResult = null,
  jobDone = null,
  packId = null,
  locale = 'tr',
}) {
  const t = useTranslations('Kasif');
  const [copied, setCopied] = useState(null);

  const receipt = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return buildClientJobReceipt({
      interactionId,
      feedbackToken,
      source,
      goals,
      minutes,
      firstResult,
      jobDone,
      packId,
      locale,
      origin,
    });
  }, [interactionId, feedbackToken, source, goals, minutes, firstResult, jobDone, packId, locale]);

  if (!receipt.hasMilestone || !interactionId || !feedbackToken) return null;

  async function copyText(kind) {
    const value = kind === 'link' ? receipt.shareUrl || receipt.sharePath : receipt.shareText;
    if (!value) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement('textarea');
        area.value = value;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(kind);
      trackEvent('kasif_job_receipt_copy', {
        kind,
        milestone: receipt.milestone || undefined,
        pack_id: receipt.packId || undefined,
        tool_id: source?.id || undefined,
      });
      window.setTimeout(() => {
        setCopied((current) => (current === kind ? null : current));
      }, 2000);
    } catch {
      /* ignore */
    }
  }

  const milestoneLabel =
    receipt.milestone === 'job_done'
      ? t('job.receiptMilestoneDone')
      : t('job.receiptMilestoneFirstResult');

  return (
    <div className="space-y-2 rounded-xl border border-emerald-600/30 bg-background/80 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('job.receiptTitle')}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{milestoneLabel}</p>
        </div>
        {receipt.sharePath ? (
          <Link
            href={receipt.sharePath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
            onClick={() =>
              trackEvent('kasif_job_receipt_open', {
                milestone: receipt.milestone || undefined,
                pack_id: receipt.packId || undefined,
              })
            }
          >
            {t('job.receiptOpen')}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <ul className="space-y-1 text-xs text-muted-foreground">
        {receipt.tool?.title ? (
          <li>
            <span className="font-medium text-foreground">{t('job.receiptTool')}:</span>{' '}
            {receipt.tool.title}
          </li>
        ) : null}
        {receipt.goals?.length ? (
          <li>
            <span className="font-medium text-foreground">{t('job.receiptGoals')}:</span>{' '}
            {receipt.goals.join(', ')}
          </li>
        ) : null}
        {receipt.minutesToFirstResult != null ? (
          <li>
            <span className="font-medium text-foreground">{t('job.receiptMinutes')}:</span> ~
            {receipt.minutesToFirstResult} {t('job.receiptMinutesUnit')}
          </li>
        ) : null}
        {receipt.packId ? (
          <li>
            <span className="font-medium text-foreground">{t('job.receiptPack')}:</span>{' '}
            <code className="text-[11px]">{receipt.packId}</code>
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyText('summary')}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-[11px] font-semibold hover:bg-muted"
        >
          {copied === 'summary' ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
              {t('job.receiptCopied')}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              {t('job.receiptCopySummary')}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => void copyText('link')}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-[11px] font-semibold hover:bg-muted"
        >
          {copied === 'link' ? (
            <>
              <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
              {t('job.receiptCopied')}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" aria-hidden="true" />
              {t('job.receiptCopyLink')}
            </>
          )}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">{t('job.receiptHint')}</p>
    </div>
  );
}
