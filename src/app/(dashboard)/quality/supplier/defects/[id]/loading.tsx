export default function SupplierDefectDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />

      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  )
}