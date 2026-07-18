import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { ArrowRight, Award, Clock, Search, Sparkles, Target, Trophy, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CreateBountyDialog } from '@/components/CreateBountyDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

export const dynamic = 'force-dynamic';

async function getActiveBounties() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('bounties')
      .select(
        `
            id,
            title,
            description,
            reputation_reward,
            expires_at,
            profiles ( username, avatar_url )
        `
      )
      .eq('status', 'Açık')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Aktif ödüller çekilirken hata:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Aktif ödüller beklenmeyen hata:', error);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'BountiesPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/odul-avciligi' : '/odul-avciligi',
  });
}

export default async function BountiesPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'BountiesPage' });
  const bounties = await getActiveBounties();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const totalReward = bounties.reduce(
    (sum, bounty) => sum + (Number(bounty.reputation_reward) || 0),
    0
  );

  const steps = [
    { icon: Search, title: t('step1Title'), body: t('step1Body') },
    { icon: Sparkles, title: t('step2Title'), body: t('step2Body') },
    { icon: Users, title: t('step3Title'), body: t('step3Body') },
    { icon: Award, title: t('step4Title'), body: t('step4Body') },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10 sm:space-y-12 sm:pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Target className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              {t('statsOpen', { count: bounties.length })}
            </span>
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              {t('statsRewardPool', { count: totalReward })}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <CreateBountyDialog />
            ) : (
              <Button asChild className="brand-gradient min-h-11 rounded-xl shadow-md">
                <Link href="/login" prefetch={false}>
                  {t('ctaLoginCreate')}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/yarisma" prefetch={false}>
                <Trophy className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('ctaChallenge')}
              </Link>
            </Button>
            <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
              <Link href="/submit" prefetch={false}>
                {t('ctaSubmitTool')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="bounty-how-heading">
        <div className="mb-5 sm:mb-6">
          <h2
            id="bounty-how-heading"
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

      <section aria-labelledby="bounty-list-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="bounty-list-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {t('listHeading')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('listSubheading')}</p>
          </div>
        </div>

        {bounties.length > 0 ? (
          <div className="space-y-3">
            {bounties.map((bounty) => {
              const profile = Array.isArray(bounty.profiles) ? bounty.profiles[0] : bounty.profiles;
              const username = profile?.username || '—';
              const avatar = profile?.avatar_url;

              return (
                <Link
                  key={bounty.id}
                  href={`/odul-avciligi/${bounty.id}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  prefetch={false}
                >
                  <Card className="glass-panel border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-semibold">
                          {t('statusOpen')}
                        </Badge>
                        <Badge variant="outline" className="font-semibold text-primary">
                          <Award className="mr-1 h-3 w-3" aria-hidden="true" />
                          {t('points', { count: bounty.reputation_reward })}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl leading-snug">{bounty.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                        {bounty.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-0 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={avatar} alt="" />
                          <AvatarFallback>
                            {String(username).substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground/80">{username}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="inline-flex items-center gap-1.5">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          {t('expires', {
                            date: new Date(bounty.expires_at).toLocaleDateString(dateLocale),
                          })}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                          {t('viewDetails')}
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center sm:px-10">
            <Award className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {user ? (
                <CreateBountyDialog />
              ) : (
                <Button asChild className="brand-gradient min-h-11 rounded-xl">
                  <Link href="/login" prefetch={false}>
                    {t('ctaLoginCreate')}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="glass-button min-h-11 rounded-xl">
                <Link href="/kategori" prefetch={false}>
                  {t('ctaBrowseCategories')}
                </Link>
              </Button>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
