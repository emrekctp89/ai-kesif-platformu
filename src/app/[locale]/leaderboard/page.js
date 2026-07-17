import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Medal, Trophy, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';
import { cn } from '@/lib/utils';

export const revalidate = 3600;

async function getTopUsers() {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url, reputation_points')
    .order('reputation_points', { ascending: false })
    .limit(25);

  if (error) {
    // Fallback without id/username if schema differs
    const fallback = await supabase
      .from('profiles')
      .select('email, avatar_url, reputation_points')
      .order('reputation_points', { ascending: false })
      .limit(25);

    if (fallback.error) {
      console.error('Liderlik tablosu çekilirken hata:', fallback.error);
      return [];
    }
    return fallback.data || [];
  }

  return data || [];
}

function displayName(user, anonymousLabel) {
  if (user.username) return user.username;
  if (user.email) {
    const local = String(user.email).split('@')[0];
    return local || anonymousLabel;
  }
  return anonymousLabel;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LeaderboardPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/leaderboard' : '/leaderboard',
  });
}

export default async function LeaderboardPage({ params }) {
  await params;
  const t = await getTranslations('LeaderboardPage');
  const topUsers = await getTopUsers();

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <Trophy className="mx-auto mb-3 h-12 w-12 text-amber-400" aria-hidden="true" />
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button mt-5 min-h-9 rounded-full"
          >
            <Link href="/topluluk" prefetch={false}>
              <Users className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('ctaCommunity')}
            </Link>
          </Button>
        </div>
      </section>

      {topUsers.length === 0 ? (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <Medal className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
        </section>
      ) : (
        <Card className="glass-panel overflow-hidden border-border/50">
          <CardContent className="space-y-2 p-3 sm:p-5">
            {topUsers.map((user, index) => {
              const name = displayName(user, t('anonymous'));
              const fallback = name.substring(0, 2).toUpperCase();
              const rank = index + 1;
              const href = user.username ? `/u/${user.username}` : null;
              const rowClass = cn(
                'flex items-center gap-3 rounded-xl p-3 transition-colors sm:gap-4 sm:p-4',
                rank === 1 && 'bg-amber-500/10 ring-1 ring-amber-500/20',
                rank === 2 && 'bg-slate-400/10 ring-1 ring-slate-400/20',
                rank === 3 && 'bg-orange-700/10 ring-1 ring-orange-700/20',
                rank > 3 && 'bg-muted/40 hover:bg-muted/70'
              );

              const inner = (
                <>
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      rank <= 3 ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    )}
                    aria-label={`${t('rank')} ${rank}`}
                  >
                    {rank <= 3 ? (
                      <Medal
                        className={cn(
                          'h-5 w-5',
                          rank === 1 && 'text-amber-500',
                          rank === 2 && 'text-slate-400',
                          rank === 3 && 'text-orange-700'
                        )}
                        aria-hidden="true"
                      />
                    ) : (
                      rank
                    )}
                  </div>
                  <Avatar className="h-11 w-11 shrink-0">
                    {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                    <AvatarFallback>{fallback}</AvatarFallback>
                  </Avatar>
                  <p className="min-w-0 flex-1 truncate font-semibold">{name}</p>
                  <div className="shrink-0 text-sm font-bold text-primary sm:text-base">
                    {t('points', { count: user.reputation_points ?? 0 })}
                  </div>
                </>
              );

              return href ? (
                <Link
                  key={user.id || user.username || user.email || rank}
                  href={href}
                  prefetch={false}
                  className={cn(
                    rowClass,
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <div key={user.email || rank} className={rowClass}>
                  {inner}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
