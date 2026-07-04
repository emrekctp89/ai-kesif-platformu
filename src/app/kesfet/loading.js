import { ToolsGridSkeleton } from "@/components/ToolsGridSkeleton";

export default function KesfetLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-4">
        {/* Search bar skeleton */}
        <div className="h-12 w-full max-w-xl animate-pulse rounded-lg bg-muted" />
        {/* Filter bar skeleton */}
        <div className="flex gap-3">
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
      <ToolsGridSkeleton />
    </div>
  );
}
