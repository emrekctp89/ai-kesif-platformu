'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, LoaderCircle } from 'lucide-react';

export function JobReceiptPublicView({ interactionId, feedbackToken, locale = 'tr' }) {
  const t = useTranslations('Kasif');
  const [status, setStatus] = useState('loading');
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!interactionId || !feedbackToken) {
      setStatus('invalid');
      return undefined;
    }

    (async () => {
      setStatus('loading');
      try {
        const params = new URLSearchParams({
          id: interactionId,
          t: feedbackToken,
          locale: locale === 'en' ? 'en' : 'tr',
        });
        const res = await fetch(`/api/kasif/receipt?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data?.receipt) {
          setStatus(res.status === 404 ? 'not_found' : 'error');
          setReceipt(null);
          return;
        }
        setReceipt(data.receipt);
        setStatus('ready');
      } catch {
        if (!cancelled) {
          setStatus('error');
          setReceipt(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [interactionId, feedbackToken, locale]);

  async function copySummary() {
    if (!receipt?.shareText) return;
    try {
      await navigator.clipboard.writeText(receipt.shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border p-6 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t('job.receiptLoading')}
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        {t('job.receiptInvalid')}
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
        {t('job.receiptNotFound')}
      </div>
    );
  }

  if (status === 'error' || !receipt) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        {t('job.receiptError')}
      </div>
    );
  }

  const milestoneLabel =
    receipt.milestone === 'job_done'
      ? t('job.receiptMilestoneDone')
      : t('job.receiptMilestoneFirstResult');

  return (
    <article className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          {t('job.receiptTitle')}
        </p>
        <h2 className="text-xl font-bold">{milestoneLabel}</h2>
      </header>

      <dl className="space-y-2 text-sm">
        {receipt.tool?.title ? (
          <div className="flex justify-between gap-3 border-b border-border/60 py-2">
            <dt className="text-muted-foreground">{t('job.receiptTool')}</dt>
            <dd className="font-medium text-right">{receipt.tool.title}</dd>
          </div>
        ) : null}
        {receipt.goals?.length ? (
          <div className="flex justify-between gap-3 border-b border-border/60 py-2">
            <dt className="text-muted-foreground">{t('job.receiptGoals')}</dt>
            <dd className="font-medium text-right">{receipt.goals.join(', ')}</dd>
          </div>
        ) : null}
        {receipt.minutesToFirstResult != null ? (
          <div className="flex justify-between gap-3 border-b border-border/60 py-2">
            <dt className="text-muted-foreground">{t('job.receiptMinutes')}</dt>
            <dd className="font-medium text-right">
              ~{receipt.minutesToFirstResult} {t('job.receiptMinutesUnit')}
            </dd>
          </div>
        ) : null}
        {receipt.packId ? (
          <div className="flex justify-between gap-3 border-b border-border/60 py-2">
            <dt className="text-muted-foreground">{t('job.receiptPack')}</dt>
            <dd className="font-mono text-right text-xs">{receipt.packId}</dd>
          </div>
        ) : null}
        {receipt.artifact?.runnerSource ? (
          <div className="flex justify-between gap-3 border-b border-border/60 py-2">
            <dt className="text-muted-foreground">{t('job.receiptRunner')}</dt>
            <dd className="font-medium text-right">{receipt.artifact.runnerSource}</dd>
          </div>
        ) : null}
      </dl>

      {receipt.artifact?.preview ? (
        <div className="rounded-xl border bg-background/70 p-3">
          <p className="text-xs font-medium text-muted-foreground">{t('job.receiptPreview')}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
            {receipt.artifact.preview}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void copySummary()}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            {t('job.receiptCopied')}
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" aria-hidden="true" />
            {t('job.receiptCopySummary')}
          </>
        )}
      </button>
    </article>
  );
}
