import type { ProductionMilestoneStatus } from "@plantx/db/client"
import { MILESTONE_STATUS_LABELS } from "@/lib/logistic/milestone-status"
import { labelForGate } from "@/lib/logistic/milestone-types"

const STATUS_COLORS: Record<ProductionMilestoneStatus, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  PLANNED: "bg-accent text-accent-foreground",
  IN_PROGRESS: "bg-accent text-accent-foreground",
  BLOCKED: "bg-muted text-muted-foreground",
  QUALITY_HOLD: "bg-destructive/10 text-destructive",
  COMPLETED: "bg-muted text-muted-foreground",
  SKIPPED: "bg-muted text-muted-foreground line-through",
  CANCELLED: "bg-muted text-muted-foreground line-through",
}

export function MilestoneStatusBadge({ status }: { status: ProductionMilestoneStatus }) {
  const label = MILESTONE_STATUS_LABELS[status]
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}>
      {label}
    </span>
  )
}

export function MilestoneGateBadge({ gate }: { gate: string }) {
  const gateColors: Record<string, string> = {
    BODY: "bg-muted text-muted-foreground",
    PAINT: "bg-accent text-accent-foreground",
    ASSEMBLY: "bg-accent text-accent-foreground",
    ELECTRICAL: "bg-muted text-muted-foreground",
    POWERTRAIN: "bg-muted text-muted-foreground",
    EOL_TEST: "bg-accent text-accent-foreground",
    PDI: "bg-muted text-muted-foreground",
    FINAL_QUALITY: "bg-muted text-muted-foreground",
    YARD_READY: "bg-muted text-muted-foreground",
    OTHER: "bg-muted text-muted-foreground",
  }
  const colorClass = gateColors[gate] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}>
      {labelForGate(gate)}
    </span>
  )
}