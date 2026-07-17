export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-10 pb-10">
      <div className="rounded-3xl border p-8 sm:p-10">
        <div className="mx-auto mb-4 h-7 w-40 rounded-full bg-muted" />
        <div className="mx-auto h-10 w-2/3 max-w-md rounded bg-muted" />
        <div className="mx-auto mt-4 h-4 w-full max-w-xl rounded bg-muted" />
        <div className="mx-auto mt-2 h-4 w-3/4 max-w-lg rounded bg-muted" />
      </div>
      <div className="mx-auto h-12 w-full max-w-2xl rounded-2xl bg-muted" />
      <div className="h-64 rounded-xl border bg-muted/40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-72 rounded-xl bg-muted/40" />
        <div className="h-72 rounded-xl bg-muted/40" />
        <div className="h-72 rounded-xl bg-muted/40" />
      </div>
    </div>
  );
}
