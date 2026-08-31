import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSupplierSelfScorecard } from "@/lib/supplier-scorecard/get-supplier-scorecards"
import { PageHeader } from "@/components/layout/PageHeader"
import { TrendingUp, AlertTriangle, Clock, Activity } from "lucide-react"

export default async function SupplierScorecardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  if (session.user.companyType !== "SUPPLIER") redirect("/quality/supplier")

  const scorecard = await getSupplierSelfScorecard({ user: session.user })

  if (!scorecard) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-muted-foreground/50 mb-3">
          <TrendingUp className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-sm text-muted-foreground">No quality data available yet</p>
      </div>
    )
  }

  const gradeColors: Record<string, string> = {
    A: "bg-muted text-muted-foreground border-border",
    B: "bg-muted text-muted-foreground border-border",
    C: "bg-destructive/10 text-destructive border-destructive/20",
    D: "bg-destructive/10 text-destructive border-destructive/20",
    E: "bg-destructive/10 text-destructive border-destructive/20",
  }

  const riskColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground border-border",
    medium: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-destructive/10 text-destructive border-destructive/20",
    critical: "bg-destructive/10 text-destructive border-destructive/20",
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Scorecard"
        description="Your quality performance across all OEMs"
      />

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground">{scorecard.overallScore}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Grade</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`rounded border px-2 py-0.5 text-sm font-bold ${gradeColors[scorecard.grade] ?? "bg-muted text-muted-foreground border-border"}`}>
              {scorecard.grade}
            </span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`rounded border px-2 py-0.5 text-xs font-medium capitalize ${riskColors[scorecard.riskLevel] ?? "bg-muted text-muted-foreground border-border"}`}>
              {scorecard.riskLevel}
            </span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open Issues</span>
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground">{scorecard.openIssuesCount}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-lg font-semibold text-foreground mb-4">Penalty Breakdown</h2>
            <div className="space-y-3">
              {[
                { label: "Critical/Major Field Defects", ...scorecard.penaltyBreakdown.fieldDefectHighCritical },
                { label: "Repeat Issue Clusters", ...scorecard.penaltyBreakdown.repeatIssueCluster },
                { label: "IQC Rejected/On-Hold", ...scorecard.penaltyBreakdown.iqcRejected },
                { label: "Open/Overdue 8D", ...scorecard.penaltyBreakdown.openOverdue8d },
                { label: "SLA Breaches", ...scorecard.penaltyBreakdown.slaBreach },
                { label: "PPAP with Issues", ...scorecard.penaltyBreakdown.ppapApprovedWithIssues },
                { label: "FMEA Coverage Gaps", ...scorecard.penaltyBreakdown.fmeaCoverageGap },
                { label: "Executive Risk Signals", ...scorecard.penaltyBreakdown.executiveRiskSignal },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{item.count} items</span>
                    <span className={item.penalty > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                      -{item.penalty} / -{item.cap} max
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total Penalty</span>
                <span className="text-sm font-medium text-foreground">
                  {100 - scorecard.overallScore} pts
                </span>
              </div>
            </div>
          </div>

          {scorecard.keySignals.length > 0 && (
            <div className="rounded-lg border bg-card p-5">
              <h2 className="text-lg font-semibold text-foreground mb-3">Key Signals</h2>
              <div className="flex flex-wrap gap-2">
                {scorecard.keySignals.map((signal) => (
                  <span
                    key={signal.label}
                    className={`rounded border px-2 py-1 text-xs font-medium ${riskColors[signal.severity] ?? "bg-muted text-muted-foreground border-border"}`}
                  >
                    {signal.label} ({signal.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground mb-2">Recommendation</h2>
            <p className="text-sm text-muted-foreground">{scorecard.recommendedAction}</p>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <h2 className="text-sm font-medium text-foreground mb-3">Summary</h2>
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted-foreground">Field Defects</dt>
                <dd className="text-sm font-medium text-foreground">{scorecard.fieldDefectsCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted-foreground">Defects / 8D</dt>
                <dd className="text-sm font-medium text-foreground">{scorecard.defects8dCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted-foreground">IQC Rejected</dt>
                <dd className="text-sm font-medium text-foreground">{scorecard.iqcRejectedCount}</dd>
              </div>
              {scorecard.latestActivityAt && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <dt className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Latest Activity
                  </dt>
                  <dd className="text-xs text-foreground">
                    {scorecard.latestActivityAt.toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
