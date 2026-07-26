'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Compass,
  Flame,
  Lightbulb,
  ListChecks,
  Rocket,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  KASIF_LEARN_MODULES,
  KASIF_LEARN_OUTCOMES,
  KASIF_LEARN_STORAGE_KEY,
  buildLearnHref,
  getKasifLearnModuleIds,
  pickLocale,
} from '@/lib/learn/kasifJobCompletionPath';
import { trackEvent } from '@/utils/analytics';

function loadCompleted() {
  try {
    const raw = localStorage.getItem(KASIF_LEARN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCompleted(map) {
  try {
    localStorage.setItem(KASIF_LEARN_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

export default function KasifLearnPathClient() {
  const t = useTranslations('LearnKasif');
  const locale = useLocale();
  const lang = locale === 'en' ? 'en' : 'tr';
  const moduleIds = useMemo(() => getKasifLearnModuleIds(), []);
  const [completed, setCompleted] = useState({});
  const [activeId, setActiveId] = useState(moduleIds[0]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const map = loadCompleted();
    setCompleted(map);
    const firstOpen = moduleIds.find((id) => !map[id]) || moduleIds[0];
    setActiveId(firstOpen);
    setHydrated(true);
    trackEvent('learn_kasif_open', { locale: lang });
  }, [moduleIds, lang]);

  const doneCount = moduleIds.filter((id) => completed[id]).length;
  const total = moduleIds.length;
  const progressPct = total ? Math.round((doneCount / total) * 100) : 0;
  const allDone = doneCount === total && total > 0;

  const activeModule = KASIF_LEARN_MODULES.find((m) => m.id === activeId) || KASIF_LEARN_MODULES[0];
  const activeIndex = Math.max(
    0,
    KASIF_LEARN_MODULES.findIndex((m) => m.id === activeModule.id)
  );

  const toggleComplete = useCallback((id) => {
    setCompleted((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (!next[id]) delete next[id];
      saveCompleted(next);
      trackEvent('learn_kasif_module_toggle', {
        module_id: id,
        completed: Boolean(next[id]),
        progress: Object.keys(next).length,
      });
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    const next = KASIF_LEARN_MODULES[activeIndex + 1];
    if (next) setActiveId(next.id);
  }, [activeIndex]);

  const goPrev = useCallback(() => {
    const prev = KASIF_LEARN_MODULES[activeIndex - 1];
    if (prev) setActiveId(prev.id);
  }, [activeIndex]);

  const practiceHref = buildLearnHref(
    activeModule.practice.href,
    lang,
    activeModule.practice.query
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10 sm:space-y-10 sm:pb-14">
      {/* Hero */}
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 rounded-xl">
              <Link href="/ogren" prefetch={false}>
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {t('backToHub')}
              </Link>
            </Button>
            <Badge variant="secondary" className="font-semibold">
              <Rocket className="mr-1 h-3 w-3" aria-hidden="true" />
              {t('pathBadge')}
            </Badge>
            <Badge variant="outline">{t('durationBadge')}</Badge>
            <Badge variant="outline">{t('levelBadge')}</Badge>
          </div>

          <div className="max-w-3xl">
            <p className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold shadow-inner">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t('heroChip')}
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('subtitle')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border bg-background/70 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('statModules')}
              </p>
              <p className="mt-1 text-2xl font-bold">{total}</p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('statProgress')}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {hydrated ? `${doneCount}/${total}` : `0/${total}`}
              </p>
            </div>
            <div className="rounded-2xl border bg-background/70 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('statOutcome')}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug">{t('statOutcomeValue')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              <span>{t('progressLabel')}</span>
              <span>{hydrated ? `%${progressPct}` : '%0'}</span>
            </div>
            <Progress value={hydrated ? progressPct : 0} className="h-2.5" />
          </div>

          {allDone ? (
            <div
              role="status"
              className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-100"
            >
              <Trophy className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">{t('completeTitle')}</p>
                <p className="mt-0.5 text-xs leading-relaxed opacity-90 sm:text-sm">
                  {t('completeBody')}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild className="ai-tavsiye-gradient min-h-11 rounded-xl font-semibold">
              <Link href="/kasif" prefetch={false}>
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaLiveKasif')}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="glass-button min-h-11 rounded-xl font-semibold"
            >
              <a href="#learn-modules">
                <ListChecks className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaStartModules')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section aria-labelledby="learn-outcomes-heading">
        <h2
          id="learn-outcomes-heading"
          className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl"
        >
          <Target className="h-6 w-6 text-primary" aria-hidden="true" />
          {t('outcomesHeading')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {KASIF_LEARN_OUTCOMES.map((item, index) => (
            <Card key={index} className="glass-panel border-border/50">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground">{pickLocale(item, lang)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Layout: nav + active module */}
      <section id="learn-modules" className="scroll-mt-24" aria-labelledby="learn-modules-heading">
        <div className="mb-5">
          <h2
            id="learn-modules-heading"
            className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl"
          >
            <Compass className="h-6 w-6 text-primary" aria-hidden="true" />
            {t('modulesHeading')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('modulesSubheading')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          {/* Module list */}
          <nav
            aria-label={t('modulesNavLabel')}
            className="h-fit space-y-1.5 rounded-2xl border bg-background/60 p-2 lg:sticky lg:top-20"
          >
            {KASIF_LEARN_MODULES.map((mod, index) => {
              const isActive = mod.id === activeModule.id;
              const isDone = Boolean(completed[mod.id]);
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => setActiveId(mod.id)}
                  className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-foreground ring-1 ring-primary/30'
                      : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {isDone ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    ) : (
                      <Circle
                        className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">
                      {t('moduleLabel', { n: index + 1 })} · {mod.durationMin} {t('min')}
                    </span>
                    <span className="mt-0.5 block font-semibold leading-snug text-foreground">
                      {pickLocale(mod.title, lang).replace(/^\d+\.\s*/, '')}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Active lesson */}
          <Card className="glass-panel overflow-hidden border-border/50">
            <CardHeader className="space-y-3 border-b bg-muted/20">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {t('moduleLabel', { n: activeIndex + 1 })} / {total}
                </Badge>
                <Badge variant="outline">
                  {activeModule.durationMin} {t('min')}
                </Badge>
                {completed[activeModule.id] ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">{t('doneBadge')}</Badge>
                ) : null}
              </div>
              <CardTitle className="text-xl leading-snug sm:text-2xl">
                {pickLocale(activeModule.title, lang)}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed sm:text-base">
                {pickLocale(activeModule.summary, lang)}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-5 sm:p-6">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  {t('learnHeading')}
                </h3>
                <ul className="space-y-2">
                  {activeModule.learn.map((item, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 rounded-xl border bg-background/70 px-3 py-2.5 text-sm leading-relaxed"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{pickLocale(item, lang)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {activeModule.tip ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-3 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                  <span className="font-semibold">{t('tipLabel')}</span>{' '}
                  {pickLocale(activeModule.tip, lang)}
                </div>
              ) : null}

              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Flame
                    className="h-4 w-4 text-violet-600 dark:text-violet-300"
                    aria-hidden="true"
                  />
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-900 dark:text-violet-100">
                    {pickLocale(activeModule.practice.label, lang)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {pickLocale(activeModule.practice.body, lang)}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button asChild className="min-h-10 rounded-xl font-semibold">
                    <Link
                      href={practiceHref}
                      prefetch={false}
                      onClick={() =>
                        trackEvent('learn_kasif_practice_click', {
                          module_id: activeModule.id,
                        })
                      }
                    >
                      {pickLocale(activeModule.practice.cta, lang)}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant={completed[activeModule.id] ? 'secondary' : 'outline'}
                    className="min-h-10 rounded-xl font-semibold"
                    onClick={() => toggleComplete(activeModule.id)}
                  >
                    {completed[activeModule.id] ? (
                      <>
                        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t('markIncomplete')}
                      </>
                    ) : (
                      <>
                        <Circle className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t('markComplete')}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  disabled={activeIndex === 0}
                  onClick={goPrev}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('prevModule')}
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={activeIndex >= total - 1}
                  onClick={() => {
                    if (!completed[activeModule.id]) toggleComplete(activeModule.id);
                    goNext();
                  }}
                >
                  {t('nextModule')}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Funnel strip */}
      <section
        aria-labelledby="learn-funnel-heading"
        className="rounded-3xl border border-dashed border-primary/25 bg-muted/20 p-5 sm:p-6"
      >
        <h2 id="learn-funnel-heading" className="text-lg font-bold sm:text-xl">
          {t('funnelHeading')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('funnelBody')}</p>
        <ol className="mt-4 flex flex-wrap gap-2">
          {[
            'job_stated',
            'tool_recommended',
            'tool_selected',
            'setup_started',
            'first_result',
            'job_done',
          ].map((stage, i) => (
            <li
              key={stage}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-semibold"
            >
              <span className="text-muted-foreground">{i + 1}.</span>
              <code className="font-mono text-[11px]">{stage}</code>
            </li>
          ))}
        </ol>
      </section>

      {/* Bottom CTAs */}
      <section className="brand-surface rounded-3xl p-6 text-center glass-panel sm:p-8">
        <h2 className="text-xl font-bold sm:text-2xl">{t('ctaBandTitle')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
          {t('ctaBandBody')}
        </p>
        <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Button asChild className="ai-tavsiye-gradient min-h-11 rounded-xl font-semibold">
            <Link href="/kasif" prefetch={false}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('ctaLiveKasif')}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="glass-button min-h-11 rounded-xl font-semibold"
          >
            <Link href="/workmind" prefetch={false}>
              {t('ctaWorkmind')}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="min-h-11 rounded-xl font-semibold">
            <Link href="/ogren" prefetch={false}>
              {t('backToHub')}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
