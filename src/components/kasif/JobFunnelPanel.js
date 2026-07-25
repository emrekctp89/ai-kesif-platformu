'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Copy, ExternalLink, LoaderCircle } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { resolveJobWizard } from '@/lib/kasif/jobWizards';
import { formatKasifGoalLabel } from '@/lib/kasif/goalLabels';

const MINUTE_OPTIONS = [5, 15, 30, 60];

/**
 * Goal-aware job setup checklist + self-report survey for Kâşif recommendations.
 */
export function JobFunnelPanel({
  interactionId,
  feedbackToken,
  source,
  locale = 'tr',
  goals = [],
  initialSelected = false,
}) {
  const t = useTranslations('Kasif');
  const wizard = useMemo(() => resolveJobWizard(goals, locale), [goals, locale]);
  const primaryGoal = Array.isArray(goals) && goals.length ? goals[0] : wizard.id;

  const [active, setActive] = useState(Boolean(initialSelected));
  const [checked, setChecked] = useState(() =>
    Object.fromEntries(wizard.steps.map((step) => [step.id, false]))
  );
  const [setupDone, setSetupDone] = useState(false);
  const [firstResult, setFirstResult] = useState(null);
  const [minutes, setMinutes] = useState(null);
  const [jobDone, setJobDone] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState(null);

  const selectedTool = source
    ? {
        id: source.id,
        slug: source.slug || null,
        title: source.title,
      }
    : null;

  const allStepsDone = useMemo(
    () => wizard.steps.length > 0 && wizard.steps.every((step) => checked[step.id]),
    [checked, wizard.steps]
  );

  const postStage = useCallback(
    async (stage, extra = {}) => {
      if (!interactionId || !feedbackToken) return false;
      setStatus('sending');
      setError(null);
      try {
        const response = await fetch('/api/kasif/funnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interactionId,
            feedbackToken,
            stage,
            locale,
            selectedTool,
            ...extra,
            meta: {
              goal: primaryGoal || undefined,
              wizard_id: wizard.id,
              ...(extra.meta && typeof extra.meta === 'object' ? extra.meta : {}),
            },
          }),
        });
        if (!response.ok) throw new Error('FUNNEL_FAILED');
        trackEvent(`kasif_funnel_${stage}`, {
          tool_id: selectedTool?.id || undefined,
          tool_title: selectedTool?.title || undefined,
          goal: primaryGoal || undefined,
          wizard_id: wizard.id,
          minutes: extra.minutesToFirstResult ?? undefined,
        });
        setStatus('saved');
        return true;
      } catch {
        setStatus('error');
        setError(t('job.saveError'));
        return false;
      }
    },
    [feedbackToken, interactionId, locale, primaryGoal, selectedTool, t, wizard.id]
  );

  async function startWithTool() {
    setActive(true);
    await postStage('tool_selected', { meta: { action: 'continue_with' } });
    await postStage('setup_started', {
      meta: { action: 'setup_panel', wizard_id: wizard.id },
    });
  }

  async function markSetupCompleted(meta = {}) {
    if (setupDone) return;
    setSetupDone(true);
    setChecked((current) => {
      const next = { ...current };
      for (const step of wizard.steps) next[step.id] = true;
      return next;
    });
    await postStage('setup_completed', {
      meta: { action: 'user_mark_done', ...meta },
    });
  }

  function toggleStep(stepId) {
    setChecked((current) => {
      const next = { ...current, [stepId]: !current[stepId] };
      const done = wizard.steps.every((step) => next[step.id]);
      if (done && !setupDone) {
        void markSetupCompleted({ action: 'all_steps_checked' });
      }
      return next;
    });
  }

  async function reportFirstResult(value) {
    setFirstResult(value);
  }

  async function confirmFirstResult(yes, minuteValue) {
    setFirstResult(yes);
    if (yes) {
      const mins = minuteValue ?? minutes ?? 15;
      setMinutes(mins);
      if (!setupDone) {
        await markSetupCompleted({ action: 'first_result_implies_setup' });
      }
      await postStage('first_result', {
        minutesToFirstResult: mins,
        meta: { self_report: true },
      });
    }
  }

  async function reportJobDone(value) {
    setJobDone(value);
    if (value === true) {
      if (firstResult !== true) {
        await confirmFirstResult(true, minutes ?? 15);
      }
      await postStage('job_done', { meta: { self_report: true } });
      setCompleted(true);
    } else if (value === 'partial') {
      if (firstResult !== true) {
        await confirmFirstResult(true, minutes ?? 15);
      }
      setCompleted(true);
    } else {
      setCompleted(true);
    }
  }

  async function copyPrompt(prompt) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt.body);
      } else {
        const area = document.createElement('textarea');
        area.value = prompt.body;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopiedPromptId(prompt.id);
      trackEvent('kasif_wizard_prompt_copy', {
        prompt_id: prompt.id,
        wizard_id: wizard.id,
        goal: primaryGoal || undefined,
        tool_id: selectedTool?.id || undefined,
      });
      window.setTimeout(() => {
        setCopiedPromptId((current) => (current === prompt.id ? null : current));
      }, 2000);
    } catch {
      setError(t('job.copyError'));
    }
  }

  if (!source || !interactionId || !feedbackToken) return null;

  const goalLabel =
    primaryGoal && primaryGoal !== 'default' ? formatKasifGoalLabel(primaryGoal, locale) : null;

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3 sm:p-4">
      {!active ? (
        <button
          type="button"
          onClick={() => void startWithTool()}
          disabled={status === 'sending'}
          aria-label={t('job.continueWithAria', { tool: source.title })}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
        >
          {status === 'sending' ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          {t('job.continueWith')}
        </button>
      ) : (
        <>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">
                {wizard.title || t('job.setupTitle', { tool: source.title })}
              </p>
              {goalLabel ? (
                <span className="rounded-full border border-emerald-600/30 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">
                  {goalLabel}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {wizard.hint || t('job.setupHint')} · {source.title}
            </p>
          </div>

          <ul className="space-y-2">
            {wizard.steps.map((step, index) => (
              <li key={step.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[step.id])}
                    onChange={() => toggleStep(step.id)}
                    className="mt-1 h-4 w-4 rounded border"
                  />
                  <span>
                    <span
                      className={
                        checked[step.id] ? 'text-muted-foreground line-through' : 'font-medium'
                      }
                    >
                      {index + 1}. {step.label}
                    </span>
                    {step.description ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {step.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {wizard.prompts?.length > 0 ? (
            <div className="space-y-2 rounded-xl border bg-background/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('job.promptsTitle')}
              </p>
              {wizard.prompts.map((prompt) => (
                <div key={prompt.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{prompt.title}</p>
                    <button
                      type="button"
                      onClick={() => void copyPrompt(prompt)}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                    >
                      {copiedPromptId === prompt.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          {t('job.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          {t('job.copyPrompt')}
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-[11px] leading-4 text-muted-foreground">
                    {prompt.body}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackEvent('kasif_funnel_open_tool', {
                  tool_id: source.id,
                  tool_title: source.title,
                  goal: primaryGoal || undefined,
                  wizard_id: wizard.id,
                });
                const firstStep = wizard.steps[0];
                if (firstStep && !checked[firstStep.id]) toggleStep(firstStep.id);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted"
            >
              {t('job.openTool')}
              <ExternalLink className="h-3 w-3" />
            </Link>
            {!setupDone && (
              <button
                type="button"
                onClick={() => void markSetupCompleted()}
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {t('job.markSetupDone')}
              </button>
            )}
          </div>

          {(setupDone || allStepsDone || Object.values(checked).some(Boolean)) && !completed && (
            <div className="space-y-3 border-t border-emerald-500/20 pt-3">
              <div>
                <p className="text-sm font-semibold">{t('job.surveyTitle')}</p>
                {wizard.firstResultHint ? (
                  <p className="mt-1 text-xs text-muted-foreground">{wizard.firstResultHint}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('job.firstResultQ')}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void confirmFirstResult(true, minutes)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      firstResult === true ? 'border-emerald-600 bg-emerald-600 text-white' : ''
                    }`}
                  >
                    {t('job.yes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void reportFirstResult(false)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      firstResult === false ? 'bg-muted' : ''
                    }`}
                  >
                    {t('job.no')}
                  </button>
                </div>
              </div>

              {firstResult === true && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t('job.minutesQ')}</p>
                  <div className="flex flex-wrap gap-2">
                    {MINUTE_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => void confirmFirstResult(true, value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          minutes === value ? 'border-emerald-600 bg-emerald-600 text-white' : ''
                        }`}
                      >
                        {t(`job.minutes.${value}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(firstResult === true || firstResult === false) && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t('job.jobDoneQ')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void reportJobDone(true)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        jobDone === true ? 'border-emerald-600 bg-emerald-600 text-white' : ''
                      }`}
                    >
                      {t('job.yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void reportJobDone('partial')}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        jobDone === 'partial' ? 'bg-muted' : ''
                      }`}
                    >
                      {t('job.partial')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void reportJobDone(false)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        jobDone === false ? 'bg-muted' : ''
                      }`}
                    >
                      {t('job.no')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {completed && (
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
              {t('job.thanks')}
            </p>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
