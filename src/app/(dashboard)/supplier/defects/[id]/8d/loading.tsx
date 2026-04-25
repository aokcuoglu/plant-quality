export default function EightDWizardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />

      <div className="rounded-lg border bg-card p-4">
        <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b p-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-8 w-16 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                  <div className="mt-1 h-9 w-full animate-pulse rounded-md bg-slate-100" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-24 animate-pulse rounded-md bg-slate-100" />
          </div>

          <div className="flex justify-between">
            <div className="h-9 w-24 animate-pulse rounded-md bg-slate-100" />
            <div className="h-9 w-24 animate-pulse rounded-md bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  )
}