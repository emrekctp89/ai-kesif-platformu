import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import KasifExperiment from './KasifExperiment';
import { isKasifSiteEnabled } from '@/lib/kasif/activation';

export const metadata = {
  title: 'Kâşif Yerel AI Deneyi',
  robots: { index: false, follow: false },
};

export default function KasifExperimentPage() {
  if (!isKasifSiteEnabled(process.env)) notFound();
  return (
    <Suspense fallback={null}>
      <KasifExperiment />
    </Suspense>
  );
}
