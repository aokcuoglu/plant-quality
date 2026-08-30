import type { LogisticOrderStatus, DispatchStatus, ExternalOrderStatus } from "@plantx/db/client"

export type { ExternalOrderStatus }

export const EXTERNAL_STATUS_LABELS: Record<ExternalOrderStatus, string> = {
  ORDER_RECEIVED: "Order Received",
  PRODUCTION_PLANNED: "Production Planned",
  IN_PRODUCTION: "In Production",
  QUALITY_CHECK: "Quality Check",
  READY_FOR_DISPATCH: "Ready for Dispatch",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  ON_HOLD: "On Hold",
}

export const EXTERNAL_STATUS_COLORS: Record<ExternalOrderStatus, string> = {
  ORDER_RECEIVED: "bg-accent text-accent-foreground",
  PRODUCTION_PLANNED: "bg-accent text-accent-foreground",
  IN_PRODUCTION: "bg-muted text-muted-foreground",
  QUALITY_CHECK: "bg-muted text-muted-foreground",
  READY_FOR_DISPATCH: "bg-muted text-muted-foreground",
  DISPATCHED: "bg-muted text-muted-foreground",
  IN_TRANSIT: "bg-accent text-accent-foreground",
  DELIVERED: "bg-muted text-muted-foreground",
  ON_HOLD: "bg-destructive/10 text-destructive",
}

export function mapToExternalStatus(
  orderStatus: LogisticOrderStatus,
  dispatchStatus?: DispatchStatus | null
): ExternalOrderStatus {
  if (dispatchStatus === "IN_TRANSIT") return "IN_TRANSIT"
  if (dispatchStatus === "LOADED") return "DISPATCHED"
  if (dispatchStatus === "ARRIVED") return "IN_TRANSIT"
  if (dispatchStatus === "DELIVERED") return "DELIVERED"

  switch (orderStatus) {
    case "DRAFT":
    case "SUBMITTED":
    case "COMMERCIAL_REVIEW":
      return "ORDER_RECEIVED"
    case "APPROVED":
    case "WAITING_PRODUCTION_PLAN":
    case "PLANNED":
      return "PRODUCTION_PLANNED"
    case "IN_PRODUCTION":
      return "IN_PRODUCTION"
    case "QUALITY_HOLD":
      return "QUALITY_CHECK"
    case "READY_FOR_DISPATCH":
      return "READY_FOR_DISPATCH"
    case "DISPATCHED":
      return "IN_TRANSIT"
    case "DELIVERED":
    case "CLOSED":
      return "DELIVERED"
    case "REJECTED":
    case "CANCELLED":
      return "ON_HOLD"
    default:
      return "ORDER_RECEIVED"
  }
}

export function labelForExternalStatus(v: string): string {
  return EXTERNAL_STATUS_LABELS[v as ExternalOrderStatus] ?? v
}

export function colorForExternalStatus(v: string): string {
  return EXTERNAL_STATUS_COLORS[v as ExternalOrderStatus] ?? "bg-muted text-muted-foreground"
}

export const EXTERNAL_DISPATCH_STATUS_LABELS: Record<string, string> = {
  NOT_PLANNED: "Pending",
  PLANNED: "Being Prepared",
  CARRIER_ASSIGNED: "Carrier Assigned",
  LOADING_PLANNED: "Loading Planned",
  LOADED: "Loaded",
  IN_TRANSIT: "In Transit",
  ARRIVED: "Arrived at Destination",
  DELIVERED: "Delivered",
  CANCELLED: "Contact OEM",
}

export function labelForExternalDispatchStatus(v: string): string {
  return EXTERNAL_DISPATCH_STATUS_LABELS[v] ?? v
}

export function getExternalOrderStatus(
  orderStatus: LogisticOrderStatus,
  externalStatusOverride: ExternalOrderStatus | null | undefined,
  dispatchStatus?: DispatchStatus | null
): ExternalOrderStatus {
  return externalStatusOverride ?? mapToExternalStatus(orderStatus, dispatchStatus)
}

export function getExternalOrderStatusLabel(
  orderStatus: LogisticOrderStatus,
  externalStatusOverride: ExternalOrderStatus | null | undefined,
  dispatchStatus?: DispatchStatus | null
): string {
  return labelForExternalStatus(getExternalOrderStatus(orderStatus, externalStatusOverride, dispatchStatus))
}

export function getExternalEta(
  plannedDeliveryDate: Date | string | null,
  dispatchEstimatedArrival: Date | string | null
): Date | null {
  if (dispatchEstimatedArrival) {
    const d = dispatchEstimatedArrival instanceof Date ? dispatchEstimatedArrival : new Date(dispatchEstimatedArrival)
    if (!isNaN(d.getTime())) return d
  }
  if (plannedDeliveryDate) {
    const d = plannedDeliveryDate instanceof Date ? plannedDeliveryDate : new Date(plannedDeliveryDate)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

export const PORTAL_VISIBLE_ORDER_FIELDS = {
  orderNumber: true,
  customerName: true,
  customerType: true,
  dealerName: true,
  distributorName: true,
  vehicleModel: true,
  vehicleVariant: true,
  vehicleType: true,
  powertrain: true,
  quantity: true,
  priority: true,
  plannedDeliveryDate: true,
  country: true,
  market: true,
  destinationCountry: true,
  destinationCity: true,
  trackingReference: true,
  transportMode: true,
  carrierName: true,
  estimatedArrivalDate: true,
  plannedLoadingDate: true,
  updatedAt: true,
} as const

export const PORTAL_HIDDEN_FIELDS = [
  "vin",
  "chassisNumber",
  "productionOrderNo",
  "salesOrderNo",
  "notes",
  "requestedDeliveryDate",
  "plannedProductionDate",
  "plannedProductionWeek",
  "delayReason",
  "qualityHold",
  "blockReason",
  "responsibleDepartment",
] as const