import { Skeleton } from "@/components/ui/skeleton"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function SupplierDevPlanDetailLoading() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")

  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-48 bg-muted  rounded" />
      <div className="rounded-lg border bg-card p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 bg-muted  rounded" />
        ))}
      </div>
    </div>
  )
}