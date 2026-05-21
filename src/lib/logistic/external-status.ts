import type { LogisticOrderStatus, DispatchStatus, ExternalOrderStatus } from "@/generated/prisma/client"

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
  ORDER_RECEIVED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  PRODUCTION_PLANNED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  IN_PRODUCTION: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  QUALITY_CHECK: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  READY_FOR_DISPATCH: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  DISPATCHED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  IN_TRANSIT: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  DELIVERED: "bg-green-500/10 text-green-600 dark:text-green-400",
  ON_HOLD: "bg-red-500/10 text-red-600 dark:text-red-400",
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
  if (dispatchEstimatedArrival) return dispatchEstimatedArrival instanceof Date ? dispatchEstimatedArrival : new Date(dispatchEstimatedArrival)
  if (plannedDeliveryDate) return plannedDeliveryDate instanceof Date ? plannedDeliveryDate : new Date(plannedDeliveryDate)
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