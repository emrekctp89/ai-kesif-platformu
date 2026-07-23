'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Bot,
  Code2,
  ImageIcon,
  LoaderCircle,
  Presentation,
  RefreshCcw,
  RotateCcw,
  Send,
  ThumbsDown,
  ThumbsUp,
  User,
} from 'lucide-react';

const STARTER_QUESTIONS = [
  {
    key: 'presentation',
    icon: Presentation,
  },
  {
    key: 'image',
    icon: ImageIcon,
  },
  {
    key: 'code',
    icon: Code2,
  },
];

export default function KasifExperiment() {
  const t = useTranslations('Kasif');
  const locale = useLocale();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const conversationEndRef = useRef(null);
  const questionRef = useRef(null);
  const activeRequestRef = useRef(null);
  const feedbackRequestsRef = useRef(new Set());

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns, loading]);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  async function submit(event) {
    event.preventDefault();
    const submittedQuestion = question.trim();
    if (submittedQuestion.length < 3 || loading) return;

    const turnId = crypto.randomUUID();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setLoading(true);
    setQuestion('');
    setTurns((current) => [...current, { id: turnId, question: submittedQuestion }]);

    try {
      const response = await fetch('/api/kasif/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ question: submittedQuestion, history, locale }),
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
  }

  function chooseStarterQuestion(starterQuestion) {
    setQuestion(starterQuestion);
    requestAnimationFrame(() => questionRef.current?.focus());
  }

  function retryQuestion(failedQuestion) {
    setQuestion(failedQuestion);
    requestAnimationFrame(() => questionRef.current?.focus());
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
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {STARTER_QUESTIONS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => chooseStarterQuestion(t(`starters.${key}.question`))}
                className="flex min-h-12 items-center gap-2 rounded-xl border bg-background px-3 py-2 text-left text-sm font-medium transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {t(`starters.${key}.label`)}
              </button>
            ))}
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
                        {turn.result.sources?.length > 0 && (
                          <div className="mt-4 border-t pt-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                              {t('sources')}
                            </p>
                            <ul className="flex flex-wrap gap-2">
                              {turn.result.sources.map((source) => (
                                <li key={source.id}>
                                  <Link
                                    className="text-sm font-medium text-primary underline underline-offset-4"
                                    href={source.url}
                                  >
                                    {source.title}
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
