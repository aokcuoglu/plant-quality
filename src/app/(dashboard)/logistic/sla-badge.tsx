import { SLA_STATUS_LABELS, SLA_STATUS_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_COLORS, type SlaStatus, type RiskLevel } from "@/lib/logistic/sla"

export function SlaStatusBadge({ status }: { status: SlaStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SLA_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}>
      {SLA_STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function RiskLevelBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${RISK_LEVEL_COLORS[level] ?? "bg-muted text-muted-foreground"}`}>
      {RISK_LEVEL_LABELS[level] ?? level}
    </span>
  )
}