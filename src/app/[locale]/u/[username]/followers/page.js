import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

async function getFollowers(username) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
            followers!following_id(
                follower:profiles!follower_id(id, username, email, avatar_url)
            )
        `
    )
    .eq('username', username)
    .single();

  if (error || !data) {
    notFound();
  }
  return (data.followers || []).map((f) => f.follower).filter(Boolean);
}

export default async function FollowersPage(props) {
  const params = await props.params;
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'FollowListPage' });
  const followers = await getFollowers(params.username);

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 text-center shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <div className="brand-chip mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('statsCount', { count: followers.length })}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t('followersTitle', { name: params.username })}
          </h1>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="glass-button mt-5 min-h-9 rounded-full"
          >
            <Link href={`/u/${params.username}`} prefetch={false}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t('backToProfile')}
            </Link>
          </Button>
        </div>
      </section>

      {followers.length > 0 ? (
        <div className="space-y-3">
          {followers.map((user) => {
            const name = user.username || user.email || '—';
            const href = user.username ? `/u/${user.username}` : null;
            const inner = (
              <Card className="glass-panel border-border/50 transition-colors hover:border-primary/30 hover:bg-muted/40">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url} alt="" />
                    <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold">{name}</p>
                </CardContent>
              </Card>
            );
            return href ? (
              <Link key={user.id} href={href} className="block" prefetch={false}>
                {inner}
              </Link>
            ) : (
              <div key={user.id}>{inner}</div>
            );
          })}
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed bg-muted/20 px-6 py-14 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">{t('emptyFollowers')}</p>
        </section>
      )}
    </div>
  );
}
