import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function SupplierDevPlanDetailLoading() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="h-7 w-48 bg-muted animate-pulse rounded" />
      <div className="rounded-lg border bg-card p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}