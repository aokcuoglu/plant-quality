import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DevPlanDetailLoading() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        <div className="space-y-1">
          <div className="h-7 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted/60 animate-pulse rounded" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}><div className="h-4 w-20 bg-muted animate-pulse rounded" /><div className="h-5 w-32 bg-muted animate-pulse rounded mt-1" /></div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}