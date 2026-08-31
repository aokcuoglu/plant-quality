import { Skeleton } from "@/components/ui/skeleton"
import { UsersIcon, AlertTriangleIcon, TrendingUpIcon, ClockIcon } from "lucide-react"

export default function SupplierScorecardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-48 bg-muted rounded " />
        <Skeleton className="h-4 w-64 bg-muted/60 rounded  mt-1" />
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-24 bg-muted rounded " />
          </div>
          <Skeleton className="h-8 w-16 bg-muted rounded  mt-2" />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-24 bg-muted rounded " />
          </div>
          <Skeleton className="h-8 w-16 bg-muted rounded  mt-2" />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-24 bg-muted rounded " />
          </div>
          <Skeleton className="h-8 w-16 bg-muted rounded  mt-2" />
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-24 bg-muted rounded " />
          </div>
          <Skeleton className="h-8 w-16 bg-muted rounded  mt-2" />
        </div>
      </div>

      <Skeleton className="h-3 w-80 bg-muted/60 rounded " />

      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-32 bg-muted rounded " />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32 bg-muted rounded " />
              <Skeleton className="h-2 flex-1 bg-muted rounded " />
              <Skeleton className="h-5 w-12 bg-muted rounded " />
              <Skeleton className="h-5 w-16 bg-muted rounded " />
              <Skeleton className="h-5 w-20 bg-muted rounded " />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}