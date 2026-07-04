import { LoadingSpinner } from "@/components/LoadingComponents";

export default function StudioLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="lg" label="Stüdyo yükleniyor..." />
    </div>
  );
}
