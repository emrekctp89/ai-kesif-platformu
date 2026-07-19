import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'challenge', path: '/yarisma', locale });
}

export default function YarismaSoftLandingPage() {
  return <SoftLandingPage featureKey="challenge" path="/yarisma" />;
}
