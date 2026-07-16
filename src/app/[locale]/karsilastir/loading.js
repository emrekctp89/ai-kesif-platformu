export default function Loading() {
  return (
    <div className="container mx-auto max-w-7xl py-12 px-4 animate-pulse">
      <div className="text-center mb-12 space-y-4">
        <div className="h-12 bg-muted rounded w-1/2 mx-auto"></div>
        <div className="h-6 bg-muted rounded w-3/4 mx-auto"></div>
      </div>
      <div className="mb-8 flex justify-center">
        <div className="h-10 bg-muted rounded w-full max-w-md"></div>
      </div>
      <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-2 md:gap-8">
        <div className="h-[500px] bg-muted rounded-xl w-full"></div>
        <div className="h-[500px] bg-muted rounded-xl w-full"></div>
      </div>
    </div>
  );
}
