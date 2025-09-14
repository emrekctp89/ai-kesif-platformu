'use client'

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function SiteBanner() {
    return (
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700">
            <div className="container mx-auto px-4 py-16 text-center text-white">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                    Yapay Zekanın Gücünü Keşfedin
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-indigo-100">
                    En iyi AI araçlarını tek bir yerde bulun, karşılaştırın ve topluluğun deneyimlerinden öğrenin. Yaratıcılığınızı bir sonraki seviyeye taşıyın.
                </p>
                <div className="mt-8 flex justify-center gap-4">
                    <Button asChild size="lg" className="bg-white text-indigo-600 hover:bg-gray-100">
                        <Link href="/signup">
                            Topluluğa Katıl <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                        <Link href="/submit">
                            Araç Öner
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
