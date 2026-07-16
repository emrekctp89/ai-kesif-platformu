export default function Loading() {
  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 animate-pulse">
      <div className="text-center mb-12 space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4"></div>
        <div className="h-12 bg-muted rounded w-3/4 mx-auto"></div>
        <div className="h-6 bg-muted rounded w-1/2 mx-auto"></div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl w-full"></div>
        ))}
      </div>
    </div>
  );
}
