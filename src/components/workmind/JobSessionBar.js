'use client';

import { CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatKasifGoalLabel, getJobSessionProgress } from '@/lib/kasif';

/**
 * Compact progress bar for a Workmind ↔ Kâşif job session.
 */
export function JobSessionBar({
  session,
  locale = 'tr',
  onSelectStep,
  onReportFirstResult,
  onReportJobDone,
  survey = null,
}) {
  const t = useTranslations('Workmind');
  if (!session?.steps?.length) return null;

  const progress = getJobSessionProgress(session);
  const goals = Array.isArray(session.goals) ? session.goals : [];

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
            {t('sessionTitle')}
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">{session.prompt}</p>
          {goals.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {goals.slice(0, 3).map((goal) => (
                <span
                  key={goal}
                  className="rounded-full border bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {formatKasifGoalLabel(goal, locale)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {progress.done}/{progress.total}
          </p>
          <p className="text-[11px] text-muted-foreground">{t('sessionProgress')}</p>
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <ol className="mt-3 flex flex-wrap gap-1.5">
        {session.steps.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelectStep?.(step.id)}
              className={`inline-flex max-w-[11rem] items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${
                step.done
                  ? 'border-emerald-600/40 bg-emerald-600/15 text-emerald-900 dark:text-emerald-100'
                  : 'bg-background/80 hover:border-primary/40'
              }`}
              title={step.label}
            >
              {step.done ? (
                <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">
                {index + 1}. {step.label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {progress.complete && survey !== 'done' ? (
        <div className="mt-3 space-y-2 border-t border-emerald-500/20 pt-3">
          <p className="text-xs font-semibold">{t('sessionSurveyTitle')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onReportFirstResult?.(true)}
              className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {t('sessionFirstResultYes')}
            </button>
            <button
              type="button"
              onClick={() => onReportJobDone?.(true)}
              className="rounded-full border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              {t('sessionJobDone')}
            </button>
          </div>
        </div>
      ) : null}

      {survey === 'done' ? (
        <p className="mt-3 text-xs font-medium text-emerald-800 dark:text-emerald-200">
          {t('sessionThanks')}
        </p>
      ) : null}
    </div>
  );
}
