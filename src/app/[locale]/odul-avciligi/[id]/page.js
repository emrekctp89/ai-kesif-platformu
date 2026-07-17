import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, Clock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { BountySubmissions } from '@/components/BountySubmissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

async function getBountyDetails(bountyId) {
  const supabase = await createClient(await cookies());
  const { data, error } = await supabase.rpc('get_bounty_details_with_submissions', {
    p_bounty_id: bountyId,
  });

  if (error || !data) {
    console.error('Ödül detayları çekilirken hata:', error);
    notFound();
  }
  return data;
}

async function getAllToolsForSelect() {
  const supabase = await createClient(await cookies());
  const { data } = await supabase
    .from('tools')
    .select('id, name')
    .eq('is_approved', true)
    .order('name');
  return data || [];
}

export default async function BountyDetailPage(props) {
  const params = await props.params;
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'BountyDetailPage' });
  const bounty = await getBountyDetails(params.id);
  const allTools = await getAllToolsForSelect();
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = Array.isArray(bounty.profiles) ? bounty.profiles[0] : bounty.profiles;
  const username = profile?.username || '—';
  const avatar = profile?.avatar_url;
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <Button asChild variant="ghost" size="sm" className="min-h-9 -ml-2 rounded-full">
        <Link href="/odul-avciligi" prefetch={false}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('back')}
        </Link>
      </Button>

      <header className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <Badge
            variant={bounty.status === 'Açık' ? 'default' : 'secondary'}
            className="mb-3 font-semibold"
          >
            {bounty.status}
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {bounty.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {bounty.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t('owner')}:</span>
              {profile?.username ? (
                <Link
                  href={`/u/${profile.username}`}
                  className="flex items-center gap-2 hover:text-primary"
                  prefetch={false}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={avatar} alt="" />
                    <AvatarFallback>{username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{username}</span>
                </Link>
              ) : (
                <span>{username}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Award className="h-4 w-4" aria-hidden="true" />
              {t('reward', { count: bounty.reputation_reward })}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t('deadline', {
                date: new Date(bounty.expires_at).toLocaleDateString(dateLocale),
              })}
            </div>
          </div>
        </div>
      </header>

      <Separator />

      <div className="rounded-3xl border border-border/50 bg-card/30 p-4 glass-panel sm:p-6">
        <BountySubmissions
          bounty={bounty}
          submissions={bounty.bounty_submissions}
          allTools={allTools}
          currentUser={user}
        />
      </div>
    </div>
  );
}
