'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Flame,
  MessageSquare,
  PenLine,
  Plus,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CreatorApplyForm } from '@/components/CreatorApplyForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CREATOR_REPUTATION_ROADMAP,
  MIN_CREATOR_REPUTATION,
  REPUTATION_AWARDS,
  isReputationEligible,
  reputationProgress,
  summarizeDailyQuests,
} from '@/lib/contentCreatorRules';

const ROADMAP_ICONS = {
  quests: Flame,
  rate: Star,
  comment: MessageSquare,
  submit: Trophy,
  prompt: Plus,
  learn: Sparkles,
};

/**
 * @param {{
 *   reputationPoints?: number,
 *   minReputation?: number,
 *   alreadyPending?: boolean,
 *   username?: string|null,
 *   dailyQuests?: Array,
 * }} props
 */
export function CreatorAccessGate({
  reputationPoints = 0,
  minReputation = MIN_CREATOR_REPUTATION,
  alreadyPending = false,
  username = null,
  dailyQuests = [],
  questLinkOpts = {},
}) {
  const t = useTranslations('ContentStudio');
  const progress = reputationProgress(reputationPoints, minReputation);
  const eligible = isReputationEligible(reputationPoints, minReputation);
  const quests = summarizeDailyQuests(dailyQuests, questLinkOpts);
  const projected = progress.current + quests.availablePoints;
  const wouldUnlock = !eligible && projected >= progress.target;

  const requirements = [
    {
      id: 'account',
      done: true,
      title: t('reqAccountTitle'),
      body: t('reqAccountBody'),
    },
    {
      id: 'reputation',
      done: eligible,
      title: t('reqReputationTitle', { min: progress.target }),
      body: t('reqReputationBody', {
        min: progress.target,
        current: progress.current,
        remaining: progress.remaining,
      }),
      emphasize: true,
    },
    {
      id: 'pitch',
      done: alreadyPending,
      title: t('reqPitchTitle'),
      body: t('reqPitchBody'),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12 pt-4">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-xl">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <PenLine className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('lockedTitle')}</h1>
          <p className="mx-auto mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('lockedBody')}
          </p>
          {username ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('greetingUser', { name: username })}
            </p>
          ) : null}
        </div>
      </section>

      {/* Reputation requirement */}
      <Card className="glass-panel border-primary/30 shadow-md ring-1 ring-primary/15">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="font-semibold">{t('reqBadge')}</Badge>
            {eligible ? (
              <Badge variant="secondary" className="font-semibold">
                {t('reqMet')}
              </Badge>
            ) : (
              <Badge variant="outline" className="font-semibold">
                {t('reqNotMet')}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {t('reqReputationHeadline', { min: progress.target })}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed sm:text-base">
            {t('applyReputationHint', { min: progress.target })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
                {progress.current}
                <span className="text-lg font-semibold text-muted-foreground sm:text-xl">
                  {' '}
                  / {progress.target}
                </span>
              </p>
              <p className="text-xs text-muted-foreground sm:text-sm">{t('yourReputation')}</p>
            </div>
            <p className="text-right text-sm font-semibold text-primary">
              {eligible
                ? t('progressComplete')
                : t('progressRemaining', { count: progress.remaining })}
            </p>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress.current}
            aria-valuemin={0}
            aria-valuemax={progress.target}
            aria-label={t('yourReputation')}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {!eligible ? (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
              {t('progressCallout', { remaining: progress.remaining, min: progress.target })}
            </p>
          ) : (
            <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
              {t('progressReady')}
            </p>
          )}
          {!eligible && quests.availablePoints > 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('questProjection', {
                available: quests.availablePoints,
                projected,
                unlock: wouldUnlock ? t('questProjectionUnlock') : t('questProjectionPartial'),
              })}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Requirements checklist */}
      <section aria-labelledby="creator-reqs-heading" className="space-y-3">
        <h2 id="creator-reqs-heading" className="text-lg font-bold tracking-tight sm:text-xl">
          {t('requirementsHeading')}
        </h2>
        <div className="space-y-2">
          {requirements.map((req) => (
            <div
              key={req.id}
              className={`flex gap-3 rounded-2xl border p-4 text-left ${
                req.emphasize
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border/60 bg-background/50'
              }`}
            >
              {req.done ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{req.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{req.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Daily quests (live) */}
      {!eligible && quests.items.length > 0 ? (
        <section aria-labelledby="creator-quests-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="creator-quests-heading"
                className="text-lg font-bold tracking-tight sm:text-xl"
              >
                {t('dailyQuestsHeading')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('dailyQuestsSubheading')}</p>
            </div>
            <Badge variant="secondary" className="font-semibold">
              {t('dailyQuestsAvailable', { count: quests.availablePoints })}
            </Badge>
          </div>
          <div className="space-y-2">
            {quests.items.map((quest) => (
              <Card
                key={quest.id}
                className={`border-border/50 ${quest.done ? 'opacity-70' : 'glass-panel'}`}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      {quest.done ? (
                        <CheckCircle2
                          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                      ) : (
                        <Circle
                          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{quest.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {quest.current}/{quest.target}
                          {quest.done ? ` · ${t('questDone')}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-primary">+{quest.reward}</span>
                  </div>
                  {!quest.done ? (
                    <>
                      <Progress value={quest.progress} className="h-2" />
                      <Button asChild size="sm" className="w-full sm:w-auto">
                        <Link href={quest.href || '/'} prefetch={false}>
                          {t(quest.ctaKey || 'questCtaDefault')}
                          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {quests.items
              .filter((q) => !q.done)
              .slice(0, 1)
              .map((q) => (
                <Button key={`primary-${q.id}`} asChild className="brand-gradient">
                  <Link href={q.href || '/'} prefetch={false}>
                    {t('questPrimaryCta')}
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ))}
            <Button asChild variant="outline">
              <Link href="/profile" prefetch={false}>
                {t('roadQuestsCta')}
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* Static roadmap with exact points */}
      {!eligible ? (
        <section aria-labelledby="creator-roadmap-heading" className="space-y-4">
          <div>
            <h2
              id="creator-roadmap-heading"
              className="text-lg font-bold tracking-tight sm:text-xl"
            >
              {t('roadmapHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('roadmapSubheading')}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: t('awardRate'),
                value: `+${REPUTATION_AWARDS.rateTool}`,
              },
              {
                label: t('awardComment'),
                value: `+${REPUTATION_AWARDS.comment}`,
              },
              {
                label: t('awardPrompt'),
                value: `+${REPUTATION_AWARDS.promptShare}`,
              },
              {
                label: t('awardSubmit'),
                value: `+${REPUTATION_AWARDS.toolSuggestionApproved}`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-3 text-center"
              >
                <p className="text-lg font-extrabold text-primary">{item.value}</p>
                <p className="text-[11px] text-muted-foreground sm:text-xs">{item.label}</p>
              </div>
            ))}
          </div>

          <ol className="space-y-3">
            {CREATOR_REPUTATION_ROADMAP.map((step, index) => {
              const Icon = ROADMAP_ICONS[step.id] || Star;
              return (
                <li key={step.id}>
                  <Card className="glass-panel border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background shadow-sm">
                          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <p className="font-semibold">{t(step.titleKey)}</p>
                            <Badge variant="outline" className="text-[11px] font-bold">
                              {step.pointsLabel} {t('pointsUnit')}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{t(step.bodyKey)}</p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href={step.href} prefetch={false}>
                          {t(step.ctaKey)}
                          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="brand-gradient">
              <Link href="/" prefetch={false}>
                {t('roadmapPrimaryCta')}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile" prefetch={false}>
                {t('roadmapProfileCta')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/submit" prefetch={false}>
                {t('roadSubmitCta')}
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* Apply form */}
      <section aria-labelledby="creator-apply-heading" className="space-y-3">
        <div>
          <h2 id="creator-apply-heading" className="text-lg font-bold tracking-tight sm:text-xl">
            {t('applySectionHeading')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {eligible ? t('applySectionReady') : t('applySectionLocked')}
          </p>
        </div>

        {eligible || alreadyPending ? (
          <Card className="glass-panel border-border/50">
            <CardContent className="pt-6">
              <CreatorApplyForm
                alreadyPending={alreadyPending}
                labels={{
                  pitchLabel: t('applyPitchLabel'),
                  pitchPlaceholder: t('applyPitchPlaceholder'),
                  submit: t('applySubmit'),
                  submitting: t('applySubmitting'),
                  pendingMessage: t('applyPending'),
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="space-y-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t('applyFormLocked', {
                  remaining: progress.remaining,
                  min: progress.target,
                })}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href="/profile" prefetch={false}>
                    {t('roadQuestsCta')}
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/" prefetch={false}>
                    {t('roadmapPrimaryCta')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
