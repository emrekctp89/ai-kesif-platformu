'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Copy, ExternalLink, LoaderCircle, Lock, Sparkles, Wand2 } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { isRunnablePack } from '@/lib/kasif/jobPacks';
import { isProPackId, buildPackPaywall } from '@/lib/kasif/packAccess';
import { buildPartnerConnectSteps } from '@/lib/kasif/partnerConnect';
import { ProPackOnboarding } from '@/components/kasif/ProPackOnboarding';

const PLACEHOLDER_KEYS = {
  'content-studio': 'packs.runnerBriefPlaceholder',
  'sales-outreach': 'packs.runnerBriefPlaceholderSales',
  'meeting-to-action': 'packs.runnerBriefPlaceholderMeeting',
  'social-launch': 'packs.runnerBriefPlaceholderSocial',
  'pitch-deck': 'packs.runnerBriefPlaceholderPitch',
  'seo-brief': 'packs.runnerBriefPlaceholderSeo',
  'support-kit': 'packs.runnerBriefPlaceholderSupport',
  'code-scaffold': 'packs.runnerBriefPlaceholderCode',
  'legal-review': 'packs.runnerBriefPlaceholderLegal',
  'research-brief': 'packs.runnerBriefPlaceholderResearch',
};

const TITLE_KEYS = {
  'content-studio': 'packs.runnerTitle',
  'sales-outreach': 'packs.runnerTitleSales',
  'meeting-to-action': 'packs.runnerTitleMeeting',
  'social-launch': 'packs.runnerTitleSocial',
  'pitch-deck': 'packs.runnerTitlePitch',
  'seo-brief': 'packs.runnerTitleSeo',
  'support-kit': 'packs.runnerTitleSupport',
  'code-scaffold': 'packs.runnerTitleCode',
  'legal-review': 'packs.runnerTitleLegal',
  'research-brief': 'packs.runnerTitleResearch',
};

const HINT_KEYS = {
  'content-studio': 'packs.runnerHint',
  'sales-outreach': 'packs.runnerHintSales',
  'meeting-to-action': 'packs.runnerHintMeeting',
  'social-launch': 'packs.runnerHintSocial',
  'pitch-deck': 'packs.runnerHintPitch',
  'seo-brief': 'packs.runnerHintSeo',
  'support-kit': 'packs.runnerHintSupport',
  'code-scaffold': 'packs.runnerHintCode',
  'legal-review': 'packs.runnerHintLegal',
  'research-brief': 'packs.runnerHintResearch',
};

function sourceLabelKey(source) {
  const key = String(source || 'local')
    .toLowerCase()
    .replace(/-fallback$/, '');
  if (key === 'partner') return 'packs.sourcePartner';
  if (key === 'gemini') return 'packs.sourceGemini';
  if (key === 'provider') return 'packs.sourceProvider';
  return 'packs.sourceLocal';
}

function providerBadgeClass(level) {
  if (level === 'partner') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100';
  }
  if (level === 'gemini') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-100';
  }
  return 'border-border bg-muted/60 text-muted-foreground';
}

/**
 * Multi-pack runner — generates first deliverable on-platform.
 * Shows partner/Gemini/local readiness + post-run tool-account connect steps.
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
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    setBrief(defaultBrief || '');
    setResult(null);
    setError(null);
    setStatus('idle');
  }, [safePackId, defaultBrief]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/kasif/partner/status?locale=${locale === 'en' ? 'en' : 'tr'}`
        );
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setProvider(data.provider || null);
      } catch {
        /* status is optional UX */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const connectSteps = useMemo(() => {
    if (!result?.run) return [];
    return buildPartnerConnectSteps(safePackId, locale, {
      interactionId: result.interactionId,
      feedbackToken: result.feedbackToken,
    });
  }, [result, safePackId, locale]);

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
        throw Object.assign(new Error(data.error || t('packs.runnerFailed')), {
          upgradePath: data.upgradePath,
          reason: data.reason,
          paywall: data.paywall || null,
          freeRunsLeft: data.freeRunsLeft,
        });
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
      if (err?.upgradePath || err?.paywall || err?.reason) {
        setResult({
          upgradePath: err.upgradePath,
          reason: err.reason,
          paywall: err.paywall || null,
          freeRunsLeft: err.freeRunsLeft,
        });
        trackEvent('kasif_pack_runner_paywall', {
          pack_id: safePackId,
          reason: err.reason,
        });
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

  const sourceKey = sourceLabelKey(result?.run?.source);
  const sourceText = t(sourceKey);

  const isProPack = isProPackId(safePackId);

  return (
    <div className="mt-4 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4">
      {isProPack ? <ProPackOnboarding locale={locale} packId={safePackId} enabled /> : null}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-900 dark:text-violet-100">
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t(TITLE_KEYS[safePackId] || TITLE_KEYS['content-studio'])}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(HINT_KEYS[safePackId] || HINT_KEYS['content-studio'])}
          </p>
        </div>
        {provider ? (
          <div
            className={`max-w-[14rem] rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-tight ${providerBadgeClass(provider.level)}`}
            title={provider.hint}
          >
            {provider.label}
          </div>
        ) : null}
      </div>

      {provider?.hint ? (
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{provider.hint}</p>
      ) : null}

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
        <div className="mt-3 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          {result?.reason === 'login_required' || result?.reason === 'pro_required' ? (
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-950 dark:text-amber-100">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {t(
                  result.reason === 'login_required'
                    ? 'packs.paywallLoginTitle'
                    : 'packs.paywallQuotaTitle'
                )}
              </p>
              <p
                role="alert"
                className="text-xs leading-4 text-amber-950/90 dark:text-amber-100/90"
              >
                {error}
              </p>
              <p className="text-[11px] text-muted-foreground">{t('packs.paywallBenefits')}</p>
              {(() => {
                const paywall =
                  result.paywall || buildPackPaywall(locale, result.reason, { packId: safePackId });
                return (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={paywall.ctaHref || result.upgradePath || '/uyelik'}
                      className="inline-flex min-h-8 items-center rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      {t(paywall.ctaKey || 'packs.upgradeCta')}
                    </Link>
                    <Link
                      href={paywall.secondaryHref || '/kasif?pack=seo-brief&runner=1'}
                      className="inline-flex min-h-8 items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      {t(paywall.secondaryKey || 'packs.paywallTryFreeRunner')}
                      <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                );
              })()}
            </>
          ) : (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : null}

      {result?.run ? (
        <div className="mt-3 space-y-2 rounded-xl border bg-background/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {t('packs.runnerDone', { source: sourceText })}
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

          {Array.isArray(result.run.steps) && result.run.steps.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('packs.runnerSteps')}
              </p>
              <ol className="space-y-2">
                {result.run.steps.map((step, index) => (
                  <li
                    key={step.id || `step-${index}`}
                    className="rounded-lg border bg-muted/30 px-2.5 py-2"
                  >
                    <p className="text-[11px] font-semibold text-foreground">
                      {index + 1}. {step.title}
                    </p>
                    <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-[11px] leading-4 text-muted-foreground">
                      {step.body}
                    </pre>
                  </li>
                ))}
              </ol>
              <details className="rounded-lg border bg-muted/20 p-2">
                <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground">
                  {t('packs.runnerFullArtifact')}
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-4 text-muted-foreground">
                  {result.artifactText}
                </pre>
              </details>
            </div>
          ) : (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-2 text-[11px] leading-4 text-muted-foreground">
              {result.artifactText}
            </pre>
          )}
        </div>
      ) : null}

      {connectSteps.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-xl border border-dashed border-violet-500/30 bg-background/50 p-3">
          <p className="text-xs font-semibold text-violet-900 dark:text-violet-100">
            {t('packs.connectTitle')}
          </p>
          <p className="text-[11px] leading-4 text-muted-foreground">{t('packs.connectHint')}</p>
          <ol className="space-y-2">
            {connectSteps.map((step) => (
              <li
                key={step.id}
                className="rounded-lg border bg-background/80 px-2.5 py-2 text-[11px] leading-4"
              >
                <p className="font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-muted-foreground">{step.description}</p>
                {step.href ? (
                  <a
                    href={step.href}
                    className="mt-1.5 inline-flex items-center gap-1 font-semibold text-violet-700 hover:underline dark:text-violet-300"
                    onClick={() =>
                      trackEvent('kasif_pack_connect_step', {
                        pack_id: safePackId,
                        step_id: step.id,
                      })
                    }
                  >
                    {step.cta}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
