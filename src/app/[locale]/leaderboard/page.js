import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'leaderboard', path: '/leaderboard', locale });
}

export default function LeaderboardSoftLandingPage() {
  return <SoftLandingPage featureKey="leaderboard" path="/leaderboard" />;
}
