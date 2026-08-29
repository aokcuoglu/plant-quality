export default function QualityIntelligenceLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-52 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted/60" />
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
            </div>
            <div className="h-7 w-12 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>

      <div className="h-4 w-48 animate-pulse rounded bg-muted" />

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted/60" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/60" />
            <div className="h-6 w-10 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted/60" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted/60" />
            <div className="flex gap-1">
              <div className="h-5 w-20 animate-pulse rounded bg-muted/60" />
              <div className="h-5 w-16 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <div className="h-5 w-5 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted/60" />
            <div className="ml-auto h-5 w-6 animate-pulse rounded-full bg-muted/60" />
          </div>
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} className="border-b px-4 py-3 space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-muted/60" />
              <div className="flex gap-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
                <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}