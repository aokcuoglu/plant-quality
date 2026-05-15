export type {
  LogisticOrderCustomerType,
  LogisticOrderVehicleType,
  LogisticOrderPowertrain,
  LogisticOrderPriority,
  LogisticOrderStatus,
  LogisticOrderEventType,
  ProductionMilestoneGate,
  ProductionMilestoneStatus,
} from "@/generated/prisma/client"

export const CUSTOMER_TYPE_OPTIONS = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "DEALER", label: "Dealer" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "INTERNAL", label: "Internal" },
] as const

export const VEHICLE_TYPE_OPTIONS = [
  { value: "BUS", label: "Bus" },
  { value: "MIDIBUS", label: "Midibus" },
  { value: "TRUCK", label: "Truck" },
  { value: "LIGHT_TRUCK", label: "Light Truck" },
  { value: "OTHER", label: "Other" },
] as const

export const POWERTRAIN_OPTIONS = [
  { value: "DIESEL", label: "Diesel" },
  { value: "CNG", label: "CNG" },
  { value: "ELECTRIC", label: "Electric" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "OTHER", label: "Other" },
] as const

export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const

export function labelForCustomerType(v: string): string {
  return CUSTOMER_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v
}

export function labelForVehicleType(v: string): string {
  return VEHICLE_TYPE_OPTIONS.find(o => o.value === v)?.label ?? v
}

export function labelForPowertrain(v: string): string {
  return POWERTRAIN_OPTIONS.find(o => o.value === v)?.label ?? v
}

export function labelForPriority(v: string): string {
  return PRIORITY_OPTIONS.find(o => o.value === v)?.label ?? v
}