import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { getNextStatuses } from "@/lib/logistic/status"
import { labelForCustomerType, labelForVehicleType, labelForPowertrain, labelForPriority } from "@/lib/logistic/types"
import { StatusBadge } from "../../status-badge"
import { ChangeStatusButton } from "./change-status-button"
import { UpdatePlanningForm } from "./update-planning-form"
import { AssignVinChassisForm } from "./assign-vin-chassis-form"
import { AddCommentForm } from "./add-comment-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LogisticOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  const companyId = session.user.companyId
  const { id } = await params

  const order = await prisma.plantLogisticOrder.findFirst({
    where: { id, companyId },
    include: {
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true } },
      events: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      },
    },
  })

  if (!order) notFound()

  const nextStatuses = getNextStatuses(order.status)
  const isDelayed = order.plannedDeliveryDate && order.plannedDeliveryDate < new Date() && !["DELIVERED", "CLOSED", "CANCELLED", "REJECTED"].includes(order.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistic/orders" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
            {isDelayed && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                Delivery Risk
              </span>
            )}
            {order.priority === "URGENT" && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                Urgent
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {order.vehicleModel}{order.vehicleVariant ? ` (${order.vehicleVariant})` : ""} — {order.quantity} unit{order.quantity > 1 ? "s" : ""}
          </p>
        </div>
        {nextStatuses.length > 0 && (
          <div className="flex items-center gap-2">
            {nextStatuses.map((status) => (
              <ChangeStatusButton key={status} orderId={order.id} newStatus={status} currentStatus={order.status} />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">Customer Information</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Customer Name</dt>
                <dd className="font-medium text-foreground">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Customer Type</dt>
                <dd className="text-foreground">{labelForCustomerType(order.customerType)}</dd>
              </div>
              {order.dealerName && (
                <div>
                  <dt className="text-xs text-muted-foreground">Dealer</dt>
                  <dd className="text-foreground">{order.dealerName}</dd>
                </div>
              )}
              {order.distributorName && (
                <div>
                  <dt className="text-xs text-muted-foreground">Distributor</dt>
                  <dd className="text-foreground">{order.distributorName}</dd>
                </div>
              )}
              {order.country && (
                <div>
                  <dt className="text-xs text-muted-foreground">Country</dt>
                  <dd className="text-foreground">{order.country}</dd>
                </div>
              )}
              {order.market && (
                <div>
                  <dt className="text-xs text-muted-foreground">Market</dt>
                  <dd className="text-foreground">{order.market}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">Vehicle Configuration</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Vehicle Model</dt>
                <dd className="font-medium text-foreground">{order.vehicleModel}</dd>
              </div>
              {order.vehicleVariant && (
                <div>
                  <dt className="text-xs text-muted-foreground">Variant</dt>
                  <dd className="text-foreground">{order.vehicleVariant}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Vehicle Type</dt>
                <dd className="text-foreground">{labelForVehicleType(order.vehicleType)}</dd>
              </div>
              {order.powertrain && (
                <div>
                  <dt className="text-xs text-muted-foreground">Powertrain</dt>
                  <dd className="text-foreground">{labelForPowertrain(order.powertrain)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Quantity</dt>
                <dd className="text-foreground">{order.quantity}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Priority</dt>
                <dd className="text-foreground">{labelForPriority(order.priority)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">Planning & Delivery</h2>
            <UpdatePlanningForm order={order} />
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">VIN / Chassis Assignment</h2>
            <AssignVinChassisForm order={order} />
          </section>

          {order.notes && (
            <section className="rounded-lg border bg-card p-4">
              <h2 className="mb-2 text-sm font-medium text-foreground">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">Order Details</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Order Number</dt>
                <dd className="font-medium text-foreground">{order.orderNumber}</dd>
              </div>
              {order.requestNumber && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Request Number</dt>
                  <dd className="text-foreground">{order.requestNumber}</dd>
                </div>
              )}
              {order.salesOrderNo && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Sales Order #</dt>
                  <dd className="text-foreground">{order.salesOrderNo}</dd>
                </div>
              )}
              {order.productionOrderNo && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Production Order #</dt>
                  <dd className="text-foreground">{order.productionOrderNo}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="text-foreground">{order.createdAt.toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created By</dt>
                <dd className="text-foreground">{order.createdBy?.name ?? order.createdBy?.email ?? "—"}</dd>
              </div>
              {order.approvedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Approved</dt>
                  <dd className="text-foreground">{order.approvedAt.toLocaleDateString()}</dd>
                </div>
              )}
              {order.deliveredAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Delivered</dt>
                  <dd className="text-foreground">{order.deliveredAt.toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">Activity Timeline</h2>
            <AddCommentForm orderId={order.id} />
            <div className="mt-3 space-y-3">
              {order.events.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`size-2 rounded-full ${event.eventType === "STATUS_CHANGED" ? "bg-emerald-500" : event.eventType === "COMMENT_ADDED" ? "bg-blue-500" : "bg-muted-foreground"}`} />
                    <div className="w-px flex-1 bg-border" />
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{event.actor?.name ?? "System"}</span>
                      <span className="text-xs text-muted-foreground">{event.createdAt.toLocaleDateString()} {event.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.message}</p>
                    {event.fromStatus && event.toStatus && (
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <StatusBadge status={event.fromStatus} />
                        <span className="text-muted-foreground">→</span>
                        <StatusBadge status={event.toStatus} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}