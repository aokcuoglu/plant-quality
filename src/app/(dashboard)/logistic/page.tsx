import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { labelForPriority } from "@/lib/logistic/types"
import Link from "next/link"
import { PlusCircle, TruckIcon, Factory, AlertTriangle, Clock, PackageCheck } from "lucide-react"
import { StatusBadge } from "./status-badge"

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
      include: { createdBy: { select: { name: true } } },
    }),
  ])

  const delayedCount = delayedOrders.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">PlantLogistic</h1>
          <p className="text-sm text-muted-foreground">Vehicle Order & Delivery Control Tower</p>
        </div>
        <Link
          href="/logistic/orders/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
        >
          <PlusCircle className="size-4" />
          New Order
        </Link>
      </div>

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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
        <SummaryCard
          title="Delivery Risk"
          value={delayedCount}
          icon={Clock}
          color={delayedCount > 0 ? "destructive" : "muted"}
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
                  <th className="px-4 py-3 text-left">Qty</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((order) => (
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
                    <td className="px-4 py-3 text-sm text-muted-foreground">{order.quantity}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{labelForPriority(order.priority)}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {order.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
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
  color?: "muted" | "destructive"
}) {
  const colorClass = color === "destructive" ? "text-destructive" : "text-foreground"
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