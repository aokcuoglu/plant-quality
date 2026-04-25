export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-48 rounded bg-muted" />
      <div className="h-4 w-64 rounded bg-muted/60" />
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted/60" />
        <div className="h-4 w-3/4 rounded bg-muted/60" />
      </div>
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted/60" />
        <div className="h-4 w-2/3 rounded bg-muted/60" />
      </div>
    </div>
  )
}
