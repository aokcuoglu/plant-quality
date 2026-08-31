import { Skeleton } from "@/components/ui/skeleton"
export default function SupplierDefectsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-32  rounded bg-muted/80" />
          <Skeleton className="mt-1 h-4 w-48  rounded bg-muted" />
        </div>
      </div>

      <div className="relative">
        <Skeleton className="h-9 w-full  rounded-md bg-muted" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-7 w-24  rounded-md bg-muted" />
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <div className="border-b p-3">
          <div className="flex gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <Skeleton key={i} className="h-3 w-20  rounded bg-muted/80" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b p-3">
            <div className="flex gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
                <Skeleton key={col} className="h-4 w-20  rounded bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}