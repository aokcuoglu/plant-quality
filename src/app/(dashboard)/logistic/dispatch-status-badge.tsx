import type { DispatchStatus } from "@/generated/prisma/client"
import { DISPATCH_STATUS_LABELS } from "@/lib/logistic/dispatch-status"

const STATUS_COLORS: Record<DispatchStatus, string> = {
  NOT_PLANNED: "bg-muted text-muted-foreground",
  PLANNED: "bg-accent text-accent-foreground",
  CARRIER_ASSIGNED: "bg-accent text-accent-foreground",
  LOADING_PLANNED: "bg-accent text-accent-foreground",
  LOADED: "bg-accent text-accent-foreground",
  IN_TRANSIT: "bg-muted text-muted-foreground",
  ARRIVED: "bg-muted text-muted-foreground",
  DELIVERED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/10 text-destructive",
}

export function DispatchStatusBadge({ status }: { status: DispatchStatus }) {
  const label = DISPATCH_STATUS_LABELS[status] ?? status
  const color = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${color}`}>
      {label}
    </span>
  )
}