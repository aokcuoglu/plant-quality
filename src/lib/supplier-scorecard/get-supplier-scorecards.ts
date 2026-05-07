import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing"
import {
  getPpapPostApprovalIssueSignals,
  getFmeaCoverageGapSignals,
  getIqcRejectionSignals,
  getRepeatIssueSignals,
} from "@/lib/quality-intelligence"
import { isDefectOverdue } from "@/lib/sla"
import { getFieldDefectSlaStatus } from "@/lib/sla-field-defect"
import type { IqcResult } from "@/generated/prisma/client"
import type { SupplierScorecard, SupplierScorecardSummary, SignalDetail } from "./types"
import { computeScore, getGrade, getRiskLevel, applyPenalty, getRecommendedAction, PENALTY_CONFIG } from "./scoring"

const NEGATIVE_IQC_RESULTS: IqcResult[] = ["REJECTED", "ON_HOLD", "REWORK_REQUIRED", "SORTING_REQUIRED"]

interface SessionUser {
  companyId: string
  companyType: string
  role: string
  plan?: string | null
}

export async function getSupplierScorecards(
  session: {
    user?: { companyId?: string | null; companyType?: string | null; role?: string | null; plan?: string | null }
  } | null
): Promise<SupplierScorecardSummary | null> {
  if (!session?.user?.companyId || session.user.companyType !== "OEM") {
    return null
  }

  const featureGate = requireFeature(session, "SUPPLIER_SCORECARD")
  if (!featureGate.allowed) {
    return null
  }

  const companyId = session.user.companyId
  const sessionUser: SessionUser = {
    companyId,
    companyType: session.user.companyType ?? "OEM",
    role: session.user.role ?? "VIEWER",
    plan: session.user.plan,
  }

  const suppliers = await prisma.company.findMany({
    where: { type: "SUPPLIER" },
    select: { id: true, name: true },
  })

  const supplierIdToOemCount = await getSupplierOemCounts(companyId)

  const activeSupplierIds = new Set(Object.keys(supplierIdToOemCount))
  const relevantSuppliers = suppliers.filter((s) => activeSupplierIds.has(s.id))

  if (relevantSuppliers.length === 0) {
    return {
      suppliersMonitored: 0,
      highCriticalRiskCount: 0,
      averageScore: 100,
      overdueActionsCount: 0,
      suppliers: [],
    }
  }

  const supplierMap = new Map(relevantSuppliers.map((s) => [s.id, s.name]))

  const [
    fieldDefects,
    defects,
    iqcReports,
    escalations,
    ppapIssueSignals,
    fmeaGapSignals,
    iqcRejectionSignals,
    repeatIssueSignals,
    overdueDefects,
    overdueFieldDefects,
  ] = await Promise.all([
    prisma.fieldDefect.findMany({
      where: { oemId: companyId, deletedAt: null, supplierId: { in: [...activeSupplierIds] } },
      select: {
        id: true,
        supplierId: true,
        severity: true,
        status: true,
        repeatIssue: true,
        escalationLevel: true,
        responseDueAt: true,
        resolutionDueAt: true,
        reportDate: true,
        createdAt: true,
      },
    }),
    prisma.defect.findMany({
      where: { oemId: companyId, supplierId: { in: [...activeSupplierIds] } },
      select: {
        id: true,
        supplierId: true,
        status: true,
        escalationLevel: true,
        currentActionOwner: true,
        supplierResponseDueAt: true,
        eightDSubmissionDueAt: true,
        oemReviewDueAt: true,
        revisionDueAt: true,
        createdAt: true,
      },
    }),
    prisma.iqcReport.findMany({
      where: { oemId: companyId, supplierId: { in: [...activeSupplierIds] } },
      select: {
        id: true,
        supplierId: true,
        result: true,
        status: true,
        inspectionDate: true,
        createdAt: true,
      },
    }),
    prisma.escalationHistory.findMany({
      where: { companyId, newLevel: { in: ["LEVEL_1", "LEVEL_2", "LEVEL_3"] } },
      select: { id: true, entityId: true, entityType: true, newLevel: true, createdAt: true },
    }),
    getPpapPostApprovalIssueSignals(sessionUser),
    getFmeaCoverageGapSignals(sessionUser),
    getIqcRejectionSignals(sessionUser),
    getRepeatIssueSignals(sessionUser),
    prisma.defect.findMany({
      where: { oemId: companyId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"] }, supplierId: { in: [...activeSupplierIds] } },
      select: {
        id: true,
        supplierId: true,
        status: true,
        escalationLevel: true,
        currentActionOwner: true,
        supplierResponseDueAt: true,
        eightDSubmissionDueAt: true,
        oemReviewDueAt: true,
        revisionDueAt: true,
      },
    }),
    prisma.fieldDefect.findMany({
      where: {
        oemId: companyId,
        deletedAt: null,
        status: { in: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"] },
        supplierId: { in: [...activeSupplierIds] },
      },
      select: {
        id: true,
        supplierId: true,
        status: true,
        severity: true,
        escalationLevel: true,
        responseDueAt: true,
        resolutionDueAt: true,
      },
    }),
  ])

  const now = new Date()

  const ppapIssueBySupplier = new Map<string, number>()
  for (const sig of ppapIssueSignals) {
    const current = ppapIssueBySupplier.get(sig.supplierId) ?? 0
    ppapIssueBySupplier.set(sig.supplierId, current + 1)
  }

  const fmeaGapBySupplier = new Map<string, number>()
  for (const gap of fmeaGapSignals) {
    if (!gap.supplierId) continue
    const current = fmeaGapBySupplier.get(gap.supplierId) ?? 0
    fmeaGapBySupplier.set(gap.supplierId, current + 1)
  }

  const iqcRejectedBySupplier = new Map<string, number>()
  for (const sig of iqcRejectionSignals) {
    const current = iqcRejectedBySupplier.get(sig.supplierId) ?? 0
    iqcRejectedBySupplier.set(sig.supplierId, current + sig.rejectionCount)
  }

  const repeatIssueBySupplier = new Map<string, number>()
  for (const sig of repeatIssueSignals) {
    const current = repeatIssueBySupplier.get(sig.supplierId) ?? 0
    repeatIssueBySupplier.set(sig.supplierId, current + 1)
  }

  const supplierScorecards: SupplierScorecard[] = []

  for (const [supplierId, supplierName] of supplierMap) {
    const supplierFieldDefects = fieldDefects.filter((fd) => fd.supplierId === supplierId)
    const supplierDefects = defects.filter((d) => d.supplierId === supplierId)
    const supplierIqc = iqcReports.filter((iqc) => iqc.supplierId === supplierId)
    const supplierEscalations = escalations.filter((e) => {
      if (!e.entityId) return false
      const fd = fieldDefects.find((fd) => fd.id === e.entityId && fd.supplierId === supplierId)
      const d = defects.find((dd) => dd.id === e.entityId && dd.supplierId === supplierId)
      return !!(fd || d)
    })

    const fieldDefectHighCritical = supplierFieldDefects.filter(
      (fd) => (fd.severity === "CRITICAL" || fd.severity === "MAJOR") && fd.status !== "CLOSED" && fd.status !== "CANCELLED"
    ).length

    const repeatIssueCount = repeatIssueBySupplier.get(supplierId) ?? 0

    const iqcRejectedCount = iqcRejectedBySupplier.get(supplierId) ?? supplierIqc.filter(
      (iqc) => iqc.result && NEGATIVE_IQC_RESULTS.includes(iqc.result)
    ).length

    const openDefects = supplierDefects.filter(
      (d) => d.status === "OPEN" || d.status === "IN_PROGRESS" || d.status === "WAITING_APPROVAL"
    )

    const overdueDefectCount = overdueDefects.filter((d) => d.supplierId === supplierId).filter((d) => isDefectOverdue(d as Parameters<typeof isDefectOverdue>[0], now)).length

    const overdueFdCount = overdueFieldDefects.filter((fd) => fd.supplierId === supplierId).filter((fd) => getFieldDefectSlaStatus(fd, now) === "overdue").length

    const overdue8dCount = overdueDefectCount + overdueFdCount

    const slaBreaches = [...overdueDefects.filter((d) => d.supplierId === supplierId && isDefectOverdue(d as Parameters<typeof isDefectOverdue>[0], now)), ...overdueFieldDefects.filter((fd) => fd.supplierId === supplierId && getFieldDefectSlaStatus(fd, now) === "overdue")].length

    const escalationCount = supplierEscalations.length

    const ppapWithIssuesCount = ppapIssueBySupplier.get(supplierId) ?? 0

    const fmeaGapCount = fmeaGapBySupplier.get(supplierId) ?? 0

    const penaltyBreakdown = {
      fieldDefectHighCritical: { count: fieldDefectHighCritical, penalty: applyPenalty(fieldDefectHighCritical, PENALTY_CONFIG.FIELD_DEFECT_HIGH_CRITICAL.perItem, PENALTY_CONFIG.FIELD_DEFECT_HIGH_CRITICAL.cap), cap: PENALTY_CONFIG.FIELD_DEFECT_HIGH_CRITICAL.cap },
      repeatIssueCluster: { count: repeatIssueCount, penalty: applyPenalty(repeatIssueCount, PENALTY_CONFIG.REPEAT_ISSUE_CLUSTER.perItem, PENALTY_CONFIG.REPEAT_ISSUE_CLUSTER.cap), cap: PENALTY_CONFIG.REPEAT_ISSUE_CLUSTER.cap },
      iqcRejected: { count: iqcRejectedCount, penalty: applyPenalty(iqcRejectedCount, PENALTY_CONFIG.IQC_REJECTED.perItem, PENALTY_CONFIG.IQC_REJECTED.cap), cap: PENALTY_CONFIG.IQC_REJECTED.cap },
      openOverdue8d: { count: overdue8dCount, penalty: applyPenalty(overdue8dCount, PENALTY_CONFIG.OPEN_OVERDUE_8D.perItem, PENALTY_CONFIG.OPEN_OVERDUE_8D.cap), cap: PENALTY_CONFIG.OPEN_OVERDUE_8D.cap },
      slaBreach: { count: Math.max(escalationCount, slaBreaches), penalty: applyPenalty(Math.max(escalationCount, slaBreaches), PENALTY_CONFIG.SLA_BREACH.perItem, PENALTY_CONFIG.SLA_BREACH.cap), cap: PENALTY_CONFIG.SLA_BREACH.cap },
      ppapApprovedWithIssues: { count: ppapWithIssuesCount, penalty: applyPenalty(ppapWithIssuesCount, PENALTY_CONFIG.PPAP_APPROVED_WITH_ISSUES.perItem, PENALTY_CONFIG.PPAP_APPROVED_WITH_ISSUES.cap), cap: PENALTY_CONFIG.PPAP_APPROVED_WITH_ISSUES.cap },
      fmeaCoverageGap: { count: fmeaGapCount, penalty: applyPenalty(fmeaGapCount, PENALTY_CONFIG.FMEA_COVERAGE_GAP.perItem, PENALTY_CONFIG.FMEA_COVERAGE_GAP.cap), cap: PENALTY_CONFIG.FMEA_COVERAGE_GAP.cap },
      executiveRiskSignal: { count: escalationCount > 0 ? Math.min(escalationCount, 3) : 0, penalty: applyPenalty(escalationCount > 0 ? Math.min(escalationCount, 3) : 0, PENALTY_CONFIG.EXECUTIVE_RISK_SIGNAL.perItem, PENALTY_CONFIG.EXECUTIVE_RISK_SIGNAL.cap), cap: PENALTY_CONFIG.EXECUTIVE_RISK_SIGNAL.cap },
    }

    const overallScore = computeScore(penaltyBreakdown)
    const grade = getGrade(overallScore)
    const riskLevel = getRiskLevel(overallScore)

    const keySignals: SignalDetail[] = []
    if (fieldDefectHighCritical > 0) keySignals.push({ label: "Critical/Major Field Defects", count: fieldDefectHighCritical, severity: "critical" })
    if (repeatIssueCount > 0) keySignals.push({ label: "Repeat Issue Clusters", count: repeatIssueCount, severity: "high" })
    if (overdue8dCount > 0) keySignals.push({ label: "Open/Overdue 8D", count: overdue8dCount, severity: "high" })
    if (iqcRejectedCount > 0) keySignals.push({ label: "IQC Rejected/On-Hold", count: iqcRejectedCount, severity: iqcRejectedCount >= 3 ? "high" : "medium" })
    if (ppapWithIssuesCount > 0) keySignals.push({ label: "PPAP with Issues", count: ppapWithIssuesCount, severity: "medium" })
    if (fmeaGapCount > 0) keySignals.push({ label: "FMEA Coverage Gaps", count: fmeaGapCount, severity: "medium" })
    if (escalationCount > 0) keySignals.push({ label: "Escalations", count: escalationCount, severity: "low" })
    keySignals.sort((a, b) => {
      const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
      return (order[b.severity] ?? 0) - (order[a.severity] ?? 0)
    })

    const recommendedAction = getRecommendedAction(riskLevel, keySignals.length)

    const allDates = [
      ...supplierFieldDefects.map((fd) => fd.reportDate ?? fd.createdAt),
      ...supplierDefects.map((d) => d.createdAt),
      ...supplierIqc.map((iqc) => iqc.inspectionDate ?? iqc.createdAt),
    ].filter((d): d is Date => d !== null)
      .map((d) => new Date(d).getTime())
      .filter((t) => Number.isFinite(t))
    const latestActivityAt = allDates.length > 0 ? new Date(Math.max(...allDates)) : null

    const drillDownLinks: { label: string; href: string }[] = []
    if (supplierFieldDefects.length > 0) drillDownLinks.push({ label: "Field Quality", href: `/quality/oem/field?supplierId=${encodeURIComponent(supplierId)}` })
    if (openDefects.length > 0) drillDownLinks.push({ label: "Defects / 8D", href: `/quality/oem/defects?supplierId=${encodeURIComponent(supplierId)}` })
    if (supplierIqc.length > 0) drillDownLinks.push({ label: "IQC", href: `/quality/oem/iqc?supplierId=${encodeURIComponent(supplierId)}` })
    if (ppapWithIssuesCount > 0) drillDownLinks.push({ label: "PPAP", href: `/quality/oem/ppap?supplierId=${encodeURIComponent(supplierId)}` })
    if (fmeaGapCount > 0) drillDownLinks.push({ label: "FMEA", href: `/quality/oem/fmea?supplierId=${encodeURIComponent(supplierId)}` })
    if (overdue8dCount > 0) drillDownLinks.push({ label: "Escalations", href: `/quality/oem/escalations` })
    drillDownLinks.push({ label: "Quality Intelligence", href: `/quality/oem/quality-intelligence` })

    supplierScorecards.push({
      supplierId,
      supplierName,
      overallScore,
      grade,
      riskLevel,
      openIssuesCount: openDefects.length + supplierFieldDefects.filter((fd) => fd.status !== "CLOSED" && fd.status !== "CANCELLED" && fd.status !== "DRAFT").length,
      repeatIssuesCount: repeatIssueCount,
      fieldDefectsCount: supplierFieldDefects.length,
      defects8dCount: supplierDefects.length,
      overdue8dCount: overdue8dCount,
      iqcRejectedCount: iqcRejectedCount,
      ppapApprovedWithIssuesCount: ppapWithIssuesCount,
      fmeaCoverageGapCount: fmeaGapCount,
      escalationCount: escalationCount,
      latestActivityAt,
      keySignals: keySignals.slice(0, 5),
      recommendedAction,
      penaltyBreakdown,
      drillDownLinks,
    })
  }

  supplierScorecards.sort((a, b) => {
    const scoreDiff = a.overallScore - b.overallScore
    if (scoreDiff !== 0) return scoreDiff
    const aDate = a.latestActivityAt ? new Date(a.latestActivityAt).getTime() : 0
    const bDate = b.latestActivityAt ? new Date(b.latestActivityAt).getTime() : 0
    const dateDiff = bDate - aDate
    if (dateDiff !== 0) return dateDiff
    return a.supplierName.localeCompare(b.supplierName)
  })

  const highCriticalRiskCount = supplierScorecards.filter((s) => s.riskLevel === "high" || s.riskLevel === "critical").length
  const averageScore = supplierScorecards.length > 0
    ? Math.round(supplierScorecards.reduce((sum, s) => sum + (Number.isFinite(s.overallScore) ? s.overallScore : 0), 0) / supplierScorecards.length)
    : 100

  const overdueActionsCount = overdueDefects.filter((d) => isDefectOverdue(d as Parameters<typeof isDefectOverdue>[0], now)).length + overdueFieldDefects.filter((fd) => getFieldDefectSlaStatus(fd, now) === "overdue").length

  return {
    suppliersMonitored: supplierScorecards.length,
    highCriticalRiskCount,
    averageScore,
    overdueActionsCount,
    suppliers: supplierScorecards,
  }
}

async function getSupplierOemCounts(companyId: string): Promise<Record<string, number>> {
  const result: Record<string, number> = {}

  const [defectSuppliers, fieldDefectSuppliers, ppapSuppliers, iqcSuppliers, fmeaSuppliers] = await Promise.all([
    prisma.defect.findMany({ where: { oemId: companyId }, select: { supplierId: true } }),
    prisma.fieldDefect.findMany({ where: { oemId: companyId, deletedAt: null }, select: { supplierId: true } }),
    prisma.ppapSubmission.findMany({ where: { oemId: companyId }, select: { supplierId: true } }),
    prisma.iqcReport.findMany({ where: { oemId: companyId }, select: { supplierId: true } }),
    prisma.fmea.findMany({ where: { oemId: companyId }, select: { supplierId: true } }),
  ])

  for (const d of defectSuppliers) { if (d.supplierId) result[d.supplierId] = (result[d.supplierId] ?? 0) + 1 }
  for (const fd of fieldDefectSuppliers) { if (fd.supplierId) result[fd.supplierId] = (result[fd.supplierId] ?? 0) + 1 }
  for (const p of ppapSuppliers) { if (p.supplierId) result[p.supplierId] = (result[p.supplierId] ?? 0) + 1 }
  for (const i of iqcSuppliers) { if (i.supplierId) result[i.supplierId] = (result[i.supplierId] ?? 0) + 1 }
  for (const f of fmeaSuppliers) { if (f.supplierId) result[f.supplierId] = (result[f.supplierId] ?? 0) + 1 }

  return result
}

export async function getSupplierScorecardDetail(
  session: {
    user?: { companyId?: string | null; companyType?: string | null; role?: string | null; plan?: string | null }
  } | null,
  supplierId: string
): Promise<SupplierScorecard | null> {
  const summary = await getSupplierScorecards(session)
  if (!summary) return null

  return summary.suppliers.find((s) => s.supplierId === supplierId) ?? null
}