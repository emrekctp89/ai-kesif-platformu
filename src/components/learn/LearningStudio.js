'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  GraduationCap,
  Search,
} from 'lucide-react';
import {
  LEARNING_JOURNEYS,
  LEARN_STORAGE_KEY,
  LESSON_IDS,
  filterJourneys,
  lessonKey,
  localText,
  normalizeLearningState,
} from '@/lib/learn/journeys';
import { getCategoryLabel } from '@/lib/categoryLocalization';

export default function LearningStudio({ toolsByCategory = {} }) {
  const t = useTranslations('LearnStudio');
  const locale = useLocale();
  const [state, setState] = useState(() => normalizeLearningState(null));
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [duration, setDuration] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [checks, setChecks] = useState({});
  const [answer, setAnswer] = useState(null);
  const [copied, setCopied] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const lessonRef = useRef(null);
  const copyTimer = useRef(null);

  useEffect(() => {
    let restored = normalizeLearningState(null);
    try {
      restored = normalizeLearningState(
        JSON.parse(localStorage.getItem(LEARN_STORAGE_KEY) || 'null')
      );
    } catch {
      /* Empty or unavailable storage. */
    }
    const params = new URLSearchParams(window.location.search);
    const route = params.get('route');
    if (LEARNING_JOURNEYS.some((item) => item.id === route)) {
      restored.active = route;
      restored.lesson = LESSON_IDS.includes(params.get('lesson'))
        ? params.get('lesson')
        : 'understand';
    }
    setState(restored);
    setReady(true);
    return () => window.clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LEARN_STORAGE_KEY, JSON.stringify(state));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }, [state, ready]);

  const route = LEARNING_JOURNEYS.find((item) => item.id === state.active);
  const visible = filterJourneys(
    LEARNING_JOURNEYS,
    { query, level, duration, savedOnly, saved: state.saved },
    locale
  );
  const done = Object.keys(state.completed).length;
  const routeDone = route
    ? LESSON_IDS.filter((id) => state.completed[lessonKey(route.id, id)]).length
    : 0;
  const complete = route && state.completed[lessonKey(route.id, state.lesson)];
  const canComplete =
    state.lesson !== 'review' || (answer === 0 && route?.checks.every((_, i) => checks[i]));

  function openRoute(id, lesson = null, focus = true) {
    const nextLesson =
      lesson || LESSON_IDS.find((key) => !state.completed[lessonKey(id, key)]) || 'review';
    setState((prev) => ({ ...prev, active: id, lesson: nextLesson }));
    setChecks({});
    setAnswer(null);
    setCopied(false);
    setCopyFailed(false);
    const url = new URL(window.location.href);
    url.searchParams.set('route', id);
    url.searchParams.set('lesson', nextLesson);
    window.history.replaceState(null, '', url);
    if (focus)
      window.requestAnimationFrame(() => {
        lessonRef.current?.focus({ preventScroll: true });
        lessonRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
  }

  function toggleComplete() {
    if (!route || (!complete && !canComplete)) return;
    const key = lessonKey(route.id, state.lesson);
    setState((prev) => {
      const completed = { ...prev.completed };
      if (completed[key]) delete completed[key];
      else completed[key] = true;
      return { ...prev, completed };
    });
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(localText(route.prompt, locale));
      setCopied(true);
      setCopyFailed(false);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyFailed(true);
    }
  }

  function exportNotes() {
    const content = LEARNING_JOURNEYS.filter((item) => state.notes[item.id])
      .map((item) => `## ${localText(item.title, locale)}\n\n${state.notes[item.id]}\n`)
      .join('\n');
    const blob = new Blob([`# ${t('notesTitle')}\n\n${content}`], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-kesif-learning-notes.md';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section
      id="learning-studio"
      aria-labelledby="learning-studio-heading"
      className="scroll-mt-24 space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
            {t('eyebrow')}
          </p>
          <h2 id="learning-studio-heading" className="text-2xl font-bold sm:text-3xl">
            {t('title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <div className="rounded-2xl border bg-card px-5 py-3">
          <p className="text-sm font-semibold" aria-live="polite">
            {t('progress', { done, total: LEARNING_JOURNEYS.length * 3 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t('localProgress')}</p>
        </div>
      </div>
      <progress
        aria-label={t('overallProgress')}
        value={done}
        max={24}
        className="h-2 w-full overflow-hidden rounded-full accent-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
      />
      {storageFailed && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
          {t('storageError')}
        </p>
      )}
      {ready && route && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div>
            <p className="text-xs text-muted-foreground">{t('continueTitle')}</p>
            <p className="mt-1 font-semibold">{localText(route.title, locale)}</p>
          </div>
          <button
            type="button"
            onClick={() => openRoute(route.id, state.lesson)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            {t('continue')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-xs font-semibold">
          <span>{t('search')}</span>
          <div className="relative">
            <Search
              className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="min-h-11 w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm font-normal"
            />
          </div>
        </label>
        <label className="space-y-1.5 text-xs font-semibold">
          <span>{t('level')}</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal"
          >
            <option value="all">{t('allLevels')}</option>
            <option value="beginner">{t('beginner')}</option>
            <option value="intermediate">{t('intermediate')}</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold">
          <span>{t('duration')}</span>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm font-normal"
          >
            <option value="all">{t('allDurations')}</option>
            <option value="short">{t('short')}</option>
          </select>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 self-end rounded-xl border px-3 text-sm">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(e) => setSavedOnly(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {t('savedOnly')}
        </label>
      </div>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {t('results', { count: visible.length })}
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visible.map((item) => {
          const count = LESSON_IDS.filter((key) => state.completed[lessonKey(item.id, key)]).length;
          const saved = state.saved.includes(item.id);
          return (
            <article
              key={item.id}
              className={`flex flex-col rounded-2xl border bg-card p-5 ${route?.id === item.id ? 'border-primary/60 ring-1 ring-primary/20' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{t(item.level)}</span>
                <button
                  type="button"
                  aria-label={t(saved ? 'unsave' : 'save', {
                    title: localText(item.title, locale),
                  })}
                  aria-pressed={saved}
                  disabled={!ready}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      saved: saved
                        ? prev.saved.filter((id) => id !== item.id)
                        : [...prev.saved, item.id],
                    }))
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
                >
                  <Bookmark
                    className={`h-4 w-4 ${saved ? 'fill-primary text-primary' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <h3 className="mt-2 text-base font-bold leading-6">
                {localText(item.title, locale)}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                {localText(item.outcome, locale)}
              </p>
              <div className="my-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('minutes', { count: item.minutes })}
                </span>
                <span>{t('routeProgress', { done: count })}</span>
              </div>
              <button
                type="button"
                disabled={!ready}
                onClick={() => openRoute(item.id)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border font-semibold text-primary hover:bg-primary/5"
              >
                {t(count === 3 ? 'revisit' : count ? 'continue' : 'start')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p>{t('empty')}</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setLevel('all');
              setDuration('all');
              setSavedOnly(false);
            }}
            className="mt-3 min-h-11 rounded-xl border px-4 text-sm font-semibold"
          >
            {t('clearFilters')}
          </button>
        </div>
      )}
      {route && (
        <article
          ref={lessonRef}
          tabIndex={-1}
          aria-labelledby="active-lesson-title"
          className="scroll-mt-24 rounded-3xl border bg-card p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-primary">
                {t('activeRoute')} · {t('routeProgress', { done: routeDone })}
              </p>
              <h3 id="active-lesson-title" className="mt-2 text-xl font-bold sm:text-2xl">
                {localText(route.title, locale)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {localText(route.outcome, locale)}
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs">{t('freeLessons')}</span>
          </div>
          <nav aria-label={t('lessonNavigation')} className="my-6 flex flex-wrap gap-2">
            {LESSON_IDS.map((id, i) => (
              <button
                key={id}
                type="button"
                aria-current={state.lesson === id ? 'step' : undefined}
                onClick={() => openRoute(route.id, id, false)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${state.lesson === id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {state.completed[lessonKey(route.id, id)] ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  `${i + 1}. `
                )}
                {t(id)}
              </button>
            ))}
          </nav>
          {state.lesson === 'understand' && (
            <div className="space-y-4">
              <h4 className="font-bold">{t('concept')}</h4>
              <p className="max-w-3xl text-sm leading-7">{localText(route.concept, locale)}</p>
              <div className="rounded-xl bg-muted/50 p-4 text-sm leading-6">{t('firstStep')}</div>
            </div>
          )}
          {state.lesson === 'practice' && (
            <div className="space-y-4">
              <h4 className="font-bold">{t('exercise')}</h4>
              <p className="text-sm leading-7">{localText(route.exercise, locale)}</p>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-sm font-semibold">{t('prompt')}</h5>
                  <button
                    type="button"
                    onClick={copyPrompt}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-background px-3 text-xs font-semibold"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(copied ? 'copied' : 'copy')}
                  </button>
                </div>
                <p className="mt-3 select-text whitespace-pre-wrap text-sm leading-7">
                  {localText(route.prompt, locale)}
                </p>
                <p role="status" className="mt-2 text-xs text-muted-foreground">
                  {copyFailed ? t('copyError') : t('promptHint')}
                </p>
              </div>
            </div>
          )}
          {state.lesson === 'review' && (
            <div className="space-y-5">
              <h4 className="font-bold">{t('qualityCheck')}</h4>
              <div className="space-y-2">
                {route.checks.map((item, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-6"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checks[i])}
                      onChange={(e) => setChecks((prev) => ({ ...prev, [i]: e.target.checked }))}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    {localText(item, locale)}
                  </label>
                ))}
              </div>
              <fieldset className="rounded-xl border p-4">
                <legend className="px-2 text-sm font-semibold">
                  {localText(route.question, locale)}
                </legend>
                {route.options.map((option, i) => (
                  <label
                    key={i}
                    className="mt-2 flex cursor-pointer items-start gap-2 py-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={`quiz-${route.id}`}
                      checked={answer === i}
                      onChange={() => setAnswer(i)}
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    {localText(option, locale)}
                  </label>
                ))}
                {answer !== null && (
                  <p
                    role="status"
                    className={`mt-2 text-sm ${answer === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}
                  >
                    {t(answer === 0 ? 'correct' : 'tryAgain')}
                  </p>
                )}
              </fieldset>
              <p className="text-xs text-muted-foreground">{t('selfAssessment')}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5">
            <button
              type="button"
              onClick={toggleComplete}
              disabled={!complete && !canComplete}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t(complete ? 'undoComplete' : 'complete')}
            </button>
            {complete && state.lesson !== 'review' && (
              <button
                type="button"
                onClick={() =>
                  openRoute(route.id, LESSON_IDS[LESSON_IDS.indexOf(state.lesson) + 1])
                }
                className="min-h-11 rounded-xl border px-4 text-sm font-semibold"
              >
                {t('nextLesson')}
              </button>
            )}
            <span role="status" className="text-xs text-muted-foreground">
              {routeDone === 3 ? t('routeFinished') : complete ? t('lessonFinished') : ''}
            </span>
          </div>
          <div className="mt-7 grid gap-6 border-t pt-6 lg:grid-cols-2">
            <div>
              <label htmlFor="learning-notes" className="text-sm font-semibold">
                {t('notesTitle')}
              </label>
              <textarea
                id="learning-notes"
                value={state.notes[route.id] || ''}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    notes: { ...prev.notes, [route.id]: e.target.value },
                  }))
                }
                maxLength={3000}
                rows={5}
                placeholder={t('notesPlaceholder')}
                className="mt-2 w-full rounded-xl border bg-background p-3 text-sm leading-6"
              />
              <p className="text-xs text-muted-foreground">
                {t('notesHint')} · {(state.notes[route.id] || '').length}/3000
              </p>
              <button
                type="button"
                onClick={exportNotes}
                disabled={!Object.values(state.notes).some(Boolean)}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold disabled:opacity-50"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t('exportNotes')}
              </button>
            </div>
            <div>
              <h4 className="text-sm font-semibold">{t('practiceTools')}</h4>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{t('toolsHint')}</p>
              <ul className="mt-3 space-y-2">
                {(toolsByCategory[route.id] || []).slice(0, 3).map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      href={`/tool/${tool.slug}`}
                      prefetch={false}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 text-sm font-semibold hover:bg-muted"
                    >
                      {tool.name}
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/kategori/${route.id}`}
                prefetch={false}
                className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary"
              >
                {getCategoryLabel({ slug: route.id }, locale) || t('openCategory')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
