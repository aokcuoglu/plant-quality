import { prisma } from "@/lib/prisma"
import type { IqcResult } from "@plantx/db/client"
import type {
  PpapPostApprovalIssueSignal,
  FmeaCoverageGapSignal,
  IqcRejectionSignal,
  RepeatIssueSignal,
  QualityIntelligenceSummary,
  SupplierPartRisk,
} from "./types"
import { computeSupplierPartRisks } from "./risk-score"

interface SessionUser {
  companyId: string
  companyType: string
  role: string
  plan?: string | null
}

const NEGATIVE_IQC_RESULTS: IqcResult[] = ["REJECTED", "ON_HOLD", "REWORK_REQUIRED", "SORTING_REQUIRED"]

function buildOemHref(prefix: string, id: string): string {
  if (!id) return "#"
  return `${prefix}/${id}`
}

export async function getPpapPostApprovalIssueSignals(session: SessionUser): Promise<PpapPostApprovalIssueSignal[]> {
  const companyId = session.companyId
  if (session.companyType !== "OEM") return []

  const approvedPaps = await prisma.ppapSubmission.findMany({
    where: { oemId: companyId, status: "APPROVED", partNumber: { not: "" } },
    select: {
      id: true,
      requestNumber: true,
      partNumber: true,
      partName: true,
      supplierId: true,
      supplier: { select: { id: true, name: true } },
      approvedAt: true,
      status: true,
    },
  })

  if (approvedPaps.length === 0) return []

  const signals: PpapPostApprovalIssueSignal[] = []

  for (const ppap of approvedPaps) {
    const issueTypes: string[] = []
    let issueCount = 0
    let latestIssueDate: Date | null = null
    const approvedAt = ppap.approvedAt

    const iqcIssues = await prisma.iqcReport.findMany({
      where: {
        oemId: companyId,
        supplierId: ppap.supplierId,
        partNumber: ppap.partNumber,
        result: { in: NEGATIVE_IQC_RESULTS },
        ...(approvedAt ? { inspectionDate: { gte: approvedAt } } : {}),
      },
      select: { id: true, result: true, inspectionNumber: true, inspectionDate: true },
      orderBy: { inspectionDate: "desc" },
      take: 5,
    })

    if (iqcIssues.length > 0) {
      issueTypes.push("IQC_REJECTION")
      issueCount += iqcIssues.length
      const latestDate = iqcIssues[0].inspectionDate
      if (latestDate && (!latestIssueDate || new Date(latestDate) > new Date(latestIssueDate))) {
        latestIssueDate = latestDate
      }
    }

    const fieldDefects = await prisma.fieldDefect.findMany({
      where: {
        oemId: companyId,
        supplierId: ppap.supplierId,
        partNumber: ppap.partNumber,
        deletedAt: null,
        ...(approvedAt ? { reportDate: { gte: approvedAt } } : {}),
      },
      select: { id: true, title: true, status: true, reportDate: true },
      orderBy: { reportDate: "desc" },
      take: 5,
    })

    if (fieldDefects.length > 0) {
      issueTypes.push("FIELD_DEFECT")
      issueCount += fieldDefects.length
      const latestDate = fieldDefects[0].reportDate
      if (latestDate && (!latestIssueDate || new Date(latestDate) > new Date(latestIssueDate))) {
        latestIssueDate = latestDate
      }
    }

    const defects = await prisma.defect.findMany({
      where: {
        oemId: companyId,
        supplierId: ppap.supplierId,
        partNumber: ppap.partNumber,
        ...(approvedAt ? { createdAt: { gte: approvedAt } } : {}),
      },
      select: { id: true, description: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    if (defects.length > 0) {
      issueTypes.push("DEFECT_8D")
      issueCount += defects.length
      const latestDate = defects[0].createdAt
      if (latestDate && (!latestIssueDate || new Date(latestDate) > new Date(latestIssueDate))) {
        latestIssueDate = latestDate
      }
    }

    if (issueCount > 0) {
      signals.push({
        ppapId: ppap.id,
        ppapRequestNumber: ppap.requestNumber,
        supplierId: ppap.supplierId,
        supplierName: ppap.supplier.name,
        partNumber: ppap.partNumber,
        partName: ppap.partName,
        ppapApprovedAt: ppap.approvedAt,
        ppapStatus: ppap.status,
        issueCount,
        issueTypes,
        latestIssueDate,
        iqcIssues: iqcIssues.map((i) => ({
          id: i.id,
          result: i.result ?? "",
          inspectionNumber: i.inspectionNumber,
          inspectionDate: i.inspectionDate,
        })),
        fieldDefects: fieldDefects.map((f) => ({
          id: f.id,
          title: f.title,
          status: f.status,
          reportDate: f.reportDate,
        })),
        defects8d: defects.map((d) => ({
          id: d.id,
          description: d.description,
          status: d.status,
          createdAt: d.createdAt,
        })),
        href: buildOemHref("/quality/oem/ppap", ppap.id),
      })
    }
  }

  return signals
}

export async function getFmeaCoverageGapSignals(session: SessionUser): Promise<FmeaCoverageGapSignal[]> {
  const companyId = session.companyId
  if (session.companyType !== "OEM") return []

  const fieldDefects = await prisma.fieldDefect.findMany({
    where: {
      oemId: companyId,
      deletedAt: null,
      category: { not: null },
      supplierId: { not: null },
      partNumber: { not: null, notIn: [""] },
    },
    select: {
      id: true,
      title: true,
      supplierId: true,
      supplier: { select: { id: true, name: true } },
      partNumber: true,
      category: true,
      subcategory: true,
    },
  })

  const defects = await prisma.defect.findMany({
    where: { oemId: companyId, partNumber: { not: "" } },
    select: {
      id: true,
      description: true,
      supplierId: true,
      supplier: { select: { id: true, name: true } },
      partNumber: true,
    },
  })

  const fmeas = await prisma.fmea.findMany({
    where: { oemId: companyId, supplierId: { not: null }, partNumber: { not: "" } },
    select: {
      id: true,
      fmeaNumber: true,
      partNumber: true,
      supplierId: true,
      status: true,
      rows: true,
    },
  })

  const fmeaMap = new Map<string, { id: string; fmeaNumber: string; rows: unknown[] }>()
  for (const f of fmeas) {
    if (!f.supplierId || !f.partNumber) continue
    const key = `${f.supplierId}::${f.partNumber}`
    if (!fmeaMap.has(key)) {
      fmeaMap.set(key, { id: f.id, fmeaNumber: f.fmeaNumber, rows: (f.rows as unknown[]) ?? [] })
    }
  }

  function hasFailureModeOverlap(fmeaRows: unknown[], text: string | null): boolean {
    if (!text || fmeaRows.length === 0) return false
    const normalized = text.toLowerCase().trim()
    const words = normalized.split(/\s+/).filter((w) => w.length >= 3)
    if (words.length === 0) return false

    for (const row of fmeaRows) {
      const r = row as Record<string, unknown>
      const failureMode = typeof r.failureMode === "string" ? r.failureMode.toLowerCase() : ""
      if (!failureMode) continue
      for (const word of words) {
        if (failureMode.includes(word)) return true
      }
    }
    return false
  }

  function buildFailureText(category: string | null, subcategory: string | null, title: string | null): string | null {
    const parts = [category, subcategory, title].filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    const unique = [...new Set(parts)]
    if (unique.length === 0) return null
    const separator = unique.length > 1 ? " — " : ""
    return unique.join(separator)
  }

  const signals: FmeaCoverageGapSignal[] = []

  for (const fd of fieldDefects) {
    const failureText = buildFailureText(fd.category, fd.subcategory, fd.title)
    if (!failureText || failureText.trim().length < 3) continue
    if (!fd.supplierId || !fd.partNumber) continue

    const key = `${fd.supplierId}::${fd.partNumber}`
    const fmeaEntry = fmeaMap.get(key)

    if (!fmeaEntry) {
      const anyFmeaForPart = fmeas.find((f) => f.partNumber === fd.partNumber)
      signals.push({
        sourceId: fd.id,
        sourceType: "FIELD_DEFECT",
        sourceTitle: fd.title,
        supplierId: fd.supplierId,
        supplierName: fd.supplier?.name ?? null,
        partNumber: fd.partNumber,
        category: fd.category,
        subcategory: fd.subcategory,
        failureText,
        hasRelatedFmea: !!anyFmeaForPart,
        fmeaId: null,
        fmeaNumber: null,
        fmeaFailureModeMatch: false,
        gapReason: anyFmeaForPart
          ? "Field defect category not covered by existing FMEA failure modes for this supplier"
          : "No FMEA exists for this supplier + part combination",
        sourceHref: buildOemHref("/quality/oem/field", fd.id),
        fmeaHref: null,
      })
    } else {
      const overlap = hasFailureModeOverlap(fmeaEntry.rows, fd.category) || hasFailureModeOverlap(fmeaEntry.rows, fd.subcategory)
      if (!overlap) {
        signals.push({
          sourceId: fd.id,
          sourceType: "FIELD_DEFECT",
          sourceTitle: fd.title,
          supplierId: fd.supplierId,
          supplierName: fd.supplier?.name ?? null,
          partNumber: fd.partNumber,
          category: fd.category,
          subcategory: fd.subcategory,
          failureText,
          hasRelatedFmea: true,
          fmeaId: fmeaEntry.id,
          fmeaNumber: fmeaEntry.fmeaNumber,
          fmeaFailureModeMatch: false,
          gapReason: "Field defect category not covered by existing FMEA failure modes for this supplier",
          sourceHref: buildOemHref("/quality/oem/field", fd.id),
          fmeaHref: buildOemHref("/quality/oem/fmea", fmeaEntry.id),
        })
      }
    }
  }

  for (const d of defects) {
    if (!d.partNumber || !d.supplierId) continue
    const failureText = d.description
    if (!failureText || failureText.trim().length < 3) continue

    const key = `${d.supplierId}::${d.partNumber}`
    const fmeaEntry = fmeaMap.get(key)

    if (!fmeaEntry) {
      signals.push({
        sourceId: d.id,
        sourceType: "DEFECT",
        sourceTitle: d.description.substring(0, 80),
        supplierId: d.supplierId,
        supplierName: d.supplier?.name ?? null,
        partNumber: d.partNumber,
        category: null,
        subcategory: null,
        failureText,
        hasRelatedFmea: false,
        fmeaId: null,
        fmeaNumber: null,
        fmeaFailureModeMatch: false,
        gapReason: "No FMEA exists for this supplier + part combination",
        sourceHref: buildOemHref("/quality/oem/defects", d.id),
        fmeaHref: null,
      })
    }
  }

  const seen = new Set<string>()
  return signals.filter((s) => {
    const key = `${s.sourceType}::${s.sourceId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function getIqcRejectionSignals(session: SessionUser): Promise<IqcRejectionSignal[]> {
  const companyId = session.companyId
  if (session.companyType !== "OEM") return []

  const rejectedInspections = await prisma.iqcReport.findMany({
    where: {
      oemId: companyId,
      result: { in: NEGATIVE_IQC_RESULTS },
      partNumber: { not: "" },
    },
    select: {
      id: true,
      inspectionNumber: true,
      partNumber: true,
      partName: true,
      supplierId: true,
      supplier: { select: { id: true, name: true } },
      result: true,
      inspectionDate: true,
      linkedDefectId: true,
    },
    orderBy: { inspectionDate: "desc" },
  })

  const groups = new Map<string, {
    supplierId: string
    supplierName: string
    partNumber: string
    partName: string | null
    inspections: typeof rejectedInspections
    latestResult: string
    latestDate: Date | null
    latestInspectionNumber: string | null
  }>()

  for (const iqc of rejectedInspections) {
    const key = `${iqc.supplierId}::${iqc.partNumber}`
    if (!groups.has(key)) {
      groups.set(key, {
        supplierId: iqc.supplierId,
        supplierName: iqc.supplier.name,
        partNumber: iqc.partNumber,
        partName: iqc.partName,
        inspections: [],
        latestResult: iqc.result ?? "UNKNOWN",
        latestDate: iqc.inspectionDate,
        latestInspectionNumber: iqc.inspectionNumber,
      })
    }
    const group = groups.get(key)!
    group.inspections.push(iqc)
    if (iqc.inspectionDate && (!group.latestDate || iqc.inspectionDate > group.latestDate)) {
      group.latestDate = iqc.inspectionDate
      group.latestResult = iqc.result ?? "UNKNOWN"
      group.latestInspectionNumber = iqc.inspectionNumber
    }
  }

  const signals: IqcRejectionSignal[] = []

  for (const group of groups.values()) {
    const hasLinked8d = group.inspections.some((i) => i.linkedDefectId !== null)

    signals.push({
      supplierId: group.supplierId,
      supplierName: group.supplierName,
      partNumber: group.partNumber,
      partName: group.partName,
      rejectionCount: group.inspections.length,
      latestResult: group.latestResult,
      latestInspectionDate: group.latestDate,
      latestInspectionNumber: group.latestInspectionNumber,
      hasLinked8d: hasLinked8d,
      inspections: group.inspections.map((i) => ({
        id: i.id,
        inspectionNumber: i.inspectionNumber,
        result: i.result ?? "UNKNOWN",
        inspectionDate: i.inspectionDate,
        partName: i.partName,
        linkedDefectId: i.linkedDefectId,
        href: buildOemHref("/quality/oem/iqc", i.id),
      })),
    })
  }

  return signals.sort((a, b) => b.rejectionCount - a.rejectionCount)
}

export async function getRepeatIssueSignals(session: SessionUser): Promise<RepeatIssueSignal[]> {
  const companyId = session.companyId
  if (session.companyType !== "OEM") return []

  const supplierMap = new Map<string, string>()

  const fieldDefects = await prisma.fieldDefect.findMany({
    where: { oemId: companyId, deletedAt: null, partNumber: { not: null, notIn: [""] }, supplierId: { not: null } },
    select: { id: true, title: true, status: true, reportDate: true, partNumber: true, supplierId: true, supplier: { select: { id: true, name: true } } },
    orderBy: { reportDate: "desc" },
  })

  for (const fd of fieldDefects) {
    if (fd.supplier?.id) supplierMap.set(fd.supplier.id, fd.supplier.name)
  }

  const defects = await prisma.defect.findMany({
    where: { oemId: companyId, partNumber: { not: "" } },
    select: { id: true, description: true, status: true, createdAt: true, partNumber: true, supplierId: true, supplier: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })

  for (const d of defects) {
    if (d.supplier?.id) supplierMap.set(d.supplier.id, d.supplier.name)
  }

  const iqcRejections = await prisma.iqcReport.findMany({
    where: { oemId: companyId, result: { in: NEGATIVE_IQC_RESULTS }, partNumber: { not: "" } },
    select: { id: true, inspectionNumber: true, result: true, partNumber: true, supplierId: true, supplier: { select: { id: true, name: true } } },
  })

  for (const i of iqcRejections) {
    if (i.supplier) supplierMap.set(i.supplier.id, i.supplier.name)
  }

  const groups = new Map<string, {
    supplierId: string
    partNumber: string
    fieldDefects: { id: string; title: string; status: string; reportDate: Date | null; href: string }[]
    defects8d: { id: string; description: string; status: string; createdAt: Date | null; href: string }[]
    iqcInspections: { id: string; inspectionNumber: string; result: string; href: string }[]
  }>()

  function getKey(supplierId: string | null, partNumber: string | null): string | null {
    if (!supplierId || !partNumber) return null
    return `${supplierId}::${partNumber}`
  }

  for (const fd of fieldDefects) {
    const key = getKey(fd.supplierId, fd.partNumber)
    if (!key) continue
    if (!groups.has(key)) {
      groups.set(key, { supplierId: fd.supplierId!, partNumber: fd.partNumber!, fieldDefects: [], defects8d: [], iqcInspections: [] })
    }
    groups.get(key)!.fieldDefects.push({
      id: fd.id, title: fd.title, status: fd.status, reportDate: fd.reportDate,
      href: buildOemHref("/quality/oem/field", fd.id),
    })
  }

  for (const d of defects) {
    const key = getKey(d.supplierId, d.partNumber)
    if (!key) continue
    if (!groups.has(key)) {
      groups.set(key, { supplierId: d.supplierId!, partNumber: d.partNumber, fieldDefects: [], defects8d: [], iqcInspections: [] })
    }
    groups.get(key)!.defects8d.push({
      id: d.id, description: d.description, status: d.status, createdAt: d.createdAt,
      href: buildOemHref("/quality/oem/defects", d.id),
    })
  }

  for (const i of iqcRejections) {
    const key = getKey(i.supplierId, i.partNumber)
    if (!key) continue
    if (!groups.has(key)) {
      groups.set(key, { supplierId: i.supplierId!, partNumber: i.partNumber, fieldDefects: [], defects8d: [], iqcInspections: [] })
    }
    groups.get(key)!.iqcInspections.push({
      id: i.id, inspectionNumber: i.inspectionNumber, result: i.result ?? "UNKNOWN",
      href: buildOemHref("/quality/oem/iqc", i.id),
    })
  }

  const manualLinks = await prisma.qualityRecordLink.findMany({
    where: {
      companyId,
      linkType: "MANUAL",
    },
    select: {
      sourceType: true,
      sourceId: true,
      targetType: true,
      targetId: true,
    },
  })

  const linkedIds = new Set<string>()
  for (const link of manualLinks) {
    linkedIds.add(`${link.sourceType}::${link.sourceId}`)
    linkedIds.add(`${link.targetType}::${link.targetId}`)
  }

  const signals: RepeatIssueSignal[] = []

  for (const group of groups.values()) {
    const totalCount = group.fieldDefects.length + group.defects8d.length + group.iqcInspections.length
    if (totalCount < 2) continue

    const isManuallyLinked = group.fieldDefects.some((fd) => linkedIds.has(`FIELD_DEFECT::${fd.id}`)) ||
      group.defects8d.some((d) => linkedIds.has(`DEFECT::${d.id}`) || linkedIds.has(`EIGHT_D::${d.id}`)) ||
      group.iqcInspections.some((i) => linkedIds.has(`IQC::${i.id}`))

    signals.push({
      supplierId: group.supplierId,
      supplierName: supplierMap.get(group.supplierId) ?? "Unknown",
      partNumber: group.partNumber,
      partName: null,
      fieldDefectCount: group.fieldDefects.length,
      defect8dCount: group.defects8d.length,
      iqcIssueCount: group.iqcInspections.length,
      totalCount,
      linkedByManualLink: isManuallyLinked,
      fieldDefects: group.fieldDefects.slice(0, 5),
      defects8d: group.defects8d.slice(0, 5),
      iqcInspections: group.iqcInspections.slice(0, 5),
    })
  }

  return signals.sort((a, b) => b.totalCount - a.totalCount)
}

export async function getSupplierPartRiskSignals(session: SessionUser): Promise<SupplierPartRisk[]> {
  const companyId = session.companyId
  if (session.companyType !== "OEM") return []

  const ppapIssueSignals = await getPpapPostApprovalIssueSignals(session)
  const fmeaGapSignals = await getFmeaCoverageGapSignals(session)
  const iqcSignals = await getIqcRejectionSignals(session)
  const repeatSignals = await getRepeatIssueSignals(session)

  const supplierMap = new Map<string, string>()
  const supplierIds = [...new Set([
    ...ppapIssueSignals.map((s) => s.supplierId),
    ...iqcSignals.map((s) => s.supplierId),
    ...repeatSignals.map((s) => s.supplierId),
  ])]
  const companies = await prisma.company.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  })
  for (const c of companies) supplierMap.set(c.id, c.name)

  const fieldDefects = await prisma.fieldDefect.findMany({
    where: { oemId: companyId, deletedAt: null, supplierId: { not: null }, partNumber: { not: null, notIn: [""] } },
    select: { supplierId: true, partNumber: true, reportDate: true, supplier: { select: { id: true, name: true } } },
  })
  for (const fd of fieldDefects) {
    if (fd.supplier?.id) supplierMap.set(fd.supplier.id, fd.supplier.name)
  }

  const allDefects = await prisma.defect.findMany({
    where: { oemId: companyId, partNumber: { not: "" } },
    select: { supplierId: true, partNumber: true, createdAt: true, status: true, supplier: { select: { id: true, name: true } } },
  })
  for (const d of allDefects) {
    if (d.supplier?.id) supplierMap.set(d.supplier.id, d.supplier.name)
  }

  const highRpnFmeas = await prisma.fmea.findMany({
    where: { oemId: companyId, supplierId: { not: null }, partNumber: { not: "" } },
    select: { id: true, partNumber: true, supplierId: true, rows: true },
  })

  const highRpnEntries: { supplierId: string; partNumber: string; maxRpn: number }[] = []
  for (const fmea of highRpnFmeas) {
    if (!fmea.supplierId || !fmea.partNumber) continue
    const rows = (fmea.rows as unknown[]) ?? []
    let maxRpn = 0
    for (const row of rows) {
      const r = row as Record<string, unknown>
      const rpn: number = Number.isFinite(r.rpn) ? (r.rpn as number) : 0
      if (rpn > maxRpn) maxRpn = rpn
    }
    if (maxRpn >= 100) {
      highRpnEntries.push({ supplierId: fmea.supplierId, partNumber: fmea.partNumber, maxRpn })
    }
  }

  const open8dDefects = allDefects.filter((d) => d.status === "OPEN" || d.status === "IN_PROGRESS")

  const manualLinks = await prisma.qualityRecordLink.findMany({
    where: { companyId },
    select: {
      sourceType: true,
      sourceId: true,
      targetType: true,
      targetId: true,
    },
  })

  const linkSourceIds = new Map<string, { type: string; field: "source" | "target" }[]>()
  const linkTargetIds = new Map<string, { type: string; field: "source" | "target" }[]>()

  for (const link of manualLinks) {
    const sk = `${link.sourceType}::${link.sourceId}`
    const tk = `${link.targetType}::${link.targetId}`
    if (!linkSourceIds.has(sk)) linkSourceIds.set(sk, [])
    linkSourceIds.get(sk)!.push({ type: link.sourceType, field: "source" })
    if (!linkTargetIds.has(tk)) linkTargetIds.set(tk, [])
    linkTargetIds.get(tk)!.push({ type: link.targetType, field: "target" })
  }

  type SupplierPart = { supplierId: string | null; partNumber: string | null }

  const [fieldDefectsForLinks, defectsForLinks, ppapsForLinks, iqcsForLinks, fmeasForLinks] = await Promise.all([
    manualLinks.length > 0 ? prisma.fieldDefect.findMany({
      where: { id: { in: [...new Set([...manualLinks.filter(l => l.sourceType === "FIELD_DEFECT" || l.targetType === "FIELD_DEFECT").map(l => l.sourceType === "FIELD_DEFECT" ? l.sourceId : l.targetId)])] } },
      select: { id: true, supplierId: true, partNumber: true },
    }) : [],
    manualLinks.length > 0 ? prisma.defect.findMany({
      where: { id: { in: [...new Set([...manualLinks.filter(l => l.sourceType === "DEFECT" || l.sourceType === "EIGHT_D" || l.targetType === "DEFECT" || l.targetType === "EIGHT_D").flatMap(l => [l.sourceId, l.targetId])])] } },
      select: { id: true, supplierId: true, partNumber: true },
    }) : [],
    manualLinks.length > 0 ? prisma.ppapSubmission.findMany({
      where: { id: { in: [...new Set([...manualLinks.filter(l => l.sourceType === "PPAP" || l.targetType === "PPAP").flatMap(l => [l.sourceId, l.targetId])])] } },
      select: { id: true, supplierId: true, partNumber: true },
    }) : [],
    manualLinks.length > 0 ? prisma.iqcReport.findMany({
      where: { id: { in: [...new Set([...manualLinks.filter(l => l.sourceType === "IQC" || l.targetType === "IQC").flatMap(l => [l.sourceId, l.targetId])])] } },
      select: { id: true, supplierId: true, partNumber: true },
    }) : [],
    manualLinks.length > 0 ? prisma.fmea.findMany({
      where: { id: { in: [...new Set([...manualLinks.filter(l => l.sourceType === "FMEA" || l.targetType === "FMEA").flatMap(l => [l.sourceId, l.targetId])])] } },
      select: { id: true, supplierId: true, partNumber: true },
    }) : [],
  ])

  const recordLookup = new Map<string, SupplierPart>()
  for (const r of fieldDefectsForLinks) recordLookup.set(`FIELD_DEFECT::${r.id}`, { supplierId: r.supplierId, partNumber: r.partNumber })
  for (const r of defectsForLinks) { recordLookup.set(`DEFECT::${r.id}`, { supplierId: r.supplierId, partNumber: r.partNumber }); recordLookup.set(`EIGHT_D::${r.id}`, { supplierId: r.supplierId, partNumber: r.partNumber }) }
  for (const r of ppapsForLinks) recordLookup.set(`PPAP::${r.id}`, { supplierId: r.supplierId, partNumber: r.partNumber })
  for (const r of iqcsForLinks) recordLookup.set(`IQC::${r.id}`, { supplierId: r.supplierId, partNumber: r.partNumber })
  for (const r of fmeasForLinks) recordLookup.set(`FMEA::${r.id}`, { supplierId: r.supplierId, partNumber: r.partNumber })

  const linkSourceDetails = manualLinks.map((link) => {
    const source = recordLookup.get(`${link.sourceType}::${link.sourceId}`)
    const target = recordLookup.get(`${link.targetType}::${link.targetId}`)
    return {
      sourceSupplierId: source?.supplierId ?? null,
      sourcePartNumber: source?.partNumber ?? null,
      targetSupplierId: target?.supplierId ?? null,
      targetPartNumber: target?.partNumber ?? null,
    }
  })

  return computeSupplierPartRisks(
    {
      ppapIssues: ppapIssueSignals.map((s) => ({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        partNumber: s.partNumber,
        partName: s.partName,
        ppapApprovedAt: s.ppapApprovedAt,
        issueTypes: s.issueTypes,
      })),
      fmeaGaps: fmeaGapSignals.map((s) => ({
        supplierId: s.supplierId,
        partNumber: s.partNumber,
        sourceTitle: s.sourceTitle,
      })),
      iqcRejections: iqcSignals.map((s) => ({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        partNumber: s.partNumber,
        partName: s.partName,
        rejectionCount: s.rejectionCount,
        latestDate: s.latestInspectionDate,
      })),
      repeatIssues: repeatSignals.map((s) => ({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        partNumber: s.partNumber,
        partName: s.partName,
        totalCount: s.totalCount,
        latestDate: s.fieldDefects[0]?.reportDate ?? s.defects8d[0]?.createdAt ?? null,
      })),
      fieldDefects: fieldDefects.map((fd) => ({
        supplierId: fd.supplierId,
        supplierName: fd.supplier?.name ?? null,
        partNumber: fd.partNumber,
        reportDate: fd.reportDate,
      })),
      defects8d: allDefects.map((d) => ({
        supplierId: d.supplierId,
        partNumber: d.partNumber,
        createdAt: d.createdAt,
        status: d.status,
      })),
      highRpnFmeas: highRpnEntries,
      open8d: open8dDefects.map((d) => ({
        supplierId: d.supplierId,
        partNumber: d.partNumber,
        dueDate: null,
      })),
      manualLinks: linkSourceDetails,
    },
    supplierMap,
  )
}

export async function getQualityIntelligenceSummary(session: SessionUser): Promise<QualityIntelligenceSummary> {
  const companyId = session.companyId
  if (session.companyType !== "OEM") {
    return {
      totalSupplierParts: 0,
      highRiskCount: 0,
      criticalRiskCount: 0,
      ppapIssueCount: 0,
      fmeaCoverageGapCount: 0,
      iqcRejectionSignalCount: 0,
      repeatIssueCount: 0,
      totalFieldDefects: 0,
      totalOpenDefects: 0,
      totalOverdueFieldDefects: 0,
      totalCriticalFieldDefects: 0,
    }
  }

  const [ppapIssues, fmeaGaps, iqcRejections, repeatIssues, riskSignals, totalFieldDefects, openDefects, overdueFd, criticalFd] = await Promise.all([
    getPpapPostApprovalIssueSignals(session),
    getFmeaCoverageGapSignals(session),
    getIqcRejectionSignals(session),
    getRepeatIssueSignals(session),
    getSupplierPartRiskSignals(session),
    prisma.fieldDefect.count({ where: { oemId: companyId, deletedAt: null } }),
    prisma.defect.count({ where: { oemId: companyId, status: { in: ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"] } } }),
    prisma.fieldDefect.count({
      where: {
        oemId: companyId,
        deletedAt: null,
        status: { in: ["OPEN", "UNDER_REVIEW", "SUPPLIER_ASSIGNED"] },
        OR: [
          { responseDueAt: { lt: new Date() } },
          { resolutionDueAt: { lt: new Date() } },
        ],
      },
    }),
    prisma.fieldDefect.count({
      where: { oemId: companyId, deletedAt: null, severity: "CRITICAL" },
    }),
  ])

  return {
    totalSupplierParts: riskSignals.length,
    highRiskCount: riskSignals.filter((r) => r.riskLevel === "high" || r.riskLevel === "critical").length,
    criticalRiskCount: riskSignals.filter((r) => r.riskLevel === "critical").length,
    ppapIssueCount: ppapIssues.length,
    fmeaCoverageGapCount: fmeaGaps.length,
    iqcRejectionSignalCount: iqcRejections.length,
    repeatIssueCount: repeatIssues.length,
    totalFieldDefects,
    totalOpenDefects: openDefects,
    totalOverdueFieldDefects: overdueFd,
    totalCriticalFieldDefects: criticalFd,
  }
}