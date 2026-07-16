export default function Loading() {
  return (
    <div className="container mx-auto py-12 px-4 space-y-8 animate-pulse">
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
      </div>
      <div className="space-y-6">
        <div className="h-64 bg-muted rounded-xl w-full"></div>
        <div className="h-48 bg-muted rounded-xl w-full"></div>
      </div>
    </div>
  );
}
