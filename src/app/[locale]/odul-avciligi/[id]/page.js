import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, Clock, Target } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { BountySubmissions } from '@/components/BountySubmissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { generatePageMetadata } from '@/utils/seo';

export const dynamic = 'force-dynamic';

async function getBountyDetails(bountyId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_bounty_details_with_submissions', {
      p_bounty_id: bountyId,
    });

    if (error || !data) {
      logger.error('Ödül detayları çekilirken hata:', error);
      return null;
    }
    return data;
  } catch (error) {
    logger.error('Ödül detayları beklenmeyen hata:', error);
    return null;
  }
}

async function getAllToolsForSelect() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('tools')
      .select('id, name')
      .eq('is_approved', true)
      .order('name');
    return data || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'BountyDetailPage' });
  const bounty = await getBountyDetails(id);
  return generatePageMetadata({
    title: bounty?.title ? `${bounty.title}` : t('metaTitle'),
    description: bounty?.description || t('metaDescription'),
    path: locale === 'en' ? `/en/odul-avciligi/${id}` : `/odul-avciligi/${id}`,
  });
}

export default async function BountyDetailPage(props) {
  const params = await props.params;
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'BountyDetailPage' });
  const bounty = await getBountyDetails(params.id);
  if (!bounty) notFound();

  const allTools = await getAllToolsForSelect();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = Array.isArray(bounty.profiles) ? bounty.profiles[0] : bounty.profiles;
  const username = profile?.username || '—';
  const avatar = profile?.avatar_url;
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR';
  const submissions = bounty.bounty_submissions || [];
  const isOpen = bounty.status === 'Açık';

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10 sm:pb-12">
      <Button asChild variant="ghost" size="sm" className="-ml-2 min-h-9 rounded-full">
        <Link href="/odul-avciligi" prefetch={false}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('back')}
        </Link>
      </Button>

      <header className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="brand-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-inner">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              {t('heroChip')}
            </div>
            <Badge variant={isOpen ? 'default' : 'secondary'} className="font-semibold">
              {isOpen ? t('statusOpen') : bounty.status}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {bounty.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {bounty.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground/80">{t('owner')}:</span>
              {profile?.username ? (
                <Link
                  href={`/u/${profile.username}`}
                  className="flex items-center gap-2 hover:text-primary"
                  prefetch={false}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={avatar} alt="" />
                    <AvatarFallback>
                      {String(username).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
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
            <Badge variant="outline" className="font-semibold">
              {t('statsSubmissions', { count: submissions.length })}
            </Badge>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="bounty-submissions-heading"
        className="rounded-3xl border border-border/50 bg-card/30 p-4 glass-panel sm:p-6"
      >
        <div className="mb-4">
          <h2
            id="bounty-submissions-heading"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            {t('submissionsHeading')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('submissionsSubheading')}</p>
        </div>
        <BountySubmissions
          bounty={bounty}
          submissions={submissions}
          allTools={allTools}
          currentUser={user}
        />
      </section>
    </div>
  );
}
