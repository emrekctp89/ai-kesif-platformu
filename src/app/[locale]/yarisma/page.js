import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Images, Sparkles, Target, Trophy, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ChallengeClient } from '@/components/ChallengeClient';
import { SubmitToShowcaseChallengeDialog } from '@/components/SubmitToShowcaseChallengeDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export const dynamic = 'force-dynamic';

async function getActiveChallenge() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('challenges')
      .select(
        `
            *,
            challenge_submissions!challenge_submissions_challenge_id_fkey (
                id,
                vote_count,
                showcase_item_id,
                showcase_items ( title, image_url )
            )
        `
      )
      .eq('status', 'Aktif')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.error('Aktif yarışma çekilirken hata:', error);
      return null;
    }
    return data;
  } catch (error) {
    logger.error('Aktif yarışma beklenmeyen hata:', error);
    return null;
  }
}

async function getUserShowcaseItems(userId) {
  if (!userId) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('showcase_items')
      .select('id, title, image_url')
      .eq('user_id', userId)
      .eq('is_approved', true);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

function daysLeft(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? Math.max(0, diff) : null;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ChallengePage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/yarisma' : '/yarisma',
  });
}

export default async function ChallengePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ChallengePage' });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [challenge, userShowcaseItems] = await Promise.all([
    getActiveChallenge(),
    getUserShowcaseItems(user?.id),
  ]);

  let userVotes = [];
  if (user && challenge?.challenge_submissions?.length) {
    const submissionIds = challenge.challenge_submissions.map((s) => s.id);
    if (submissionIds.length > 0) {
      const { data } = await supabase
        .from('challenge_submission_votes')
        .select('submission_id')
        .eq('user_id', user.id)
        .in('submission_id', submissionIds);
      userVotes = data || [];
    }
  }

  const submissions = challenge?.challenge_submissions || [];
  const remaining = daysLeft(challenge?.end_date);
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';

  const steps = [
    { icon: Sparkles, title: t('step1Title'), body: t('step1Body') },
    { icon: Images, title: t('step2Title'), body: t('step2Body') },
    { icon: Users, title: t('step3Title'), body: t('step3Body') },
    { icon: Trophy, title: t('step4Title'), body: t('step4Body') },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10 sm:space-y-12 sm:pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>

          {challenge ? (
            <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-border/50 bg-background/50 px-4 py-4 text-left sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="font-semibold">{t('statusActive')}</Badge>
                {remaining !== null ? (
                  <Badge variant="outline" className="font-semibold">
                    <CalendarDays className="mr-1 h-3 w-3" aria-hidden="true" />
                    {t('daysLeft', { count: remaining })}
                  </Badge>
                ) : null}
              </div>
              <h2 className="mt-3 text-xl font-semibold text-primary sm:text-2xl">
                {challenge.title}
              </h2>
              {challenge.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {challenge.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground sm:text-sm">
                {challenge.start_date ? (
                  <span>
                    {t('starts', {
                      date: new Date(challenge.start_date).toLocaleDateString(dateLocale),
                    })}
                  </span>
                ) : null}
                {challenge.end_date ? (
                  <span>
                    {t('ends', {
                      date: new Date(challenge.end_date).toLocaleDateString(dateLocale),
                    })}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t('noActive')}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {challenge ? (
              <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
                {t('statsSubmissions', { count: submissions.length })}
              </span>
            ) : null}
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              {t('statsVotesHint')}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/eserler" prefetch={false}>
                <Images className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaShowcase')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/odul-avciligi" prefetch={false}>
                <Target className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaBounties')}
              </Link>
            </Button>
            {user && challenge ? (
              <SubmitToShowcaseChallengeDialog
                userShowcaseItems={userShowcaseItems}
                challengeTitle={challenge.title}
              />
            ) : null}
            {!user && challenge ? (
              <Button asChild className="brand-gradient min-h-11 rounded-xl shadow-md">
                <Link href="/login" prefetch={false}>
                  {t('ctaLogin')}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="challenge-how-heading">
        <div className="mb-5 sm:mb-6">
          <h2
            id="challenge-how-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {t('howHeading')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('howSubheading')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, index) => (
            <Card
              key={title}
              className="glass-panel border-border/50 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader className="space-y-3 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="rounded-xl border bg-background p-2.5 shadow-sm">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {challenge && submissions.length > 0 ? (
        <section aria-labelledby="challenge-entries-heading" className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="challenge-entries-heading"
                className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                {t('entriesHeading')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('entriesSubheading')}</p>
            </div>
            <Badge variant="secondary" className="w-fit font-semibold">
              {t('statsSubmissions', { count: submissions.length })}
            </Badge>
          </div>
          <ChallengeClient submissions={submissions} user={user} userVotes={userVotes} />
        </section>
      ) : challenge ? (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center sm:px-10">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptySubmissionsTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {t('emptySubmissions')}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/eserler" prefetch={false}>
                {t('ctaShowcase')}
              </Link>
            </Button>
            {user ? (
              <SubmitToShowcaseChallengeDialog
                userShowcaseItems={userShowcaseItems}
                challengeTitle={challenge.title}
              />
            ) : (
              <Button asChild className="brand-gradient min-h-11 rounded-xl">
                <Link href="/login" prefetch={false}>
                  {t('ctaLogin')}
                </Link>
              </Button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center sm:px-10">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('noActiveTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('noActiveBody')}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/eserler" prefetch={false}>
                {t('ctaShowcase')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/odul-avciligi" prefetch={false}>
                {t('ctaBounties')}
              </Link>
            </Button>
          </div>
          {user && user.email === process.env.ADMIN_EMAIL ? (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border/50 bg-card/40 px-5 py-6 glass-panel">
              <p className="mb-4 text-sm text-muted-foreground">{t('adminPrompt')}</p>
              <Button asChild className="brand-gradient min-h-11 shadow-md">
                <Link href="/admin" prefetch={false}>
                  {t('adminCta')}
                </Link>
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
