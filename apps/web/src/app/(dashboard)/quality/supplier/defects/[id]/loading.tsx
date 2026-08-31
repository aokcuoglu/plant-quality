import { Skeleton } from "@/components/ui/skeleton"
export default function SupplierDefectDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36  rounded bg-muted" />

      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-48  rounded bg-muted/80" />
          <Skeleton className="mt-1 h-4 w-64  rounded bg-muted" />
        </div>
        <Skeleton className="h-6 w-24  rounded-full bg-muted/80" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0 xl:col-span-1 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-32  rounded bg-muted/80" />
            <Skeleton className="h-4 w-full  rounded bg-muted" />
            <Skeleton className="h-4 w-3/4  rounded bg-muted" />
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-32  rounded bg-muted/80" />
            <Skeleton className="h-20  rounded bg-muted" />
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-24  rounded bg-muted/80" />
            <Skeleton className="h-4 w-40  rounded bg-muted" />
            <Skeleton className="h-4 w-32  rounded bg-muted" />
            <Skeleton className="h-4 w-36  rounded bg-muted" />
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-28  rounded bg-muted/80" />
            <Skeleton className="h-4 w-40  rounded bg-muted" />
            <Skeleton className="h-4 w-32  rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}