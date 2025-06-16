import { Skeleton } from "@/components/ui/skeleton"

export function ToolCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-lg flex flex-col space-y-4">
      <div className="flex-grow space-y-3">
        {/* Başlık ve Puan için yer tutucu */}
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        </div>
        
        {/* Kategori için yer tutucu */}
        <Skeleton className="h-5 w-1/3 rounded-md" />

        {/* Açıklama için yer tutucu */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      
      {/* Buton için yer tutucu */}
      <Skeleton className="h-10 w-full mt-4 rounded-lg" />
    </div>
  )
}
