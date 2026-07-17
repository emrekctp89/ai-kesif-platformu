import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Award, Clock, Target } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { CreateBountyDialog } from '@/components/CreateBountyDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generatePageMetadata } from '@/utils/seo';

async function getActiveBounties() {
  const supabase = await createClient(await cookies());
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
  const t = await getTranslations('BountiesPage');
  const bounties = await getActiveBounties();
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10">
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
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm">
              {t('statsOpen', { count: bounties.length })}
            </span>
            {user ? <CreateBountyDialog /> : null}
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {bounties.length > 0 ? (
          bounties.map((bounty) => {
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
                  <CardHeader>
                    <CardTitle className="text-xl">{bounty.title}</CardTitle>
                    <CardDescription className="line-clamp-2 pt-1">
                      {bounty.description}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={avatar} alt="" />
                        <AvatarFallback>{username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{username}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 font-semibold text-primary">
                        <Award className="h-4 w-4" aria-hidden="true" />
                        {t('points', { count: bounty.reputation_reward })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {new Date(bounty.expires_at).toLocaleDateString(dateLocale)}
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            );
          })
        ) : (
          <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
            <Award className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold tracking-tight">{t('emptyTitle')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('emptyBody')}</p>
          </section>
        )}
      </div>
    </div>
  );
}
