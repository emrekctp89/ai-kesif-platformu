'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function SiteBanner() {
  return (
    <div className="brand-gradient relative">
      <div className="container mx-auto px-4 py-16 text-center text-white">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          Yapay Zekanın Gücünü Keşfedin
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
          En iyi AI araçlarını tek bir yerde bulun, karşılaştırın ve topluluğun deneyimlerinden
          öğrenin. Yaratıcılığınızı bir sonraki seviyeye taşıyın.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild size="lg" className="bg-white text-indigo-950 hover:bg-white/90">
            <Link href="/signup">
              Topluluğa Katıl <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white text-white hover:bg-white/10"
          >
            <Link href="/submit">Araç Öner</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
