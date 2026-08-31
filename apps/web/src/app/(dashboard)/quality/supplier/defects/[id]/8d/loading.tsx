import { Skeleton } from "@/components/ui/skeleton"
export default function EightDWizardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-36  rounded bg-muted" />

      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-4 w-64  rounded bg-muted" />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-8 w-16  rounded-md bg-muted" />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <Skeleton className="h-5 w-40  rounded bg-muted/80" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24  rounded bg-muted" />
                  <Skeleton className="mt-1 h-9 w-full  rounded-md bg-muted" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Skeleton className="h-5 w-48  rounded bg-muted/80" />
            <Skeleton className="mt-4 h-24  rounded-md bg-muted" />
          </div>

          <div className="flex justify-between">
            <Skeleton className="h-9 w-24  rounded-md bg-muted" />
            <Skeleton className="h-9 w-24  rounded-md bg-muted/80" />
          </div>
        </div>
      </div>
    </div>
  )
}