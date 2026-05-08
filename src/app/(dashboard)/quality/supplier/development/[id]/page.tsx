import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { getSupplierDevPlanDetail, PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/supplier-development"
import { SupplierActionItemCard } from "./SupplierActionItemCard"
import { DevPlanTimeline } from "@/app/(dashboard)/quality/oem/supplier-development/[id]/DevPlanTimeline"
import { SubmitForReviewButton } from "./SubmitForReviewButton"

export default async function SupplierDevPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "SUPPLIER") redirect("/login")

  const { id } = await params
  const plan = await getSupplierDevPlanDetail(session, id)
  if (!plan) notFound()

  const canSubmit = plan.status === "SUPPLIER_ACTION_REQUIRED" || plan.status === "REVISION_REQUIRED"
  const isReadOnly = plan.status === "COMPLETED" || plan.status === "CANCELLED"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/quality/supplier/development" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <PageHeader title={plan.title} description="Supplier development action plan" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Plan Overview</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">OEM Company</p>
                <p className="text-sm font-medium text-foreground">{plan.oemCompanyName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${PRIORITY_CONFIG[plan.priority].className}`}>
                  {PRIORITY_CONFIG[plan.priority].label}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${STATUS_CONFIG[plan.status].className}`}>
                  {STATUS_CONFIG[plan.status].label}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="text-sm text-foreground">{plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "No date set"}</p>
              </div>
            </div>
            {plan.description && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm text-foreground mt-1">{plan.description}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Your Action Items</h2>
            {plan.actionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No action items assigned to your company yet.</p>
            ) : (
              <div className="space-y-2">
                {plan.actionItems.map((item) => (
                  <SupplierActionItemCard key={item.id} item={item} planId={plan.id} isReadOnly={isReadOnly} canSubmit={canSubmit} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {canSubmit && <SubmitForReviewButton planId={plan.id} />}

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Activity Timeline</h2>
            <DevPlanTimeline events={plan.events} />
          </div>
        </div>
      </div>
    </div>
  )
}