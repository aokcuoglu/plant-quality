import { Skeleton } from "@/components/ui/skeleton"
export default function SupplierFieldDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4  rounded bg-muted" />
        <Skeleton className="h-6 w-64  rounded bg-muted" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-24  rounded bg-muted/60" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex gap-2">
                  <Skeleton className="h-3 w-20  rounded bg-muted/60" />
                  <Skeleton className="h-3 w-48  rounded bg-muted" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-16  rounded bg-muted/60" />
              <Skeleton className="h-3 w-16  rounded bg-muted/60" />
              <Skeleton className="h-3 w-24  rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}