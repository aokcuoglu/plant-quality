import type { DispatchStatus } from "@/generated/prisma/client"
import { DISPATCH_STATUS_LABELS } from "@/lib/logistic/dispatch-status"

const STATUS_COLORS: Record<DispatchStatus, string> = {
  NOT_PLANNED: "bg-muted text-muted-foreground",
  PLANNED: "bg-blue-500/10 text-blue-600",
  CARRIER_ASSIGNED: "bg-indigo-500/10 text-indigo-600",
  LOADING_PLANNED: "bg-cyan-500/10 text-cyan-600",
  LOADED: "bg-teal-500/10 text-teal-600",
  IN_TRANSIT: "bg-amber-500/10 text-amber-600",
  ARRIVED: "bg-purple-500/10 text-purple-600",
  DELIVERED: "bg-emerald-500/10 text-emerald-600",
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