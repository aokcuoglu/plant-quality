import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  BugIcon,
  AlertTriangleIcon,
  ClockIcon,
  GaugeIcon,
  SparklesIcon,
  PlusCircleIcon,
  ShieldAlertIcon,
  FileCheckIcon,
  ClipboardCheckIcon,
  TrendingUpIcon,
  BarChart3Icon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { Button } from "@/components/ui/button"
import { getIntelligenceData } from "@/app/(dashboard)/quality/intelligence-actions"
import { RISK_LEVEL_CONFIG } from "@/lib/quality-intelligence"
import { requireFeature } from "@/lib/billing"

function RankingTable({
  title,
  items,
  hrefPrefix,
  emptyMessage,
}: {
  title: string
  items: { name: string; count: number }[]
  hrefPrefix?: string
  emptyMessage: string
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y">
          {items.map((item, i) => (
            <div key={`${item.name}-${i}`} className="flex items-center justify-between px-4 py-2.5">
              {hrefPrefix ? (
                <Link href={`${hrefPrefix}${encodeURIComponent(item.name)}`} className="text-sm text-foreground hover:underline truncate max-w-[calc(100%-3rem)]">
                  {item.name}
                </Link>
              ) : (
                <span className="text-sm text-foreground truncate max-w-[calc(100%-3rem)]">{item.name}</span>
              )}
              <span className="text-sm font-medium text-muted-foreground ml-4 shrink-0">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
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

function RiskTable({ signals }: { signals: { supplierId: string; supplierName: string; partNumber: string; partName: string | null; riskScore: number; riskLevel: string; signalCount: number; contributors: { signal: string; points: number; description: string }[]; latestActivity: Date | null; href?: string }[] }) {
  if (signals.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <TrendingUpIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No supplier + part combinations with risk signals detected.</p>
        <p className="text-xs text-muted-foreground mt-1">Risk signals appear when quality issues (IQC rejections, field defects, defect/8D records, FMEA gaps, etc.) are detected across modules for the same supplier + part.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Supplier</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Part Number</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Score</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Level</th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">Signals</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Contributing Factors</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {signals.map((s) => (
              <tr key={`${s.supplierId}-${s.partNumber}`} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-foreground">{s.supplierName}</td>
                <td className="px-4 py-3">
                  <div className="text-foreground font-mono text-xs">{s.partNumber}</div>
                  {s.partName && <div className="text-xs text-muted-foreground">{s.partName}</div>}
                </td>
                <td className="px-4 py-3 text-center font-bold text-foreground">{s.riskScore}</td>
                <td className="px-4 py-3 text-center"><RiskBadge level={s.riskLevel} /></td>
                <td className="px-4 py-3 text-center text-muted-foreground">{s.signalCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.contributors.slice(0, 3).map((c, i) => (
                      <span key={i} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {c.signal.replace(/_/g, " ").toLowerCase()} (+{c.points})
                      </span>
                    ))}
                    {s.contributors.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{s.contributors.length - 3} more</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SignalPanel({
  title,
  icon: Icon,
  count,
  children,
  emptyMessage,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count: number
  children: React.ReactNode
  emptyMessage: string
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {count > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export default async function QualityIntelligencePage() {
  const session = await auth()
  if (!session?.user?.companyId || session.user.companyType !== "OEM") redirect("/login")

  const featureGate = requireFeature(session, "QUALITY_INTELLIGENCE")
  if (!featureGate.allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Quality Intelligence" description="Risk signals, supplier analysis, and cross-module quality insights" />
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <BarChart3Icon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Quality Intelligence</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Pro to unlock Quality Intelligence analytics, risk signals, and cross-module insights.
          </p>
          <Link href="/settings/plan" className="mt-4 inline-block">
            <Button>
              <BarChart3Icon className="mr-1.5 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const data = await getIntelligenceData()

  if (!data) redirect("/login")

  const { isEnterprise } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Intelligence"
        description="Risk signals, supplier analysis, and cross-module quality insights"
      />

      <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardCard
          title="Total Field Defects"
          value={data.totalDefects}
          icon={BugIcon}
          subtitle="All reported defects"
          href="/quality/oem/field"
        />
        <DashboardCard
          title="Open Field Defects"
          value={data.openDefects}
          icon={AlertTriangleIcon}
          subtitle="Active defects"
          href="/quality/oem/field?filter=active"
        />
        <DashboardCard
          title="Overdue Field Defects"
          value={data.overdueDefects}
          icon={ClockIcon}
          subtitle="Past SLA deadline"
          href="/quality/oem/field?filter=overdue"
        />
        <DashboardCard
          title="Critical Field Defects"
          value={data.criticalDefects}
          icon={GaugeIcon}
          subtitle="Critical severity"
          href="/quality/oem/field?filter=critical"
        />
      </div>

      {data.aiAcceptanceRate !== null ? (
        <DashboardCard
          title="AI Suggestion Acceptance Rate"
          value={`${data.aiAcceptanceRate}%`}
          icon={SparklesIcon}
          subtitle={`${data.acceptedClassificationSuggestions} of ${data.totalClassificationSuggestions} classification suggestions accepted`}
        />
      ) : data.totalDefects > 0 ? (
        <DashboardCard
          title="AI Suggestion Acceptance Rate"
          value="—"
          icon={SparklesIcon}
          subtitle="No classification suggestions generated yet"
        />
      ) : null}

      {isEnterprise && data.intelligenceSummary && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-foreground pt-2">Risk Intelligence</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Deterministic risk scoring based on cross-module quality signals. No AI or LLM is used — every score is explainable from its contributing factors.</p>
          </div>
          <div className="grid gap-4 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <DashboardCard
              title="High Risk"
              value={data.intelligenceSummary.highRiskCount}
              icon={AlertTriangleIcon}
              subtitle="Supplier + part combos"
            />
            <DashboardCard
              title="Critical Risk"
              value={data.intelligenceSummary.criticalRiskCount}
              icon={GaugeIcon}
              subtitle="Requires immediate attention"
            />
            <DashboardCard
              title="PPAP Issues"
              value={data.intelligenceSummary.ppapIssueCount}
              icon={FileCheckIcon}
              subtitle="Approved PPAPs with issues"
              href="/quality/oem/quality-intelligence#ppap-issues"
            />
            <DashboardCard
              title="FMEA Gaps"
              value={data.intelligenceSummary.fmeaCoverageGapCount}
              icon={ShieldAlertIcon}
              subtitle="Coverage gaps detected"
              href="/quality/oem/quality-intelligence#fmea-gaps"
            />
            <DashboardCard
              title="IQC Rejections"
              value={data.intelligenceSummary.iqcRejectionSignalCount}
              icon={ClipboardCheckIcon}
              subtitle="Supplier + part groups"
              href="/quality/oem/quality-intelligence#iqc-rejections"
            />
          </div>

          {data.riskSignals.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Supplier + Part Risk Table</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Sorted by risk score. Each score is the sum of contributing signal points, capped at 150.</p>
              </div>
              <RiskTable signals={data.riskSignals} />
            </>
          )}

          <div id="ppap-issues" className="scroll-mt-20">
            <SignalPanel
              title="PPAP Approved with Issue History"
              icon={FileCheckIcon}
              count={data.ppapIssueSignals.length}
              emptyMessage="No PPAP records with post-approval quality issues detected. Signals appear when IQC rejections, field defects, or defect/8D records occur after PPAP approval for the same supplier + part."
            >
              <div className="divide-y">
                {data.ppapIssueSignals.map((s) => (
                  <div key={s.ppapId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link href={s.href} className="text-sm font-medium text-foreground hover:underline">
                          {s.ppapRequestNumber}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.supplierName} / {s.partNumber}
                          {s.partName && <span className="ml-1">— {s.partName}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground">{s.issueCount} issue(s)</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <div className="flex gap-1">
                            {s.issueTypes.map((t) => (
                              <span key={t} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {t.replace(/_/g, " ").toLowerCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {s.latestIssueDate && (
                          <span className="text-[10px] text-muted-foreground">
                            Latest: {s.latestIssueDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SignalPanel>
          </div>

          <div id="fmea-gaps" className="scroll-mt-20">
            <SignalPanel
              title="FMEA Coverage Gaps"
              icon={ShieldAlertIcon}
              count={data.fmeaGapSignals.length}
              emptyMessage="No FMEA coverage gaps detected. All field defects and defects with meaningful failure text have matching FMEA failure modes for the same supplier + part."
            >
              <div className="divide-y">
                {data.fmeaGapSignals.map((s) => (
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
                              <span className="text-amber-500">Partial coverage</span>
                              {s.fmeaHref && (
                                <> · <Link href={s.fmeaHref} className="text-emerald-500 hover:underline">View FMEA</Link></>
                              )}
                            </>
                          ) : (
                            <span className="text-red-500">No FMEA exists</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.gapReason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SignalPanel>
          </div>

          <div id="iqc-rejections" className="scroll-mt-20">
            <SignalPanel
              title="IQC Rejection History"
              icon={ClipboardCheckIcon}
              count={data.iqcRejectionSignals.length}
              emptyMessage="No IQC rejection patterns detected. Signals appear when inspections result in Rejected, On Hold, Rework Required, or Sorting Required for a supplier + part."
            >
              <div className="divide-y">
                {data.iqcRejectionSignals.map((s) => (
                  <div key={`${s.supplierId}-${s.partNumber}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {s.supplierName} / {s.partNumber}
                        </div>
                        {s.partName && <div className="text-xs text-muted-foreground">{s.partName}</div>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">
                            {s.rejectionCount} rejection{s.rejectionCount !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Latest: {s.latestResult.replace(/_/g, " ").toLowerCase()}
                          </span>
                          {s.hasLinked8d && (
                            <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              Linked 8D
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {s.latestInspectionDate && (
                          <span className="text-[10px] text-muted-foreground">
                            {s.latestInspectionDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {s.inspections.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.inspections.slice(0, 3).map((i) => (
                          <Link key={i.id} href={i.href} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent">
                            {i.inspectionNumber}
                          </Link>
                        ))}
                        {s.inspections.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">+{s.inspections.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SignalPanel>
          </div>

          <div id="repeat-issues" className="scroll-mt-20">
            <SignalPanel
              title="Repeat Issue Clusters"
              icon={TrendingUpIcon}
              count={data.repeatIssueSignals.length}
              emptyMessage="No repeat issue clusters detected. Clusters appear when 2 or more quality records (field defects, defects/8D, or IQC issues) share the same supplier + part number."
            >
              <div className="divide-y">
                {data.repeatIssueSignals.map((s) => (
                  <div key={`${s.supplierId}-${s.partNumber}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {s.supplierName} / {s.partNumber}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {s.fieldDefectCount > 0 && (
                            <span className="inline-flex items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-500">
                              {s.fieldDefectCount} field defect{s.fieldDefectCount !== 1 ? "s" : ""}
                            </span>
                          )}
                          {s.defect8dCount > 0 && (
                            <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {s.defect8dCount} defect/8D
                            </span>
                          )}
                          {s.iqcIssueCount > 0 && (
                            <span className="inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">
                              {s.iqcIssueCount} IQC issue{s.iqcIssueCount !== 1 ? "s" : ""}
                            </span>
                          )}
                          {s.linkedByManualLink && (
                            <span className="inline-flex items-center rounded-md border border-foreground/20 bg-foreground/10 px-1.5 py-0.5 text-[10px] text-foreground">
                              Manual link
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">Total: {s.totalCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.fieldDefects.slice(0, 2).map((fd) => (
                        <Link key={fd.id} href={fd.href} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent">
                          {fd.title.length > 40 ? fd.title.substring(0, 40) + "..." : fd.title}
                        </Link>
                      ))}
                      {s.defects8d.slice(0, 2).map((d) => (
                        <Link key={d.id} href={d.href} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent">
                          {d.description.length > 40 ? d.description.substring(0, 40) + "..." : d.description}
                        </Link>
                      ))}
                      {s.iqcInspections.slice(0, 2).map((i) => (
                        <Link key={i.id} href={i.href} className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent">
                          {i.inspectionNumber}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SignalPanel>
          </div>
        </>
      )}

      {!isEnterprise && (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <TrendingUpIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Risk Intelligence</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to Enterprise to unlock risk signals, supplier + part risk scoring, PPAP post-approval issue detection, FMEA coverage gap analysis, IQC rejection patterns, and repeat issue clusters.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Risk scoring is deterministic and explainable — no AI or LLM is used. Every score breaks down into contributing factor points.
          </p>
          <Link href="/settings/plan" className="mt-4 inline-block">
            <Button>
              <TrendingUpIcon className="mr-1.5 h-4 w-4" />
              Upgrade to Enterprise
            </Button>
          </Link>
        </div>
      )}

      {data.totalDefects === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <BugIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No field defects yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create your first field defect to see quality intelligence analytics.</p>
          <Link href="/quality/oem/field/new" className="mt-4 inline-block">
            <Button>
              <PlusCircleIcon className="mr-1.5 h-4 w-4" />
              Create First Field Defect
            </Button>
          </Link>
        </div>
      )}

      {data.totalDefects > 0 && (
        <h2 className="text-lg font-semibold text-foreground pt-2">Top Categories & Subcategories</h2>
      )}
      {data.totalDefects > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <RankingTable
            title="Top Categories"
            items={data.topCategories}
            hrefPrefix="/quality/oem/field?filter=cat:"
            emptyMessage="No categories assigned yet"
          />
          <RankingTable
            title="Top Subcategories"
            items={data.topSubcategories}
            hrefPrefix="/quality/oem/field?filter=subcat:"
            emptyMessage="No subcategories assigned yet"
          />
        </div>
      )}

      {data.totalDefects > 0 && (
        <h2 className="text-lg font-semibold text-foreground pt-2">Affected Vehicles, Suppliers & Parts</h2>
      )}

      {data.totalDefects > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <RankingTable
            title="Top Vehicle Models"
            items={data.topVehicleModels}
            emptyMessage="No vehicle data yet"
          />
          <RankingTable
            title="Top Suppliers"
            items={data.topSuppliers.map((s) => ({ name: s.name, count: s.count }))}
            emptyMessage="No supplier data yet"
          />
          <RankingTable
            title="Top Recurring Part Numbers"
            items={data.topPartNumbers}
            emptyMessage="No part number data yet"
          />
        </div>
      )}
    </div>
  )
}