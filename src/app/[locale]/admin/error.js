'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function AdminError({ error, reset }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Admin Paneli Hatası"
      message="Yönetim paneli yüklenirken veya veriler alınırken bir sorun oluştu."
    />
  );
}
