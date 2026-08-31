import { Skeleton } from "@/components/ui/skeleton"
export default function EditFieldDefectLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Skeleton className="h-4 w-32  rounded bg-muted" />
      <Skeleton className="h-6 w-40  rounded bg-muted" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24  rounded bg-muted/60" />
          <Skeleton className="h-10 w-full  rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  )
}