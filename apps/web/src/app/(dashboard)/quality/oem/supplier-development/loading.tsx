import { Skeleton } from "@/components/ui/skeleton"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function SupplierDevelopmentLoading() {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48 bg-muted  rounded" />
          <Skeleton className="h-4 w-64 bg-muted/60  rounded" />
        </div>
        <Skeleton className="h-9 w-32 bg-muted  rounded-md" />
      </div>
      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-24 bg-muted  rounded" />
            <Skeleton className="h-8 w-16 bg-muted  rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <Skeleton className="h-5 w-32 bg-muted  rounded" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-48 bg-muted  rounded" />
              <Skeleton className="h-4 w-24 bg-muted  rounded" />
              <Skeleton className="h-4 w-16 bg-muted  rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}