import { LoadingSpinner } from '@/components/LoadingComponents';

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
      {/* Stats cards skeleton */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border bg-card p-4">
            <div className="mb-2 h-4 w-20 rounded bg-muted" />
            <div className="h-7 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
      {/* Content area skeleton */}
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" label="Dashboard yükleniyor..." />
      </div>
    </div>
  );
}
