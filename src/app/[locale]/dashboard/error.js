'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function DashboardError({ error, reset }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Dashboard Hatası"
      message="Dashboard verileri yüklenirken bir sorun oluştu."
    />
  );
}
