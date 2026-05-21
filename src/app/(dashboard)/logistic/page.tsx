import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { calculateProductionProgress } from "@/lib/logistic/milestone-status"
import { getOrderSlaSummary, type OrderSlaInput } from "@/lib/logistic/sla"
import Link from "next/link"
import { PlusCircle, TruckIcon, Factory, AlertTriangle, Clock, PackageCheck, Wrench, ShieldAlert, MapPin, Ban, Ship } from "lucide-react"
import { StatusBadge } from "./status-badge"
import { DISPATCH_STATUS_LABELS } from "@/lib/logistic/dispatch-status"

export const dynamic = "force-dynamic"

export default async function LogisticDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId

  const [
    totalActiveOrders,
    inProductionCount,
    readyForDispatchCount,
    qualityHoldCount,
    delayedOrders,
    recentOrders,
    ordersWithBlockedMilestones,
    ordersWithQualityHoldMilestones,
    milestonesDueThisWeek,
    vehiclesInYardCount,
    readyForDispatchYardCount,
    dispatchBlockedYardCount,
    loadingPlannedThisWeek,
    inTransitCount,
    deliveredThisMonth,
  ] = await Promise.all([
    prisma.plantLogisticOrder.count({
      where: {
        companyId,
        status: { notIn: ["CLOSED", "CANCELLED", "REJECTED"] },
      },
    }),
    prisma.plantLogisticOrder.count({
      where: { companyId, status: "IN_PRODUCTION" },
    }),
    prisma.plantLogisticOrder.count({
      where: { companyId, status: "READY_FOR_DISPATCH" },
    }),
    prisma.plantLogisticOrder.count({
      where: { companyId, status: "QUALITY_HOLD" },
    }),
    prisma.plantLogisticOrder.findMany({
      where: {
        companyId,
        status: { notIn: ["DELIVERED", "CLOSED", "CANCELLED", "REJECTED"] },
        plannedDeliveryDate: { lt: new Date() },
      },
      select: { id: true },
    }),
    prisma.plantLogisticOrder.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        createdBy: { select: { name: true } },
        milestones: {
          orderBy: { sequence: "asc" },
          select: { id: true, gate: true, status: true, qualityHold: true },
        },
        yardStatus: { select: { yardLocation: true, readyForDispatch: true, blockedForDispatch: true } },
        dispatches: { select: { status: true, carrierName: true, estimatedArrivalDate: true }, take: 1, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.plantLogisticProductionMilestone.count({
      where: {
        companyId,
        status: "BLOCKED",
      },
    }),
    prisma.plantLogisticProductionMilestone.count({
      where: {
        companyId,
        qualityHold: true,
      },
    }),
    prisma.plantLogisticProductionMilestone.count({
      where: {
        companyId,
        plannedFinish: {
          gte: new Date(),
          lte: new Date(new Date().setDate(new Date().getDate() + 7)),
        },
        status: { notIn: ["COMPLETED", "SKIPPED", "CANCELLED"] },
      },
    }),
    prisma.plantLogisticYardStatus.count({
      where: { companyId },
    }),
    prisma.plantLogisticYardStatus.count({
      where: { companyId, readyForDispatch: true },
    }),
    prisma.plantLogisticYardStatus.count({
      where: { companyId, blockedForDispatch: true },
    }),
    prisma.plantLogisticDispatch.count({
      where: {
        companyId,
        plannedLoadingDate: {
          gte: new Date(),
          lte: new Date(new Date().setDate(new Date().getDate() + 7)),
        },
        status: { in: ["LOADING_PLANNED", "CARRIER_ASSIGNED", "PLANNED"] },
      },
    }),
    prisma.plantLogisticDispatch.count({
      where: {
        companyId,
        status: "IN_TRANSIT",
      },
    }),
    prisma.plantLogisticDispatch.count({
      where: {
        companyId,
        status: "DELIVERED",
        deliveredAt: {
          gte: new Date(new Date().setDate(1)),
        },
      },
    }),
  ])

  const _delayedCount = delayedOrders.length

  const allActiveOrders = await prisma.plantLogisticOrder.findMany({
    where: {
      companyId,
      status: { notIn: ["CLOSED", "CANCELLED", "REJECTED"] },
    },
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

  const slaSummaries = allActiveOrders.map((order) => {
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

  const slaDelayedCount = slaSummaries.filter((s) => s.slaStatus === "DELAYED").length
  const slaAtRiskCount = slaSummaries.filter((s) => s.slaStatus === "AT_RISK").length
  const slaBlockedCount = slaSummaries.filter((s) => s.slaStatus === "BLOCKED").length
  const slaEtaOverdueCount = slaSummaries.filter((s) => s.delayCategory === "ETA_OVERDUE").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">PlantLogistic</h1>
          <p className="text-sm text-muted-foreground">Vehicle Order & Delivery Control Tower</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/logistic/delay-intelligence"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <AlertTriangle className="size-4" />
            Delay Intelligence
          </Link>
          <Link
            href="/logistic/orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            <PlusCircle className="size-4" />
            New Order
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <SummaryCard
          title="Active Orders"
          value={totalActiveOrders}
          icon={TruckIcon}
        />
        <SummaryCard
          title="In Production"
          value={inProductionCount}
          icon={Factory}
        />
        <SummaryCard
          title="Ready for Dispatch"
          value={readyForDispatchCount}
          icon={PackageCheck}
        />
        <SummaryCard
          title="Quality Hold"
          value={qualityHoldCount}
          icon={AlertTriangle}
          color={qualityHoldCount > 0 ? "destructive" : "muted"}
        />
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-4">
        <SummaryCard
          title="SLA Delayed"
          value={slaDelayedCount}
          icon={AlertTriangle}
          color={slaDelayedCount > 0 ? "destructive" : "muted"}
        />
        <SummaryCard
          title="At Risk"
          value={slaAtRiskCount}
          icon={Clock}
          color={slaAtRiskCount > 0 ? "warning" : "muted"}
        />
        <SummaryCard
          title="Blocked"
          value={slaBlockedCount}
          icon={Ban}
          color={slaBlockedCount > 0 ? "destructive" : "muted"}
        />
        <SummaryCard
          title="ETA Overdue"
          value={slaEtaOverdueCount}
          icon={Ship}
          color={slaEtaOverdueCount > 0 ? "destructive" : "muted"}
        />
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3">
        <SummaryCard
          title="Vehicles in Yard"
          value={vehiclesInYardCount}
          icon={MapPin}
        />
        <SummaryCard
          title="Ready for Dispatch (Yard)"
          value={readyForDispatchYardCount}
          icon={PackageCheck}
          color={readyForDispatchYardCount > 0 ? "emerald" : "muted"}
        />
        <SummaryCard
          title="Dispatch Blocked"
          value={dispatchBlockedYardCount}
          icon={Ban}
          color={dispatchBlockedYardCount > 0 ? "destructive" : "muted"}
        />
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3">
        <SummaryCard
          title="Loading Planned This Week"
          value={loadingPlannedThisWeek}
          icon={Clock}
          color={loadingPlannedThisWeek > 0 ? "warning" : "muted"}
        />
        <SummaryCard
          title="In Transit"
          value={inTransitCount}
          icon={Ship}
          color={inTransitCount > 0 ? "emerald" : "muted"}
        />
        <SummaryCard
          title="Delivered This Month"
          value={deliveredThisMonth}
          icon={PackageCheck}
        />
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3">
        <SummaryCard
          title="Milestones Blocked"
          value={ordersWithBlockedMilestones}
          icon={Wrench}
          color={ordersWithBlockedMilestones > 0 ? "warning" : "muted"}
        />
        <SummaryCard
          title="Milestones on Q-Hold"
          value={ordersWithQualityHoldMilestones}
          icon={ShieldAlert}
          color={ordersWithQualityHoldMilestones > 0 ? "destructive" : "muted"}
        />
        <SummaryCard
          title="Due This Week"
          value={milestonesDueThisWeek}
          icon={Clock}
          color={milestonesDueThisWeek > 0 ? "warning" : "muted"}
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Recent Orders</h2>
          <Link
            href="/logistic/orders"
            className="text-xs text-emerald-500 hover:text-emerald-600"
          >
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <TruckIcon className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm">No vehicle orders yet</p>
            <Link
              href="/logistic/orders/new"
              className="mt-2 text-xs text-emerald-500 hover:text-emerald-600"
            >
              Create your first order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left">Order #</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Production</th>
                  <th className="px-4 py-3 text-left">Yard</th>
                  <th className="px-4 py-3 text-left">Dispatch</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((order) => {
                   const progress = calculateProductionProgress(order.milestones)
                   return (
                    <tr key={order.id} className="group hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/logistic/orders/${order.id}`} className="text-sm font-medium text-foreground hover:text-emerald-500">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{order.customerName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.vehicleModel}
                        {order.vehicleVariant ? ` (${order.vehicleVariant})` : ""}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">
                        {order.milestones.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-16 rounded-full bg-muted">
                              <div
                                className={`h-1.5 rounded-full ${progress === 100 ? "bg-emerald-500" : order.milestones.some(m => m.qualityHold) ? "bg-destructive" : "bg-cyan-500"}`}
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
                        {order.yardStatus ? (
                          <div className="flex flex-col">
                            <span>{order.yardStatus.yardLocation || "—"}</span>
                            {order.yardStatus.readyForDispatch && <span className="text-[10px] text-emerald-600">Ready</span>}
                            {order.yardStatus.blockedForDispatch && <span className="text-[10px] text-destructive">Blocked</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.dispatches.length > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-xs">{DISPATCH_STATUS_LABELS[order.dispatches[0].status as keyof typeof DISPATCH_STATUS_LABELS] ?? order.dispatches[0].status}</span>
                            {order.dispatches[0].carrierName && <span className="text-[10px] text-muted-foreground">{order.dispatches[0].carrierName}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {order.createdAt.toLocaleDateString()}
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

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color?: "muted" | "destructive" | "warning" | "emerald"
}) {
  const colorClass = color === "destructive" ? "text-destructive" : color === "warning" ? "text-amber-600" : color === "emerald" ? "text-emerald-600" : "text-foreground"
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