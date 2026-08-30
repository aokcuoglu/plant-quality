import type { LogisticOrderStatus, ProductionMilestoneStatus } from "@plantx/db/client"

/**
 * Logical stages shown on the real-time vehicle location board.
 * These are derived from the existing order + milestone + yard + dispatch
 * data so that the board always reflects a single source of truth.
 */
export const VEHICLE_STAGES = [
  "IN_PRODUCTION",
  "YARD",
  "WASH",
  "PDI",
  "READY",
  "QUALITY_HOLD",
  "IN_TRANSIT",
  "DELIVERED",
] as const

export type VehicleStage = (typeof VEHICLE_STAGES)[number]

export interface VehicleStageMeta {
  label: string
  shortLabel: string
  description: string
  color: string
  dotColor: string
}

export const STAGE_META: Record<VehicleStage, VehicleStageMeta> = {
  IN_PRODUCTION: {
    label: "In Production",
    shortLabel: "Line",
    description: "On the production line",
    color: "border-border",
    dotColor: "bg-cyan-500",
  },
  YARD: {
    label: "Yard / Üst Park",
    shortLabel: "Yard",
    description: "Parked, awaiting operation",
    color: "border-border",
    dotColor: "bg-slate-400",
  },
  WASH: {
    label: "Washing",
    shortLabel: "Wash",
    description: "Washing operation in progress",
    color: "border-border",
    dotColor: "bg-sky-400",
  },
  PDI: {
    label: "PDI",
    shortLabel: "PDI",
    description: "PDI checks in progress",
    color: "border-border",
    dotColor: "bg-indigo-400",
  },
  READY: {
    label: "Ready for Dispatch",
    shortLabel: "Ready",
    description: "Ready, awaiting dispatch",
    color: "border-emerald-500/40",
    dotColor: "bg-emerald-500",
  },
  QUALITY_HOLD: {
    label: "Quality Hold",
    shortLabel: "Hold",
    description: "Blocked by quality",
    color: "border-destructive/40",
    dotColor: "bg-destructive",
  },
  IN_TRANSIT: {
    label: "In Transit",
    shortLabel: "Transit",
    description: "Loaded and on the way",
    color: "border-border",
    dotColor: "bg-blue-500",
  },
  DELIVERED: {
    label: "Delivered",
    shortLabel: "Done",
    description: "Delivered to destination",
    color: "border-border",
    dotColor: "bg-foreground",
  },
}

const TERMINAL_MILESTONE_STATUSES: ProductionMilestoneStatus[] = [
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
]

export interface StageInput {
  status: LogisticOrderStatus
  milestones: {
    gate: string
    status: ProductionMilestoneStatus
    qualityHold: boolean
  }[]
  yardStatus: {
    readyForDispatch: boolean
    blockedForDispatch: boolean
  } | null
  dispatches: {
    status: string
  }[]
}

/**
 * Derive the logical vehicle stage from the underlying order data.
 * Precedence: delivered → in transit → quality hold → ready → wash → pdi → yard → production.
 */
export function deriveVehicleStage(order: StageInput): VehicleStage {
  const terminalOrder = ["DELIVERED", "CLOSED"]
  if (terminalOrder.includes(order.status)) return "DELIVERED"

  const dispatch = order.dispatches.find(
    (d) => !["DELIVERED", "CANCELLED"].includes(d.status)
  )
  if (dispatch && ["LOADED", "IN_TRANSIT", "ARRIVED"].includes(dispatch.status)) {
    return "IN_TRANSIT"
  }

  if (order.status === "QUALITY_HOLD") return "QUALITY_HOLD"

  const activeHold = order.milestones.find(
    (m) => !TERMINAL_MILESTONE_STATUSES.includes(m.status) && m.qualityHold
  )
  const blocked = order.milestones.find(
    (m) => m.status === "BLOCKED" || m.status === "QUALITY_HOLD"
  )
  if (activeHold || blocked) return "QUALITY_HOLD"

  if (order.yardStatus?.readyForDispatch && !order.yardStatus.blockedForDispatch) {
    return "READY"
  }

  const wash = order.milestones.find((m) => m.gate === "WASH")
  if (wash && ["IN_PROGRESS", "BLOCKED", "QUALITY_HOLD"].includes(wash.status)) {
    return "WASH"
  }

  const pdi = order.milestones.find((m) => m.gate === "PDI")
  if (pdi && ["IN_PROGRESS", "BLOCKED", "QUALITY_HOLD"].includes(pdi.status)) {
    return "PDI"
  }

  if (order.yardStatus) return "YARD"

  return "IN_PRODUCTION"
}

/** Find the active (first non-terminal) milestone for display purposes. */
export function getActiveMilestone(
  milestones: { gate: string; status: ProductionMilestoneStatus }[]
): { gate: string; status: ProductionMilestoneStatus } | null {
  return milestones.find((m) => !TERMINAL_MILESTONE_STATUSES.includes(m.status)) ?? null
}
