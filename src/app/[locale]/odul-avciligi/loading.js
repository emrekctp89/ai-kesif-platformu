export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 animate-pulse">
      <div className="text-center mb-12 space-y-4">
        <div className="h-12 bg-muted rounded w-3/4 mx-auto"></div>
        <div className="h-6 bg-muted rounded w-1/2 mx-auto"></div>
      </div>
      <div className="flex justify-end mb-8">
        <div className="h-10 bg-muted rounded w-32"></div>
      </div>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-xl w-full"></div>
        ))}
      </div>
    </div>
  );
}
