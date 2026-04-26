export default function NewDefectLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />

      <div>
        <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-1 h-4 w-56 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-9 w-full animate-pulse rounded-md bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="h-9 w-full animate-pulse rounded-md bg-slate-200" />
    </div>
  )
}