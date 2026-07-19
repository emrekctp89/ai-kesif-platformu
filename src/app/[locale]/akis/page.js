import logger from '@/utils/logger';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ActivityFeedClient } from '@/components/ActivityFeedClient';
import { generatePageMetadata } from '@/utils/seo';

async function getActivityFeedData(userId) {
  const supabase = await createClient(await cookies());

  const followingPromise = userId
    ? supabase.rpc('get_community_activity_feed', { p_user_id: userId })
    : Promise.resolve({ data: [], error: null });

  const generalPromise = supabase.rpc('get_community_activity_feed');

  const [followingResult, generalResult] = await Promise.all([followingPromise, generalPromise]);

  if (followingResult.error) {
    logger.error('Takip akışı çekilirken hata:', followingResult.error);
  }
  if (generalResult.error) {
    logger.error('Genel akış çekilirken hata:', generalResult.error);
  }

  return {
    following: Array.isArray(followingResult.data) ? followingResult.data : [],
    general: Array.isArray(generalResult.data) ? generalResult.data : [],
  };
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ActivityFeedPage' });
  return generatePageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: locale === 'en' ? '/en/akis' : '/akis',
  });
}

export default async function ActivityFeedPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ActivityFeedPage' });
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?message=${encodeURIComponent(t('loginRequired'))}`);
  }

  const { following, general } = await getActivityFeedData(user.id);
  const initialMode = following.length > 0 ? 'following' : 'general';

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10">
      <div className="rounded-3xl border border-border/50 bg-card/30 p-4 glass-panel sm:p-6">
        <ActivityFeedClient
          initialFollowingItems={following}
          initialGeneralItems={general}
          initialMode={initialMode}
          canUseFollowing
          title={t('title')}
          description={t('description')}
        />
      </div>
    </div>
  );
}
