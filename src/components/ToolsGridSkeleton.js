import { ToolCardSkeleton } from "./ToolCardSkeleton";

// Ana sayfada gösterilecek iskelet kartlarının sayısını belirler
const SKELETON_COUNT = 12;

export function ToolsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {/* Belirlenen sayıda iskelet kartını ekrana basar */}
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <ToolCardSkeleton key={index} />
      ))}
    </div>
  );
}
