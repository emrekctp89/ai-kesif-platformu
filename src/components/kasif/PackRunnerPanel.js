'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, LoaderCircle, Sparkles, Wand2 } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { isRunnablePack } from '@/lib/kasif/jobPacks';

const PLACEHOLDER_KEYS = {
  'content-studio': 'packs.runnerBriefPlaceholder',
  'sales-outreach': 'packs.runnerBriefPlaceholderSales',
  'meeting-to-action': 'packs.runnerBriefPlaceholderMeeting',
  'social-launch': 'packs.runnerBriefPlaceholderSocial',
  'pitch-deck': 'packs.runnerBriefPlaceholderPitch',
};

const TITLE_KEYS = {
  'content-studio': 'packs.runnerTitle',
  'sales-outreach': 'packs.runnerTitleSales',
  'meeting-to-action': 'packs.runnerTitleMeeting',
  'social-launch': 'packs.runnerTitleSocial',
  'pitch-deck': 'packs.runnerTitlePitch',
};

const HINT_KEYS = {
  'content-studio': 'packs.runnerHint',
  'sales-outreach': 'packs.runnerHintSales',
  'meeting-to-action': 'packs.runnerHintMeeting',
  'social-launch': 'packs.runnerHintSocial',
  'pitch-deck': 'packs.runnerHintPitch',
};

/**
 * Multi-pack runner — generates first deliverable on-platform.
 */
export function PackRunnerPanel({
  locale = 'tr',
  packId = 'content-studio',
  defaultBrief = '',
  onComplete,
}) {
  const t = useTranslations('Kasif');
  const safePackId = isRunnablePack(packId) ? packId : 'content-studio';
  const [brief, setBrief] = useState(defaultBrief);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBrief(defaultBrief || '');
    setResult(null);
    setError(null);
    setStatus('idle');
  }, [safePackId, defaultBrief]);

  async function run(event) {
    event.preventDefault();
    setError(null);
    if (brief.trim().length < 8) {
      setError(t('packs.runnerBriefShort'));
      return;
    }
    setStatus('running');
    try {
      const response = await fetch('/api/kasif/pack-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: safePackId,
          brief: brief.trim(),
          locale,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.upgradePath) {
          throw Object.assign(new Error(data.error || t('packs.runnerFailed')), {
            upgradePath: data.upgradePath,
            reason: data.reason,
          });
        }
        throw new Error(data.error || t('packs.runnerFailed'));
      }
      setResult(data);
      setStatus('done');
      trackEvent('kasif_pack_runner_done', {
        pack_id: safePackId,
        source: data.run?.source,
        char_count: data.artifactText?.length,
      });
      onComplete?.(data);
    } catch (err) {
      setStatus('error');
      setError(err?.message || t('packs.runnerFailed'));
      if (err?.upgradePath) {
        setResult({ upgradePath: err.upgradePath, reason: err.reason });
      }
    }
  }

  async function copyAll() {
    if (!result?.artifactText) return;
    try {
      await navigator.clipboard.writeText(result.artifactText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('job.copyError'));
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-900 dark:text-violet-100">
        <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t(TITLE_KEYS[safePackId] || TITLE_KEYS['content-studio'])}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(HINT_KEYS[safePackId] || HINT_KEYS['content-studio'])}
      </p>

      <form onSubmit={run} className="mt-3 space-y-2">
        <label htmlFor={`pack-runner-brief-${safePackId}`} className="sr-only">
          {t('packs.runnerBriefLabel')}
        </label>
        <textarea
          id={`pack-runner-brief-${safePackId}`}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={3}
          maxLength={800}
          placeholder={t(PLACEHOLDER_KEYS[safePackId] || PLACEHOLDER_KEYS['content-studio'])}
          className="w-full resize-y rounded-lg border bg-background p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          disabled={status === 'running'}
        />
        <button
          type="submit"
          disabled={status === 'running' || brief.trim().length < 8}
          className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 sm:w-auto"
        >
          {status === 'running' ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {status === 'running' ? t('packs.runnerRunning') : t('packs.runnerCta')}
        </button>
      </form>

      {error ? (
        <div className="mt-2 space-y-1">
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
          {result?.upgradePath ? (
            <a
              href={result.upgradePath}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t('packs.upgradeCta')}
            </a>
          ) : null}
        </div>
      ) : null}

      {result?.run ? (
        <div className="mt-3 space-y-2 rounded-xl border bg-background/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {t('packs.runnerDone', { source: result.run.source || 'local' })}
            </p>
            <button
              type="button"
              onClick={() => void copyAll()}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium hover:bg-muted"
            >
              <Copy className="h-3 w-3" />
              {copied ? t('job.copied') : t('packs.runnerCopy')}
            </button>
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-[11px] leading-4 text-muted-foreground">
            {result.artifactText}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
