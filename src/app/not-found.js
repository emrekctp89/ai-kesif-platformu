// app/not-found.js
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404 - Sayfa Bulunamadı</h1>
      <p className="mt-4 text-muted-foreground">
        Aradığınız sayfa mevcut değil.
      </p>
    </div>
  );
}
