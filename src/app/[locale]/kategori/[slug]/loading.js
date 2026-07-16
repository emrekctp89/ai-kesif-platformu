export default function Loading() {
  return (
    <div className="container mx-auto py-12 px-4 animate-pulse">
      <div className="mb-12 text-center space-y-4">
        <div className="h-12 bg-muted rounded w-1/2 mx-auto"></div>
        <div className="h-6 bg-muted rounded w-3/4 mx-auto"></div>
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="md:col-span-1 space-y-4">
          <div className="h-[400px] bg-muted rounded-xl w-full"></div>
        </div>
        <div className="md:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-xl w-full"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
