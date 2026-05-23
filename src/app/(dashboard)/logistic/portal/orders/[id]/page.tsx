import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { isPortalUser } from "@/lib/logistic/portal-access"
import { getPortalOrderDetail, getPortalOrderTimeline } from "../../actions"
import { labelForExternalStatus, colorForExternalStatus, labelForExternalDispatchStatus } from "@/lib/logistic/external-status"
import { labelForVehicleType, labelForPowertrain, labelForPriority, labelForCustomerType } from "@/lib/logistic/types"
import { labelForTransportMode } from "@/lib/logistic/dispatch-status"
import { type OrderSlaInput } from "@/lib/logistic/sla"
import { ExternalDelayPanel } from "./delay-panel"
import { ArrowLeft, TruckIcon, Calendar, Info } from "lucide-react"
import Link from "next/link"

export default async function PortalOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!isPortalUser(session.user.companyType)) redirect("/logistic")

  const [orderResult, timelineResult] = await Promise.all([
    getPortalOrderDetail(id),
    getPortalOrderTimeline(id),
  ])

  if ("error" in orderResult) {
    notFound()
  }

  const order = orderResult.data
  const timeline = "data" in timelineResult ? timelineResult.data : []

  const portalSlaInput: OrderSlaInput = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status ?? "IN_PRODUCTION",
    requestedDeliveryDate: null,
    plannedDeliveryDate: order.plannedDeliveryDate ? new Date(order.plannedDeliveryDate) : null,
    deliveredAt: null,
    closedAt: null,
    externalVisible: true,
    externalStatus: order.externalStatus,
    externalStatusNote: order.externalStatusNote,
    milestones: [],
    yardStatus: null,
    dispatches: order.dispatches.map((d) => ({
      id: d.id,
      status: d.status ?? "NOT_PLANNED",
      plannedLoadingDate: d.plannedLoadingDate,
      estimatedArrivalDate: d.estimatedArrivalDate,
    })),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/logistic/portal/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Orders
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{order.customerName}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${colorForExternalStatus(order.externalStatus)}`}>
          {labelForExternalStatus(order.externalStatus)}
        </span>
      </div>

      {order.externalStatusNote && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <Info className="size-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">OEM Note</p>
              <p className="text-sm text-muted-foreground">{order.externalStatusNote}</p>
            </div>
          </div>
        </div>
      )}

      <ExternalDelayPanel order={portalSlaInput} externalStatusNote={order.externalStatusNote ?? null} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Vehicle Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-medium text-foreground">{order.vehicleModel}</dd>
              </div>
              {order.vehicleVariant && (
                <div>
                  <dt className="text-muted-foreground">Variant</dt>
                  <dd className="font-medium text-foreground">{order.vehicleVariant}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium text-foreground">{labelForVehicleType(order.vehicleType)}</dd>
              </div>
              {order.powertrain && (
                <div>
                  <dt className="text-muted-foreground">Powertrain</dt>
                  <dd className="font-medium text-foreground">{labelForPowertrain(order.powertrain)}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Quantity</dt>
                <dd className="font-medium text-foreground">{order.quantity}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="font-medium text-foreground">{labelForPriority(order.priority)}</dd>
              </div>
            </dl>
          </div>

          {order.dispatches && order.dispatches.length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <TruckIcon className="size-4 text-emerald-500" /> Delivery Information
              </h2>
              {order.dispatches.map((dispatch) => (
                <div key={dispatch.id} className="space-y-3 pb-4 mb-4 border-b last:border-b-0 last:mb-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {dispatch.dispatchBatchNo ?? `Dispatch`}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorForExternalStatus(dispatch.status === "IN_TRANSIT" ? "IN_TRANSIT" : dispatch.status === "DELIVERED" ? "DELIVERED" : dispatch.status === "LOADED" ? "DISPATCHED" : dispatch.status === "ARRIVED" ? "IN_TRANSIT" : "ORDER_RECEIVED")}`}>
                      {labelForExternalDispatchStatus(dispatch.status)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {dispatch.carrierName && (
                      <div>
                        <dt className="text-muted-foreground">Carrier</dt>
                        <dd className="font-medium text-foreground">{dispatch.carrierName}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">Transport</dt>
                      <dd className="font-medium text-foreground">{labelForTransportMode(dispatch.transportMode)}</dd>
                    </div>
                    {dispatch.estimatedArrivalDate && (
                      <div>
                        <dt className="text-muted-foreground">ETA</dt>
                        <dd className="font-medium text-foreground">{new Date(dispatch.estimatedArrivalDate).toLocaleDateString()}</dd>
                      </div>
                    )}
                    {(dispatch.destinationCity || dispatch.destinationCountry) && (
                      <div>
                        <dt className="text-muted-foreground">Destination</dt>
                        <dd className="font-medium text-foreground">
                          {[dispatch.destinationCity, dispatch.destinationCountry].filter(Boolean).join(", ")}
                        </dd>
                      </div>
                    )}
                    {dispatch.trackingReference && (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Tracking Ref</dt>
                        <dd className="font-medium text-foreground font-mono text-xs">{dispatch.trackingReference}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Calendar className="size-4 text-emerald-500" /> Order Summary
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Customer Type</dt>
                <dd className="font-medium text-foreground">{labelForCustomerType(order.customerType)}</dd>
              </div>
              {order.dealerName && (
                <div>
                  <dt className="text-muted-foreground">Dealer</dt>
                  <dd className="font-medium text-foreground">{order.dealerName}</dd>
                </div>
              )}
              {order.distributorName && (
                <div>
                  <dt className="text-muted-foreground">Distributor</dt>
                  <dd className="font-medium text-foreground">{order.distributorName}</dd>
                </div>
              )}
              {order.country && (
                <div>
                  <dt className="text-muted-foreground">Country</dt>
                  <dd className="font-medium text-foreground">{order.country}</dd>
                </div>
              )}
              {order.market && (
                <div>
                  <dt className="text-muted-foreground">Market</dt>
                  <dd className="font-medium text-foreground">{order.market}</dd>
                </div>
              )}
              {order.plannedDeliveryDate && (
                <div>
                  <dt className="text-muted-foreground">Planned Delivery</dt>
                  <dd className="font-medium text-foreground">{new Date(order.plannedDeliveryDate).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {timeline && timeline.length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground mb-4">Timeline</h2>
              <div className="space-y-3">
                {timeline.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="mt-1 size-2 rounded-full bg-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{event.message ?? event.eventType.replace(/_/g, " ").toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}