'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  Bot,
  Check,
  Code2,
  ExternalLink,
  GitCompareArrows,
  ImageIcon,
  LoaderCircle,
  Mail,
  MessageSquare,
  Presentation,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react';
import { formatKasifGoalLabel } from '@/lib/kasif/goalLabels';
import { matchJobPack } from '@/lib/kasif/jobPacks';
import { buildWorkmindHandoffUrl } from '@/lib/kasif/jobSession';
import { JobFunnelPanel } from '@/components/kasif/JobFunnelPanel';
import { JobPacksStrip, JobPackSuggestion } from '@/components/kasif/JobPacksStrip';
import { trackEvent } from '@/utils/analytics';

const STARTER_QUESTIONS = [
  { key: 'presentation', icon: Presentation },
  { key: 'image', icon: ImageIcon },
  { key: 'code', icon: Code2 },
  { key: 'seo', icon: Search },
  { key: 'email', icon: Mail },
  { key: 'chatbot', icon: MessageSquare },
];

function storageKeyFor(locale) {
  return `kasif-conversation-v1:${locale || 'tr'}`;
}

export default function KasifExperiment() {
  const t = useTranslations('Kasif');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [comparison, setComparison] = useState({});
  const conversationEndRef = useRef(null);
  const questionRef = useRef(null);
  const activeRequestRef = useRef(null);
  const feedbackRequestsRef = useRef(new Set());
  const historyRef = useRef(history);
  const loadingRef = useRef(loading);
  const softLandingPendingRef = useRef(null);
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns, loading]);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  // Oturum geçmişini locale bazlı geri yükle.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKeyFor(locale));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.turns)) setTurns(parsed.turns);
        if (Array.isArray(parsed?.history)) setHistory(parsed.history);
      } else {
        setTurns([]);
        setHistory([]);
      }
    } catch {
      setTurns([]);
      setHistory([]);
    } finally {
      setHydrated(true);
    }
  }, [locale]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        storageKeyFor(locale),
        JSON.stringify({
          turns: turns.map((turn) => ({
            id: turn.id,
            question: turn.question,
            result: turn.result
              ? {
                  ...turn.result,
                  // feedback UI state'i de sakla (interactionId ile yeniden gönderilebilir)
                }
              : turn.result,
            feedback: turn.feedback,
            feedbackStatus: turn.feedbackStatus,
          })),
          history,
        })
      );
    } catch {
      // private mode / quota
    }
  }, [turns, history, locale, hydrated]);

  const askQuestion = useCallback(
    async (rawQuestion, options = {}) => {
      const submittedQuestion = String(rawQuestion || '').trim();
      if (submittedQuestion.length < 3 || loadingRef.current) return;

      const pending = softLandingPendingRef.current;
      const pendingFresh = pending && Date.now() - pending.at < 30 * 60 * 1000 ? pending : null;
      if (pending && !pendingFresh) softLandingPendingRef.current = null;

      const fromSoftLanding =
        options.fromSoftLanding === true ||
        Boolean(pendingFresh) ||
        Boolean(options.softLandingParentId);
      const softLandingParentId =
        options.softLandingParentId || pendingFresh?.interactionId || null;
      const softLandingStarter = options.softLandingStarter || null;

      const turnId = crypto.randomUUID();
      const controller = new AbortController();
      activeRequestRef.current = controller;
      setLoading(true);
      setQuestion('');
      setTurns((current) => [...current, { id: turnId, question: submittedQuestion }]);

      const historySnapshot = historyRef.current;

      try {
        const response = await fetch('/api/kasif/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            question: submittedQuestion,
            history: historySnapshot,
            locale,
            ...(fromSoftLanding
              ? {
                  fromSoftLanding: true,
                  softLandingParentId,
                  softLandingStarter,
                }
              : {}),
          }),
        });
        const data = await response.json();
        const result = response.ok ? data : { error: data.error || t('genericError') };
        setTurns((current) =>
          current.map((turn) => (turn.id === turnId ? { ...turn, result } : turn))
        );
        if (response.ok) {
          setHistory((current) =>
            [
              ...current,
              { role: 'user', content: submittedQuestion },
              { role: 'assistant', content: data.answer },
            ].slice(-6)
          );

          const isSoftLanding =
            data.softLanding === true ||
            data.metaKind === 'soft-landing' ||
            data.intent?.meta === 'soft-landing';
          if (isSoftLanding) {
            softLandingPendingRef.current = {
              interactionId: data.interactionId || null,
              at: Date.now(),
            };
            trackEvent('kasif_soft_landing_shown', {
              interaction_id: data.interactionId || undefined,
              price_preference: data.intent?.pricePreference || undefined,
            });
          }

          if (data.funnel?.stages?.job_stated || data.sources?.length > 0) {
            trackEvent('kasif_funnel_job_stated', {
              goal: data.intent?.goals?.[0] || undefined,
              source_count: Array.isArray(data.sources) ? data.sources.length : 0,
              from_soft_landing: fromSoftLanding || undefined,
            });
          }
          if (data.funnel?.stages?.tool_recommended || data.sources?.length > 0) {
            trackEvent('kasif_funnel_tool_recommended', {
              source_count: Array.isArray(data.sources) ? data.sources.length : 0,
              from_soft_landing: fromSoftLanding || undefined,
            });
          }

          if (fromSoftLanding) {
            trackEvent('kasif_soft_landing_follow_up', {
              starter: softLandingStarter || 'free-text',
              parent_id: softLandingParentId || undefined,
              has_sources: Array.isArray(data.sources) && data.sources.length > 0,
            });
            if (Array.isArray(data.sources) && data.sources.length > 0) {
              trackEvent('kasif_soft_landing_converted', {
                starter: softLandingStarter || 'free-text',
                parent_id: softLandingParentId || undefined,
                source_count: data.sources.length,
                goal: data.intent?.goals?.[0] || undefined,
              });
              softLandingPendingRef.current = null;
            }
          }
        }
      } catch (error) {
        if (error?.name === 'AbortError') return;
        setTurns((current) =>
          current.map((turn) =>
            turn.id === turnId ? { ...turn, result: { error: t('connectionError') } } : turn
          )
        );
      } finally {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
          setLoading(false);
        }
      }
    },
    [locale, t]
  );

  // Deep link: /kasif?q=... (+ optional auto=1) from pack connect steps.
  useEffect(() => {
    if (!hydrated || deepLinkHandledRef.current) return;
    const raw = searchParams?.get('q') || searchParams?.get('question') || '';
    const prefill = String(raw).trim().slice(0, 800);
    if (!prefill) return;
    deepLinkHandledRef.current = true;
    const auto = searchParams?.get('auto') === '1' || searchParams?.get('auto') === 'true';
    if (auto) {
      void askQuestion(prefill);
    } else {
      setQuestion(prefill);
      requestAnimationFrame(() => questionRef.current?.focus());
    }
  }, [hydrated, searchParams, askQuestion]);

  async function submit(event) {
    event.preventDefault();
    await askQuestion(question);
  }

  async function sendFeedback(turnId, result, value) {
    if (!result?.interactionId || feedbackRequestsRef.current.has(turnId)) return;
    feedbackRequestsRef.current.add(turnId);
    setTurns((current) =>
      current.map((turn) =>
        turn.id === turnId ? { ...turn, feedbackStatus: 'sending', feedbackError: null } : turn
      )
    );

    try {
      const response = await fetch('/api/kasif/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interactionId: result.interactionId,
          feedbackToken: result.feedbackToken,
          feedback: value,
        }),
      });
      if (!response.ok) throw new Error('KASIF_FEEDBACK_FAILED');
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? { ...turn, feedback: value, feedbackStatus: 'saved', feedbackError: null }
            : turn
        )
      );
    } catch {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                feedbackStatus: 'error',
                feedbackError: t('feedbackError'),
              }
            : turn
        )
      );
    } finally {
      feedbackRequestsRef.current.delete(turnId);
    }
  }

  function resetConversation() {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    softLandingPendingRef.current = null;
    setLoading(false);
    setTurns([]);
    setHistory([]);
    setComparison({});
    setQuestion('');
    try {
      sessionStorage.removeItem(storageKeyFor(locale));
    } catch {
      // ignore
    }
  }

  function chooseStarterQuestion(
    starterQuestion,
    { autoAsk = false, fromSoftLanding = false, softLandingStarter = null } = {}
  ) {
    if (autoAsk) {
      if (fromSoftLanding) {
        trackEvent('kasif_soft_landing_starter_click', {
          starter: softLandingStarter || undefined,
          parent_id: softLandingPendingRef.current?.interactionId || undefined,
        });
      }
      void askQuestion(starterQuestion, {
        fromSoftLanding,
        softLandingParentId: softLandingPendingRef.current?.interactionId || null,
        softLandingStarter,
      });
      return;
    }
    setQuestion(starterQuestion);
    requestAnimationFrame(() => questionRef.current?.focus());
  }

  function retryQuestion(failedQuestion) {
    void askQuestion(failedQuestion);
  }

  function toggleComparison(turnId, sourceId) {
    setComparison((current) => {
      const selected = current[turnId] || [];
      const next = selected.includes(sourceId)
        ? selected.filter((id) => id !== sourceId)
        : selected.length < 3
          ? [...selected, sourceId]
          : selected;
      return { ...current, [turnId]: next };
    });
  }

  function followUpQuestions(result) {
    if (!result?.sources?.length) return [];
    const pricePreference = result.intent?.pricePreference;
    const prompts = [];
    if (pricePreference !== 'free') prompts.push(t('followUps.free'));
    if (result.sources.length > 1) prompts.push(t('followUps.compare'));
    prompts.push(t('followUps.beginner'));
    return prompts.slice(0, 3);
  }

  function StarterChips({ prefix, autoAsk = false, limit = 6, fromSoftLanding = false }) {
    return STARTER_QUESTIONS.slice(0, limit).map(({ key, icon: Icon }) => (
      <button
        key={`${prefix}-${key}`}
        type="button"
        onClick={() =>
          chooseStarterQuestion(t(`starters.${key}.question`), {
            autoAsk,
            fromSoftLanding,
            softLandingStarter: key,
          })
        }
        className={
          autoAsk
            ? 'inline-flex min-h-8 items-center gap-1.5 rounded-full border border-violet-500/20 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50'
            : 'flex min-h-12 items-center gap-2 rounded-xl border bg-background px-3 py-2 text-left text-sm font-medium transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        }
        disabled={loading}
      >
        <Icon
          className={autoAsk ? 'h-3.5 w-3.5 text-primary' : 'h-4 w-4 shrink-0 text-primary'}
          aria-hidden="true"
        />
        {t(`starters.${key}.label`)}
      </button>
    ));
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col gap-6 px-2 py-8 sm:px-4 sm:py-12">
      <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/10 p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-background/70 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t('eyebrow')}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{t('title')}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {t('subtitle')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t('trust.catalog')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1">
                <GitCompareArrows className="h-3.5 w-3.5 text-violet-500" />
                {t('trust.compare')}
              </span>
            </div>
          </div>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={resetConversation}
              className="shrink-0 rounded-xl border bg-background/70 p-2.5 text-muted-foreground backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t('newConversation')}
              title={t('newConversation')}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {turns.length === 0 && (
        <>
          <JobPacksStrip
            locale={locale}
            onAskPack={(pack) => {
              void askQuestion(pack.starterQuestion);
            }}
          />
          <section
            aria-labelledby="kasif-starters-heading"
            className="rounded-3xl border bg-card/80 p-5 shadow-sm sm:p-6"
          >
            <h2 id="kasif-starters-heading" className="text-sm font-semibold">
              {t('startersTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('startersDescription')}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <StarterChips prefix="home" autoAsk={false} />
            </div>
          </section>
        </>
      )}

      {turns.length > 0 && (
        <section aria-label={t('conversationLabel')} aria-live="polite" className="space-y-7">
          {turns.map((turn) => (
            <div key={turn.id} className="space-y-3">
              <div className="ml-auto flex max-w-[85%] items-start justify-end gap-2">
                <p className="rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground">
                  {turn.question}
                </p>
                <span className="mt-1 rounded-full border p-1.5" aria-hidden="true">
                  <User className="h-4 w-4" />
                </span>
              </div>

              {turn.result ? (
                <div className="flex max-w-[92%] items-start gap-2">
                  <span className="mt-1 rounded-full border bg-muted p-1.5" aria-hidden="true">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                    {turn.result.error ? (
                      <div>
                        <p role="alert" className="text-sm text-destructive">
                          {turn.result.error}
                        </p>
                        <button
                          type="button"
                          onClick={() => retryQuestion(turn.question)}
                          className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                        >
                          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                          {t('retry')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {turn.result.answer}
                        </p>
                        {turn.result.grounded === false && !turn.result.meta && (
                          <div className="mt-3 space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                            <p className="text-xs text-amber-900 dark:text-amber-100">
                              {t('ungroundedHint')}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              <StarterChips prefix={`ungrounded-${turn.id}`} autoAsk limit={4} />
                            </div>
                          </div>
                        )}
                        {(turn.result.softLanding || turn.result.metaKind === 'soft-landing') && (
                          <div className="mt-3 space-y-2 rounded-md border border-violet-500/30 bg-violet-500/10 px-3 py-2">
                            <p className="text-xs text-violet-900 dark:text-violet-100">
                              {t('softLandingHint')}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              <StarterChips
                                prefix={`soft-${turn.id}`}
                                autoAsk
                                limit={4}
                                fromSoftLanding
                              />
                            </div>
                          </div>
                        )}
                        {turn.result.grounded !== false &&
                          !turn.result.meta &&
                          !turn.result.intent?.meta &&
                          !turn.result.softLanding &&
                          typeof turn.result.confidence === 'number' &&
                          turn.result.confidence > 0 &&
                          turn.result.confidence < 0.55 && (
                            <p className="mt-3 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-950 dark:text-sky-100">
                              {t('lowConfidenceHint')}
                            </p>
                          )}
                        {(turn.result.meta ||
                          turn.result.intent?.meta ||
                          turn.result.softLanding ||
                          turn.result.intent?.goals?.length > 0 ||
                          turn.result.intent?.pricePreference) && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(turn.result.softLanding ||
                              turn.result.metaKind === 'soft-landing') && (
                              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:text-violet-200">
                                {t('softLandingBadge')}
                              </span>
                            )}
                            {(turn.result.meta || turn.result.intent?.meta) &&
                              turn.result.metaKind !== 'soft-landing' &&
                              !turn.result.softLanding && (
                                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:text-violet-200">
                                  {t('metaBadge')}
                                </span>
                              )}
                            {turn.result.intent?.goals?.map((goal) => (
                              <span
                                key={goal}
                                className="rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                              >
                                {formatKasifGoalLabel(goal, locale)}
                              </span>
                            ))}
                            {turn.result.intent?.pricePreference &&
                              turn.result.intent.pricePreference !== 'any' && (
                                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {turn.result.intent.pricePreference === 'free'
                                    ? t('priceFree')
                                    : t('pricePaid')}
                                </span>
                              )}
                            {typeof turn.result.confidence === 'number' && (
                              <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                                {t('confidence', {
                                  value: Math.round(turn.result.confidence * 100),
                                })}
                              </span>
                            )}
                          </div>
                        )}
                        {turn.result.sources?.length > 0 &&
                          !turn.result.softLanding &&
                          !turn.result.meta &&
                          !turn.result.intent?.meta && (
                            <div className="mt-3 space-y-2">
                              <Link
                                href={buildWorkmindHandoffUrl(turn.question, {
                                  locale,
                                  from: 'kasif',
                                  interactionId: turn.result.interactionId,
                                  feedbackToken: turn.result.feedbackToken,
                                  goals: turn.result.intent?.goals,
                                  autoGenerate: true,
                                })}
                                onClick={() => {
                                  trackEvent('kasif_workmind_handoff', {
                                    goal: turn.result.intent?.goals?.[0] || undefined,
                                    source_count: turn.result.sources.length,
                                  });
                                }}
                                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-semibold text-violet-900 transition-colors hover:bg-violet-500/15 dark:text-violet-100 sm:w-auto"
                              >
                                {t('openWorkmind')}
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                              </Link>
                              <p className="text-[11px] text-muted-foreground">
                                {t('openWorkmindHint')}
                              </p>
                              <JobPackSuggestion
                                pack={matchJobPack(turn.result.intent?.goals, locale)}
                                locale={locale}
                                interactionId={turn.result.interactionId}
                                feedbackToken={turn.result.feedbackToken}
                              />
                            </div>
                          )}
                        {turn.result.sources?.length > 0 && (
                          <div className="mt-4 border-t pt-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                              {t('sources')}
                            </p>
                            <ul className="grid gap-3 md:grid-cols-2">
                              {turn.result.sources.map((source) => (
                                <li
                                  key={source.id}
                                  className={`relative flex min-h-44 flex-col rounded-2xl border bg-background p-4 transition-all ${
                                    comparison[turn.id]?.includes(source.id)
                                      ? 'border-violet-500/60 ring-2 ring-violet-500/10'
                                      : 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <Link
                                      className="text-base font-semibold text-foreground hover:text-primary"
                                      href={source.url}
                                    >
                                      {source.title}
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => toggleComparison(turn.id, source.id)}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition-colors hover:bg-muted"
                                      aria-pressed={
                                        comparison[turn.id]?.includes(source.id) || false
                                      }
                                      aria-label={t('comparison.toggle', { tool: source.title })}
                                    >
                                      {comparison[turn.id]?.includes(source.id) ? (
                                        <Check className="h-3 w-3 text-emerald-500" />
                                      ) : (
                                        <GitCompareArrows className="h-3 w-3" />
                                      )}
                                      {t('comparison.select')}
                                    </button>
                                  </div>
                                  {source.description ? (
                                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                                      {source.description}
                                    </p>
                                  ) : null}
                                  <div className="mt-auto pt-3">
                                    {Array.isArray(source.reasons) && source.reasons.length > 0 ? (
                                      <div className="mb-2 flex flex-wrap gap-1">
                                        {source.reasons.map((reason) => (
                                          <span
                                            key={reason}
                                            className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                                          >
                                            {reason}
                                          </span>
                                        ))}
                                      </div>
                                    ) : null}
                                    <span className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                                      {source.category ? (
                                        <span className="rounded-full border px-1.5 py-0.5">
                                          {source.category}
                                        </span>
                                      ) : null}
                                      {source.pricing ? (
                                        <span className="rounded-full border px-1.5 py-0.5">
                                          {source.pricing}
                                        </span>
                                      ) : null}
                                      {typeof source.rating === 'number' ? (
                                        <span className="rounded-full border px-1.5 py-0.5">
                                          ★ {source.rating}
                                        </span>
                                      ) : null}
                                    </span>
                                    <Link
                                      href={source.url}
                                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                      onClick={() => {
                                        trackEvent('kasif_tool_open_click', {
                                          tool_id: source.id,
                                          tool_title: source.title,
                                        });
                                      }}
                                    >
                                      {t('openTool')}
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                    {turn.result.interactionId && turn.result.feedbackToken ? (
                                      <JobFunnelPanel
                                        interactionId={turn.result.interactionId}
                                        feedbackToken={turn.result.feedbackToken}
                                        source={source}
                                        locale={locale}
                                        goals={
                                          Array.isArray(turn.result.intent?.goals)
                                            ? turn.result.intent.goals
                                            : []
                                        }
                                      />
                                    ) : null}
                                  </div>
                                </li>
                              ))}
                            </ul>
                            {(comparison[turn.id]?.length || 0) >= 2 && (
                              <div className="mt-3 overflow-hidden rounded-2xl border bg-muted/20">
                                <div className="flex items-center justify-between border-b px-4 py-3">
                                  <div>
                                    <p className="text-sm font-semibold">{t('comparison.title')}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {t('comparison.description')}
                                    </p>
                                  </div>
                                  <GitCompareArrows className="h-5 w-5 text-primary" />
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[520px] text-left text-xs">
                                    <thead className="text-muted-foreground">
                                      <tr>
                                        <th className="px-4 py-2 font-medium">
                                          {t('comparison.tool')}
                                        </th>
                                        <th className="px-4 py-2 font-medium">
                                          {t('comparison.category')}
                                        </th>
                                        <th className="px-4 py-2 font-medium">
                                          {t('comparison.pricing')}
                                        </th>
                                        <th className="px-4 py-2 font-medium">
                                          {t('comparison.rating')}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {turn.result.sources
                                        .filter((source) => comparison[turn.id].includes(source.id))
                                        .map((source) => (
                                          <tr key={source.id} className="border-t">
                                            <td className="px-4 py-3 font-semibold">
                                              {source.title}
                                            </td>
                                            <td className="px-4 py-3">{source.category || '—'}</td>
                                            <td className="px-4 py-3">{source.pricing || '—'}</td>
                                            <td className="px-4 py-3">
                                              {source.rating ? `★ ${source.rating}` : '—'}
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            <div className="mt-4">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">
                                {t('followUps.title')}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {followUpQuestions(turn.result).map((prompt) => (
                                  <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => askQuestion(prompt)}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-muted disabled:opacity-50"
                                  >
                                    {prompt}
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {turn.result.interactionId && (
                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
                            <span className="text-xs text-muted-foreground">
                              {t('feedbackQuestion')}
                            </span>
                            <button
                              type="button"
                              onClick={() => sendFeedback(turn.id, turn.result, 1)}
                              disabled={turn.feedback != null || turn.feedbackStatus === 'sending'}
                              aria-label={t('useful')}
                              title={t('useful')}
                              className="rounded-md border p-1.5 disabled:opacity-50"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => sendFeedback(turn.id, turn.result, -1)}
                              disabled={turn.feedback != null || turn.feedbackStatus === 'sending'}
                              aria-label={t('notUseful')}
                              title={t('notUseful')}
                              className="rounded-md border p-1.5 disabled:opacity-50"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </button>
                            {turn.feedback != null && (
                              <span className="text-xs text-muted-foreground">{t('saved')}</span>
                            )}
                            {turn.feedbackStatus === 'sending' && (
                              <span role="status" className="text-xs text-muted-foreground">
                                {t('saving')}
                              </span>
                            )}
                            {turn.feedbackError && (
                              <span role="alert" className="basis-full text-xs text-destructive">
                                {turn.feedbackError}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  role="status"
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {t('thinking')}
                </div>
              )}
            </div>
          ))}
          <div ref={conversationEndRef} />
        </section>
      )}

      <form
        onSubmit={submit}
        className="sticky bottom-3 z-10 space-y-2 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur"
      >
        <label htmlFor="kasif-question" className="sr-only">
          {t('askLabel')}
        </label>
        <textarea
          id="kasif-question"
          ref={questionRef}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={800}
          rows={3}
          className="w-full resize-none bg-transparent p-2 text-sm outline-none"
          placeholder={t('placeholder')}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{question.length}/800</span>
          <button
            type="submit"
            disabled={loading || question.trim().length < 3}
            className="rounded-md bg-primary p-2 text-primary-foreground disabled:opacity-50"
            aria-label={t('askLabel')}
            title={t('askLabel')}
          >
            {loading ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
