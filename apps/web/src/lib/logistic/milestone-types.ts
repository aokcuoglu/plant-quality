export type {
  ProductionMilestoneGate,
  ProductionMilestoneStatus,
} from "@plantx/db/client"

export const MILESTONE_GATE_OPTIONS = [
  { value: "BODY" as const, label: "Body / Body Shop" },
  { value: "PAINT" as const, label: "Paint" },
  { value: "ASSEMBLY" as const, label: "Assembly" },
  { value: "ELECTRICAL" as const, label: "Electrical" },
  { value: "POWERTRAIN" as const, label: "Powertrain / Drivetrain" },
  { value: "EOL_TEST" as const, label: "EOL Test" },
  { value: "WASH" as const, label: "Washing" },
  { value: "PDI" as const, label: "PDI" },
  { value: "FINAL_QUALITY" as const, label: "Final Quality Gate" },
  { value: "YARD_READY" as const, label: "Yard / Ready" },
  { value: "OTHER" as const, label: "Other" },
] as const

export const DEFAULT_MILESTONE_GATES = MILESTONE_GATE_OPTIONS.filter(
  (o) => o.value !== "OTHER"
)

export function labelForGate(gate: string): string {
  return MILESTONE_GATE_OPTIONS.find((o) => o.value === gate)?.label ?? gate
}

export const MILESTONE_STATUS_OPTIONS = [
  { value: "NOT_STARTED" as const, label: "Not Started" },
  { value: "PLANNED" as const, label: "Planned" },
  { value: "IN_PROGRESS" as const, label: "In Progress" },
  { value: "BLOCKED" as const, label: "Blocked" },
  { value: "QUALITY_HOLD" as const, label: "Quality Hold" },
  { value: "COMPLETED" as const, label: "Completed" },
  { value: "SKIPPED" as const, label: "Skipped" },
  { value: "CANCELLED" as const, label: "Cancelled" },
] as const

export function labelForMilestoneStatus(status: string): string {
  return MILESTONE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export const DEPARTMENT_OPTIONS = [
  "Body Shop",
  "Paint Shop",
  "Assembly",
  "Electrical",
  "Powertrain",
  "Quality",
  "Production Planning",
  "Logistics",
  "PDI",
  "Engineering",
  "Other",
] as const