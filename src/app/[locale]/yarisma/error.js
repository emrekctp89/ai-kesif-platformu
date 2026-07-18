'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function ChallengeError({ error, reset }) {
  useEffect(() => {
    console.error('Yarışma sayfası hatası:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <Trophy className="mb-4 h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
      <h1 className="text-2xl font-bold tracking-tight">Yarışma yüklenemedi</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sayfa geçici olarak açılamıyor. Lütfen tekrar dene.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} className="rounded-xl">
          Tekrar dene
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/">Ana sayfa</Link>
        </Button>
      </div>
    </div>
  );
}
