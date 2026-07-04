import { LoadingSpinner } from '@/components/LoadingComponents';

export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="lg" label="Admin paneli yükleniyor..." />
    </div>
  );
}
