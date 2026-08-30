import type { DispatchStatus } from "@plantx/db/client"

export const DISPATCH_TRANSITIONS: Record<DispatchStatus, DispatchStatus[]> = {
  NOT_PLANNED: ["PLANNED"],
  PLANNED: ["CARRIER_ASSIGNED"],
  CARRIER_ASSIGNED: ["LOADING_PLANNED"],
  LOADING_PLANNED: ["LOADED"],
  LOADED: ["IN_TRANSIT"],
  IN_TRANSIT: ["ARRIVED"],
  ARRIVED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
}

export const DISPATCH_CANCELABLE_STATUSES: DispatchStatus[] = [
  "NOT_PLANNED",
  "PLANNED",
  "CARRIER_ASSIGNED",
  "LOADING_PLANNED",
  "LOADED",
]

export const DISPATCH_TERMINAL_STATUSES: DispatchStatus[] = [
  "DELIVERED",
  "CANCELLED",
]

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  NOT_PLANNED: "Not Planned",
  PLANNED: "Planned",
  CARRIER_ASSIGNED: "Carrier Assigned",
  LOADING_PLANNED: "Loading Planned",
  LOADED: "Loaded",
  IN_TRANSIT: "In Transit",
  ARRIVED: "Arrived",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

export function canTransitionDispatch(from: DispatchStatus, to: DispatchStatus): boolean {
  if (to === "CANCELLED" && DISPATCH_CANCELABLE_STATUSES.includes(from)) return true
  return DISPATCH_TRANSITIONS[from]?.includes(to) ?? false
}

export function getNextDispatchStatuses(current: DispatchStatus): DispatchStatus[] {
  const transitions = DISPATCH_TRANSITIONS[current] ?? []
  if (!DISPATCH_TERMINAL_STATUSES.includes(current) && !transitions.includes("CANCELLED" as DispatchStatus)) {
    return [...transitions, "CANCELLED"]
  }
  return transitions
}

export const TRANSPORT_MODE_OPTIONS = [
  { value: "ROAD", label: "Road" },
  { value: "SEA", label: "Sea" },
  { value: "RAIL", label: "Rail" },
  { value: "AIR", label: "Air" },
  { value: "MULTIMODAL", label: "Multimodal" },
  { value: "OTHER", label: "Other" },
] as const

export function labelForTransportMode(v: string): string {
  return TRANSPORT_MODE_OPTIONS.find(o => o.value === v)?.label ?? v
}

export function labelForDispatchStatus(v: string): string {
  return DISPATCH_STATUS_LABELS[v as DispatchStatus] ?? v
}