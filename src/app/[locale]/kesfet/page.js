import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'discover', path: '/kesfet', locale });
}

export default function KesfetSoftLandingPage() {
  return <SoftLandingPage featureKey="discover" path="/kesfet" />;
}
