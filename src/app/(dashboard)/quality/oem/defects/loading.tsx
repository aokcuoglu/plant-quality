export default function DefectsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-1 h-4 w-48 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-md bg-slate-200" />
      </div>

      <div className="relative">
        <div className="h-9 w-full animate-pulse rounded-md bg-slate-100" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-7 w-20 animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-3">
          <div className="flex gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="border-b p-3">
            <div className="flex gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                <div key={col} className="h-4 w-16 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}