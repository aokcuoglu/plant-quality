import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CreateDevPlanForm } from "./form"
import { requireFeature } from "@/lib/billing"
import { TargetIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { getSuppliersForOem, getOemUsers } from "@/lib/supplier-development"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CreateDevPlanPage({ searchParams }: { searchParams: Promise<{ supplierId?: string; sourceType?: string; sourceId?: string }> }) {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Create Development Plan" description="Create a new supplier development action plan" />
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <TargetIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Enterprise Feature</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Enterprise to create Supplier Development Action Plans.
          </p>
          <Link href="/settings/plan" className="mt-4 inline-block">
            <Button><TargetIcon className="mr-1.5 h-4 w-4" />Upgrade to Enterprise</Button>
          </Link>
        </div>
      </div>
    )
  }

  const params = await searchParams
  const suppliers = await getSuppliersForOem(session)
  const oemUsers = await getOemUsers(session)

  return (
    <div className="space-y-6">
      <CreateDevPlanForm
        suppliers={suppliers}
        oemUsers={oemUsers}
        prefillSupplierId={params.supplierId || null}
        prefillSourceType={params.sourceType || null}
        prefillSourceId={params.sourceId || null}
      />
    </div>
  )
}