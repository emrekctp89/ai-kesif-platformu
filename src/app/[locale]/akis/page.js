import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ActivityFeedClient } from '@/components/ActivityFeedClient';

async function getActivityFeedData(userId) {
  const supabase = await createClient();

  const followingPromise = userId
    ? supabase.rpc('get_community_activity_feed', { p_user_id: userId })
    : Promise.resolve({ data: [], error: null });

  const generalPromise = supabase.rpc('get_community_activity_feed');

  const [followingResult, generalResult] = await Promise.all([followingPromise, generalPromise]);

  if (followingResult.error) {
    console.error('Takip akışı çekilirken hata:', followingResult.error);
  }
  if (generalResult.error) {
    console.error('Genel akış çekilirken hata:', generalResult.error);
  }

  return {
    following: Array.isArray(followingResult.data) ? followingResult.data : [],
    general: Array.isArray(generalResult.data) ? generalResult.data : [],
  };
}

export const metadata = {
  title: 'Akış | AI Keşif Platformu',
  description:
    'Takip ettiğiniz kişilerin ve topluluğun en son aktivitelerini, favorilerini, yorumlarını ve eserlerini keşfedin.',
};

export default async function ActivityFeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?message=${encodeURIComponent('Akış sayfasını görmek için giriş yapmalısınız.')}`
    );
  }

  const { following, general } = await getActivityFeedData(user.id);
  const initialMode = following.length > 0 ? 'following' : 'general';

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 sm:py-12">
      <ActivityFeedClient
        initialFollowingItems={following}
        initialGeneralItems={general}
        initialMode={initialMode}
        canUseFollowing
        title="Sizin İçin Akış"
        description="Takip ettiklerinizden veya genel topluluktan favoriler, yorumlar, eserler ve promptlar."
      />
    </div>
  );
}
