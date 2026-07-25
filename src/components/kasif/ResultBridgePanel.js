'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardPaste, LoaderCircle, Sparkles } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { resolveBridgeGoal, validateBridgeArtifact } from '@/lib/kasif/resultBridge';
import { formatKasifGoalLabel } from '@/lib/kasif/goalLabels';

const BRIDGE_ERROR_KEYS = {
  empty: 'bridgeErrorEmpty',
  too_short: 'bridgeErrorTooShort',
  too_long: 'bridgeErrorTooLong',
  weak_structure: 'bridgeErrorWeak',
  unsupported_goal: 'bridgeErrorUnsupported',
  invalid: 'bridgeErrorFailed',
  failed: 'bridgeErrorFailed',
};

const PLACEHOLDER_KEYS = {
  'email-writing': 'bridgePlaceholderEmail',
  'content-writing': 'bridgePlaceholderContent',
  'presentation-creation': 'bridgePlaceholderPresentation',
  'image-generation': 'bridgePlaceholderImage',
  'workflow-automation': 'bridgePlaceholderAutomation',
  'meeting-notes': 'bridgePlaceholderMeeting',
};

/**
 * Copy-paste first-result bridge for supported goals (P3).
 */
export function ResultBridgePanel({
  interactionId,
  feedbackToken,
  goals = [],
  locale = 'tr',
  onSuccess,
}) {
  const t = useTranslations('Kasif.job');
  const bridgeGoal = useMemo(() => resolveBridgeGoal(goals), [goals]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [markDone, setMarkDone] = useState(false);

  if (!bridgeGoal || !interactionId || !feedbackToken) return null;

  const preview = validateBridgeArtifact(bridgeGoal, text);
  const goalLabel = formatKasifGoalLabel(bridgeGoal, locale);
  const placeholderKey = PLACEHOLDER_KEYS[bridgeGoal] || 'bridgePlaceholderDefault';

  async function submit(event) {
    event.preventDefault();
    setError(null);
    const clientCheck = validateBridgeArtifact(bridgeGoal, text);
    if (!clientCheck.ok) {
      const key = BRIDGE_ERROR_KEYS[clientCheck.reason] || 'bridgeErrorFailed';
      setError(t(key));
      return;
    }

    setStatus('sending');
    try {
      const response = await fetch('/api/kasif/result-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionId,
          feedbackToken,
          goal: bridgeGoal,
          text,
          locale,
          markJobDone: markDone,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || t('bridgeErrorFailed'));
      }

      setSaved({
        charCount: data.artifact?.char_count,
        minutes: data.minutesToFirstResult,
        jobDone: data.jobDone,
      });
      setStatus('saved');
      trackEvent('kasif_result_bridge_paste', {
        goal: bridgeGoal,
        char_count: data.artifact?.char_count,
        minutes: data.minutesToFirstResult,
        job_done: Boolean(data.jobDone),
      });
      onSuccess?.(data);
    } catch (err) {
      setStatus('error');
      setError(err?.message || t('bridgeErrorFailed'));
    }
  }

  if (saved) {
    return (
      <div className="mt-3 space-y-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('bridgeSuccessTitle')}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('bridgeSuccessBody', {
            chars: saved.charCount ?? 0,
            minutes: saved.minutes ?? '—',
          })}
        </p>
        {saved.jobDone ? (
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
            {t('bridgeJobDoneNote')}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-2 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3"
    >
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-100">
          <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
          {t('bridgeTitle')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t('bridgeHint', { goal: goalLabel })}</p>
      </div>

      <label htmlFor={`result-bridge-${interactionId}`} className="sr-only">
        {t('bridgeLabel')}
      </label>
      <textarea
        id={`result-bridge-${interactionId}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={5}
        maxLength={40000}
        placeholder={t(placeholderKey)}
        className="w-full resize-y rounded-lg border bg-background p-2 text-xs leading-5 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        disabled={status === 'sending'}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          {text.trim().length}
          {preview.ok ? ` · ${t('bridgeReady')}` : ''}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={markDone}
            onChange={(event) => setMarkDone(event.target.checked)}
            className="h-3.5 w-3.5 rounded border"
          />
          {t('bridgeAlsoJobDone')}
        </label>
      </div>

      <button
        type="submit"
        disabled={status === 'sending' || text.trim().length < 20}
        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
      >
        {status === 'sending' ? (
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {t('bridgeSubmit')}
      </button>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
