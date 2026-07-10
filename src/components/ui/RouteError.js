'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function RouteError({
  error,
  reset,
  title = 'Bir Hata Oluştu',
  message = 'Bu bölümü yüklerken beklenmedik bir sorunla karşılaştık.',
}) {
  React.useEffect(() => {
    // Hatayı logla (örn. Sentry'e gönderebilir)
    console.error('RouteError caught:', error);
  }, [error]);

  return (
    <div className="flex w-full items-center justify-center p-4 min-h-[300px]">
      <Card className="w-full max-w-md border-destructive/20 shadow-lg glass-panel">
        <CardHeader className="flex flex-col items-center space-y-2 text-center pb-4">
          <div className="rounded-full bg-destructive/10 p-3 mb-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm">
          <p>{message}</p>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-2 bg-destructive/5 text-destructive rounded-md text-left text-xs overflow-auto max-h-32">
              <code className="break-words">{error?.message || 'Bilinmeyen hata'}</code>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center pt-2">
          <Button variant="outline" onClick={() => reset()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Tekrar Dene
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
