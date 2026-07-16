export default function Loading() {
  return (
    <div className="container mx-auto max-w-6xl py-12 px-4 animate-pulse">
      <div className="text-center mb-16 space-y-4">
        <div className="h-16 bg-muted rounded w-1/2 mx-auto"></div>
        <div className="h-6 bg-muted rounded w-3/4 mx-auto"></div>
      </div>
      <div className="space-y-16">
        <section>
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-xl w-full"></div>
            ))}
          </div>
        </section>
        <section>
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-xl w-full"></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
