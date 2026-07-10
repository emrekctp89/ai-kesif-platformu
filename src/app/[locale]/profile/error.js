'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function ProfileError({ error, reset }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Profil Hatası"
      message="Profil bilgileri yüklenirken bir sorun oluştu."
    />
  );
}
