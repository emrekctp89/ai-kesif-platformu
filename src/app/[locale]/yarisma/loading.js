export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-10 pb-10">
      <div className="rounded-3xl border border-border/40 bg-muted/30 p-8 sm:p-10">
        <div className="mx-auto mb-4 h-7 w-28 rounded-full bg-muted" />
        <div className="mx-auto mb-3 h-10 w-2/3 max-w-md rounded-lg bg-muted" />
        <div className="mx-auto mb-6 h-5 w-1/2 max-w-sm rounded bg-muted" />
        <div className="mx-auto h-24 max-w-xl rounded-2xl bg-muted/70" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-muted/50" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-square rounded-2xl bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
