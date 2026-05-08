import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  TargetIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  PlusCircleIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { Button } from "@/components/ui/button"
import { requireFeature } from "@/lib/billing"
import { getOemDevPlans, STATUS_CONFIG, PRIORITY_CONFIG, isDevPlanOverdue } from "@/lib/supplier-development"

export default async function SupplierDevelopmentPage() {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Supplier Development" description="Supplier development action plans" />
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <TargetIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Supplier Development Plans</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Enterprise to unlock Supplier Development Action Plans.
          </p>
          <Link href="/oem/settings/plan" className="mt-4 inline-block">
            <Button><TargetIcon className="mr-1.5 h-4 w-4" />Upgrade to Enterprise</Button>
          </Link>
        </div>
      </div>
    )
  }

  const data = await getOemDevPlans(session)
  if (!data) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Supplier Development" description="Manage supplier improvement action plans" />
        <Link href="/quality/oem/supplier-development/new">
          <Button>
            <PlusCircleIcon className="mr-1.5 h-4 w-4" />
            Create Plan
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-4">
        <DashboardCard
          title="Total Plans"
          value={data.totalCount}
          icon={TargetIcon}
          subtitle="All development plans"
        />
        <DashboardCard
          title="Action Required"
          value={data.supplierActionRequiredCount + data.oemReviewCount}
          icon={AlertTriangleIcon}
          subtitle="Pending review or action"
        />
        <DashboardCard
          title="Overdue"
          value={data.overdueCount}
          icon={ClockIcon}
          subtitle="Past due date"
          href="/quality/oem/supplier-development"
        />
        <DashboardCard
          title="Completed"
          value={data.completedCount}
          icon={CheckCircleIcon}
          subtitle="Successfully closed"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Development Plans</h2>
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {data.totalCount} plan{data.totalCount !== 1 ? "s" : ""}
          </span>
        </div>
        {data.plans.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <TargetIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No development plans yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first supplier development plan to start tracking improvement actions.</p>
            <Link href="/quality/oem/supplier-development/new" className="mt-4 inline-block">
              <Button size="sm"><PlusCircleIcon className="mr-1.5 h-4 w-4" />Create Plan</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.plans.map((plan) => {
                  const overdue = isDevPlanOverdue(plan)
                  return (
                    <tr key={plan.id} className="group hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground truncate max-w-[200px]">{plan.title}</div>
                        {plan.sourceType && (
                          <div className="text-xs text-muted-foreground mt-0.5">Source: {plan.sourceType.replace(/_/g, " ").toLowerCase()}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-foreground">{plan.supplierName}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${PRIORITY_CONFIG[plan.priority].className}`}>
                          {PRIORITY_CONFIG[plan.priority].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${STATUS_CONFIG[plan.status].className}`}>
                          {STATUS_CONFIG[plan.status].label}
                        </span>
                        {overdue && (
                          <span className="ml-1 inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 uppercase">Overdue</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-foreground">
                          {plan.completedActionItemCount}/{plan.actionItemCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {plan.dueDate ? (
                          <span className={`text-sm ${overdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                            {new Date(plan.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No date</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/quality/oem/supplier-development/${plan.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-emerald-500 transition-colors">
                          Detail <ArrowRightIcon className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}