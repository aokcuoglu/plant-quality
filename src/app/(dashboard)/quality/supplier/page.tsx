import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import {
  BugIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TimerIcon,
  FileCheckIcon,
  CalendarDaysIcon,
  GaugeIcon,
  FileTextIcon,
  ClipboardCheckIcon,
  ShieldAlertIcon,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { StatusDonut } from "@/components/dashboard/StatusDonut"
import { TrendArea } from "@/components/dashboard/TrendArea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CustomerBar } from "@/components/dashboard/CustomerBar"
import { addCalendarDays, getActiveDueDate, isDefectOverdue } from "@/lib/sla"
import { hasRequiredSubmissionEvidence } from "@/lib/evidence"
import type { EightDSection } from "@/generated/prisma/client"

function getEvidenceReady(evidences: { section: EightDSection }[]) {
  const counts = evidences.reduce<Partial<Record<EightDSection, number>>>((acc, item) => {
    acc[item.section] = (acc[item.section] ?? 0) + 1
    return acc
  }, {})
  return hasRequiredSubmissionEvidence(counts)
}

export default async function SupplierDashboardPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "SUPPLIER") redirect("/login")

  const defectCounts = await prisma.defect.groupBy({
    by: ["status"],
    where: { supplierId: session.user.companyId },
    _count: true,
  })

  const totalDefects = defectCounts.reduce((sum, d) => sum + d._count, 0)
  const openDefects = defectCounts.find((d) => d.status === "OPEN")?._count ?? 0
  const inProgress = defectCounts.find((d) => d.status === "IN_PROGRESS" || d.status === "REJECTED")?._count ?? 0
  const waitingApproval = defectCounts.find((d) => d.status === "WAITING_APPROVAL")?._count ?? 0
  const resolved = defectCounts.find((d) => d.status === "RESOLVED")?._count ?? 0
  const operationalDefects = await prisma.defect.findMany({
    where: { supplierId: session.user.companyId, status: { not: "RESOLVED" } },
    select: {
      status: true,
      currentActionOwner: true,
      supplierAssigneeId: true,
      supplierResponseDueAt: true,
      eightDSubmissionDueAt: true,
      oemReviewDueAt: true,
      revisionDueAt: true,
      evidences: { where: { deletedAt: null }, select: { section: true } },
    },
  })
  const today = new Date()
  const weekEnd = addCalendarDays(today, 7)
  const overdueAssigned = operationalDefects.filter((d) => d.supplierAssigneeId === session.user.id && isDefectOverdue(d)).length
  const dueThisWeek = operationalDefects.filter((d) => {
    const dueDate = getActiveDueDate(d)
    return dueDate && dueDate >= today && dueDate <= weekEnd
  }).length
  const missingEvidence = operationalDefects.filter((d) => !getEvidenceReady(d.evidences)).length
  const evidenceReady = operationalDefects.filter((d) => getEvidenceReady(d.evidences)).length

  const slaActive = operationalDefects.filter((d) => getActiveDueDate(d) !== null).length
  const totalOperational = operationalDefects.length
  const slaBreachRate = totalOperational > 0 ? Math.round((overdueAssigned / totalOperational) * 100) : 0

  const resolvedDefects = await prisma.defect.findMany({
    where: {
      supplierId: session.user.companyId,
      status: "RESOLVED",
    },
    select: { createdAt: true, resolvedAt: true },
  })

  let avgResolutionDays: number | null = null
  const validDurations = resolvedDefects
    .map((d) => {
      const end = d.resolvedAt ?? new Date()
      return (end.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    })
    .filter((days) => days >= 0)
  if (validDurations.length > 0) {
    avgResolutionDays = Math.round((validDurations.reduce((a, b) => a + b, 0) / validDurations.length) * 10) / 10
  }

  const topCustomers = await prisma.defect.groupBy({
    by: ["oemId"],
    where: { supplierId: session.user.companyId },
    _count: true,
    orderBy: { _count: { oemId: "desc" } },
    take: 5,
  })

  const customerIds = topCustomers.map((s) => s.oemId)
  const customers = await prisma.company.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true },
  })
  const customerMap = new Map(customers.map((s) => [s.id, s.name]))

  const customerChartData = topCustomers.map((s) => ({
    name: customerMap.get(s.oemId) ?? "Unknown",
    _count: s._count,
  }))

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  const monthlyDefects = await prisma.defect.findMany({
    where: {
      supplierId: session.user.companyId,
      createdAt: { gte: sixMonthsAgo },
    },
    select: { createdAt: true },
  })

  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const monthlyMap = new Map<string, number>()
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = `${monthLabels[d.getMonth()]} ${d.getFullYear()}`
    monthlyMap.set(key, 0)
  }
  for (const d of monthlyDefects) {
    const key = `${monthLabels[d.createdAt.getMonth()]} ${d.createdAt.getFullYear()}`
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1)
    }
  }
  const monthlyChartData = Array.from(monthlyMap.entries()).map(([month, _count]) => ({
    month,
    _count,
  }))

  const [supplierPpapPending, supplierIqcTotal, supplierIqcFailed, supplierFmeaDraft] = await Promise.all([
    prisma.ppapSubmission.count({
      where: { supplierId: session.user.companyId, status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] } },
    }),
    prisma.iqcReport.count({
      where: { supplierId: session.user.companyId },
    }),
    prisma.iqcReport.count({
      where: { supplierId: session.user.companyId, result: { in: ["REJECTED", "ON_HOLD", "REWORK_REQUIRED", "SORTING_REQUIRED"] } },
    }),
    prisma.fmea.count({
      where: { supplierId: session.user.companyId, status: { in: ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"] } },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Dashboard"
        description={`Welcome back, ${session.user.name ?? session.user.email}`}
      />

      <div className="grid gap-4 md:grid-cols-5">
        <DashboardCard
          title="Total Defects"
          value={totalDefects}
          icon={BugIcon}
          subtitle="All assigned quality issues"
          href="/quality/supplier/defects"
        />
        <DashboardCard
          title="Open"
          value={openDefects}
          icon={AlertTriangleIcon}
          subtitle="Awaiting your 8D report"
          href="/quality/supplier/defects?filter=open"
        />
        <DashboardCard
          title="In Progress"
          value={inProgress}
          icon={ClockIcon}
          subtitle="Being drafted"
          href="/quality/supplier/defects?filter=in-progress"
        />
        <DashboardCard
          title="Awaiting Approval"
          value={waitingApproval}
          icon={TimerIcon}
          subtitle="Submitted to customer"
          href="/quality/supplier/defects?filter=waiting-customer"
        />
        <DashboardCard
          title="Resolved"
          value={resolved}
          icon={CheckCircleIcon}
          subtitle="Successfully closed"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="SLA Active"
          value={slaActive}
          icon={CalendarDaysIcon}
          subtitle="Defects under active SLA"
          href="/quality/supplier/defects?filter=has-sla"
        />
        <DashboardCard
          title="SLA Breach Rate"
          value={`${slaBreachRate}%`}
          icon={GaugeIcon}
          subtitle="Overdue / Total active"
        />
        <DashboardCard
          title="Due This Week"
          value={dueThisWeek}
          icon={TimerIcon}
          subtitle="Active SLA in next 7 days"
          href="/quality/supplier/defects?filter=due-this-week"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Defect Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut data={defectCounts} total={totalDefects} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Customers by Defects</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerBar data={customerChartData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Defect Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendArea data={monthlyChartData} />
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-1 text-sm font-medium">Avg Resolution Time</h3>
        <p className="text-2xl font-bold">{avgResolutionDays !== null ? `${avgResolutionDays} days` : "—"}</p>
        <p className="text-xs text-muted-foreground">{avgResolutionDays !== null ? "Mean time from creation to resolution" : "No resolved defects yet"}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Overdue Assigned"
          value={overdueAssigned}
          icon={AlertTriangleIcon}
          subtitle="Assigned to you and past due"
          href="/quality/supplier/defects?filter=overdue"
        />
        <DashboardCard
          title="Due This Week"
          value={dueThisWeek}
          icon={TimerIcon}
          subtitle="Active SLA dates in next 7 days"
          href="/quality/supplier/defects?filter=due-this-week"
        />
        <DashboardCard
          title="Customer Review"
          value={waitingApproval}
          icon={ClockIcon}
          subtitle="Waiting for OEM approval"
          href="/quality/supplier/defects?filter=waiting-customer"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          title="Missing Evidence"
          value={missingEvidence}
          icon={AlertTriangleIcon}
          subtitle="Open defects missing required files"
          href="/quality/supplier/defects?filter=evidence-missing"
        />
        <DashboardCard
          title="Evidence Ready"
          value={evidenceReady}
          icon={FileCheckIcon}
          subtitle="Open defects with D5/D6/D7 evidence"
          href="/quality/supplier/defects?filter=evidence-ready"
        />
      </div>

      <h2 className="text-lg font-semibold text-foreground pt-2">Quality Modules</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="PPAP Action Required"
          value={supplierPpapPending}
          icon={FileTextIcon}
          subtitle="PPAP submissions requiring action"
          href="/quality/supplier/ppap"
        />
        <DashboardCard
          title="IQC Inspections"
          value={`${supplierIqcFailed} / ${supplierIqcTotal}`}
          icon={ClipboardCheckIcon}
          subtitle="Failed / Total inspections"
          href="/quality/supplier/iqc"
        />
        <DashboardCard
          title="FMEA Drafts"
          value={supplierFmeaDraft}
          icon={ShieldAlertIcon}
          subtitle="Active FMEA analyses"
          href="/quality/supplier/fmea"
        />
      </div>
    </div>
  )
}
