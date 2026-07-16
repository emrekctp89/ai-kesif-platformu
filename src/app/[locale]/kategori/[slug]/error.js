'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Kategori Error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-24 px-4 text-center">
      <h2 className="text-2xl font-bold mb-4">Bir Hata Oluştu!</h2>
      <p className="text-muted-foreground mb-8">
        Kategori içerikleri yüklenirken bir sorunla karşılaşıldı.
      </p>
      <Button onClick={() => reset()}>Tekrar Dene</Button>
    </div>
  );
}
