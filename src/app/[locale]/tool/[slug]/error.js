'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function ToolDetailError({ error, reset }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Araç Yüklenemedi"
      message="Bu aracın detayları yüklenirken bir sorun oluştu."
    />
  );
}
