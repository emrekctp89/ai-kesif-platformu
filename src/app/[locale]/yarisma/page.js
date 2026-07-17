import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Images, Trophy } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ChallengeClient } from '@/components/ChallengeClient';
import { SubmitToShowcaseChallengeDialog } from '@/components/SubmitToShowcaseChallengeDialog';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

async function getActiveChallenge() {
  const supabase = await createClient(await cookies());
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
    .single();

  if (error) {
    console.error('Aktif yarışma çekilirken hata:', error);
    return null;
  }
  return data;
}

async function getUserShowcaseItems(userId) {
  if (!userId) return [];
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('showcase_items')
    .select('id, title, image_url')
    .eq('user_id', userId)
    .eq('is_approved', true);
  if (error) return [];
  return data || [];
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
  await params;
  const t = await getTranslations('ChallengePage');
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [challenge, userShowcaseItems] = await Promise.all([
    getActiveChallenge(),
    getUserShowcaseItems(user?.id),
  ]);

  let userVotes = [];
  if (user && challenge?.challenge_submissions) {
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

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <Trophy className="mx-auto mb-3 h-14 w-14 text-amber-400" aria-hidden="true" />
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          {challenge ? (
            <>
              <h2 className="mt-4 text-xl font-semibold text-primary sm:text-2xl">
                {challenge.title}
              </h2>
              <p className="mx-auto mt-2 max-w-2xl text-base text-muted-foreground sm:text-lg">
                {challenge.description}
              </p>
            </>
          ) : (
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t('noActive')}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/eserler" prefetch={false}>
                <Images className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaShowcase')}
              </Link>
            </Button>
            {user && challenge ? (
              <SubmitToShowcaseChallengeDialog
                userShowcaseItems={userShowcaseItems}
                challengeTitle={challenge.title}
              />
            ) : null}
          </div>
        </div>
      </section>

      {challenge?.challenge_submissions?.length > 0 ? (
        <ChallengeClient
          submissions={challenge.challenge_submissions}
          user={user}
          userVotes={userVotes}
        />
      ) : challenge ? (
        <div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">{t('emptySubmissions')}</p>
        </div>
      ) : (
        user &&
        user.email === process.env.ADMIN_EMAIL && (
          <div className="rounded-3xl border border-border/50 bg-card/40 px-6 py-10 text-center glass-panel">
            <p className="mb-4 text-muted-foreground">{t('adminPrompt')}</p>
            <Button asChild className="brand-gradient min-h-11 shadow-md">
              <Link href="/admin" prefetch={false}>
                {t('adminCta')}
              </Link>
            </Button>
          </div>
        )
      )}
    </div>
  );
}
