export default function ToolDetailLoading() {
  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-10">
      {/* Back link */}
      <div className="mb-4 h-5 w-48 animate-pulse rounded bg-muted sm:mb-6" />

      {/* Breadcrumb */}
      <div className="mb-6 flex gap-2">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="min-w-0 space-y-6 sm:space-y-8">
          {/* Hero */}
          <div className="rounded-3xl border p-4 sm:p-8">
            <div className="flex gap-4">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-muted sm:h-20 sm:w-20" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="h-9 w-2/3 max-w-md animate-pulse rounded bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <div className="h-12 w-full animate-pulse rounded-lg bg-muted sm:w-56" />
              <div className="h-12 w-full animate-pulse rounded-lg bg-muted sm:w-36" />
            </div>
          </div>

          {/* Overview cards */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="h-72 animate-pulse rounded-xl border bg-muted/40" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </aside>
      </div>
    </div>
  );
}
