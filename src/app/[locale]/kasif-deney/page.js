import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import KasifExperiment from './KasifExperiment';
import { isKasifEnabled } from '@/lib/kasif/config';

export const metadata = {
  title: 'Kâşif Yerel AI Deneyi',
  robots: { index: false, follow: false },
};

export default function KasifExperimentPage() {
  if (!isKasifEnabled(process.env)) notFound();
  return (
    <Suspense fallback={null}>
      <KasifExperiment />
    </Suspense>
  );
}
