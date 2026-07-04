export default function ToolDetailLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex gap-2">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 md:col-span-2">
          {/* Title + icon */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-xl bg-muted" />
            <div className="space-y-2">
              <div className="h-7 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
          {/* Tags */}
          <div className="flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
          <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
