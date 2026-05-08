import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TargetIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"

export default async function SupplierDevelopmentLoading() {
  const session = await auth()
  if (!session?.user?.companyId) redirect("/login")

  return (
    <div className="space-y-6">
      <PageHeader title="Development Plans" description="Loading..." />
      <div className="rounded-lg border bg-card p-8 text-center">
        <TargetIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading development plans...</p>
      </div>
    </div>
  )
}