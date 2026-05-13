import type { LogisticOrderStatus } from "@/generated/prisma/client"
import { STATUS_LABELS } from "@/lib/logistic/status"

const STATUS_COLORS: Record<LogisticOrderStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-500/10 text-blue-500",
  COMMERCIAL_REVIEW: "bg-amber-500/10 text-amber-500",
  APPROVED: "bg-emerald-500/10 text-emerald-500",
  REJECTED: "bg-destructive/10 text-destructive",
  WAITING_PRODUCTION_PLAN: "bg-amber-500/10 text-amber-500",
  PLANNED: "bg-cyan-500/10 text-cyan-500",
  IN_PRODUCTION: "bg-blue-500/10 text-blue-500",
  QUALITY_HOLD: "bg-destructive/10 text-destructive",
  READY_FOR_DISPATCH: "bg-emerald-500/10 text-emerald-500",
  DISPATCHED: "bg-indigo-500/10 text-indigo-500",
  DELIVERED: "bg-emerald-500/10 text-emerald-500",
  CLOSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground line-through",
}

export function StatusBadge({ status }: { status: LogisticOrderStatus }) {
  const label = STATUS_LABELS[status]
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}>
      {label}
    </span>
  )
}