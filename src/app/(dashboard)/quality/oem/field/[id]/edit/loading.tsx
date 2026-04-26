export default function EditFieldDefectLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  )
}