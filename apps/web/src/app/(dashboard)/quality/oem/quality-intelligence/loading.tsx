import { Skeleton } from "@/components/ui/skeleton"
export default function QualityIntelligenceLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-52  rounded bg-muted" />
        <Skeleton className="h-4 w-80  rounded bg-muted/60" />
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5  rounded bg-muted/60" />
              <Skeleton className="h-4 w-28  rounded bg-muted/60" />
            </div>
            <Skeleton className="h-8 w-16  rounded bg-muted" />
            <Skeleton className="h-3 w-24  rounded bg-muted/60" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5  rounded bg-muted/60" />
              <Skeleton className="h-4 w-24  rounded bg-muted/60" />
            </div>
            <Skeleton className="h-7 w-12  rounded bg-muted" />
            <Skeleton className="h-3 w-32  rounded bg-muted/60" />
          </div>
        ))}
      </div>

      <Skeleton className="h-4 w-48  rounded bg-muted" />

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24  rounded bg-muted/60" />
            <Skeleton className="h-4 w-20  rounded bg-muted/60" />
            <Skeleton className="h-4 w-12  rounded bg-muted/60" />
            <Skeleton className="h-4 w-14  rounded bg-muted/60" />
            <Skeleton className="h-4 w-14  rounded bg-muted/60" />
            <Skeleton className="h-4 w-28  rounded bg-muted/60" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4">
            <Skeleton className="h-4 w-32  rounded bg-muted/60" />
            <Skeleton className="h-4 w-20  rounded bg-muted/60" />
            <Skeleton className="h-6 w-10  rounded bg-muted" />
            <Skeleton className="h-5 w-16  rounded-full bg-muted/60" />
            <Skeleton className="h-4 w-8  rounded bg-muted/60" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-20  rounded bg-muted/60" />
              <Skeleton className="h-5 w-16  rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Skeleton className="h-5 w-5  rounded bg-muted/60" />
            <Skeleton className="h-4 w-40  rounded bg-muted/60" />
            <Skeleton className="ml-auto h-5 w-6  rounded-full bg-muted/60" />
          </div>
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="border-b px-4 py-3 space-y-2">
              <Skeleton className="h-4 w-48  rounded bg-muted/60" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24  rounded bg-muted/60" />
                <Skeleton className="h-4 w-32  rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}