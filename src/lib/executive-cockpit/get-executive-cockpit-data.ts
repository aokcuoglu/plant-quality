import { prisma } from "@/lib/prisma"
import { requireFeature } from "@/lib/billing"
import { normalizePlan, isPlanAtLeast } from "@/lib/billing/plans"
import {
  getSupplierPartRiskSignals,
  getPpapPostApprovalIssueSignals,
  getFmeaCoverageGapSignals,
  getIqcRejectionSignals,
  getRepeatIssueSignals,
  getQualityIntelligenceSummary,
} from "@/lib/quality-intelligence"
import { isDefectOverdue, getActiveDueDate } from "@/lib/sla"
import { getFieldDefectSlaStatus } from "@/lib/sla-field-defect"
import type { ExecutiveCockpitData, ActionItem, SupplierAttentionEntry, SlaEscalationItem } from "./types"

function genId(): string {
  return `act-${Math.random().toString(36).substring(2, 10)}`
}

export async function getExecutiveCockpitData(session: {
  user?: {
    companyId?: string | null
    companyType?: string | null
    role?: string | null
    plan?: string | null
  }
} | null): Promise<ExecutiveCockpitData | null> {
  if (!session?.user?.companyId || session.user.companyType !== "OEM") {
    return null
  }

  const featureGate = requireFeature(session, "EXECUTIVE_COCKPIT")
  if (!featureGate.allowed) {
    return null
  }

  const companyId = session.user.companyId
  const plan = normalizePlan(session.user.plan)
  const isEnterprise = isPlanAtLeast(plan, "ENTERPRISE")

  if (!isEnterprise) {
    return null
  }

  const sessionUser = {
    companyId,
    companyType: session.user.companyType ?? "OEM",
    role: session.user.role ?? "VIEWER",
    plan: session.user.plan,
  }

  const [riskSignals, ppapIssueSignals, fmeaGapSignals, _iqcRejectionSignals, repeatIssueSignals, intelligenceSummary] = await Promise.all([
    getSupplierPartRiskSignals(sessionUser),
    getPpapPostApprovalIssueSignals(sessionUser),
    getFmeaCoverageGapSignals(sessionUser),
    getIqcRejectionSignals(sessionUser),
    getRepeatIssueSignals(sessionUser),
    getQualityIntelligenceSummary(sessionUser),
  ])

  const highRiskSupplierParts = riskSignals.filter((r) => r.riskLevel === "high" || r.riskLevel === "critical").length

  const [overdueDefects, overdueFieldDefects, escalatedDefects, escalatedFieldDefects, dueSoonDefects, dueSoonFieldDefects] = await Promise.all([
    prisma.defect.findMany({
      where: { oemId: companyId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"] } },
      select: {
        id: true,
        description: true,
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
      where: { oemId: companyId, deletedAt: null, status: { in: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"] } },
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        escalationLevel: true,
        responseDueAt: true,
        resolutionDueAt: true,
      },
    }),
    prisma.defect.findMany({
      where: { oemId: companyId, escalationLevel: { in: ["LEVEL_1", "LEVEL_2", "LEVEL_3"] } },
      select: {
        id: true,
        description: true,
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
      where: { oemId: companyId, deletedAt: null, escalationLevel: { in: ["LEVEL_1", "LEVEL_2", "LEVEL_3"] } },
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        escalationLevel: true,
        responseDueAt: true,
        resolutionDueAt: true,
      },
    }),
    prisma.defect.findMany({
      where: { oemId: companyId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"] } },
      select: {
        id: true,
        description: true,
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
      where: { oemId: companyId, deletedAt: null, status: { in: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"] } },
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        escalationLevel: true,
        responseDueAt: true,
        resolutionDueAt: true,
      },
    }),
  ])

  let overdueActions = 0
  const now = new Date()

  for (const d of overdueDefects) {
    if (isDefectOverdue(d as Parameters<typeof isDefectOverdue>[0], now)) {
      overdueActions++
    }
  }
  for (const fd of overdueFieldDefects) {
    const slaStatus = getFieldDefectSlaStatus(fd, now)
    if (slaStatus === "overdue") {
      overdueActions++
    }
  }

  const criticalHighFieldIssues = await prisma.fieldDefect.count({
    where: {
      oemId: companyId,
      deletedAt: null,
      severity: { in: ["CRITICAL", "MAJOR"] },
      status: { in: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"] },
    },
  })

  const openDefects8d = await prisma.defect.count({
    where: { oemId: companyId, status: { in: ["OPEN", "IN_PROGRESS"] } },
  })

  const topRisks = riskSignals.slice(0, 20).map((r, i) => {
    const mainSignals = r.contributors.slice(0, 3).map((c) => c.signal.replace(/_/g, " ").toLowerCase())
    let recommendedAction = "Monitor"
    if (r.riskLevel === "critical") {
      recommendedAction = "Immediate review required"
    } else if (r.riskLevel === "high") {
      recommendedAction = "Review this week"
    } else if (r.riskLevel === "medium") {
      recommendedAction = "Schedule review"
    }
    return {
      rank: i + 1,
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      partNumber: r.partNumber,
      partName: r.partName,
      riskLevel: r.riskLevel,
      riskScore: Number.isFinite(r.riskScore) ? r.riskScore : 0,
      mainSignals,
      latestActivity: r.latestActivity,
      recommendedAction,
      href: null,
    }
  })

  const supplierGroups = new Map<string, {
    supplierId: string
    supplierName: string
    parts: Set<string>
    riskLevels: string[]
    signalCounts: number[]
    hrefs: { label: string; href: string }[]
  }>()

  for (const r of riskSignals) {
    if (!supplierGroups.has(r.supplierId)) {
      supplierGroups.set(r.supplierId, {
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        parts: new Set(),
        riskLevels: [],
        signalCounts: [],
        hrefs: [],
      })
    }
    const group = supplierGroups.get(r.supplierId)!
    group.parts.add(r.partNumber)
    group.riskLevels.push(r.riskLevel)
    group.signalCounts.push(r.signalCount)
  }

  for (const ri of repeatIssueSignals) {
    if (!supplierGroups.has(ri.supplierId)) {
      supplierGroups.set(ri.supplierId, {
        supplierId: ri.supplierId,
        supplierName: ri.supplierName,
        parts: new Set(),
        riskLevels: [],
        signalCounts: [],
        hrefs: [],
      })
    }
    const group = supplierGroups.get(ri.supplierId)!
    for (const fd of ri.fieldDefects.slice(0, 3)) {
      group.hrefs.push({ label: fd.title.length > 40 ? fd.title.substring(0, 40) + "..." : fd.title, href: fd.href })
    }
  }

  const highestRiskLevel = (levels: string[]): string => {
    const order = ["critical", "high", "medium", "low"]
    for (const level of order) {
      if (levels.includes(level)) return level
    }
    return "low"
  }

  const supplierAttention: SupplierAttentionEntry[] = []
  for (const group of supplierGroups.values()) {
    const topRisk = highestRiskLevel(group.riskLevels)
    const totalSignals = group.signalCounts.reduce((a, b) => a + b, 0)

    let recommendedAction = "Monitor supplier performance"
    if (topRisk === "critical") {
      recommendedAction = "Escalate to executive leadership"
    } else if (topRisk === "high") {
      recommendedAction = "Schedule supplier review meeting"
    } else if (topRisk === "medium" && totalSignals >= 3) {
      recommendedAction = "Request supplier corrective action plan"
    }

    supplierAttention.push({
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      activeSignalCount: totalSignals,
      highestRiskLevel: topRisk,
      topAffectedParts: [...group.parts].slice(0, 5),
      recommendedAction,
      hrefs: group.hrefs.slice(0, 5),
    })
  }

  supplierAttention.sort((a, b) => {
    const levelOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
    const aLevel = levelOrder[a.highestRiskLevel] ?? 0
    const bLevel = levelOrder[b.highestRiskLevel] ?? 0
    if (bLevel !== aLevel) return bLevel - aLevel
    return b.activeSignalCount - a.activeSignalCount
  })

  const slaEscalationAttention: SlaEscalationItem[] = []

  for (const d of escalatedDefects) {
    const dueDate = getActiveDueDate(d as Parameters<typeof getActiveDueDate>[0])
    const overdue = isDefectOverdue(d as Parameters<typeof isDefectOverdue>[0], now)
    slaEscalationAttention.push({
      id: d.id,
      type: "defect",
      title: d.description.length > 80 ? d.description.substring(0, 80) + "..." : d.description,
      status: d.status,
      severity: null,
      escalationLevel: d.escalationLevel,
      slaStatus: overdue ? "overdue" : "on-track",
      dueDate,
      href: `/quality/oem/defects/${d.id}`,
      ownerType: d.currentActionOwner,
    })
  }

  for (const fd of escalatedFieldDefects) {
    const slaStatus = getFieldDefectSlaStatus(fd, now)
    slaEscalationAttention.push({
      id: fd.id,
      type: "field_defect",
      title: fd.title,
      status: fd.status,
      severity: fd.severity,
      escalationLevel: fd.escalationLevel,
      slaStatus,
      dueDate: fd.responseDueAt ?? fd.resolutionDueAt,
      href: `/quality/oem/field/${fd.id}`,
      ownerType: null,
    })
  }

  for (const d of dueSoonDefects) {
    if (d.escalationLevel !== "NONE") continue
    const dueDate = getActiveDueDate(d as Parameters<typeof getActiveDueDate>[0])
    if (!dueDate) continue
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (diffHours > 0 && diffHours <= 48) {
      const existing = slaEscalationAttention.find((item) => item.id === d.id)
      if (!existing) {
        slaEscalationAttention.push({
          id: d.id,
          type: "defect",
          title: d.description.length > 80 ? d.description.substring(0, 80) + "..." : d.description,
          status: d.status,
          severity: null,
          escalationLevel: d.escalationLevel,
          slaStatus: "due-soon",
          dueDate,
          href: `/quality/oem/defects/${d.id}`,
          ownerType: d.currentActionOwner,
        })
      }
    }
  }

  for (const fd of dueSoonFieldDefects) {
    if (fd.escalationLevel !== "NONE") continue
    const slaStatus = getFieldDefectSlaStatus(fd, now)
    if (slaStatus === "due-soon") {
      const existing = slaEscalationAttention.find((item) => item.id === fd.id)
      if (!existing) {
        slaEscalationAttention.push({
          id: fd.id,
          type: "field_defect",
          title: fd.title,
          status: fd.status,
          severity: fd.severity,
          escalationLevel: fd.escalationLevel,
          slaStatus,
          dueDate: fd.responseDueAt ?? fd.resolutionDueAt,
          href: `/quality/oem/field/${fd.id}`,
          ownerType: null,
        })
      }
    }
  }

  slaEscalationAttention.sort((a, b) => {
    const statusOrder: Record<string, number> = { overdue: 4, "due-soon": 3, escalated: 2, "on-track": 1 }
    const aStatus = a.slaStatus === "overdue" ? 4 : (a.escalationLevel && a.escalationLevel !== "NONE" ? 2 : (statusOrder[a.slaStatus] ?? 0))
    const bStatus = b.slaStatus === "overdue" ? 4 : (b.escalationLevel && b.escalationLevel !== "NONE" ? 2 : (statusOrder[b.slaStatus] ?? 0))
    if (bStatus !== aStatus) return bStatus - aStatus
    const levelOrder: Record<string, number> = { LEVEL_3: 3, LEVEL_2: 2, LEVEL_1: 1, NONE: 0 }
    return (levelOrder[b.escalationLevel ?? "NONE"] ?? 0) - (levelOrder[a.escalationLevel ?? "NONE"] ?? 0)
  })

  const repeatIssueSummary = {
    totalClusters: repeatIssueSignals.length,
    totalRecords: repeatIssueSignals.reduce((sum, r) => sum + r.totalCount, 0),
    clusters: repeatIssueSignals.slice(0, 10).map((r) => ({
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      partNumber: r.partNumber,
      totalCount: r.totalCount,
      fieldDefectCount: r.fieldDefectCount,
      defect8dCount: r.defect8dCount,
      iqcCount: r.iqcIssueCount,
      hrefs: [
        ...r.fieldDefects.slice(0, 2).map((fd) => ({ label: fd.title.length > 40 ? fd.title.substring(0, 40) + "..." : fd.title, href: fd.href })),
        ...r.defects8d.slice(0, 2).map((d) => ({ label: d.description.length > 40 ? d.description.substring(0, 40) + "..." : d.description, href: d.href })),
        ...r.iqcInspections.slice(0, 2).map((i) => ({ label: i.inspectionNumber, href: i.href })),
      ].slice(0, 5),
    })),
  }

  const ppapIqcFieldSignals = ppapIssueSignals.map((s) => ({
    ppapId: s.ppapId,
    ppapRequestNumber: s.ppapRequestNumber,
    supplierName: s.supplierName,
    partNumber: s.partNumber,
    issueCount: s.issueCount,
    issueTypes: s.issueTypes,
    latestIssueDate: s.latestIssueDate,
    href: s.href,
  }))

  const fmeaCoverageSignals = fmeaGapSignals.slice(0, 20).map((s) => ({
    sourceId: s.sourceId,
    sourceType: s.sourceType,
    sourceTitle: s.sourceTitle,
    supplierName: s.supplierName,
    partNumber: s.partNumber,
    hasRelatedFmea: s.hasRelatedFmea,
    gapReason: s.gapReason,
    sourceHref: s.sourceHref,
    fmeaHref: s.fmeaHref,
  }))

  const actionItems: ActionItem[] = []

  for (const r of riskSignals.filter((r) => r.riskLevel === "critical").slice(0, 3)) {
    actionItems.push({
      id: genId(),
      priority: "critical",
      reason: `Critical risk score ${Number.isFinite(r.riskScore) ? r.riskScore : 0}`,
      title: `Review supplier ${r.supplierName} for critical risk on part ${r.partNumber}`,
      href: `/quality/oem/quality-intelligence`,
      suggestedOwner: "Quality Director",
      category: "supplier",
    })
  }

  if (overdueActions > 0) {
    actionItems.push({
      id: genId(),
      priority: "critical",
      reason: `${overdueActions} overdue action(s)`,
      title: `Prioritize ${overdueActions} overdue action(s) across defects and field issues`,
      href: "/quality/oem/escalations",
      suggestedOwner: "Plant Quality Manager",
      category: "sla",
    })
  }

  for (const ri of repeatIssueSignals.filter((r) => r.totalCount >= 3).slice(0, 3)) {
    actionItems.push({
      id: genId(),
      priority: "high",
      reason: `${ri.totalCount} repeat issues across modules`,
      title: `Review repeated issues with ${ri.supplierName} on part ${ri.partNumber}`,
      href: ri.fieldDefects[0]?.href ?? ri.defects8d[0]?.href ?? null,
      suggestedOwner: "Supplier Quality Manager",
      category: "repeat",
    })
  }

  for (const gap of fmeaGapSignals.slice(0, 3)) {
    actionItems.push({
      id: genId(),
      priority: "high",
      reason: "Potential coverage gap",
      title: `Review FMEA coverage for recurring failure: ${gap.failureText.length > 60 ? gap.failureText.substring(0, 60) + "..." : gap.failureText}`,
      href: gap.fmeaHref ?? gap.sourceHref,
      suggestedOwner: "Quality Engineer",
      category: "fmea",
    })
  }

  for (const ppap of ppapIssueSignals.slice(0, 3)) {
    actionItems.push({
      id: genId(),
      priority: "medium",
      reason: `PPAP approved with ${ppap.issueCount} related issue(s)`,
      title: `Check PPAP/IQC history for part ${ppap.partNumber} (${ppap.supplierName})`,
      href: ppap.href,
      suggestedOwner: "Supplier Quality Manager",
      category: "ppap",
    })
  }

  actionItems.sort((a, b) => {
    const priorityOrder: Record<string, number> = { critical: 3, high: 2, medium: 1 }
    return (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0)
  })

  return {
    kpis: {
      criticalHighFieldIssues,
      openDefects8d,
      overdueActions,
      highRiskSupplierParts,
      repeatIssues: intelligenceSummary.repeatIssueCount,
      ppapApprovedWithIssues: intelligenceSummary.ppapIssueCount,
      fmeaCoverageGaps: intelligenceSummary.fmeaCoverageGapCount,
    },
    topRisks,
    supplierAttention: supplierAttention.slice(0, 10),
    slaEscalationAttention: slaEscalationAttention.slice(0, 20),
    repeatIssueSummary,
    ppapIqcFieldSignals,
    fmeaCoverageSignals,
    actionRequiredList: actionItems.slice(0, 10),
  }
}