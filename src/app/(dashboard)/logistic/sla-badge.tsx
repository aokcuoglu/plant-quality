import { SLA_STATUS_LABELS, SLA_STATUS_COLORS, type SlaStatus } from "@/lib/logistic/sla"

export function SlaStatusBadge({ status }: { status: SlaStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SLA_STATUS_COLORS[status]}`}>
      {SLA_STATUS_LABELS[status]}
    </span>
  )
}

export function RiskLevelBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }) {
  const colors: Record<string, string> = {
    LOW: "bg-emerald-500/10 text-emerald-600",
    MEDIUM: "bg-amber-500/10 text-amber-600",
    HIGH: "bg-orange-500/10 text-orange-600",
    CRITICAL: "bg-red-500/10 text-red-600",
  }
  const labels: Record<string, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors[level] ?? "bg-muted text-muted-foreground"}`}>
      {labels[level] ?? level}
    </span>
  )
}