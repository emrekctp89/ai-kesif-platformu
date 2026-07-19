import { SoftLandingPage, softLandingMetadata } from '@/components/SoftLandingPage';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return softLandingMetadata({ featureKey: 'bounties', path: '/odul-avciligi', locale });
}

export default function OdulAvciligiSoftLandingPage() {
  return <SoftLandingPage featureKey="bounties" path="/odul-avciligi" />;
}
