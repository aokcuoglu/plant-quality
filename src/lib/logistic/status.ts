import type { LogisticOrderStatus } from "@/generated/prisma/client"

export const ALLOWED_TRANSITIONS: Record<LogisticOrderStatus, LogisticOrderStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["COMMERCIAL_REVIEW"],
  COMMERCIAL_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["WAITING_PRODUCTION_PLAN"],
  REJECTED: [],
  WAITING_PRODUCTION_PLAN: ["PLANNED"],
  PLANNED: ["IN_PRODUCTION"],
  IN_PRODUCTION: ["QUALITY_HOLD", "READY_FOR_DISPATCH"],
  QUALITY_HOLD: ["IN_PRODUCTION"],
  READY_FOR_DISPATCH: ["DISPATCHED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
}

export const CANCELABLE_STATUSES: LogisticOrderStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "COMMERCIAL_REVIEW",
  "APPROVED",
  "WAITING_PRODUCTION_PLAN",
  "PLANNED",
  "IN_PRODUCTION",
  "QUALITY_HOLD",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
]

export const TERMINAL_STATUSES: LogisticOrderStatus[] = [
  "REJECTED",
  "CLOSED",
  "CANCELLED",
]

export const STATUS_LABELS: Record<LogisticOrderStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  COMMERCIAL_REVIEW: "Commercial Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WAITING_PRODUCTION_PLAN: "Waiting Production Plan",
  PLANNED: "Planned",
  IN_PRODUCTION: "In Production",
  QUALITY_HOLD: "Quality Hold",
  READY_FOR_DISPATCH: "Ready for Dispatch",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
}

export const MILESTONE_EVENT_LABELS: Record<string, string> = {
  MILESTONES_CREATED: "Production milestones created",
  MILESTONE_STARTED: "Milestone started",
  MILESTONE_COMPLETED: "Milestone completed",
  MILESTONE_BLOCKED: "Milestone blocked",
  MILESTONE_QUALITY_HOLD: "Milestone quality hold",
}

export function canTransitionTo(from: LogisticOrderStatus, to: LogisticOrderStatus): boolean {
  if (to === "CANCELLED" && CANCELABLE_STATUSES.includes(from)) return true
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function getNextStatuses(current: LogisticOrderStatus): LogisticOrderStatus[] {
  const transitions = ALLOWED_TRANSITIONS[current] ?? []
  if (!TERMINAL_STATUSES.includes(current) && !transitions.includes("CANCELLED" as LogisticOrderStatus)) {
    return [...transitions, "CANCELLED"]
  }
  return transitions
}