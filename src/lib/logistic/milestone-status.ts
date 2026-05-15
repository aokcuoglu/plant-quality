import type { ProductionMilestoneStatus } from "@/generated/prisma/client"

export const ALLOWED_MILESTONE_TRANSITIONS: Record<ProductionMilestoneStatus, ProductionMilestoneStatus[]> = {
  NOT_STARTED: ["PLANNED", "CANCELLED"],
  PLANNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "BLOCKED", "QUALITY_HOLD"],
  BLOCKED: ["IN_PROGRESS"],
  QUALITY_HOLD: ["IN_PROGRESS"],
  COMPLETED: [],
  SKIPPED: [],
  CANCELLED: [],
}

export const TERMINAL_MILESTONE_STATUSES: ProductionMilestoneStatus[] = [
  "COMPLETED",
  "SKIPPED",
  "CANCELLED",
]

export const MILESTONE_STATUS_LABELS: Record<ProductionMilestoneStatus, string> = {
  NOT_STARTED: "Not Started",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  QUALITY_HOLD: "Quality Hold",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  CANCELLED: "Cancelled",
}

export function canTransitionMilestone(
  from: ProductionMilestoneStatus,
  to: ProductionMilestoneStatus
): boolean {
  return ALLOWED_MILESTONE_TRANSITIONS[from]?.includes(to) ?? false
}

export function getNextMilestoneStatuses(
  current: ProductionMilestoneStatus
): ProductionMilestoneStatus[] {
  return ALLOWED_MILESTONE_TRANSITIONS[current] ?? []
}

export function isTerminalMilestoneStatus(
  status: ProductionMilestoneStatus
): boolean {
  return TERMINAL_MILESTONE_STATUSES.includes(status)
}

export function calculateProductionProgress(
  milestones: { status: ProductionMilestoneStatus }[]
): number {
  if (milestones.length === 0) return 0
  const completed = milestones.filter((m) => m.status === "COMPLETED").length
  return Math.round((completed / milestones.length) * 100)
}