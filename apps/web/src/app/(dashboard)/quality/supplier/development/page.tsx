import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  TargetIcon,
  ArrowRightIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { getSupplierDevPlans, STATUS_CONFIG, PRIORITY_CONFIG, isDevPlanOverdue } from "@/lib/supplier-development"
import { requireFeature } from "@/lib/billing"

export default async function SupplierDevelopmentPage() {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "SUPPLIER") redirect("/login")

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) redirect("/quality/supplier")

  const plans = await getSupplierDevPlans(session)

  return (
    <div className="space-y-6">
      <PageHeader title="Development Plans" description="Supplier development action plans assigned to your company" />

      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <TargetIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No development plans assigned</h3>
          <p className="text-sm text-muted-foreground mt-1">No supplier development action plans have been assigned to your company yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Assigned Plans</h2>
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {plans.length} plan{plans.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <TableHead className="px-4 py-3 text-left">Title</TableHead>
                  <TableHead className="px-4 py-3 text-center">Priority</TableHead>
                  <TableHead className="px-4 py-3 text-center">Status</TableHead>
                  <TableHead className="px-4 py-3 text-left">Due Date</TableHead>
                  <TableHead className="px-4 py-3 text-center">Actions</TableHead>
                  <TableHead className="px-4 py-3 text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {plans.map((plan) => {
                  const overdue = isDevPlanOverdue(plan)
                  const needsAction = plan.status === "SUPPLIER_ACTION_REQUIRED" || plan.status === "REVISION_REQUIRED"
                  return (
                    <TableRow key={plan.id} className="group hover:bg-muted/50">
                      <TableCell className="px-4 py-3">
                        <div className="font-medium text-foreground truncate max-w-[200px]">{plan.title}</div>
                        {needsAction && (
                          <span className="text-xs text-destructive font-semibold mt-0.5 block">Action required</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${PRIORITY_CONFIG[plan.priority].className}`}>
                          {PRIORITY_CONFIG[plan.priority].label}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${STATUS_CONFIG[plan.status].className}`}>
                          {STATUS_CONFIG[plan.status].label}
                        </span>
                        {overdue && (
                          <span className="ml-1 inline-flex items-center rounded-md border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive uppercase">Overdue</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {plan.dueDate ? (
                          <span className={`text-sm ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                            {new Date(plan.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No date</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span className="text-sm text-foreground">
                          {plan.completedActionItemCount}/{plan.actionItemCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Link href={`/quality/supplier/development/${plan.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-foreground transition-colors">
                          View <ArrowRightIcon className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}