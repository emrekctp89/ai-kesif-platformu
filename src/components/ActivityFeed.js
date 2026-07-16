import { CommunityFeedPreview } from '@/components/CommunityFeedPreview';

/**
 * Geriye dönük uyumluluk: sunucu tarafı topluluk akışı özeti.
 * Canlı / kişiselleştirilmiş deneyim için ActivityFeedClient kullanın.
 */
export async function ActivityFeed({ limit = 20, className = '' } = {}) {
  return <CommunityFeedPreview limit={limit} className={className} />;
}
