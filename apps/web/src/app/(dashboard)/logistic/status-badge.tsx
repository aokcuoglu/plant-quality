import type { LogisticOrderStatus } from "@plantx/db/client"

const STATUS_COLORS: Record<LogisticOrderStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-accent text-accent-foreground",
  COMMERCIAL_REVIEW: "bg-muted text-muted-foreground",
  APPROVED: "bg-muted text-muted-foreground",
  REJECTED: "bg-destructive/10 text-destructive",
  WAITING_PRODUCTION_PLAN: "bg-muted text-muted-foreground",
  PLANNED: "bg-accent text-accent-foreground",
  IN_PRODUCTION: "bg-accent text-accent-foreground",
  QUALITY_HOLD: "bg-destructive/10 text-destructive",
  READY_FOR_DISPATCH: "bg-muted text-muted-foreground",
  DISPATCHED: "bg-accent text-accent-foreground",
  DELIVERED: "bg-muted text-muted-foreground",
  CLOSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground line-through",
}

export function StatusBadge({
  status,
  label,
}: {
  status: LogisticOrderStatus
  label: string
}) {
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}>
      {label}
    </span>
  )
}
