import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  AwardIcon,
  UsersIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  ClockIcon,
  ArrowRightIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { Button } from "@/components/ui/button"
import { requireFeature } from "@/lib/billing"
import { getSupplierScorecards } from "@/lib/supplier-scorecard"
import { GRADE_CONFIG, RISK_LEVEL_CONFIG } from "@/lib/supplier-scorecard/scoring"
import type { SupplierScorecard } from "@/lib/supplier-scorecard/types"

function GradeBadge({ grade }: { grade: string }) {
  const config = GRADE_CONFIG[grade as keyof typeof GRADE_CONFIG] ?? GRADE_CONFIG.E
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${config.className}`}>
      {grade}
    </span>
  )
}

function RiskBadge({ level }: { level: string }) {
  const config = RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG] ?? RISK_LEVEL_CONFIG.low
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${config.className}`}>
      {config.label}
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0))
  let barColor = "bg-emerald-500"
  if (safeScore < 40) barColor = "bg-red-500"
  else if (safeScore < 60) barColor = "bg-orange-500"
  else if (safeScore < 80) barColor = "bg-amber-500"

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${safeScore}%` }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-8 text-right text-foreground">{safeScore}</span>
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

export default async function SupplierScorecardPage() {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  const featureGate = requireFeature(session, "SUPPLIER_SCORECARD")
  if (!featureGate.allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Supplier Scorecard" description="Supplier quality performance scoring" />
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <AwardIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Supplier Quality Scorecard</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Enterprise to unlock the Supplier Quality Scorecard with supplier grading, risk assessment, and module-level signal breakdowns.
          </p>
          <Link href="/settings/plan" className="mt-4 inline-block">
            <Button>
              <AwardIcon className="mr-1.5 h-4 w-4" />
              Upgrade to Enterprise
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const data = await getSupplierScorecards(session)
  if (!data) redirect("/login")

  if (data.suppliers.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Supplier Scorecard" description="Supplier quality performance scoring and risk grading" />
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <AwardIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No supplier quality data available yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Scorecards will appear once suppliers have quality records associated with your company.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Scorecard"
        description="Deterministic supplier quality scoring across field defects, 8D, IQC, PPAP, FMEA, and SLA signals"
      />

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-4">
        <DashboardCard
          title="Suppliers Monitored"
          value={data.suppliersMonitored}
          icon={UsersIcon}
          subtitle="Active quality records"
        />
        <DashboardCard
          title="High / Critical Risk"
          value={data.highCriticalRiskCount}
          icon={AlertTriangleIcon}
          subtitle="Requires review"
        />
        <DashboardCard
          title="Average Score"
          value={data.averageScore}
          icon={TrendingUpIcon}
          subtitle="Across all suppliers"
        />
        <DashboardCard
          title="Overdue Actions"
          value={data.overdueActionsCount}
          icon={ClockIcon}
          subtitle="Past SLA deadline"
          href="/quality/oem/escalations"
        />
      </div>

      <p className="text-xs text-muted-foreground">Scores are deterministic, derived from your workflow data. No AI-generated content. Penalties are capped per category.</p>

      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Supplier Rankings</h2>
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {data.suppliers.length} suppliers
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-center">Grade</th>
                <th className="px-4 py-3 text-center">Risk</th>
                <th className="px-4 py-3 text-left">Top Signals</th>
                <th className="px-4 py-3 text-left">Recommendation</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.suppliers.map((supplier) => (
                <SupplierRow key={supplier.supplierId} supplier={supplier} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SupplierRow({ supplier }: { supplier: SupplierScorecard }) {
  const detailHref = `/quality/oem/scorecard/${supplier.supplierId}`

  return (
    <tr className="group hover:bg-muted/50">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground truncate max-w-[200px]">{supplier.supplierName}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {supplier.openIssuesCount} open issue{supplier.openIssuesCount !== 1 ? "s" : ""}
        </div>
      </td>
      <td className="px-4 py-3 min-w-[140px]">
        <ScoreBar score={supplier.overallScore} />
      </td>
      <td className="px-4 py-3 text-center">
        <GradeBadge grade={supplier.grade} />
      </td>
      <td className="px-4 py-3 text-center">
        <RiskBadge level={supplier.riskLevel} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {supplier.keySignals.length > 0 ? (
            supplier.keySignals.slice(0, 3).map((signal, idx) => (
              <SignalBadge key={`${signal.label}-${idx}`} signal={signal} />
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No signals</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">{supplier.recommendedAction}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <Link href={detailHref} className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-emerald-500 transition-colors">
          Detail <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  )
}