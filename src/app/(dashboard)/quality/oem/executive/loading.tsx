export default function ExecutiveCockpitLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-6 w-64 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5 animate-pulse">
            <div className="h-3 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-12 bg-muted rounded mb-1" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card animate-pulse">
        <div className="px-4 py-3 border-b border-border">
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-border">
            <div className="h-3 w-16 bg-muted rounded mb-2" />
            <div className="h-4 w-full bg-muted rounded mb-1" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card animate-pulse">
            <div className="px-4 py-3 border-b border-border">
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="px-4 py-3 border-b border-border">
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-full bg-muted rounded mb-1" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}