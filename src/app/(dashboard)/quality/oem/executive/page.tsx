import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangleIcon,
  BugIcon,
  ClockIcon,
  GaugeIcon,
  ShieldAlertIcon,
  FileCheckIcon,
  RepeatIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  EyeIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { Button } from "@/components/ui/button"
import { RISK_LEVEL_CONFIG } from "@/lib/quality-intelligence"
import { requireFeature } from "@/lib/billing"
import { ESCALATION_COLORS, ESCALATION_LABELS } from "@/lib/escalation"
import { getExecutiveCockpitData } from "@/lib/executive-cockpit"
import type { ActionPriority } from "@/lib/executive-cockpit"

function RiskBadge({ level }: { level: string }) {
  const config = RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG] ?? RISK_LEVEL_CONFIG.low
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${config.className}`}>
      {config.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: ActionPriority }) {
  const config: Record<ActionPriority, { label: string; className: string }> = {
    critical: { label: "Critical", className: "bg-red-500/10 text-red-500 border-red-500/20" },
    high: { label: "High", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
    medium: { label: "Medium", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  }
  const c = config[priority] ?? config.medium
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${c.className}`}>
      {c.label}
    </span>
  )
}

function SlaStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" },
    "due-soon": { label: "Due Soon", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    escalated: { label: "Escalated", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
    "on-track": { label: "On Track", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  }
  const c = config[status] ?? config["on-track"]
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${c.className}`}>
      {c.label}
    </span>
  )
}

export default async function ExecutiveCockpitPage() {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  const featureGate = requireFeature(session, "EXECUTIVE_COCKPIT")
  if (!featureGate.allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Executive Cockpit" description="Leadership-ready quality insights" />
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <GaugeIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Executive Quality Cockpit</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Enterprise to unlock the Executive Quality Cockpit with KPIs, risk signals, supplier attention analysis, SLA monitoring, and action items.
          </p>
          <Link href="/oem/settings/plan" className="mt-4 inline-block">
            <Button>
              <GaugeIcon className="mr-1.5 h-4 w-4" />
              Upgrade to Enterprise
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const data = await getExecutiveCockpitData(session)
  if (!data) redirect("/login")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Quality Cockpit"
        description="Leadership-ready quality performance, risk, and action insights"
      />

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
        <DashboardCard
          title="Critical / High Field Issues"
          value={data.kpis.criticalHighFieldIssues}
          icon={AlertTriangleIcon}
          subtitle="CRITICAL or MAJOR severity"
          href="/quality/oem/field?filter=critical"
        />
        <DashboardCard
          title="Open Defects / 8D"
          value={data.kpis.openDefects8d}
          icon={BugIcon}
          subtitle="Requiring attention"
          href="/quality/oem/defects"
        />
        <DashboardCard
          title="Overdue Actions"
          value={data.kpis.overdueActions}
          icon={ClockIcon}
          subtitle="Past SLA deadline"
          href="/quality/oem/escalations"
        />
        <DashboardCard
          title="High Risk Combos"
          value={data.kpis.highRiskSupplierParts}
          icon={GaugeIcon}
          subtitle="Supplier + part combos"
          href="/quality/oem/quality-intelligence"
        />
        <DashboardCard
          title="Repeat Issues"
          value={data.kpis.repeatIssues}
          icon={RepeatIcon}
          subtitle="Cross-module clusters"
          href="/quality/oem/quality-intelligence#repeat-issues"
        />
        <DashboardCard
          title="PPAP With Issues"
          value={data.kpis.ppapApprovedWithIssues}
          icon={FileCheckIcon}
          subtitle="Approved with issue history"
          href="/quality/oem/quality-intelligence#ppap-issues"
        />
        <DashboardCard
          title="FMEA Gaps"
          value={data.kpis.fmeaCoverageGaps}
          icon={ShieldAlertIcon}
          subtitle="Potential coverage gaps"
          href="/quality/oem/quality-intelligence#fmea-gaps"
        />
      </div>

      {data.actionRequiredList.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Action Required This Week</h2>
            </div>
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {data.actionRequiredList.length}
            </span>
          </div>
          <div className="divide-y">
            {data.actionRequiredList.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={item.priority} />
                      <span className="text-xs text-muted-foreground">{item.reason}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Suggested: {item.suggestedOwner}</p>
                  </div>
                  {item.href && (
                    <Link href={item.href} className="shrink-0 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                      View <ArrowRightIcon className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.topRisks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground">Top Risk Supplier + Part Combinations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sorted by risk score. Each score is derived from deterministic quality signal points, capped at 150.</p>
        </div>
      )}

      {data.topRisks.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center">
          <TrendingUpIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No supplier + part combinations with risk signals detected.</p>
          <p className="text-xs text-muted-foreground mt-1">Risk signals appear when quality issues are detected across modules for the same supplier + part.</p>
        </div>
      )}

      {data.topRisks.length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part Number</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Main Signals</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Latest Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.topRisks.map((r) => (
                  <tr key={`${r.supplierId}-${r.partNumber}`} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{r.rank}</td>
                    <td className="px-4 py-3 text-foreground">{r.supplierName}</td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-mono text-xs">{r.partNumber}</div>
                      {r.partName && <div className="text-xs text-muted-foreground">{r.partName}</div>}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-foreground">{r.riskScore}</td>
                    <td className="px-4 py-3 text-center"><RiskBadge level={r.riskLevel} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.mainSignals.map((s, i) => (
                          <span key={i} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.latestActivity ? new Date(r.latestActivity).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.recommendedAction}</td>
                    <td className="px-4 py-3">
                      <Link href="/quality/oem/quality-intelligence" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                        <EyeIcon className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GaugeIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Supplier Attention</h2>
            </div>
            {data.supplierAttention.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.supplierAttention.length}
              </span>
            )}
          </div>
          {data.supplierAttention.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No suppliers currently require executive attention.</p>
              <p className="text-xs text-muted-foreground mt-1">Suppliers appear here when they have high-risk parts, repeated issues, or escalation signals.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.supplierAttention.map((s) => (
                <div key={s.supplierId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{s.supplierName}</span>
                        <RiskBadge level={s.highestRiskLevel} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.topAffectedParts.slice(0, 3).map((p) => (
                          <span key={p} className="font-mono">{p}</span>
                        )).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`}> · </span>, el], [] as React.ReactNode[])}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.recommendedAction}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {s.activeSignalCount} signal{s.activeSignalCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {s.hrefs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.hrefs.map((link, i) => (
                        <Link key={i} href={link.href} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">SLA & Escalation Attention</h2>
            </div>
            {data.slaEscalationAttention.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.slaEscalationAttention.length}
              </span>
            )}
          </div>
          {data.slaEscalationAttention.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No SLA or escalation attention items found.</p>
              <p className="text-xs text-muted-foreground mt-1">Items appear here when defects or field issues are overdue, escalated, or approaching SLA deadlines.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.slaEscalationAttention.map((item) => (
                <div key={`${item.type}-${item.id}`} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={item.href} className="text-sm font-medium text-foreground hover:underline">
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {item.type === "field_defect" ? "Field Defect" : "Defect/8D"}
                        </span>
                        <SlaStatusBadge status={item.slaStatus} />
                        {item.escalationLevel && item.escalationLevel !== "NONE" && (
                          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${ESCALATION_COLORS[item.escalationLevel as keyof typeof ESCALATION_COLORS]?.bg ?? "bg-muted text-muted-foreground"}`}>
                            {ESCALATION_LABELS[item.escalationLevel as keyof typeof ESCALATION_LABELS] ?? item.escalationLevel}
                          </span>
                        )}
                        {item.severity && (
                          <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {item.severity}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {item.dueDate && (
                        <span className="text-[10px] text-muted-foreground">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheckIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">PPAP / IQC / Field Risk Snapshot</h2>
            </div>
            {data.ppapIqcFieldSignals.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.ppapIqcFieldSignals.length}
              </span>
            )}
          </div>
          {data.ppapIqcFieldSignals.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No cross-module PPAP/IQC/Field signals detected.</p>
              <p className="text-xs text-muted-foreground mt-1">Signals appear when approved PPAPs have related IQC rejections, field defects, or 8D records for the same supplier + part.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.ppapIqcFieldSignals.map((s) => (
                <div key={s.ppapId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={s.href} className="text-sm font-medium text-foreground hover:underline">
                        {s.ppapRequestNumber}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.supplierName} / {s.partNumber}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">{s.issueCount} related issue(s)</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <div className="flex gap-1">
                          {s.issueTypes.map((t) => (
                            <span key={t} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {t.replace(/_/g, " ").toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">Approved PPAP with related issue history</p>
                    </div>
                    <div className="shrink-0">
                      {s.latestIssueDate && (
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(s.latestIssueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlertIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">FMEA Coverage Snapshot</h2>
            </div>
            {data.fmeaCoverageSignals.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {data.fmeaCoverageSignals.length}
              </span>
            )}
          </div>
          {data.fmeaCoverageSignals.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No potential FMEA coverage gaps detected.</p>
              <p className="text-xs text-muted-foreground mt-1">Gaps appear when field defects or defect records have no corresponding FMEA failure mode for the same supplier + part.</p>
            </div>
          ) : (
            <div className="divide-y">
              {data.fmeaCoverageSignals.map((s) => (
                <div key={`${s.sourceType}-${s.sourceId}`} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={s.sourceHref} className="text-sm font-medium text-foreground hover:underline">
                        {s.sourceTitle.length > 80 ? s.sourceTitle.substring(0, 80) + "..." : s.sourceTitle}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                          {s.sourceType === "FIELD_DEFECT" ? "Field Defect" : "Defect/8D"}
                        </span>
                        {s.supplierName && <span className="ml-2">{s.supplierName}</span>}
                        {s.partNumber && <span className="ml-1">/ {s.partNumber}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s.hasRelatedFmea ? (
                          <>
                            <span className="text-amber-500">Potential coverage gap</span>
                            {s.fmeaHref && (
                              <> · <Link href={s.fmeaHref} className="text-emerald-500 hover:underline">View FMEA</Link></>
                            )}
                          </>
                        ) : (
                          <span className="text-red-500">No FMEA exists</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">Potential coverage gap</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RepeatIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Repeat Issue Summary</h2>
          </div>
          {data.repeatIssueSummary.totalClusters > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {data.repeatIssueSummary.totalClusters} cluster{data.repeatIssueSummary.totalClusters !== 1 ? "s" : ""} · {data.repeatIssueSummary.totalRecords} record{data.repeatIssueSummary.totalRecords !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {data.repeatIssueSummary.totalClusters === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">No repeat issue clusters detected.</p>
            <p className="text-xs text-muted-foreground mt-1">Clusters appear when 2 or more quality records share the same supplier + part number across modules.</p>
          </div>
        ) : (
          <div className="divide-y">
            {data.repeatIssueSummary.clusters.map((c) => (
              <div key={`${c.supplierId}-${c.partNumber}`} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {c.supplierName} / <span className="font-mono">{c.partNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {c.fieldDefectCount > 0 && (
                        <span className="inline-flex items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500">
                          {c.fieldDefectCount} field defect{c.fieldDefectCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {c.defect8dCount > 0 && (
                        <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {c.defect8dCount} defect/8D
                        </span>
                      )}
                      {c.iqcCount > 0 && (
                        <span className="inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">
                          {c.iqcCount} IQC issue{c.iqcCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">Total: {c.totalCount}</span>
                    </div>
                  </div>
                </div>
                {c.hrefs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.hrefs.map((link, i) => (
                      <Link key={i} href={link.href} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {data.kpis.criticalHighFieldIssues === 0 && data.kpis.openDefects8d === 0 && data.kpis.overdueActions === 0 && data.kpis.highRiskSupplierParts === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <CheckCircleIcon className="h-10 w-10 text-emerald-500/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">All Clear</h3>
          <p className="text-sm text-muted-foreground mt-1">No critical quality risks, overdue actions, or high-risk supplier-part combinations detected at this time. The cockpit will update as new signals emerge.</p>
        </div>
      )}
    </div>
  )
}