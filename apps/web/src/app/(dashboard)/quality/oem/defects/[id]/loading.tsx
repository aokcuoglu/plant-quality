export default function OemDefectDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-36 animate-pulse rounded bg-muted" />

      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-muted/80" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-6 w-24 animate-pulse rounded-full bg-muted/80" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="min-w-0 xl:col-span-1 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-muted/80" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-muted/80" />
            <div className="h-20 animate-pulse rounded bg-muted" />
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-5 w-24 animate-pulse rounded bg-muted/80" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-5 w-28 animate-pulse rounded bg-muted/80" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}