'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    // Client boundary — keep payload small and free of sensitive data.
    console.error('[route-error]', {
      digest: error?.digest,
      name: error?.name,
      message: error?.message?.slice?.(0, 200),
    });
  }, [error]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center"
    >
      <div className="mb-5 rounded-full bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl">Bu bölüm yüklenirken bir sorun oluştu</h1>
      <p className="mt-3 text-muted-foreground">
        Geçici bir bağlantı sorunu olabilir. Yeniden deneyebilir veya ana sayfaya dönebilirsiniz.
      </p>
      {error?.digest && (
        <p className="mt-3 text-xs text-muted-foreground">Hata kodu: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} className="tap-target min-h-11">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Yeniden Dene
        </Button>
        <Button asChild variant="outline" className="tap-target min-h-11">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Ana Sayfa
          </Link>
        </Button>
        <Button asChild variant="ghost" className="tap-target min-h-11">
          <Link href="/kesfet">Keşfet</Link>
        </Button>
      </div>
    </div>
  );
}
