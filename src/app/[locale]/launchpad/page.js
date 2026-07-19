import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { LaunchCard } from '@/components/LaunchCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generatePageMetadata } from '@/utils/seo';

async function getLaunches(startDate, endDate, userId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.rpc('get_launches', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_user_id: userId,
  });

  if (error) {
    logger.error('Lansmanlar çekilirken hata:', error);
    return [];
  }
  return data || [];
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'LaunchpadPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/launchpad' : '/launchpad',
  });
}

export default async function LaunchpadPage({ params }) {
  await params;
  const t = await getTranslations('LaunchpadPage');
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [todayLaunches, weekLaunches] = await Promise.all([
    getLaunches(today, today, user?.id),
    getLaunches(sevenDaysAgo, today, user?.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-10 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Rocket className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <Rocket className="mx-auto mb-3 h-12 w-12 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              {t('statsToday', { count: todayLaunches.length })}
            </span>
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              {t('statsWeek', { count: weekLaunches.length })}
            </span>
          </div>

          {user ? (
            <Button asChild size="lg" className="brand-gradient mt-6 min-h-11 shadow-md">
              <Link href="/launchpad/submit" prefetch={false}>
                <Rocket className="mr-2 h-5 w-5" aria-hidden="true" />
                {t('ctaSubmit')}
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl">
          <TabsTrigger value="today" className="rounded-xl">
            {t('tabToday')}
          </TabsTrigger>
          <TabsTrigger value="week" className="rounded-xl">
            {t('tabWeek')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <div className="space-y-4 pt-6">
            {todayLaunches.length > 0 ? (
              todayLaunches.map((launch) => (
                <LaunchCard key={launch.id} launch={launch} user={user} isVoted={launch.is_voted} />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-12 text-center">
                <Rocket className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
                <p className="mt-4 text-sm text-muted-foreground">{t('emptyToday')}</p>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="week">
          <div className="space-y-4 pt-6">
            {weekLaunches.length > 0 ? (
              weekLaunches.map((launch) => (
                <LaunchCard key={launch.id} launch={launch} user={user} isVoted={launch.is_voted} />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed bg-muted/20 px-6 py-12 text-center">
                <Rocket className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
                <p className="mt-4 text-sm text-muted-foreground">{t('emptyWeek')}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
