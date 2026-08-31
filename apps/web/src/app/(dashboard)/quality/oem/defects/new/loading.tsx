import { Skeleton } from "@/components/ui/skeleton"
export default function NewDefectLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Skeleton className="h-4 w-28  rounded bg-muted" />

      <div>
        <Skeleton className="h-7 w-32  rounded bg-muted/80" />
        <Skeleton className="mt-1 h-4 w-56  rounded bg-muted" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24  rounded bg-muted/80" />
            <Skeleton className="h-9 w-full  rounded-md bg-muted" />
          </div>
        ))}
      </div>

      <Skeleton className="h-9 w-full  rounded-md bg-muted/80" />
    </div>
  )
}