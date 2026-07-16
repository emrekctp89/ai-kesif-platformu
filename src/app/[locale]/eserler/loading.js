export default function Loading() {
  return (
    <div className="container mx-auto max-w-6xl py-12 px-4 animate-pulse">
      <div className="text-center mb-12 space-y-4">
        <div className="h-12 bg-muted rounded w-1/3 mx-auto"></div>
        <div className="h-6 bg-muted rounded w-1/2 mx-auto"></div>
      </div>
      <div className="mb-12 h-16 bg-muted rounded w-full"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-96 bg-muted rounded-xl w-full"></div>
        ))}
      </div>
    </div>
  );
}
