export default function ProfileLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Avatar + name skeleton */}
      <div className="mb-8 flex items-center gap-6">
        <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className="mb-6 flex gap-4 border-b">
        <div className="h-9 w-24 animate-pulse rounded-t bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-t bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-t bg-muted" />
      </div>
      {/* Content skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
