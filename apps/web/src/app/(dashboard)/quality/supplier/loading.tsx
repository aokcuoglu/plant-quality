import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64  rounded bg-muted" />
        <Skeleton className="h-4 w-40  rounded bg-muted/60" />
      </div>
      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24  rounded bg-muted" />
                <Skeleton className="h-8 w-16  rounded bg-muted/80" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-[250px]  rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
