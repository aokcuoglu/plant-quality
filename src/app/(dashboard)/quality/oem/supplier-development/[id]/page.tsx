import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeftIcon,
  TargetIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { requireFeature } from "@/lib/billing"
import { getOemDevPlanDetail, PRIORITY_CONFIG, STATUS_CONFIG, ACTION_STATUS_CONFIG, SOURCE_TYPE_CONFIG, isDevPlanOverdue } from "@/lib/supplier-development"
import { DevPlanActions } from "./DevPlanActions"
import { DevPlanTimeline } from "./DevPlanTimeline"
import { AddActionItemForm } from "./AddActionItemForm"
import { AddCommentForm } from "./AddCommentForm"

export default async function DevPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  const featureGate = requireFeature(session, "SUPPLIER_DEVELOPMENT")
  if (!featureGate.allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Development Plan" description="Supplier development action plan" />
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <TargetIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mt-1">Upgrade to Enterprise to access this feature.</p>
          <Link href="/oem/settings/plan" className="mt-4 inline-block">
            <Button><TargetIcon className="mr-1.5 h-4 w-4" />Upgrade</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { id } = await params
  const plan = await getOemDevPlanDetail(session, id)
  if (!plan) notFound()

  const overdue = isDevPlanOverdue(plan)
  const isReadOnly = plan.status === "COMPLETED" || plan.status === "CANCELLED"
  const completedItems = plan.actionItems.filter((a) => a.status === "COMPLETED" || a.status === "ACCEPTED" || a.status === "CANCELLED")
  const overdueItems = plan.actionItems.filter((a) => a.dueDate && new Date(a.dueDate) < new Date() && a.status !== "COMPLETED" && a.status !== "ACCEPTED" && a.status !== "CANCELLED")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/quality/oem/supplier-development" className="text-muted-foreground hover:text-foreground transition-colors">
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
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="text-sm font-medium text-foreground">{plan.supplierName}</p>
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
                {overdue && (
                  <span className="ml-1 inline-flex items-center rounded-md border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive uppercase">Overdue</span>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className={`text-sm ${overdue ? "text-destructive font-semibold" : "text-foreground"}`}>
                  {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "No date set"}
                </p>
              </div>
              {plan.sourceType && (
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-sm text-foreground">{SOURCE_TYPE_CONFIG[plan.sourceType]?.label ?? plan.sourceType}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-sm text-foreground">{plan.ownerName ?? "Unassigned"}</p>
              </div>
            </div>
            {plan.description && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm text-foreground mt-1">{plan.description}</p>
              </div>
            )}
            {plan.completedAt && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm text-foreground">{new Date(plan.completedAt).toLocaleDateString()} by {plan.completedByName ?? "Unknown"}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Action Items</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{completedItems.length}/{plan.actionItems.length} completed</span>
                {overdueItems.length > 0 && (
                  <span className="text-destructive font-semibold">{overdueItems.length} overdue</span>
                )}
              </div>
            </div>

            {plan.actionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No action items yet.</p>
            ) : (
              <div className="space-y-2">
                {plan.actionItems.map((item) => {
                  const itemOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "COMPLETED" && item.status !== "ACCEPTED" && item.status !== "CANCELLED"
                  return (
                    <div key={item.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                            <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${ACTION_STATUS_CONFIG[item.status].className}`}>
                              {ACTION_STATUS_CONFIG[item.status].label}
                            </span>
                            <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${item.ownerType === "OEM" ? "bg-muted text-muted-foreground border-border" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                              {item.ownerType}
                            </span>
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>Owner: {item.ownerName ?? "Unassigned"}</span>
                            <span>Due: {item.dueDate ? (itemOverdue ? <span className="text-destructive font-semibold">{new Date(item.dueDate).toLocaleDateString()}</span> : new Date(item.dueDate).toLocaleDateString()) : "None"}</span>
                          </div>
                          {item.supplierResponse && (
                            <div className="mt-2 rounded-md bg-amber-500/5 border border-amber-500/10 p-2">
                              <p className="text-xs font-medium text-amber-600">Supplier Response:</p>
                              <p className="text-xs text-foreground mt-0.5">{item.supplierResponse}</p>
                            </div>
                          )}
                          {item.oemComment && (
                            <div className="mt-2 rounded-md bg-muted/50 border border-border p-2">
                              <p className="text-xs font-medium text-muted-foreground">OEM Comment:</p>
                              <p className="text-xs text-foreground mt-0.5">{item.oemComment}</p>
                            </div>
                          )}
                        </div>
                        {!isReadOnly && (
                          <OemActionItemActions itemId={item.id} planId={plan.id} status={item.status} ownerType={item.ownerType} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!isReadOnly && <AddActionItemForm planId={plan.id} />}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick Stats</h2>
            <div className="grid gap-2">
              <StatRow label="Total Items" value={plan.actionItems.length} icon={TargetIcon} />
              <StatRow label="Completed" value={completedItems.length} icon={CheckCircleIcon} />
              <StatRow label="Overdue" value={overdueItems.length} icon={AlertTriangleIcon} />
              <StatRow label="Supplier Items" value={plan.actionItems.filter((a) => a.ownerType === "SUPPLIER").length} icon={ClockIcon} />
            </div>
          </div>

          {!isReadOnly && <DevPlanActions planId={plan.id} status={plan.status} />}

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Activity Timeline</h2>
            <DevPlanTimeline events={plan.events} />
          </div>

          {!isReadOnly && <AddCommentForm planId={plan.id} />}
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

import { OemActionItemActions } from "./OemActionItemActions"