import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { STATUS_LABELS } from "@/lib/logistic/status"
import { labelForCustomerType, labelForPriority } from "@/lib/logistic/types"
import { labelForGate } from "@/lib/logistic/milestone-types"
import { calculateProductionProgress, allMilestonesResolved } from "@/lib/logistic/milestone-status"
import { DISPATCH_STATUS_LABELS } from "@/lib/logistic/dispatch-status"
import { getOrderSlaSummary, SLA_STATUS_LABELS as SLA_LABELS, type OrderSlaInput } from "@/lib/logistic/sla"
import Link from "next/link"
import { PlusCircle, TruckIcon } from "lucide-react"
import { StatusBadge } from "../status-badge"

export const dynamic = "force-dynamic"

export default async function LogisticOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const params = await searchParams
  const statusFilter = params.status ?? ""
  const searchFilter = (params.search ?? "").trim()

  const where: Record<string, unknown> = { companyId }
  if (statusFilter) {
    where.status = statusFilter
  }
  if (searchFilter) {
    where.OR = [
      { orderNumber: { contains: searchFilter, mode: "insensitive" } },
      { customerName: { contains: searchFilter, mode: "insensitive" } },
      { vehicleModel: { contains: searchFilter, mode: "insensitive" } },
      { vin: { contains: searchFilter, mode: "insensitive" } },
      { chassisNumber: { contains: searchFilter, mode: "insensitive" } },
    ]
  }

  const orders = await prisma.plantLogisticOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        milestones: {
          orderBy: { sequence: "asc" },
          select: {
            id: true,
            gate: true,
            status: true,
            qualityHold: true,
            sequence: true,
            title: true,
            plannedFinish: true,
            responsibleDepartment: true,
            delayReason: true,
          },
        },
        yardStatus: { select: { yardLocation: true, parkingSlot: true, readyForDispatch: true, blockedForDispatch: true, blockReason: true, lastMovementAt: true } },
        dispatches: { select: { id: true, status: true, plannedLoadingDate: true, estimatedArrivalDate: true, carrierName: true }, take: 1, orderBy: { createdAt: "desc" } },
      },
  })

  const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Vehicle Orders</h1>
          <p className="text-sm text-muted-foreground">Manage vehicle requests, production plans, and delivery tracking</p>
        </div>
        <Link
          href="/logistic/orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
        >
          <PlusCircle className="size-4" />
          New Order
        </Link>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          name="status"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          defaultValue={statusFilter}
        >
          <option value="">All statuses</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
          <input
            type="text"
            name="search"
            placeholder="Search orders, customers, vehicles..."
            defaultValue={searchFilter}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Apply filters
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-muted-foreground">
          <TruckIcon className="mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm">No vehicle orders found</p>
          <Link
            href="/logistic/orders/new"
            className="mt-2 text-xs text-emerald-500 hover:text-emerald-600"
          >
            Create your first order
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">Order #</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Qty</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Production</th>
                  <th className="px-4 py-3 text-left">Current Gate</th>
                  <th className="px-4 py-3 text-left">Yard</th>
                  <th className="px-4 py-3 text-left">Dispatch</th>
                  <th className="px-4 py-3 text-left">Delivery Target</th>
                  <th className="px-4 py-3 text-left">SLA</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => {
                   const progress = calculateProductionProgress(order.milestones)
                   const currentMs = order.milestones.find(m => m.status === "IN_PROGRESS" || m.status === "BLOCKED" || m.status === "QUALITY_HOLD")
                   const hasHold = order.milestones.some(m => m.qualityHold)
  const milestonesCompleted = !currentMs && allMilestonesResolved(order.milestones)
                   const slaInput: OrderSlaInput = {
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
                       title: m.title ?? m.gate,
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
                           blockReason: order.yardStatus.blockReason ?? null,
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
                   const sla = getOrderSlaSummary(slaInput)
                   return (
                    <tr key={order.id} className="group hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/logistic/orders/${order.id}`} className="text-sm font-medium text-foreground hover:text-emerald-500">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{order.customerName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{labelForCustomerType(order.customerType)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.vehicleModel}
                        {order.vehicleVariant ? ` (${order.vehicleVariant})` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{order.quantity}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{labelForPriority(order.priority)}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">
                        {order.milestones.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 rounded-full bg-muted">
                              <div
                                className={`h-1.5 rounded-full ${progress === 100 ? "bg-emerald-500" : hasHold ? "bg-destructive" : "bg-cyan-500"}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {currentMs ? labelForGate(currentMs.gate) : milestonesCompleted ? "Completed" : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.yardStatus ? (
                          <div className="flex flex-col">
                            <span>{order.yardStatus.yardLocation || "—"}{order.yardStatus.parkingSlot ? ` / ${order.yardStatus.parkingSlot}` : ""}</span>
                            {order.yardStatus.readyForDispatch && <span className="text-[10px] text-emerald-600">Ready</span>}
                            {order.yardStatus.blockedForDispatch && <span className="text-[10px] text-destructive">Blocked</span>}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.dispatches.length > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-xs">{DISPATCH_STATUS_LABELS[order.dispatches[0].status as keyof typeof DISPATCH_STATUS_LABELS] ?? order.dispatches[0].status}</span>
                            {order.dispatches[0].carrierName && <span className="text-[10px] text-muted-foreground">{order.dispatches[0].carrierName}</span>}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.plannedDeliveryDate ? order.plannedDeliveryDate.toLocaleDateString() : order.requestedDeliveryDate ? order.requestedDeliveryDate.toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          sla.slaStatus === "DELAYED" ? "bg-red-500/10 text-red-600" :
                          sla.slaStatus === "BLOCKED" ? "bg-red-500/10 text-red-700" :
                          sla.slaStatus === "AT_RISK" ? "bg-amber-500/10 text-amber-600" :
                          sla.slaStatus === "DELIVERED" ? "bg-green-500/10 text-green-600" :
                          "bg-emerald-500/10 text-emerald-600"
                        }`}>
                          {SLA_LABELS[sla.slaStatus]}
                        </span>
                        {sla.daysUntilOrOverdue !== 0 && sla.slaStatus !== "DELIVERED" && (
                          <span className={`ml-1 text-[10px] ${sla.daysUntilOrOverdue < 0 ? "text-destructive" : "text-amber-600"}`}>
                            {sla.daysUntilOrOverdue < 0 ? `${Math.abs(sla.daysUntilOrOverdue)}d overdue` : `${sla.daysUntilOrOverdue}d`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{order.createdAt.toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}