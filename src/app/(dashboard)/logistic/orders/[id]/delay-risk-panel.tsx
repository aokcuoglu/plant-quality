import {
  DELAY_CATEGORY_LABELS,
  type OrderSlaSummary,
} from "@/lib/logistic/sla"
import { SlaStatusBadge, RiskLevelBadge } from "../../sla-badge"
import { AlertTriangle, Clock, ShieldAlert, Factory, TruckIcon, MapPin } from "lucide-react"

export function DelayRiskPanel({ summary }: { summary: OrderSlaSummary }) {
  if (summary.slaStatus === "DELIVERED") {
    return (
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
          <Clock className="size-4 text-emerald-500" /> SLA & Delay Status
        </h2>
        <p className="text-sm text-muted-foreground">Order delivered — no active SLA tracking.</p>
      </section>
    )
  }

  if (summary.slaStatus === "ON_TRACK" && summary.riskLevel === "LOW") {
    return (
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
          <Clock className="size-4 text-emerald-500" /> SLA & Delay Status
        </h2>
        <div className="flex items-center gap-3">
          <SlaStatusBadge status={summary.slaStatus} />
          <RiskLevelBadge level={summary.riskLevel} />
          {summary.targetDate && (
            <span className="text-sm text-muted-foreground">
              Target: {summary.targetDate.toLocaleDateString()}
              {summary.daysUntilOrOverdue > 0 && ` (${summary.daysUntilOrOverdue}d remaining)`}
            </span>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium text-foreground flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-500" /> SLA & Delay Status
      </h2>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SlaStatusBadge status={summary.slaStatus} />
          <RiskLevelBadge level={summary.riskLevel} />
          {summary.targetDate && (
            <span className="text-sm text-muted-foreground">
              Target: {summary.targetDate.toLocaleDateString()}
            </span>
          )}
          {summary.daysUntilOrOverdue !== 0 && (
            <span className={`text-sm font-medium ${summary.daysUntilOrOverdue < 0 ? "text-destructive" : "text-amber-600"}`}>
              {summary.daysUntilOrOverdue < 0 ? `${Math.abs(summary.daysUntilOrOverdue)} days overdue` : `${summary.daysUntilOrOverdue} days remaining`}
            </span>
          )}
        </div>

        {summary.currentBlockingStage && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <ShieldAlert className="size-4" />
              Blocked: {summary.currentBlockingStage}
            </div>
          </div>
        )}

        {summary.delayCategory !== "NONE" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Delay Category</dt>
              <dd className="text-sm font-medium text-foreground">{DELAY_CATEGORY_LABELS[summary.delayCategory]}</dd>
            </div>
            {summary.internalReason && (
              <div>
                <dt className="text-xs text-muted-foreground">Internal Reason</dt>
                <dd className="text-sm font-medium text-foreground">{summary.internalReason}</dd>
              </div>
            )}
            {summary.responsibleDepartment && (
              <div>
                <dt className="text-xs text-muted-foreground">Responsible Department</dt>
                <dd className="text-sm font-medium text-foreground">{summary.responsibleDepartment}</dd>
              </div>
            )}
            {summary.suggestedAction && (
              <div>
                <dt className="text-xs text-muted-foreground">Suggested Action</dt>
                <dd className="text-sm font-medium text-foreground">{summary.suggestedAction}</dd>
              </div>
            )}
          </div>
        )}

        {summary.milestoneDelays.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Factory className="size-3" /> Delayed Milestones
            </h3>
            <div className="space-y-2">
              {summary.milestoneDelays.map((ms) => (
                <div key={ms.milestoneId} className={`rounded-lg border p-2.5 ${ms.blocked ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{ms.title}</span>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${ms.blocked ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
                      {ms.qualityHold ? "Q-Hold" : ms.status}
                    </span>
                  </div>
                  {ms.plannedFinish && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Planned finish: {ms.plannedFinish.toLocaleDateString()}
                      {ms.overdue && <span className="text-destructive ml-1">({ms.daysOverdue}d overdue)</span>}
                    </p>
                  )}
                  {ms.delayReason && <p className="text-xs text-amber-600 mt-0.5">Reason: {ms.delayReason}</p>}
                  {ms.responsibleDepartment && <p className="text-xs text-muted-foreground mt-0.5">Dept: {ms.responsibleDepartment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.yardDelay && summary.yardDelay.blockedForDispatch && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
              <MapPin className="size-4" />
              Yard: Dispatch blocked
              {summary.yardDelay.blockReason && <span className="font-normal text-muted-foreground">— {summary.yardDelay.blockReason}</span>}
            </div>
            {summary.yardDelay.daysInYard !== null && (
              <p className="text-xs text-muted-foreground mt-1">Vehicle in yard for {summary.yardDelay.daysInYard} day{summary.yardDelay.daysInYard !== 1 ? "s" : ""}</p>
            )}
          </div>
        )}

        {summary.dispatchDelays.length > 0 && summary.dispatchDelays.some((d) => d.loadingOverdue || d.etaOverdue) && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <TruckIcon className="size-3" /> Dispatch Delays
            </h3>
            <div className="space-y-2">
              {summary.dispatchDelays.filter((d) => d.loadingOverdue || d.etaOverdue).map((d) => (
                <div key={d.dispatchId} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">Dispatch</span>
                    <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      {d.status}
                    </span>
                  </div>
                  {d.loadingOverdue && (
                    <p className="text-xs text-destructive mt-1">Loading overdue by {d.daysLoadingOverdue} day{d.daysLoadingOverdue !== 1 ? "s" : ""}</p>
                  )}
                  {d.etaOverdue && (
                    <p className="text-xs text-destructive mt-1">ETA overdue by {d.daysEtaOverdue} day{d.daysEtaOverdue !== 1 ? "s" : ""}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}