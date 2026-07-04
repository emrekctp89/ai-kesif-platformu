'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Wrench, Home, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ToolDetailError({ error, reset }) {
  useEffect(() => {
    console.error('[tool-detail-error]', { digest: error?.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 rounded-full bg-destructive/10 p-4 text-destructive">
        <Wrench className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl">Araç bilgileri yüklenirken sorun oluştu</h1>
      <p className="mt-3 text-muted-foreground">
        Bu aracın detaylarına şu anda ulaşılamıyor. Araç kaldırılmış veya geçici bir sorun yaşanıyor
        olabilir.
      </p>
      {error?.digest && (
        <p className="mt-3 text-xs text-muted-foreground">Hata kodu: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Yeniden Dene
        </Button>
        <Button asChild variant="outline">
          <Link href="/kesfet">
            <Search className="mr-2 h-4 w-4" />
            Keşfet
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Ana Sayfa
          </Link>
        </Button>
      </div>
    </div>
  );
}
