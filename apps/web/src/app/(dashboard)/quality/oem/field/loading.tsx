import { Skeleton } from "@/components/ui/skeleton"
export default function OemFieldLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48  rounded bg-muted" />
          <Skeleton className="h-4 w-64  rounded bg-muted/60" />
        </div>
        <Skeleton className="h-10 w-40  rounded-lg bg-muted" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20  rounded-full bg-muted/60" />
        ))}
      </div>
      <Skeleton className="h-9 w-80  rounded-md bg-muted/60" />
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4">
            <Skeleton className="h-4 w-32  rounded bg-muted/60" />
            <Skeleton className="h-5 w-16  rounded-full bg-muted/60" />
            <Skeleton className="h-5 w-14  rounded-full bg-muted/60" />
            <Skeleton className="h-4 w-24  rounded bg-muted/60" />
            <Skeleton className="h-4 w-16  rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  )
}