import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing/guards"
import { STATUS_LABELS } from "@/lib/logistic/status"
import { labelForCustomerType, labelForPriority } from "@/lib/logistic/types"
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
    include: { createdBy: { select: { name: true } } },
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="flex items-center gap-2">
          <select
            name="status"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            defaultValue={statusFilter}
            onChange={(e) => {
              const form = e.currentTarget.closest("form")
              if (form) form.submit()
            }}
          >
            <option value="">All statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </form>
        <form className="flex-1 sm:max-w-xs">
          <input
            type="text"
            name="search"
            placeholder="Search orders, customers, vehicles..."
            defaultValue={searchFilter}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </form>
      </div>

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
                  <th className="px-4 py-3 text-left">Delivery Target</th>
                  <th className="px-4 py-3 text-left">VIN</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
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
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {order.plannedDeliveryDate ? order.plannedDeliveryDate.toLocaleDateString() : order.requestedDeliveryDate ? order.requestedDeliveryDate.toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{order.vin || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{order.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}