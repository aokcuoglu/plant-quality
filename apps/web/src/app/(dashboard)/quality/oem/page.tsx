import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { BugIcon, ClockIcon, AlertTriangleIcon, TimerIcon, FileCheckIcon, CalendarDaysIcon, GaugeIcon, FileTextIcon, ClipboardCheckIcon, ShieldAlertIcon } from "lucide-react"
import { getTranslations } from "@/i18n/server"
import { PageHeader } from "@/components/layout/PageHeader"
import { DashboardCard } from "@/components/layout/DashboardCard"
import { StatusDonut } from "@/components/dashboard/StatusDonut"
import { SupplierBar } from "@/components/dashboard/SupplierBar"
import { TrendArea } from "@/components/dashboard/TrendArea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { getActiveDueDate, isDefectOverdue, isDueSoon } from "@/lib/sla"
import { hasRequiredSubmissionEvidence } from "@/lib/evidence"
import type { EightDSection } from "@plantx/db/client"

function getEvidenceReady(evidences: { section: EightDSection }[]) {
  const counts = evidences.reduce<Partial<Record<EightDSection, number>>>((acc, item) => {
    acc[item.section] = (acc[item.section] ?? 0) + 1
    return acc
  }, {})
  return hasRequiredSubmissionEvidence(counts)
}

export default async function OemDashboardPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM") redirect("/login")
  const t = await getTranslations()

  const defectCounts = await prisma.defect.groupBy({
    by: ["status"],
    where: { oemId: session.user.companyId },
    _count: true,
  })

  const totalDefects = defectCounts.reduce((sum, d) => sum + d._count, 0)
  const openDefects = defectCounts.find((d) => d.status === "OPEN")?._count ?? 0
  const waitingApproval = defectCounts.find((d) => d.status === "WAITING_APPROVAL")?._count ?? 0
  const operationalDefects = await prisma.defect.findMany({
    where: { oemId: session.user.companyId, status: { not: "RESOLVED" } },
    select: {
      status: true,
      currentActionOwner: true,
      supplierResponseDueAt: true,
      eightDSubmissionDueAt: true,
      oemReviewDueAt: true,
      revisionDueAt: true,
      evidences: { where: { deletedAt: null }, select: { section: true } },
    },
  })
  const overdueDefects = operationalDefects.filter((d) => isDefectOverdue(d)).length
  const waitingSupplierAction = operationalDefects.filter((d) => d.currentActionOwner === "SUPPLIER").length
  const waitingOemAction = operationalDefects.filter((d) => d.currentActionOwner === "OEM").length
  const missingEvidence = operationalDefects.filter((d) => !getEvidenceReady(d.evidences)).length
  const readyForReview = operationalDefects.filter((d) => d.status === "WAITING_APPROVAL" && getEvidenceReady(d.evidences)).length

  const slaActive = operationalDefects.filter((d) => getActiveDueDate(d) !== null).length
  const dueSoon = operationalDefects.filter((d) => {
    const dueDate = getActiveDueDate(d)
    if (!dueDate || isDefectOverdue(d)) return false
    return isDueSoon(d)
  }).length
  const totalOperational = operationalDefects.length
  const slaBreachRate = totalOperational > 0 ? Math.round((overdueDefects / totalOperational) * 100) : 0

  const resolvedDefects = await prisma.defect.findMany({
    where: {
      oemId: session.user.companyId,
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

  const topSuppliers = await prisma.defect.groupBy({
    by: ["supplierId"],
    where: { oemId: session.user.companyId },
    _count: true,
    orderBy: { _count: { supplierId: "desc" } },
    take: 5,
  })

  const supplierIds = topSuppliers.map((s) => s.supplierId)
  const suppliers = await prisma.company.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  })
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]))

  const supplierChartData = topSuppliers.map((s) => ({
    name: supplierMap.get(s.supplierId) ?? t("dashboard.quality.oem.unknownSupplier"),
    _count: s._count,
  }))

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  const monthlyDefects = await prisma.defect.findMany({
    where: {
      oemId: session.user.companyId,
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

  const [ppapPending, iqcTotal, iqcPassed, fmeaActive] = await Promise.all([
    prisma.ppapSubmission.count({
      where: { oemId: session.user.companyId, status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW"] } },
    }),
    prisma.iqcReport.count({
      where: { oemId: session.user.companyId, status: "COMPLETED" },
    }),
    prisma.iqcReport.count({
      where: { oemId: session.user.companyId, status: "COMPLETED", result: "ACCEPTED" },
    }),
    prisma.fmea.count({
      where: { oemId: session.user.companyId, status: { in: ["DRAFT", "REQUESTED", "SUPPLIER_IN_PROGRESS", "UNDER_REVIEW", "REVISION_REQUIRED"] } },
    }),
  ])
  const iqcPassRate = iqcTotal > 0 ? `${Math.round((iqcPassed / iqcTotal) * 100)}%` : "—"

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.quality.oem.title")}
        description={t("dashboard.quality.oem.welcome", { name: session.user.name ?? session.user.email ?? "" })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardCard
          title={t("dashboard.quality.oem.totalDefects")}
          value={totalDefects}
          icon={BugIcon}
          subtitle={t("dashboard.quality.oem.totalDefectsSub")}
          href="/quality/oem/defects"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.open")}
          value={openDefects}
          icon={AlertTriangleIcon}
          subtitle={t("dashboard.quality.oem.openSub")}
          href="/quality/oem/defects?filter=open"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.awaitingApproval")}
          value={waitingApproval}
          icon={ClockIcon}
          subtitle={t("dashboard.quality.oem.awaitingApprovalSub")}
          href="/quality/oem/defects?filter=waiting-approval"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.avgResolutionTime")}
          value={avgResolutionDays !== null ? `${avgResolutionDays}d` : "—"}
          icon={TimerIcon}
          subtitle={avgResolutionDays !== null ? t("dashboard.quality.oem.avgResolutionTimeSub") : t("dashboard.quality.oem.noResolvedDefects")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title={t("dashboard.quality.oem.slaActive")}
          value={slaActive}
          icon={CalendarDaysIcon}
          subtitle={t("dashboard.quality.oem.slaActiveSub")}
          href="/quality/oem/defects?filter=has-sla"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.dueSoon")}
          value={dueSoon}
          icon={TimerIcon}
          subtitle={t("dashboard.quality.oem.dueSoonSub")}
          href="/quality/oem/defects?filter=due-soon"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.slaBreachRate")}
          value={`${slaBreachRate}%`}
          icon={GaugeIcon}
          subtitle={t("dashboard.quality.oem.slaBreachRateSub")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title={t("dashboard.quality.oem.overdue")}
          value={overdueDefects}
          icon={AlertTriangleIcon}
          subtitle={t("dashboard.quality.oem.overdueSub")}
          href="/quality/oem/defects?filter=overdue"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.supplierAction")}
          value={waitingSupplierAction}
          icon={ClockIcon}
          subtitle={t("dashboard.quality.oem.supplierActionSub")}
          href="/quality/oem/defects?filter=supplier"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.oemAction")}
          value={waitingOemAction}
          icon={TimerIcon}
          subtitle={t("dashboard.quality.oem.oemActionSub")}
          href="/quality/oem/defects?filter=oem"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardCard
          title={t("dashboard.quality.oem.missingEvidence")}
          value={missingEvidence}
          icon={AlertTriangleIcon}
          subtitle={t("dashboard.quality.oem.missingEvidenceSub")}
          href="/quality/oem/defects?filter=evidence-missing"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.readyForReview")}
          value={readyForReview}
          icon={FileCheckIcon}
          subtitle={t("dashboard.quality.oem.readyForReviewSub")}
          href="/quality/oem/defects?filter=evidence-ready"
        />
      </div>

      <h2 className="text-lg font-semibold text-foreground pt-2">{t("dashboard.quality.oem.qualityModules")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title={t("dashboard.quality.oem.ppapPending")}
          value={ppapPending}
          icon={FileTextIcon}
          subtitle={t("dashboard.quality.oem.ppapPendingSub")}
          href="/quality/oem/ppap"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.iqcPassRate")}
          value={iqcPassRate}
          icon={ClipboardCheckIcon}
          subtitle={t("dashboard.quality.oem.iqcPassRateSub")}
          href="/quality/oem/iqc"
        />
        <DashboardCard
          title={t("dashboard.quality.oem.fmeaActive")}
          value={fmeaActive}
          icon={ShieldAlertIcon}
          subtitle={t("dashboard.quality.oem.fmeaActiveSub")}
          href="/quality/oem/fmea"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.quality.oem.defectStatusDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut data={defectCounts} total={totalDefects} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.quality.oem.topSuppliersByDefects")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierBar data={supplierChartData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.quality.oem.monthlyDefectTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendArea data={monthlyChartData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
