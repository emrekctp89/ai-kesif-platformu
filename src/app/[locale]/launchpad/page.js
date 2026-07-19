import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'launchpad', path: '/launchpad', locale });
}

export default function LaunchpadSoftLandingPage() {
  return <SoftLandingPage featureKey="launchpad" path="/launchpad" />;
}
