import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import {
  getOrderSlaSummary,
  formatSlaDate,
  formatDaysValue,
  DELAY_CATEGORY_LABELS,
  type RiskLevel,
  type DelayCategory,
  type OrderSlaInput,
} from "@/lib/logistic/sla"
import { STATUS_LABELS } from "@/lib/logistic/status"
import { SlaStatusBadge, RiskLevelBadge } from "../sla-badge"
import Link from "next/link"
import { AlertTriangle, Clock, ShieldAlert, ArrowUpRight, TruckIcon } from "lucide-react"

export const dynamic = "force-dynamic"

type FilterParams = Promise<{ risk?: string; category?: string }>

export default async function DelayIntelligencePage({ searchParams }: { searchParams: FilterParams }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const params = await searchParams
  const riskFilter = params.risk ?? ""
  const categoryFilter = params.category ?? ""

  const orders = await prisma.plantLogisticOrder.findMany({
    where: {
      companyId,
      status: { notIn: ["CLOSED", "CANCELLED", "REJECTED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      milestones: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          gate: true,
          title: true,
          status: true,
          plannedFinish: true,
          qualityHold: true,
          responsibleDepartment: true,
          delayReason: true,
        },
      },
      yardStatus: {
        select: {
          readyForDispatch: true,
          blockedForDispatch: true,
          blockReason: true,
          lastMovementAt: true,
        },
      },
      dispatches: {
        select: {
          id: true,
          status: true,
          plannedLoadingDate: true,
          estimatedArrivalDate: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  const summaries = orders.map((order) => {
    const input: OrderSlaInput = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      requestedDeliveryDate: order.requestedDeliveryDate,
      plannedDeliveryDate: order.plannedDeliveryDate,
      deliveredAt: order.deliveredAt,
      closedAt: order.closedAt,
      externalVisible: order.externalVisible,
      externalStatus: order.externalStatus,
      externalStatusNote: order.externalStatusNote,
      milestones: order.milestones.map((m) => ({
        id: m.id,
        gate: m.gate,
        title: m.title,
        status: m.status,
        plannedFinish: m.plannedFinish,
        qualityHold: m.qualityHold,
        responsibleDepartment: m.responsibleDepartment,
        delayReason: m.delayReason,
      })),
      yardStatus: order.yardStatus
        ? {
            readyForDispatch: order.yardStatus.readyForDispatch,
            blockedForDispatch: order.yardStatus.blockedForDispatch,
            blockReason: order.yardStatus.blockReason,
            lastMovementAt: order.yardStatus.lastMovementAt,
          }
        : null,
      dispatches: order.dispatches.map((d) => ({
        id: d.id,
        status: d.status,
        plannedLoadingDate: d.plannedLoadingDate,
        estimatedArrivalDate: d.estimatedArrivalDate,
      })),
    }
    return getOrderSlaSummary(input)
  })

  const delayedCount = summaries.filter((s) => s.slaStatus === "DELAYED").length
  const atRiskCount = summaries.filter((s) => s.slaStatus === "AT_RISK").length
  const blockedCount = summaries.filter((s) => s.slaStatus === "BLOCKED").length
  const qualityHoldAging = summaries.filter(
    (s) => s.delayCategory === "QUALITY_HOLD_AGING"
  ).length
  const dispatchOverdue = summaries.filter(
    (s) => s.delayCategory === "DISPATCH_DELAY" || s.delayCategory === "ETA_OVERDUE"
  ).length
  const etaOverdue = summaries.filter((s) => s.delayCategory === "ETA_OVERDUE").length

  const filteredSummaries = summaries.filter((s) => {
    if (riskFilter && s.riskLevel !== riskFilter) return false
    if (categoryFilter && s.delayCategory !== categoryFilter) return false
    return true
  })

  const riskOptions: { value: RiskLevel; label: string }[] = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "CRITICAL", label: "Critical" },
  ]

  const categoryOptions: { value: DelayCategory; label: string }[] = [
    { value: "PRODUCTION_DELAY", label: "Production Delay" },
    { value: "MILESTONE_OVERDUE", label: "Milestone Overdue" },
    { value: "QUALITY_HOLD_AGING", label: "Quality Hold Aging" },
    { value: "YARD_AGING", label: "Yard Aging" },
    { value: "DISPATCH_DELAY", label: "Dispatch Delay" },
    { value: "DELIVERY_RISK", label: "Delivery Risk" },
    { value: "ETA_OVERDUE", label: "ETA Overdue" },
    { value: "EXTERNAL_COMMITMENT_RISK", label: "External Commitment Risk" },
    { value: "NONE", label: "On Track" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Delay Intelligence</h1>
        <p className="text-sm text-muted-foreground">Monitor SLA compliance, delay risks, and blocking stages across all active orders</p>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        <KPICard title="Delayed" value={delayedCount} icon={AlertTriangle} color={delayedCount > 0 ? "destructive" : "muted"} />
        <KPICard title="At Risk" value={atRiskCount} icon={Clock} color={atRiskCount > 0 ? "warning" : "muted"} />
        <KPICard title="Blocked" value={blockedCount} icon={ShieldAlert} color={blockedCount > 0 ? "destructive" : "muted"} />
        <KPICard title="Q-Hold Aging" value={qualityHoldAging} icon={AlertTriangle} color={qualityHoldAging > 0 ? "warning" : "muted"} />
        <KPICard title="Dispatch Overdue" value={dispatchOverdue} icon={TruckIcon} color={dispatchOverdue > 0 ? "warning" : "muted"} />
        <KPICard title="ETA Overdue" value={etaOverdue} icon={Clock} color={etaOverdue > 0 ? "destructive" : "muted"} />
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <NativeSelect
          name="risk"
          defaultValue={riskFilter}
        >
          <NativeSelectOption value="">All risk levels</NativeSelectOption>
          {riskOptions.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>{opt.label}</NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          name="category"
          defaultValue={categoryFilter}
        >
          <NativeSelectOption value="">All categories</NativeSelectOption>
          {categoryOptions.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>{opt.label}</NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          type="submit"
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Apply filters
        </Button>
      </form>

      {filteredSummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-muted-foreground">
          <TruckIcon className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm">No orders matching current filters</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <TableHead className="px-4 py-3 text-left">Order</TableHead>
                  <TableHead className="px-4 py-3 text-left">Customer</TableHead>
                  <TableHead className="px-4 py-3 text-left">Vehicle</TableHead>
                  <TableHead className="px-4 py-3 text-left">Order Status</TableHead>
                  <TableHead className="px-4 py-3 text-left">SLA Status</TableHead>
                  <TableHead className="px-4 py-3 text-left">Risk</TableHead>
                  <TableHead className="px-4 py-3 text-left">Target Date</TableHead>
                  <TableHead className="px-4 py-3 text-left">Days</TableHead>
                  <TableHead className="px-4 py-3 text-left">Category</TableHead>
                  <TableHead className="px-4 py-3 text-left">Blocking</TableHead>
                  <TableHead className="px-4 py-3 text-left">Department</TableHead>
                  <TableHead className="px-4 py-3 text-left">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {filteredSummaries.map((summary) => {
                  const order = orders.find((o) => o.id === summary.orderId)
                  return (
                    <TableRow key={summary.orderId} className="group hover:bg-muted/50">
                      <TableCell className="px-4 py-3">
                        <Link href={`/logistic/orders/${summary.orderId}`} className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-foreground">
                          {summary.orderNumber}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{order?.customerName ?? "—"}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{order?.vehicleModel ?? "—"}</TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {order?.status ? (STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ?? order.status) : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <SlaStatusBadge status={summary.slaStatus} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <RiskLevelBadge level={summary.riskLevel} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {formatSlaDate(summary.targetDate)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        {summary.daysUntilOrOverdue !== null ? (
                          <span className={summary.daysUntilOrOverdue < 0 ? "text-destructive" : summary.daysUntilOrOverdue <= 7 ? "text-destructive" : "text-muted-foreground"}>
                            {formatDaysValue(summary.daysUntilOrOverdue)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {DELAY_CATEGORY_LABELS[summary.delayCategory]}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {summary.currentBlockingStage ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {summary.responsibleDepartment ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm" title={summary.suggestedAction ?? undefined}>
                        {summary.suggestedAction ? (
                          <span className="text-muted-foreground">{summary.suggestedAction.length > 30 ? summary.suggestedAction.slice(0, 30) + "…" : summary.suggestedAction}</span>
                        ) : "—"}
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

function KPICard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: "muted" | "destructive" | "warning" | "blue"
}) {
  const colorClass = color === "destructive" ? "text-destructive" : color === "warning" ? "text-destructive" : color === "blue" ? "text-foreground" : "text-foreground"
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
      </div>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${colorClass}`}>{value}</p>
    </div>
  )
}