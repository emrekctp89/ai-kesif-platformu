import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Images, Rss, Star, Trophy, TrendingUp, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CommunityFeedPreview } from '@/components/CommunityFeedPreview';
import { UserCard } from '@/components/UserCard';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

export const revalidate = 1800;

async function getDiscoveryData(userId) {
  const supabase = await createClient(await cookies());
  const [
    { data: weeklyTop, error: weeklyError },
    { data: mostFollowed, error: popularError },
    { data: newestMembers, error: newestError },
    { data: followingList },
  ] = await Promise.all([
    supabase.rpc('get_weekly_top_contributors'),
    supabase.rpc('get_most_followed_users'),
    supabase.rpc('get_newest_members'),
    userId
      ? supabase.from('followers').select('following_id').eq('follower_id', userId)
      : Promise.resolve({ data: [] }),
  ]);

  if (weeklyError) console.error('Haftalık yıldızlar hatası:', weeklyError);
  if (popularError) console.error('Popüler üyeler hatası:', popularError);
  if (newestError) console.error('Yeni üyeler hatası:', newestError);

  const followingSet = new Set(followingList?.map((f) => f.following_id) || []);

  return {
    weeklyTop: weeklyTop || [],
    mostFollowed: mostFollowed || [],
    newestMembers: newestMembers || [],
    followingSet,
  };
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Community' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/topluluk' : '/topluluk',
  });
}

function SectionHeader({ id, icon: Icon, title, subtitle }) {
  return (
    <div className="mb-5 sm:mb-6">
      <h2
        id={id}
        className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
      >
        {Icon ? <Icon className="h-7 w-7 text-primary" aria-hidden="true" /> : null}
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export default async function CommunityPage({ params }) {
  await params;
  const t = await getTranslations('Community');
  const supabase = await createClient(await cookies());
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { weeklyTop, mostFollowed, newestMembers, followingSet } = await getDiscoveryData(
    currentUser?.id
  );

  const hasAny = weeklyTop.length > 0 || mostFollowed.length > 0 || newestMembers.length > 0;

  const quickLinks = [
    { href: '/leaderboard', label: t('ctaLeaderboard'), icon: Trophy },
    { href: '/akis', label: t('ctaFeed'), icon: Rss },
    { href: '/eserler', label: t('ctaShowcase'), icon: Images },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-12 pb-8 sm:space-y-16 sm:pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                asChild
                variant="outline"
                size="sm"
                className="glass-button min-h-10 rounded-full px-4 font-semibold"
              >
                <Link href={href} prefetch={false}>
                  <Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <CommunityFeedPreview limit={4} className="mx-auto max-w-3xl" />

      {!hasAny ? (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
        </section>
      ) : null}

      <div className="space-y-14 sm:space-y-16">
        {weeklyTop.length > 0 ? (
          <section aria-labelledby="community-weekly-heading">
            <SectionHeader
              id="community-weekly-heading"
              icon={TrendingUp}
              title={t('weeklyHeading')}
              subtitle={t('weeklySubheading')}
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-5">
              {weeklyTop.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUser={currentUser}
                  isInitiallyFollowing={followingSet.has(user.id)}
                  context="weekly_stars"
                />
              ))}
            </div>
          </section>
        ) : null}

        {mostFollowed.length > 0 ? (
          <section aria-labelledby="community-popular-heading">
            <SectionHeader
              id="community-popular-heading"
              icon={Star}
              title={t('popularHeading')}
              subtitle={t('popularSubheading')}
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-5">
              {mostFollowed.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUser={currentUser}
                  isInitiallyFollowing={followingSet.has(user.id)}
                  context="most_followed"
                />
              ))}
            </div>
          </section>
        ) : null}

        {newestMembers.length > 0 ? (
          <section aria-labelledby="community-newest-heading">
            <SectionHeader
              id="community-newest-heading"
              icon={Users}
              title={t('newestHeading')}
              subtitle={t('newestSubheading')}
            />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-5">
              {newestMembers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  currentUser={currentUser}
                  isInitiallyFollowing={followingSet.has(user.id)}
                  context="newest_members"
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
