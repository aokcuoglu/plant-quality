import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeftIcon,
  AwardIcon,
  ShieldAlertIcon,
  BugIcon,
  FileCheckIcon,
  ClipboardCheckIcon,
  TrendingUpIcon,
  ClockIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  TargetIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { requireFeature, normalizePlan, canUseFeature } from "@/lib/billing"
import { getSupplierScorecardDetail } from "@/lib/supplier-scorecard"
import { GRADE_CONFIG, RISK_LEVEL_CONFIG, PENALTY_CONFIG } from "@/lib/supplier-scorecard/scoring"

function GradeBadge({ grade }: { grade: string }) {
  const config = GRADE_CONFIG[grade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.E
  return (
    <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${config.className}`}>
      Grade {grade}
    </span>
  )
}

function RiskBadge({ level }: { level: string }) {
  const config = RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG] ?? RISK_LEVEL_CONFIG.low
  return (
    <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${config.className}`}>
      {config.label} Risk
    </span>
  )
}

function PenaltyRow({ label, count, penalty, cap, perItem }: { label: string; count: number; penalty: number; cap: number; perItem?: number }) {
  const isZero = penalty <= 0
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{label}</span>
        {count > 0 && <span className="text-xs text-muted-foreground">({count} item{count !== 1 ? "s" : ""})</span>}
      </div>
      <div className="flex items-center gap-3">
        {count > 0 && perItem && (
          <span className="text-xs text-muted-foreground">{perItem} ea, cap {cap}</span>
        )}
        <span className={`text-sm font-semibold tabular-nums ${isZero ? "text-muted-foreground" : "text-destructive"}`}>
          {isZero ? "0" : `-${penalty}`}
        </span>
      </div>
    </div>
  )
}

function SignalBadge({ signal }: { signal: { label: string; count: number; severity: string } }) {
  const severityColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    low: "bg-muted text-muted-foreground border-border",
  }
  const className = severityColors[signal.severity] ?? severityColors.low
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider ${className}`}>
      {signal.label} ({signal.count})
    </span>
  )
}

function MetricCard({ label, value, icon: Icon, href }: { label: string; value: number; icon: React.ElementType; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div>
        <div className="text-lg font-bold tabular-nums text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
  if (href && value > 0) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

export default async function SupplierScorecardDetailPage({ params }: { params: Promise<{ supplierId: string }> }) {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  const featureGate = requireFeature(session, "SUPPLIER_SCORECARD")
  if (!featureGate.allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Supplier Scorecard" description="Supplier quality performance scoring" />
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <AwardIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Enterprise Feature</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Enterprise to access Supplier Scorecard details.
          </p>
          <Link href="/oem/settings/plan" className="mt-4 inline-block">
            <Button><AwardIcon className="mr-1.5 h-4 w-4" />Upgrade to Enterprise</Button>
          </Link>
        </div>
      </div>
    )
  }

  const { supplierId } = await params
  if (!supplierId) notFound()

  const supplier = await getSupplierScorecardDetail(session, supplierId)
  if (!supplier) notFound()

  const safeScore = Math.max(0, Math.min(100, Number.isFinite(supplier.overallScore) ? supplier.overallScore : 0))
  let barColor = "bg-emerald-500"
  if (safeScore < 40) barColor = "bg-red-500"
  else if (safeScore < 60) barColor = "bg-orange-500"
  else if (safeScore < 80) barColor = "bg-amber-500"

  const bd = supplier.penaltyBreakdown
  const totalPenalty = 100 - safeScore

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/quality/oem/scorecard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <PageHeader
          title={supplier.supplierName}
          description="Supplier quality scorecard detail"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Score Summary</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl font-bold tabular-nums text-foreground">{safeScore}<span className="text-sm font-normal text-muted-foreground">/100</span></div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-muted">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${safeScore}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <GradeBadge grade={supplier.grade} />
              <RiskBadge level={supplier.riskLevel} />
            </div>
            <p className="text-sm text-muted-foreground">{supplier.recommendedAction}</p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-2">Penalty Breakdown</h2>
            <p className="text-xs text-muted-foreground mb-3">Starts at 100. Penalties are subtracted per category, each capped. Total penalty: -{totalPenalty}</p>
            <PenaltyRow label="Critical/Major Field Defects" count={bd.fieldDefectHighCritical.count} penalty={bd.fieldDefectHighCritical.penalty} cap={PENALTY_CONFIG.FIELD_DEFECT_HIGH_CRITICAL.cap} perItem={PENALTY_CONFIG.FIELD_DEFECT_HIGH_CRITICAL.perItem} />
            <PenaltyRow label="Repeat Issue Clusters" count={bd.repeatIssueCluster.count} penalty={bd.repeatIssueCluster.penalty} cap={PENALTY_CONFIG.REPEAT_ISSUE_CLUSTER.cap} perItem={PENALTY_CONFIG.REPEAT_ISSUE_CLUSTER.perItem} />
            <PenaltyRow label="IQC Rejected/On-Hold" count={bd.iqcRejected.count} penalty={bd.iqcRejected.penalty} cap={PENALTY_CONFIG.IQC_REJECTED.cap} perItem={PENALTY_CONFIG.IQC_REJECTED.perItem} />
            <PenaltyRow label="Open/Overdue 8D" count={bd.openOverdue8d.count} penalty={bd.openOverdue8d.penalty} cap={PENALTY_CONFIG.OPEN_OVERDUE_8D.cap} perItem={PENALTY_CONFIG.OPEN_OVERDUE_8D.perItem} />
            <PenaltyRow label="SLA Breach/Escalation" count={bd.slaBreach.count} penalty={bd.slaBreach.penalty} cap={PENALTY_CONFIG.SLA_BREACH.cap} perItem={PENALTY_CONFIG.SLA_BREACH.perItem} />
            <PenaltyRow label="PPAP with Issues" count={bd.ppapApprovedWithIssues.count} penalty={bd.ppapApprovedWithIssues.penalty} cap={PENALTY_CONFIG.PPAP_APPROVED_WITH_ISSUES.cap} perItem={PENALTY_CONFIG.PPAP_APPROVED_WITH_ISSUES.perItem} />
            <PenaltyRow label="FMEA Coverage Gaps" count={bd.fmeaCoverageGap.count} penalty={bd.fmeaCoverageGap.penalty} cap={PENALTY_CONFIG.FMEA_COVERAGE_GAP.cap} perItem={PENALTY_CONFIG.FMEA_COVERAGE_GAP.perItem} />
            <PenaltyRow label="Executive Risk Signals" count={bd.executiveRiskSignal.count} penalty={bd.executiveRiskSignal.penalty} cap={PENALTY_CONFIG.EXECUTIVE_RISK_SIGNAL.cap} perItem={PENALTY_CONFIG.EXECUTIVE_RISK_SIGNAL.perItem} />
            <div className="flex items-center justify-between py-2.5 font-semibold text-foreground">
              <span>Total Penalty</span>
              <span className="tabular-nums text-destructive">-{totalPenalty}</span>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Key Signals</h2>
            {supplier.keySignals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {supplier.keySignals.map((signal, idx) => (
                  <SignalBadge key={`${signal.label}-${idx}`} signal={signal} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active signals detected — this supplier has no current quality issues requiring attention.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Module Breakdown</h2>
            <div className="grid gap-2">
              <MetricCard label="Field Defects" value={supplier.fieldDefectsCount} icon={AlertTriangleIcon} href={`/quality/oem/field?supplierId=${encodeURIComponent(supplier.supplierId)}`} />
              <MetricCard label="Defects / 8D" value={supplier.defects8dCount} icon={BugIcon} href={`/quality/oem/defects?supplierId=${encodeURIComponent(supplier.supplierId)}`} />
              <MetricCard label="Overdue 8D / SLA" value={supplier.overdue8dCount} icon={ClockIcon} href="/quality/oem/escalations" />
              <MetricCard label="IQC Rejected" value={supplier.iqcRejectedCount} icon={ClipboardCheckIcon} href={`/quality/oem/iqc?supplierId=${encodeURIComponent(supplier.supplierId)}`} />
              <MetricCard label="PPAP with Issues" value={supplier.ppapApprovedWithIssuesCount} icon={FileCheckIcon} href={`/quality/oem/ppap?supplierId=${encodeURIComponent(supplier.supplierId)}`} />
              <MetricCard label="FMEA Gaps" value={supplier.fmeaCoverageGapCount} icon={ShieldAlertIcon} href={`/quality/oem/fmea?supplierId=${encodeURIComponent(supplier.supplierId)}`} />
              <MetricCard label="Escalations" value={supplier.escalationCount} icon={TrendingUpIcon} href="/quality/oem/escalations" />
              <MetricCard label="Repeat Clusters" value={supplier.repeatIssuesCount} icon={BarChart3Icon} href="/quality/oem/quality-intelligence" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Drill-Down Links</h2>
            {supplier.drillDownLinks.length > 0 ? (
              <div className="space-y-1.5">
                {supplier.drillDownLinks.map((link, idx) => (
                  <Link key={`${link.href}-${idx}`} href={link.href} className="flex items-center gap-2 text-sm text-foreground hover:text-emerald-500 transition-colors py-1">
                    <ArrowLeftIcon className="h-3 w-3 rotate-180" />
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No drill-down links available.</p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Latest Activity</h2>
            {supplier.latestActivityAt ? (
              <p className="text-sm text-muted-foreground">{new Date(supplier.latestActivityAt).toLocaleDateString()}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Development Plan</h2>
            <p className="text-sm text-muted-foreground mb-3">Create a supplier development action plan to address quality issues.</p>
            {canUseFeature(normalizePlan(session.user.plan), session.user.companyType, "SUPPLIER_DEVELOPMENT") ? (
              <Link href={`/quality/oem/supplier-development/new?supplierId=${encodeURIComponent(supplier.supplierId)}&sourceType=SCORECARD`} className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-emerald-500 transition-colors">
                <TargetIcon className="h-4 w-4" />
                Create Development Plan
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">Upgrade to Enterprise to create development plans.</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">All scores are deterministic and derived from workflow data. No AI-generated content.</p>
    </div>
  )
}