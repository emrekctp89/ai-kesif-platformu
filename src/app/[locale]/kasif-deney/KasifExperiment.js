'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Bot,
  Code2,
  ImageIcon,
  LoaderCircle,
  Mail,
  MessageSquare,
  Presentation,
  RefreshCcw,
  RotateCcw,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react';
import { formatKasifGoalLabel } from '@/lib/kasif/goalLabels';

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
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const conversationEndRef = useRef(null);
  const questionRef = useRef(null);
  const activeRequestRef = useRef(null);
  const feedbackRequestsRef = useRef(new Set());
  const historyRef = useRef(history);
  const loadingRef = useRef(loading);

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
    async (rawQuestion) => {
      const submittedQuestion = String(rawQuestion || '').trim();
      if (submittedQuestion.length < 3 || loadingRef.current) return;

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
    setLoading(false);
    setTurns([]);
    setHistory([]);
    setQuestion('');
    try {
      sessionStorage.removeItem(storageKeyFor(locale));
    } catch {
      // ignore
    }
  }

  function chooseStarterQuestion(starterQuestion, { autoAsk = false } = {}) {
    if (autoAsk) {
      void askQuestion(starterQuestion);
      return;
    }
    setQuestion(starterQuestion);
    requestAnimationFrame(() => questionRef.current?.focus());
  }

  function retryQuestion(failedQuestion) {
    void askQuestion(failedQuestion);
  }

  function StarterChips({ prefix, autoAsk = false, limit = 6 }) {
    return STARTER_QUESTIONS.slice(0, limit).map(({ key, icon: Icon }) => (
      <button
        key={`${prefix}-${key}`}
        type="button"
        onClick={() => chooseStarterQuestion(t(`starters.${key}.question`), { autoAsk })}
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
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col gap-6 px-2 py-8 sm:px-4 sm:py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={resetConversation}
            className="shrink-0 rounded-md border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('newConversation')}
            title={t('newConversation')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </header>

      {turns.length === 0 && (
        <section
          aria-labelledby="kasif-starters-heading"
          className="rounded-2xl border bg-card p-4"
        >
          <h2 id="kasif-starters-heading" className="text-sm font-semibold">
            {t('startersTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('startersDescription')}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <StarterChips prefix="home" autoAsk={false} />
          </div>
        </section>
      )}

      {turns.length > 0 && (
        <section aria-label={t('conversationLabel')} aria-live="polite" className="space-y-5">
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
                  <div className="min-w-0 flex-1 rounded-md border bg-card p-4">
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
                              <StarterChips prefix={`soft-${turn.id}`} autoAsk limit={4} />
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
                        {turn.result.sources?.length > 0 && (
                          <div className="mt-4 border-t pt-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                              {t('sources')}
                            </p>
                            <ul className="grid gap-2 sm:grid-cols-2">
                              {turn.result.sources.map((source) => (
                                <li key={source.id}>
                                  <Link
                                    className="flex h-full flex-col gap-1 rounded-xl border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                                    href={source.url}
                                  >
                                    <span className="font-medium text-primary">{source.title}</span>
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
                                  </Link>
                                </li>
                              ))}
                            </ul>
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
        className="sticky bottom-3 space-y-2 rounded-md border bg-background p-3 shadow-lg"
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
          className="w-full resize-none bg-transparent p-2 outline-none"
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
