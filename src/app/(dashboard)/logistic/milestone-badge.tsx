import type { ProductionMilestoneStatus } from "@/generated/prisma/client"
import { MILESTONE_STATUS_LABELS } from "@/lib/logistic/milestone-status"
import { labelForGate } from "@/lib/logistic/milestone-types"

const STATUS_COLORS: Record<ProductionMilestoneStatus, string> = {
  NOT_STARTED: "bg-muted text-muted-foreground",
  PLANNED: "bg-blue-500/10 text-blue-500",
  IN_PROGRESS: "bg-cyan-500/10 text-cyan-500",
  BLOCKED: "bg-amber-500/10 text-amber-500",
  QUALITY_HOLD: "bg-destructive/10 text-destructive",
  COMPLETED: "bg-emerald-500/10 text-emerald-500",
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
    BODY: "bg-orange-500/10 text-orange-500",
    PAINT: "bg-purple-500/10 text-purple-500",
    ASSEMBLY: "bg-blue-500/10 text-blue-500",
    ELECTRICAL: "bg-yellow-500/10 text-yellow-500",
    POWERTRAIN: "bg-red-500/10 text-red-500",
    EOL_TEST: "bg-cyan-500/10 text-cyan-500",
    PDI: "bg-emerald-500/10 text-emerald-500",
    FINAL_QUALITY: "bg-emerald-500/10 text-emerald-700",
    YARD_READY: "bg-green-500/10 text-green-500",
    OTHER: "bg-muted text-muted-foreground",
  }
  const colorClass = gateColors[gate] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}>
      {labelForGate(gate)}
    </span>
  )
}