import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PenLine } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { ContentStudioClient } from '@/components/ContentStudioClient';
import { CreatorAccessGate } from '@/components/CreatorAccessGate';
import {
  getCreatorPostsForCurrentUser,
  hasOpenCreatorApplication,
} from '@/app/actions/contentCreators';
import { createAdminClient } from '@/utils/supabase/admin';
import { generatePageMetadata } from '@/utils/seo';
import { MIN_CREATOR_REPUTATION } from '@/lib/contentCreatorRules';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ContentStudio' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/icerik' : '/icerik',
    noindex: true,
  });
}

export default async function ContentStudioPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ContentStudio' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_content_creator, username, reputation_points')
    .eq('id', user.id)
    .maybeSingle();

  const allowed = isAdmin || Boolean(profile?.is_content_creator);

  if (!allowed) {
    const today = new Date().toISOString().split('T')[0];
    const [pending, dailyQuests, featuredTool, popularTool, sampleProfile] = await Promise.all([
      hasOpenCreatorApplication(user.id),
      (async () => {
        const { data, error } = await supabase
          .from('user_daily_quests')
          .select(
            `
            *,
            quests (
              description,
              action_type,
              target_count,
              reputation_reward
            )
          `
          )
          .eq('user_id', user.id)
          .eq('quest_date', today);
        if (error) return [];
        return data || [];
      })(),
      admin
        .from('tools')
        .select('slug')
        .eq('is_approved', true)
        .eq('is_featured', true)
        .not('slug', 'is', null)
        .limit(1)
        .maybeSingle(),
      admin
        .from('tools')
        .select('slug')
        .eq('is_approved', true)
        .not('slug', 'is', null)
        .order('is_featured', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('profiles')
        .select('username')
        .not('username', 'is', null)
        .neq('id', user.id)
        .order('reputation_points', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return (
      <CreatorAccessGate
        reputationPoints={profile?.reputation_points || 0}
        minReputation={MIN_CREATOR_REPUTATION}
        alreadyPending={pending}
        username={profile?.username || null}
        dailyQuests={dailyQuests}
        questLinkOpts={{
          featuredToolSlug: featuredTool?.data?.slug || null,
          popularToolSlug: popularTool?.data?.slug || featuredTool?.data?.slug || null,
          sampleUsername: sampleProfile?.data?.username || null,
        }}
      />
    );
  }

  const posts = await getCreatorPostsForCurrentUser();

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      <section className="brand-surface relative overflow-hidden rounded-3xl p-6 shadow-xl glass-panel sm:p-8">
        <div className="relative z-10">
          <div className="brand-chip mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold shadow-inner">
            <PenLine className="h-4 w-4" aria-hidden="true" />
            {t('heroChip')}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <ContentStudioClient posts={posts} />
    </div>
  );
}
