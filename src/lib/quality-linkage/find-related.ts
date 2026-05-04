import { prisma } from "@/lib/prisma"
import type { QualityRecordType, QualityLinkType } from "@/generated/prisma/client"
import type { GroupedRelatedRecords, Confidence } from "./types"
import {
  QUALITY_RECORD_TYPE_LABELS,
  SCORE_MANUAL,
  SCORE_DIRECT,
  SCORE_THRESHOLD,
  DEFAULT_GROUP_LIMIT,
  MAX_TOTAL_RESULTS,
  confidenceFromScore,
} from "./types"

interface SessionUser {
  companyId: string
  companyType: string
  role: string
  plan?: string | null
}

type SupplierScope = { oemId: string; supplierId: string | null; isSupplier: boolean; companySupplierId: string }

function getSupplierScope(session: SessionUser, oemId: string, sourceSupplierId: string | null): SupplierScope {
  const isSupplier = session.companyType === "SUPPLIER"
  const supplierId = sourceSupplierId
  return { oemId, supplierId, isSupplier, companySupplierId: session.companyId }
}

function buildHref(recordType: QualityRecordType, id: string, companyType: string): string {
  const prefix = companyType === "SUPPLIER" ? "/quality/supplier" : "/quality/oem"
  switch (recordType) {
    case "FIELD_DEFECT":
      return `${prefix}/field/${id}`
    case "DEFECT":
    case "EIGHT_D":
      return `${prefix}/defects/${id}`
    case "PPAP":
      return `${prefix}/ppap/${id}`
    case "IQC":
      return `${prefix}/iqc/${id}`
    case "FMEA":
      return `${prefix}/fmea/${id}`
  }
}

function statusLabel(recordType: QualityRecordType, status: string | null): string {
  if (!status) return "—"
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

const MATCH_SCORES = {
  MANUAL: SCORE_MANUAL,
  DIRECT_LINK: SCORE_DIRECT,
  SAME_PART_EXACT: 60,
  SAME_SUPPLIER_WITH_PART: 15,
  SAME_SUPPLIER_ONLY: 15,
  SAME_FAILURE_MODE_EXACT: 30,
  SAME_CATEGORY_SUBCATEGORY: 15,
  SAME_VEHICLE: 10,
  SAME_VEHICLE_WITH_PART: 5,
  TITLE_KEYWORD_STRONG: 25,
  TITLE_KEYWORD_WEAK: 10,
  IQC_REJECTION_BONUS: 20,
  IQC_ON_HOLD_BONUS: 10,
  PPAP_APPROVED_SAME_PART: 15,
  FMEA_FAILURE_MODE_MATCH: 25,
} as const

const MIN_KEYWORD_LENGTH = 4
const STOP_WORDS = new Set([
  "the", "and", "for", "was", "with", "this", "that", "from", "into", "has",
  "have", "been", "are", "not", "but", "had", "they", "their", "were", "will",
  "would", "could", "should", "which", "when", "what", "your", "its", "our",
  "all", "may", "also", "any", "can", "did", "does", "get", "how", "just",
  "more", "must", "new", "now", "one", "only", "our", "out", "over", "see",
  "some", "such", "than", "them", "then", "very", "way", "who", "why",
])

function tokenize(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= MIN_KEYWORD_LENGTH && !STOP_WORDS.has(t))
}

function keywordOverlapScore(a: string | null | undefined, b: string | null | undefined): number {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)
  if (tokensA.length === 0 || tokensB.length === 0) return 0
  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  let overlap = 0
  for (const t of setA) {
    if (setB.has(t)) overlap++
  }
  if (overlap === 0) return 0
  if (overlap >= 3) return MATCH_SCORES.TITLE_KEYWORD_STRONG
  if (overlap >= 2) return MATCH_SCORES.TITLE_KEYWORD_WEAK
  return 0
}

interface ScoredMatch {
  recordType: QualityRecordType
  id: string
  title: string
  status: string
  statusLabel: string
  supplier: string | null
  partNumber: string | null
  createdAt: Date
  matchReasons: QualityLinkType[]
  href: string
  score: number
  confidence: Confidence
}

function computeConfidence(score: number): Confidence {
  return confidenceFromScore(score)
}

function filterAndSort(records: ScoredMatch[]): ScoredMatch[] {
  const filtered = records.filter(r => r.score >= SCORE_THRESHOLD || r.confidence === "direct")
  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  return filtered
}

function groupRecords(records: ScoredMatch[]): GroupedRelatedRecords[] {
  const filtered = filterAndSort(records)
  const groups = new Map<QualityRecordType, ScoredMatch[]>()
  for (const r of filtered) {
    const existing = groups.get(r.recordType) ?? []
    existing.push(r)
    groups.set(r.recordType, existing)
  }
  const typeOrder: QualityRecordType[] = ["FIELD_DEFECT", "DEFECT", "EIGHT_D", "PPAP", "IQC", "FMEA"]
  let totalAllocated = 0
  const result: GroupedRelatedRecords[] = []
  for (const t of typeOrder) {
    if (totalAllocated >= MAX_TOTAL_RESULTS) break
    const recs = groups.get(t)
    if (recs && recs.length > 0) {
      const remaining = MAX_TOTAL_RESULTS - totalAllocated
      const limit = Math.min(DEFAULT_GROUP_LIMIT, remaining)
      const sliced = recs.slice(0, limit)
      totalAllocated += sliced.length
      result.push({
        recordType: t,
        label: QUALITY_RECORD_TYPE_LABELS[t],
        records: sliced.map(({ score, ...rest }) => ({ ...rest, score })),
      })
    }
  }
  return result
}

function dedupRecords(records: ScoredMatch[]): ScoredMatch[] {
  const seen = new Map<string, ScoredMatch>()
  for (const r of records) {
    const key = `${r.recordType}:${r.id}`
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, r)
    } else {
      const mergedReasons = new Set([...existing.matchReasons, ...r.matchReasons])
      existing.matchReasons = [...mergedReasons]
      existing.score = Math.max(existing.score, r.score)
      existing.confidence = computeConfidence(existing.score)
    }
  }
  return [...seen.values()]
}

function isIqcRejectedOrOnHold(status: string | null): boolean {
  if (!status) return false
  const s = status.toUpperCase()
  return s === "REJECTED" || s === "ON_HOLD" || s === "FAILED" || s.includes("REJECT") || s.includes("HOLD")
}

function isPpapApproved(status: string | null): boolean {
  if (!status) return false
  return status.toUpperCase() === "APPROVED"
}

export async function findRelatedForFieldDefect(
  fieldDefectId: string,
  session: SessionUser,
): Promise<GroupedRelatedRecords[]> {
  const { companyId, companyType } = session
  const isSupplier = companyType === "SUPPLIER"

  const fd = await prisma.fieldDefect.findFirst({
    where: {
      id: fieldDefectId,
      ...(isSupplier ? { supplierId: companyId } : { oemId: companyId }),
      deletedAt: null,
    },
  })
  if (!fd) return []

  const oemId = isSupplier ? fd.oemId : companyId
  const supplierId = fd.supplierId
  const scope = getSupplierScope(session, oemId, supplierId)
  const records: ScoredMatch[] = []

  if (fd.linkedDefectId) {
    const where: Record<string, unknown> = { id: fd.linkedDefectId, oemId }
    if (scope.isSupplier) where.supplierId = scope.companySupplierId
    const defect = await prisma.defect.findFirst({ where, include: { eightDReport: true } })
    if (defect) {
      records.push({
        recordType: "DEFECT",
        id: defect.id,
        title: defect.description,
        status: defect.status,
        statusLabel: statusLabel("DEFECT", defect.status),
        supplier: (await getSupplierName(defect.supplierId)) ?? null,
        partNumber: defect.partNumber ?? null,
        createdAt: defect.createdAt,
        matchReasons: ["FIELD_TO_8D"] as QualityLinkType[],
        href: buildHref("DEFECT", defect.id, companyType),
        score: SCORE_DIRECT,
        confidence: "direct",
      })
    }
  }

  if (supplierId) {
    const ppapWhere: Record<string, unknown> = { oemId, supplierId }
    if (scope.isSupplier) ppapWhere.supplierId = scope.companySupplierId
    const ppapRecords = await prisma.ppapSubmission.findMany({
      where: ppapWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    for (const p of ppapRecords) {
      const reasons: QualityLinkType[] = []
      let score = 0
      const partMatch = fd.partNumber && p.partNumber && fd.partNumber.toLowerCase() === p.partNumber.toLowerCase()
      if (partMatch) {
        reasons.push("SAME_PART")
        score += MATCH_SCORES.SAME_PART_EXACT
      }
      if (supplierId && p.supplierId === supplierId) {
        if (partMatch) {
          reasons.push("SAME_SUPPLIER")
          score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
        } else {
          reasons.push("SAME_SUPPLIER_ONLY")
          score += MATCH_SCORES.SAME_SUPPLIER_ONLY
        }
      }
      if (fd.vehicleModel && p.vehicleModel && fd.vehicleModel.toLowerCase() === p.vehicleModel.toLowerCase()) {
        reasons.push("SAME_VEHICLE")
        score += partMatch ? MATCH_SCORES.SAME_VEHICLE_WITH_PART : MATCH_SCORES.SAME_VEHICLE
      }
      if (isPpapApproved(p.status) && partMatch) {
        reasons.push("PPAP_REFERENCE")
        score += MATCH_SCORES.PPAP_APPROVED_SAME_PART
      }
      if (reasons.length > 0) {
        records.push({
          recordType: "PPAP",
          id: p.id,
          title: `${p.requestNumber} — ${p.partName || p.partNumber}`,
          status: p.status,
          statusLabel: statusLabel("PPAP", p.status),
          supplier: (await getSupplierName(p.supplierId)) ?? null,
          partNumber: p.partNumber,
          createdAt: p.createdAt,
          matchReasons: reasons,
          href: buildHref("PPAP", p.id, companyType),
          score,
          confidence: computeConfidence(score),
        })
      }
    }

    const iqcWhere: Record<string, unknown> = { oemId, supplierId }
    if (scope.isSupplier) iqcWhere.supplierId = scope.companySupplierId
    const iqcRecords = await prisma.iqcReport.findMany({
      where: iqcWhere,
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    for (const i of iqcRecords) {
      const reasons: QualityLinkType[] = []
      let score = 0
      const partMatch = fd.partNumber && i.partNumber && fd.partNumber.toLowerCase() === i.partNumber.toLowerCase()
      if (partMatch) {
        reasons.push("SAME_PART")
        score += MATCH_SCORES.SAME_PART_EXACT
      }
      if (supplierId && i.supplierId === supplierId) {
        if (partMatch) {
          reasons.push("SAME_SUPPLIER")
          score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
        } else {
          reasons.push("SAME_SUPPLIER_ONLY")
          score += MATCH_SCORES.SAME_SUPPLIER_ONLY
        }
      }
      if (fd.vehicleModel && i.vehicleModel && fd.vehicleModel.toLowerCase() === i.vehicleModel.toLowerCase()) {
        reasons.push("SAME_VEHICLE")
        score += partMatch ? MATCH_SCORES.SAME_VEHICLE_WITH_PART : MATCH_SCORES.SAME_VEHICLE
      }
      if (isIqcRejectedOrOnHold(i.result)) {
        if (partMatch) {
          reasons.push("IQC_REJECTION")
          score += MATCH_SCORES.IQC_REJECTION_BONUS
        }
      }
      if (reasons.length > 0) {
        records.push({
          recordType: "IQC",
          id: i.id,
          title: `${i.inspectionNumber} — ${i.partName || i.partNumber}`,
          status: i.status,
          statusLabel: statusLabel("IQC", i.status),
          supplier: (await getSupplierName(i.supplierId)) ?? null,
          partNumber: i.partNumber,
          createdAt: i.createdAt,
          matchReasons: reasons,
          href: buildHref("IQC", i.id, companyType),
          score,
          confidence: computeConfidence(score),
        })
      }
    }
  }

  {
    const fmeaWhere: Record<string, unknown> = { oemId }
    if (fd.partNumber) fmeaWhere.partNumber = { equals: fd.partNumber, mode: "insensitive" as const }
    if (supplierId) fmeaWhere.supplierId = supplierId
    if (scope.isSupplier) fmeaWhere.supplierId = scope.companySupplierId

    if (fd.partNumber || (supplierId && fd.category)) {
      const fmeaRecords = await prisma.fmea.findMany({
        where: fmeaWhere,
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      for (const f of fmeaRecords) {
        const reasons: QualityLinkType[] = []
        let score = 0
        const partMatch = fd.partNumber && f.partNumber && fd.partNumber.toLowerCase() === f.partNumber.toLowerCase()
        if (partMatch) {
          reasons.push("SAME_PART")
          score += MATCH_SCORES.SAME_PART_EXACT
        }
        if (supplierId && f.supplierId === supplierId) {
          if (partMatch) {
            reasons.push("SAME_SUPPLIER")
            score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
          } else {
            reasons.push("SAME_SUPPLIER_ONLY")
            score += MATCH_SCORES.SAME_SUPPLIER_ONLY
          }
        }
        if (fd.category && f.title) {
          const titleScore = keywordOverlapScore(fd.category, f.title)
          if (titleScore > 0) {
            reasons.push("FMEA_COVERAGE")
            score += MATCH_SCORES.FMEA_FAILURE_MODE_MATCH
          }
        }
        if (reasons.length > 0) {
          records.push({
            recordType: "FMEA",
            id: f.id,
            title: `${f.fmeaNumber} — ${f.title}`,
            status: f.status,
            statusLabel: statusLabel("FMEA", f.status),
            supplier: f.supplierId ? (await getSupplierName(f.supplierId)) : null,
            partNumber: f.partNumber,
            createdAt: f.createdAt,
            matchReasons: reasons,
            href: buildHref("FMEA", f.id, companyType),
            score,
            confidence: computeConfidence(score),
          })
        }
      }
    }
  }

  if (fd.partNumber || supplierId) {
    const defectOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (fd.partNumber) {
      defectOrConditions.push({ partNumber: { equals: fd.partNumber, mode: "insensitive" as const } })
    }
    if (scope.isSupplier) {
      defectOrConditions.push({ supplierId: scope.companySupplierId })
    } else if (supplierId) {
      defectOrConditions.push({ supplierId })
    }
    if (defectOrConditions.length > 0) {
      const defects = await prisma.defect.findMany({
        where: {
          oemId,
          ...(scope.isSupplier ? { supplierId: scope.companySupplierId } : {}),
          OR: defectOrConditions,
          ...(fd.linkedDefectId ? { id: { not: fd.linkedDefectId } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      for (const d of defects) {
        const reasons: QualityLinkType[] = []
        let score = 0
        const partMatch = fd.partNumber && d.partNumber && fd.partNumber.toLowerCase() === d.partNumber.toLowerCase()
        if (partMatch) {
          reasons.push("SAME_PART")
          score += MATCH_SCORES.SAME_PART_EXACT
        }
        if (supplierId && d.supplierId === supplierId) {
          if (partMatch) {
            reasons.push("SAME_SUPPLIER")
            score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
          } else {
            reasons.push("SAME_SUPPLIER_ONLY")
            score += MATCH_SCORES.SAME_SUPPLIER_ONLY
          }
        }
        if (fd.category && d.description && fd.category.toLowerCase() !== d.description.toLowerCase()) {
          const tokScore = keywordOverlapScore(fd.category, d.description)
          if (tokScore >= MATCH_SCORES.TITLE_KEYWORD_STRONG) {
            reasons.push("SAME_FAILURE_MODE")
            score += MATCH_SCORES.SAME_FAILURE_MODE_EXACT
          }
        }
        if (reasons.length > 0) {
          records.push({
            recordType: "DEFECT",
            id: d.id,
            title: d.description,
            status: d.status,
            statusLabel: statusLabel("DEFECT", d.status),
            supplier: (await getSupplierName(d.supplierId)) ?? null,
            partNumber: d.partNumber ?? null,
            createdAt: d.createdAt,
            matchReasons: reasons,
            href: buildHref("DEFECT", d.id, companyType),
            score,
            confidence: computeConfidence(score),
          })
        }
      }
    }
  }

  const manualLinks = await prisma.qualityRecordLink.findMany({
    where: {
      companyId: oemId,
      OR: [
        { sourceType: "FIELD_DEFECT", sourceId: fieldDefectId },
        { targetType: "FIELD_DEFECT", targetId: fieldDefectId },
      ],
    },
  })
  for (const link of manualLinks) {
    const isSource = link.sourceType === "FIELD_DEFECT" && link.sourceId === fieldDefectId
    const targetRecordType = isSource ? link.targetType : link.sourceType
    const targetRecordId = isSource ? link.targetId : link.sourceId
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType, scope)
    if (resolved) {
      records.push({
        ...resolved,
        matchReasons: [link.linkType === "MANUAL" ? "MANUAL" as QualityLinkType : link.linkType],
        score: SCORE_MANUAL,
        confidence: "direct",
      })
    }
  }

  return groupRecords(dedupRecords(records))
}

export async function findRelatedForIqc(
  iqcId: string,
  session: SessionUser,
): Promise<GroupedRelatedRecords[]> {
  const { companyId, companyType } = session
  const isSupplier = companyType === "SUPPLIER"

  const iqc = await prisma.iqcReport.findFirst({
    where: {
      id: iqcId,
      ...(isSupplier ? { supplierId: companyId } : { oemId: companyId }),
    },
  })
  if (!iqc) return []

  const oemId = iqc.oemId
  const supplierId = iqc.supplierId
  const scope = getSupplierScope(session, oemId, supplierId)
  const records: ScoredMatch[] = []

  if (iqc.linkedDefectId) {
    const where: Record<string, unknown> = { id: iqc.linkedDefectId, oemId }
    if (scope.isSupplier) where.supplierId = scope.companySupplierId
    const defect = await prisma.defect.findFirst({ where })
    if (defect) {
      records.push({
        recordType: "DEFECT",
        id: defect.id,
        title: defect.description,
        status: defect.status,
        statusLabel: statusLabel("DEFECT", defect.status),
        supplier: (await getSupplierName(defect.supplierId)) ?? null,
        partNumber: defect.partNumber ?? null,
        createdAt: defect.createdAt,
        matchReasons: ["IQC_TO_DEFECT"] as QualityLinkType[],
        href: buildHref("DEFECT", defect.id, companyType),
        score: SCORE_DIRECT,
        confidence: "direct",
      })
    }
  }

  if (supplierId && iqc.partNumber) {
    const ppapWhere: Record<string, unknown> = {
      oemId,
      supplierId,
      partNumber: { equals: iqc.partNumber, mode: "insensitive" as const },
    }
    if (scope.isSupplier) ppapWhere.supplierId = scope.companySupplierId
    const ppapRecords = await prisma.ppapSubmission.findMany({
      where: ppapWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const p of ppapRecords) {
      const reasons: QualityLinkType[] = ["SAME_PART", "SAME_SUPPLIER"]
      let score = MATCH_SCORES.SAME_PART_EXACT + MATCH_SCORES.SAME_SUPPLIER_WITH_PART
      if (isPpapApproved(p.status)) {
        reasons.push("PPAP_REFERENCE")
        score += MATCH_SCORES.PPAP_APPROVED_SAME_PART
      }
      records.push({
        recordType: "PPAP",
        id: p.id,
        title: `${p.requestNumber} — ${p.partName || p.partNumber}`,
        status: p.status,
        statusLabel: statusLabel("PPAP", p.status),
        supplier: (await getSupplierName(p.supplierId)) ?? null,
        partNumber: p.partNumber,
        createdAt: p.createdAt,
        matchReasons: reasons,
        href: buildHref("PPAP", p.id, companyType),
        score,
        confidence: computeConfidence(score),
      })
    }
  }

  {
    if (iqc.partNumber) {
      const fmeaWhere: Record<string, unknown> = {
        oemId,
        partNumber: { equals: iqc.partNumber, mode: "insensitive" as const },
      }
      if (scope.isSupplier) {
        fmeaWhere.supplierId = scope.companySupplierId
      } else if (supplierId) {
        fmeaWhere.supplierId = supplierId
      }
      const fmeaRecords = await prisma.fmea.findMany({
        where: fmeaWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      for (const f of fmeaRecords) {
        const reasons: QualityLinkType[] = ["SAME_PART"]
        let score = MATCH_SCORES.SAME_PART_EXACT
        if (supplierId && f.supplierId === supplierId) {
          reasons.push("SAME_SUPPLIER")
          score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
        }
        if (f.title && iqc.partName) {
          const fmeaOverlap = keywordOverlapScore(iqc.partName, f.title)
          if (fmeaOverlap >= MATCH_SCORES.TITLE_KEYWORD_STRONG) {
            reasons.push("FMEA_COVERAGE")
            score += MATCH_SCORES.FMEA_FAILURE_MODE_MATCH
          }
        }
        records.push({
          recordType: "FMEA",
          id: f.id,
          title: `${f.fmeaNumber} — ${f.title}`,
          status: f.status,
          statusLabel: statusLabel("FMEA", f.status),
          supplier: f.supplierId ? (await getSupplierName(f.supplierId)) : null,
          partNumber: f.partNumber,
          createdAt: f.createdAt,
          matchReasons: reasons,
          href: buildHref("FMEA", f.id, companyType),
          score,
          confidence: computeConfidence(score),
        })
      }
    }
  }

  {
    const fdOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (iqc.partNumber) {
      fdOrConditions.push({ partNumber: { equals: iqc.partNumber, mode: "insensitive" as const } })
    }
    if (scope.isSupplier) {
      fdOrConditions.push({ supplierId: scope.companySupplierId })
    } else if (supplierId) {
      fdOrConditions.push({ supplierId })
    }
    if (fdOrConditions.length > 0) {
      const fdBaseWhere: Record<string, unknown> = { oemId, deletedAt: null }
      if (scope.isSupplier) fdBaseWhere.supplierId = scope.companySupplierId
      const fieldDefects = await prisma.fieldDefect.findMany({
        where: {
          ...fdBaseWhere,
          OR: fdOrConditions,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      for (const fdef of fieldDefects) {
        const reasons: QualityLinkType[] = []
        let score = 0
        const partMatch = iqc.partNumber && fdef.partNumber && iqc.partNumber.toLowerCase() === fdef.partNumber.toLowerCase()
        if (partMatch) {
          reasons.push("SAME_PART")
          score += MATCH_SCORES.SAME_PART_EXACT
        }
        if (supplierId && fdef.supplierId === supplierId) {
          if (partMatch) {
            reasons.push("SAME_SUPPLIER")
            score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
          } else {
            reasons.push("SAME_SUPPLIER_ONLY")
            score += MATCH_SCORES.SAME_SUPPLIER_ONLY
          }
        }
        if (iqc.vehicleModel && fdef.vehicleModel && iqc.vehicleModel.toLowerCase() === fdef.vehicleModel.toLowerCase()) {
          reasons.push("SAME_VEHICLE")
          score += (partMatch ? MATCH_SCORES.SAME_VEHICLE_WITH_PART : MATCH_SCORES.SAME_VEHICLE)
        }
        if (reasons.length > 0) {
          records.push({
            recordType: "FIELD_DEFECT",
            id: fdef.id,
            title: fdef.title,
            status: fdef.status,
            statusLabel: statusLabel("FIELD_DEFECT", fdef.status),
            supplier: fdef.supplierId ? (await getSupplierName(fdef.supplierId)) : null,
            partNumber: fdef.partNumber ?? null,
            createdAt: fdef.createdAt,
            matchReasons: reasons,
            href: buildHref("FIELD_DEFECT", fdef.id, companyType),
            score,
            confidence: computeConfidence(score),
          })
        }
      }
    }
  }

  {
    const dOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (iqc.partNumber) {
      dOrConditions.push({ partNumber: { equals: iqc.partNumber, mode: "insensitive" as const } })
    }
    if (scope.isSupplier) {
      dOrConditions.push({ supplierId: scope.companySupplierId })
    } else if (supplierId) {
      dOrConditions.push({ supplierId })
    }
    if (dOrConditions.length > 0) {
      const dBaseWhere: Record<string, unknown> = { oemId }
      if (scope.isSupplier) dBaseWhere.supplierId = scope.companySupplierId
      const defects = await prisma.defect.findMany({
        where: {
          ...dBaseWhere,
          OR: dOrConditions,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      for (const d of defects) {
        if (iqc.linkedDefectId && d.id === iqc.linkedDefectId) continue
        const reasons: QualityLinkType[] = []
        let score = 0
        const partMatch = iqc.partNumber && d.partNumber && iqc.partNumber.toLowerCase() === d.partNumber.toLowerCase()
        if (partMatch) {
          reasons.push("SAME_PART")
          score += MATCH_SCORES.SAME_PART_EXACT
        }
        if (supplierId && d.supplierId === supplierId) {
          if (partMatch) {
            reasons.push("SAME_SUPPLIER")
            score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
          } else {
            reasons.push("SAME_SUPPLIER_ONLY")
            score += MATCH_SCORES.SAME_SUPPLIER_ONLY
          }
        }
        if (reasons.length > 0) {
          records.push({
            recordType: "DEFECT",
            id: d.id,
            title: d.description,
            status: d.status,
            statusLabel: statusLabel("DEFECT", d.status),
            supplier: (await getSupplierName(d.supplierId)) ?? null,
            partNumber: d.partNumber ?? null,
            createdAt: d.createdAt,
            matchReasons: reasons,
            href: buildHref("DEFECT", d.id, companyType),
            score,
            confidence: computeConfidence(score),
          })
        }
      }
    }
  }

  const manualLinks = await prisma.qualityRecordLink.findMany({
    where: {
      companyId: oemId,
      OR: [
        { sourceType: "IQC", sourceId: iqcId },
        { targetType: "IQC", targetId: iqcId },
      ],
    },
  })
  for (const link of manualLinks) {
    const isSource = link.sourceType === "IQC" && link.sourceId === iqcId
    const targetRecordType = isSource ? link.targetType : link.sourceType
    const targetRecordId = isSource ? link.targetId : link.sourceId
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType, scope)
    if (resolved) {
      records.push({
        ...resolved,
        matchReasons: [link.linkType === "MANUAL" ? "MANUAL" as QualityLinkType : link.linkType],
        score: SCORE_MANUAL,
        confidence: "direct",
      })
    }
  }

  return groupRecords(dedupRecords(records))
}

export async function findRelatedForFmea(
  fmeaId: string,
  session: SessionUser,
): Promise<GroupedRelatedRecords[]> {
  const { companyId, companyType } = session
  const isSupplier = companyType === "SUPPLIER"

  const fmea = await prisma.fmea.findFirst({
    where: {
      id: fmeaId,
      ...(isSupplier ? { supplierId: companyId } : { oemId: companyId }),
    },
  })
  if (!fmea) return []

  const oemId = fmea.oemId
  const supplierId = fmea.supplierId
  const scope = getSupplierScope(session, oemId, supplierId)
  const records: ScoredMatch[] = []

  if (fmea.defectId) {
    const where: Record<string, unknown> = { id: fmea.defectId, oemId }
    if (scope.isSupplier) where.supplierId = scope.companySupplierId
    const defect = await prisma.defect.findFirst({ where })
    if (defect) {
      records.push({
        recordType: "DEFECT",
        id: defect.id,
        title: defect.description,
        status: defect.status,
        statusLabel: statusLabel("DEFECT", defect.status),
        supplier: (await getSupplierName(defect.supplierId)) ?? null,
        partNumber: defect.partNumber ?? null,
        createdAt: defect.createdAt,
        matchReasons: ["PPAP_REFERENCE"] as QualityLinkType[],
        href: buildHref("DEFECT", defect.id, companyType),
        score: SCORE_DIRECT,
        confidence: "direct",
      })
    }
  }

  {
    const fdOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (fmea.partNumber) {
      fdOrConditions.push({ partNumber: { equals: fmea.partNumber, mode: "insensitive" as const } })
    }
    if (scope.isSupplier) {
      fdOrConditions.push({ supplierId: scope.companySupplierId })
    } else if (supplierId) {
      fdOrConditions.push({ supplierId })
    }
    if (fdOrConditions.length > 0) {
      const fdBaseWhere: Record<string, unknown> = { oemId, deletedAt: null }
      if (scope.isSupplier) fdBaseWhere.supplierId = scope.companySupplierId
      const fieldDefects = await prisma.fieldDefect.findMany({
        where: {
          ...fdBaseWhere,
          OR: fdOrConditions,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      for (const fd of fieldDefects) {
        const reasons: QualityLinkType[] = []
        let score = 0
        const partMatch = fmea.partNumber && fd.partNumber && fmea.partNumber.toLowerCase() === fd.partNumber.toLowerCase()
        if (partMatch) {
          reasons.push("SAME_PART")
          score += MATCH_SCORES.SAME_PART_EXACT
        }
        if (supplierId && fd.supplierId === supplierId) {
          if (partMatch) {
            reasons.push("SAME_SUPPLIER")
            score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
          } else {
            reasons.push("SAME_SUPPLIER_ONLY")
            score += MATCH_SCORES.SAME_SUPPLIER_ONLY
          }
        }
        if (fd.category && fmea.title) {
          const tokScore = keywordOverlapScore(fd.category, fmea.title)
          if (tokScore > 0) {
            reasons.push("FMEA_COVERAGE")
            score += MATCH_SCORES.FMEA_FAILURE_MODE_MATCH
          }
        }
        if (fmea.vehicleModel && fd.vehicleModel && fmea.vehicleModel.toLowerCase() === fd.vehicleModel.toLowerCase()) {
          reasons.push("SAME_VEHICLE")
          score += (partMatch ? MATCH_SCORES.SAME_VEHICLE_WITH_PART : MATCH_SCORES.SAME_VEHICLE)
        }
        if (reasons.length > 0) {
          records.push({
            recordType: "FIELD_DEFECT",
            id: fd.id,
            title: fd.title,
            status: fd.status,
            statusLabel: statusLabel("FIELD_DEFECT", fd.status),
            supplier: fd.supplierId ? (await getSupplierName(fd.supplierId)) : null,
            partNumber: fd.partNumber ?? null,
            createdAt: fd.createdAt,
            matchReasons: reasons,
            href: buildHref("FIELD_DEFECT", fd.id, companyType),
            score,
            confidence: computeConfidence(score),
          })
        }
      }
    }
  }

  {
    if (fmea.partNumber) {
      const iqcWhere: Record<string, unknown> = {
        oemId,
        partNumber: { equals: fmea.partNumber, mode: "insensitive" as const },
      }
      if (scope.isSupplier) {
        iqcWhere.supplierId = scope.companySupplierId
      } else if (supplierId) {
        iqcWhere.supplierId = supplierId
      }
      const iqcRecords = await prisma.iqcReport.findMany({
        where: iqcWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      for (const i of iqcRecords) {
        const reasons: QualityLinkType[] = ["SAME_PART"]
        let score = MATCH_SCORES.SAME_PART_EXACT
        if (supplierId && i.supplierId === supplierId) {
          reasons.push("SAME_SUPPLIER")
          score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
        }
        if (isIqcRejectedOrOnHold(i.result)) {
          reasons.push("IQC_REJECTION")
          score += MATCH_SCORES.IQC_REJECTION_BONUS
        }
        records.push({
          recordType: "IQC",
          id: i.id,
          title: `${i.inspectionNumber} — ${i.partName || i.partNumber}`,
          status: i.status,
          statusLabel: statusLabel("IQC", i.status),
          supplier: (await getSupplierName(i.supplierId)) ?? null,
          partNumber: i.partNumber,
          createdAt: i.createdAt,
          matchReasons: reasons,
          href: buildHref("IQC", i.id, companyType),
          score,
          confidence: computeConfidence(score),
        })
      }
    }
  }

  if (supplierId && fmea.partNumber) {
    const ppapWhere: Record<string, unknown> = {
      oemId,
      supplierId,
      partNumber: { equals: fmea.partNumber, mode: "insensitive" as const },
    }
    if (scope.isSupplier) ppapWhere.supplierId = scope.companySupplierId
    const ppapRecords = await prisma.ppapSubmission.findMany({
      where: ppapWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const p of ppapRecords) {
      const reasons: QualityLinkType[] = ["SAME_PART", "SAME_SUPPLIER", "PPAP_REFERENCE"]
      const score = MATCH_SCORES.SAME_PART_EXACT + MATCH_SCORES.SAME_SUPPLIER_WITH_PART + MATCH_SCORES.PPAP_APPROVED_SAME_PART
      records.push({
        recordType: "PPAP",
        id: p.id,
        title: `${p.requestNumber} — ${p.partName || p.partNumber}`,
        status: p.status,
        statusLabel: statusLabel("PPAP", p.status),
        supplier: (await getSupplierName(p.supplierId)) ?? null,
        partNumber: p.partNumber,
        createdAt: p.createdAt,
        matchReasons: reasons,
        href: buildHref("PPAP", p.id, companyType),
        score,
        confidence: computeConfidence(score),
      })
    }
  }

  {
    const dOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (fmea.partNumber) {
      dOrConditions.push({ partNumber: { equals: fmea.partNumber, mode: "insensitive" as const } })
    }
    if (scope.isSupplier) {
      dOrConditions.push({ supplierId: scope.companySupplierId })
    } else if (supplierId) {
      dOrConditions.push({ supplierId })
    }
    const dBaseWhere: Record<string, unknown> = { oemId }
    if (scope.isSupplier) dBaseWhere.supplierId = scope.companySupplierId
    if (dOrConditions.length > 0) {
      const defects = await prisma.defect.findMany({
        where: {
          ...dBaseWhere,
          OR: dOrConditions,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      for (const d of defects) {
        if (fmea.defectId && d.id === fmea.defectId) continue
        const reasons: QualityLinkType[] = []
        let score = 0
        const partMatch = fmea.partNumber && d.partNumber && fmea.partNumber.toLowerCase() === d.partNumber.toLowerCase()
        if (partMatch) {
          reasons.push("SAME_PART")
          score += MATCH_SCORES.SAME_PART_EXACT
        }
        if (supplierId && d.supplierId === supplierId) {
          if (partMatch) {
            reasons.push("SAME_SUPPLIER")
            score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
          } else {
            reasons.push("SAME_SUPPLIER_ONLY")
            score += MATCH_SCORES.SAME_SUPPLIER_ONLY
          }
        }
        if (reasons.length > 0) {
          records.push({
            recordType: "DEFECT",
            id: d.id,
            title: d.description,
            status: d.status,
            statusLabel: statusLabel("DEFECT", d.status),
            supplier: (await getSupplierName(d.supplierId)) ?? null,
            partNumber: d.partNumber ?? null,
            createdAt: d.createdAt,
            matchReasons: reasons,
            href: buildHref("DEFECT", d.id, companyType),
            score,
            confidence: computeConfidence(score),
          })
        }
      }
    }
  }

  const manualLinks = await prisma.qualityRecordLink.findMany({
    where: {
      companyId: oemId,
      OR: [
        { sourceType: "FMEA", sourceId: fmeaId },
        { targetType: "FMEA", targetId: fmeaId },
      ],
    },
  })
  for (const link of manualLinks) {
    const isSource = link.sourceType === "FMEA" && link.sourceId === fmeaId
    const targetRecordType = isSource ? link.targetType : link.sourceType
    const targetRecordId = isSource ? link.targetId : link.sourceId
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType, scope)
    if (resolved) {
      records.push({
        ...resolved,
        matchReasons: [link.linkType === "MANUAL" ? "MANUAL" as QualityLinkType : link.linkType],
        score: SCORE_MANUAL,
        confidence: "direct",
      })
    }
  }

  return groupRecords(dedupRecords(records))
}

export async function findRelatedForPpap(
  ppapId: string,
  session: SessionUser,
): Promise<GroupedRelatedRecords[]> {
  const { companyId, companyType } = session
  const isSupplier = companyType === "SUPPLIER"

  const ppap = await prisma.ppapSubmission.findFirst({
    where: {
      id: ppapId,
      ...(isSupplier ? { supplierId: companyId } : { oemId: companyId }),
    },
  })
  if (!ppap) return []

  const oemId = ppap.oemId
  const supplierId = ppap.supplierId
  const scope = getSupplierScope(session, oemId, supplierId)
  const records: ScoredMatch[] = []

  if (ppap.defectId) {
    const where: Record<string, unknown> = { id: ppap.defectId, oemId }
    if (scope.isSupplier) where.supplierId = scope.companySupplierId
    const defect = await prisma.defect.findFirst({ where })
    if (defect) {
      records.push({
        recordType: "DEFECT",
        id: defect.id,
        title: defect.description,
        status: defect.status,
        statusLabel: statusLabel("DEFECT", defect.status),
        supplier: (await getSupplierName(defect.supplierId)) ?? null,
        partNumber: defect.partNumber ?? null,
        createdAt: defect.createdAt,
        matchReasons: ["PPAP_REFERENCE"] as QualityLinkType[],
        href: buildHref("DEFECT", defect.id, companyType),
        score: SCORE_DIRECT,
        confidence: "direct",
      })
    }
  }

  if (supplierId && ppap.partNumber) {
    const iqcWhere: Record<string, unknown> = {
      oemId,
      supplierId,
      partNumber: { equals: ppap.partNumber, mode: "insensitive" as const },
    }
    if (scope.isSupplier) iqcWhere.supplierId = scope.companySupplierId
    const iqcRecords = await prisma.iqcReport.findMany({
      where: iqcWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const i of iqcRecords) {
      const reasons: QualityLinkType[] = ["SAME_PART", "SAME_SUPPLIER"]
      let score = MATCH_SCORES.SAME_PART_EXACT + MATCH_SCORES.SAME_SUPPLIER_WITH_PART
      if (isIqcRejectedOrOnHold(i.result)) {
        reasons.push("IQC_REJECTION")
        score += MATCH_SCORES.IQC_REJECTION_BONUS
      }
      records.push({
        recordType: "IQC",
        id: i.id,
        title: `${i.inspectionNumber} — ${i.partName || i.partNumber}`,
        status: i.status,
        statusLabel: statusLabel("IQC", i.status),
        supplier: (await getSupplierName(i.supplierId)) ?? null,
        partNumber: i.partNumber,
        createdAt: i.createdAt,
        matchReasons: reasons,
        href: buildHref("IQC", i.id, companyType),
        score,
        confidence: computeConfidence(score),
      })
    }
  }

  if (supplierId && ppap.partNumber) {
    const fmeaWhere: Record<string, unknown> = {
      oemId,
      partNumber: { equals: ppap.partNumber, mode: "insensitive" as const },
      supplierId,
    }
    if (scope.isSupplier) fmeaWhere.supplierId = scope.companySupplierId
    const fmeaRecords = await prisma.fmea.findMany({
      where: fmeaWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const f of fmeaRecords) {
      const reasons: QualityLinkType[] = ["SAME_PART", "SAME_SUPPLIER"]
      let score = MATCH_SCORES.SAME_PART_EXACT + MATCH_SCORES.SAME_SUPPLIER_WITH_PART
      if (f.title && ppap.partName) {
        const fmeaOverlap = keywordOverlapScore(ppap.partName, f.title)
        if (fmeaOverlap >= MATCH_SCORES.TITLE_KEYWORD_STRONG) {
          reasons.push("FMEA_COVERAGE")
          score += MATCH_SCORES.FMEA_FAILURE_MODE_MATCH
        }
      }
      records.push({
        recordType: "FMEA",
        id: f.id,
        title: `${f.fmeaNumber} — ${f.title}`,
        status: f.status,
        statusLabel: statusLabel("FMEA", f.status),
        supplier: f.supplierId ? (await getSupplierName(f.supplierId)) : null,
        partNumber: f.partNumber,
        createdAt: f.createdAt,
        matchReasons: reasons,
        href: buildHref("FMEA", f.id, companyType),
        score,
        confidence: computeConfidence(score),
      })
    }
  }

  {
    const fieldDefects = await prisma.fieldDefect.findMany({
      where: {
        oemId,
        deletedAt: null,
        supplierId: scope.isSupplier ? scope.companySupplierId : supplierId,
        partNumber: { equals: ppap.partNumber, mode: "insensitive" as const },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const fd of fieldDefects) {
      const reasons: QualityLinkType[] = ["SAME_PART"]
      let score = MATCH_SCORES.SAME_PART_EXACT
      if (fd.supplierId === supplierId) {
        reasons.push("SAME_SUPPLIER")
        score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
      }
      if (ppap.vehicleModel && fd.vehicleModel && ppap.vehicleModel.toLowerCase() === fd.vehicleModel.toLowerCase()) {
        reasons.push("SAME_VEHICLE")
        score += MATCH_SCORES.SAME_VEHICLE_WITH_PART
      }
      records.push({
        recordType: "FIELD_DEFECT",
        id: fd.id,
        title: fd.title,
        status: fd.status,
        statusLabel: statusLabel("FIELD_DEFECT", fd.status),
        supplier: fd.supplierId ? (await getSupplierName(fd.supplierId)) : null,
        partNumber: fd.partNumber ?? null,
        createdAt: fd.createdAt,
        matchReasons: reasons,
        href: buildHref("FIELD_DEFECT", fd.id, companyType),
        score,
        confidence: computeConfidence(score),
      })
    }
  }

  {
    const defects = await prisma.defect.findMany({
      where: {
        oemId,
        partNumber: { equals: ppap.partNumber, mode: "insensitive" as const },
        ...(scope.isSupplier ? { supplierId: scope.companySupplierId } : {}),
        ...(supplierId && !scope.isSupplier ? { supplierId } : {}),
        ...(ppap.defectId ? { id: { not: ppap.defectId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const d of defects) {
      const reasons: QualityLinkType[] = ["SAME_PART"]
      let score = MATCH_SCORES.SAME_PART_EXACT
      if (d.supplierId === supplierId) {
        reasons.push("SAME_SUPPLIER")
        score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
      }
      records.push({
        recordType: "DEFECT",
        id: d.id,
        title: d.description,
        status: d.status,
        statusLabel: statusLabel("DEFECT", d.status),
        supplier: (await getSupplierName(d.supplierId)) ?? null,
        partNumber: d.partNumber ?? null,
        createdAt: d.createdAt,
        matchReasons: reasons,
        href: buildHref("DEFECT", d.id, companyType),
        score,
        confidence: computeConfidence(score),
      })
    }
  }

  const manualLinks = await prisma.qualityRecordLink.findMany({
    where: {
      companyId: oemId,
      OR: [
        { sourceType: "PPAP", sourceId: ppapId },
        { targetType: "PPAP", targetId: ppapId },
      ],
    },
  })
  for (const link of manualLinks) {
    const isSource = link.sourceType === "PPAP" && link.sourceId === ppapId
    const targetRecordType = isSource ? link.targetType : link.sourceType
    const targetRecordId = isSource ? link.targetId : link.sourceId
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType, scope)
    if (resolved) {
      records.push({
        ...resolved,
        matchReasons: [link.linkType === "MANUAL" ? "MANUAL" as QualityLinkType : link.linkType],
        score: SCORE_MANUAL,
        confidence: "direct",
      })
    }
  }

  return groupRecords(dedupRecords(records))
}

export async function findRelatedForDefect(
  defectId: string,
  session: SessionUser,
): Promise<GroupedRelatedRecords[]> {
  const { companyId, companyType } = session
  const isSupplier = companyType === "SUPPLIER"

  const defect = await prisma.defect.findFirst({
    where: {
      id: defectId,
      ...(isSupplier ? { supplierId: companyId } : { oemId: companyId }),
    },
  })
  if (!defect) return []

  const oemId = defect.oemId
  const supplierId = defect.supplierId
  const scope = getSupplierScope(session, oemId, supplierId)
  const records: ScoredMatch[] = []

  const linkedFd = await prisma.fieldDefect.findFirst({
    where: {
      linkedDefectId: defectId,
      oemId,
      deletedAt: null,
      ...(scope.isSupplier ? { supplierId: scope.companySupplierId } : {}),
    },
    select: { id: true, title: true, status: true, supplierId: true, partNumber: true, createdAt: true },
  })
  if (linkedFd) {
    records.push({
      recordType: "FIELD_DEFECT",
      id: linkedFd.id,
      title: linkedFd.title,
      status: linkedFd.status as string,
      statusLabel: statusLabel("FIELD_DEFECT", linkedFd.status as string),
      supplier: linkedFd.supplierId ? (await getSupplierName(linkedFd.supplierId)) : null,
      partNumber: linkedFd.partNumber ?? null,
      createdAt: linkedFd.createdAt,
      matchReasons: ["FIELD_TO_8D"] as QualityLinkType[],
      href: buildHref("FIELD_DEFECT", linkedFd.id, companyType),
      score: SCORE_DIRECT,
      confidence: "direct",
    })
  }

  {
    const where: Record<string, unknown> = { linkedDefectId: defectId, oemId }
    if (scope.isSupplier) where.supplierId = scope.companySupplierId
    const linkedIqc = await prisma.iqcReport.findFirst({
      where,
      select: { id: true, inspectionNumber: true, partName: true, partNumber: true, status: true, supplierId: true, createdAt: true },
    })
    if (linkedIqc) {
      records.push({
        recordType: "IQC",
        id: linkedIqc.id,
        title: `${linkedIqc.inspectionNumber} — ${linkedIqc.partName || linkedIqc.partNumber}`,
        status: linkedIqc.status as string,
        statusLabel: statusLabel("IQC", linkedIqc.status as string),
        supplier: (await getSupplierName(linkedIqc.supplierId)) ?? null,
        partNumber: linkedIqc.partNumber,
        createdAt: linkedIqc.createdAt,
        matchReasons: ["IQC_TO_DEFECT"] as QualityLinkType[],
        href: buildHref("IQC", linkedIqc.id, companyType),
        score: SCORE_DIRECT,
        confidence: "direct",
      })
    }
  }

  {
    const where: Record<string, unknown> = { defectId: defectId, oemId }
    if (scope.isSupplier) where.supplierId = scope.companySupplierId
    const linkedPpap = await prisma.ppapSubmission.findFirst({
      where,
      select: { id: true, requestNumber: true, partName: true, partNumber: true, status: true, supplierId: true, createdAt: true },
    })
    if (linkedPpap) {
      records.push({
        recordType: "PPAP",
        id: linkedPpap.id,
        title: `${linkedPpap.requestNumber} — ${linkedPpap.partName || linkedPpap.partNumber}`,
        status: linkedPpap.status as string,
        statusLabel: statusLabel("PPAP", linkedPpap.status as string),
        supplier: (await getSupplierName(linkedPpap.supplierId)) ?? null,
        partNumber: linkedPpap.partNumber,
        createdAt: linkedPpap.createdAt,
        matchReasons: ["PPAP_REFERENCE"] as QualityLinkType[],
        href: buildHref("PPAP", linkedPpap.id, companyType),
        score: SCORE_DIRECT,
        confidence: "direct",
      })
    }
  }

  {
    const where: Record<string, unknown> = { defectId: defectId, oemId }
    if (scope.isSupplier) where.supplierId = scope.companySupplierId
    const linkedFmea = await prisma.fmea.findFirst({
      where,
      select: { id: true, fmeaNumber: true, title: true, status: true, supplierId: true, partNumber: true, createdAt: true },
    })
    if (linkedFmea) {
      records.push({
        recordType: "FMEA",
        id: linkedFmea.id,
        title: `${linkedFmea.fmeaNumber} — ${linkedFmea.title}`,
        status: linkedFmea.status as string,
        statusLabel: statusLabel("FMEA", linkedFmea.status as string),
        supplier: linkedFmea.supplierId ? (await getSupplierName(linkedFmea.supplierId)) : null,
        partNumber: linkedFmea.partNumber,
        createdAt: linkedFmea.createdAt,
        matchReasons: ["FMEA_COVERAGE"] as QualityLinkType[],
        href: buildHref("FMEA", linkedFmea.id, companyType),
        score: SCORE_DIRECT,
        confidence: "direct",
      })
    }
  }

  {
    const fdOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (defect.partNumber) {
      fdOrConditions.push({ partNumber: { equals: defect.partNumber, mode: "insensitive" as const } })
    }
    if (scope.isSupplier) {
      fdOrConditions.push({ supplierId: scope.companySupplierId })
    } else if (supplierId) {
      fdOrConditions.push({ supplierId })
    }
    if (fdOrConditions.length > 0) {
      const fdBaseWhere: Record<string, unknown> = { oemId, deletedAt: null }
      if (scope.isSupplier) fdBaseWhere.supplierId = scope.companySupplierId
      if (linkedFd) fdBaseWhere.id = { not: linkedFd.id }
      const fieldDefects = await prisma.fieldDefect.findMany({
        where: {
          ...fdBaseWhere,
          OR: fdOrConditions,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      for (const fd of fieldDefects) {
        const reasons: QualityLinkType[] = []
        let score = 0
        const partMatch = defect.partNumber && fd.partNumber && defect.partNumber.toLowerCase() === fd.partNumber.toLowerCase()
        if (partMatch) {
          reasons.push("SAME_PART")
          score += MATCH_SCORES.SAME_PART_EXACT
        }
        if (supplierId && fd.supplierId === supplierId) {
          if (partMatch) {
            reasons.push("SAME_SUPPLIER")
            score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
          } else {
            reasons.push("SAME_SUPPLIER_ONLY")
            score += MATCH_SCORES.SAME_SUPPLIER_ONLY
          }
        }
        if (reasons.length > 0) {
          records.push({
            recordType: "FIELD_DEFECT",
            id: fd.id,
            title: fd.title,
            status: fd.status as string,
            statusLabel: statusLabel("FIELD_DEFECT", fd.status as string),
            supplier: fd.supplierId ? (await getSupplierName(fd.supplierId)) : null,
            partNumber: fd.partNumber ?? null,
            createdAt: fd.createdAt,
            matchReasons: reasons,
            href: buildHref("FIELD_DEFECT", fd.id, companyType),
            score,
            confidence: computeConfidence(score),
          })
        }
      }
    }
  }

  if (defect.partNumber || supplierId) {
    const dOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (defect.partNumber) {
      dOrConditions.push({ partNumber: { equals: defect.partNumber, mode: "insensitive" as const } })
    }
    if (scope.isSupplier) {
      dOrConditions.push({ supplierId: scope.companySupplierId })
    } else if (supplierId) {
      dOrConditions.push({ supplierId })
    }
    const dBaseWhere: Record<string, unknown> = { oemId, id: { not: defectId } }
    if (scope.isSupplier) dBaseWhere.supplierId = scope.companySupplierId
    const otherDefects = await prisma.defect.findMany({
      where: {
        ...dBaseWhere,
        OR: dOrConditions,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    for (const d of otherDefects) {
      const reasons: QualityLinkType[] = []
      let score = 0
      const partMatch = defect.partNumber && d.partNumber && defect.partNumber.toLowerCase() === d.partNumber.toLowerCase()
      if (partMatch) {
        reasons.push("SAME_PART")
        score += MATCH_SCORES.SAME_PART_EXACT
      }
      if (supplierId && d.supplierId === supplierId) {
        if (partMatch) {
          reasons.push("SAME_SUPPLIER")
          score += MATCH_SCORES.SAME_SUPPLIER_WITH_PART
        } else {
          reasons.push("SAME_SUPPLIER_ONLY")
          score += MATCH_SCORES.SAME_SUPPLIER_ONLY
        }
      }
      if (score > 0 && defect.description && d.description) {
        const tokScore = keywordOverlapScore(defect.description, d.description)
        if (tokScore >= MATCH_SCORES.TITLE_KEYWORD_STRONG) {
          reasons.push("SAME_FAILURE_MODE")
          score += MATCH_SCORES.SAME_FAILURE_MODE_EXACT
        }
      }
      if (reasons.length > 0) {
        records.push({
          recordType: "DEFECT",
          id: d.id,
          title: d.description,
          status: d.status as string,
          statusLabel: statusLabel("DEFECT", d.status as string),
          supplier: (await getSupplierName(d.supplierId)) ?? null,
          partNumber: d.partNumber ?? null,
          createdAt: d.createdAt,
          matchReasons: reasons,
          href: buildHref("DEFECT", d.id, companyType),
          score,
          confidence: computeConfidence(score),
        })
      }
    }
  }

  const manualLinks = await prisma.qualityRecordLink.findMany({
    where: {
      companyId: oemId,
      OR: [
        { sourceType: "DEFECT", sourceId: defectId },
        { targetType: "DEFECT", targetId: defectId },
      ],
    },
  })
  for (const link of manualLinks) {
    const isSource = link.sourceType === "DEFECT" && link.sourceId === defectId
    const targetRecordType = isSource ? link.targetType : link.sourceType
    const targetRecordId = isSource ? link.targetId : link.sourceId
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType, scope)
    if (resolved) {
      records.push({
        ...resolved,
        matchReasons: [link.linkType === "MANUAL" ? "MANUAL" as QualityLinkType : link.linkType],
        score: SCORE_MANUAL,
        confidence: "direct",
      })
    }
  }

  return groupRecords(dedupRecords(records))
}

const supplierNameCache = new Map<string, string>()

async function getSupplierName(supplierId: string): Promise<string | null> {
  const cached = supplierNameCache.get(supplierId)
  if (cached !== undefined) return cached
  const company = await prisma.company.findUnique({
    where: { id: supplierId },
    select: { name: true },
  })
  const name = company?.name ?? null
  supplierNameCache.set(supplierId, name ?? "")
  return name
}

async function resolveRecord(
  recordType: QualityRecordType,
  recordId: string,
  oemId: string,
  companyType: string,
  scope: SupplierScope,
): Promise<Omit<ScoredMatch, "matchReasons" | "score" | "confidence"> | null> {
  const supplierFilter = scope.isSupplier ? { supplierId: scope.companySupplierId } : {}
  switch (recordType) {
    case "FIELD_DEFECT": {
      const fd = await prisma.fieldDefect.findFirst({
        where: { id: recordId, oemId, deletedAt: null, ...supplierFilter },
      })
      if (!fd) return null
      return {
        recordType: "FIELD_DEFECT",
        id: fd.id,
        title: fd.title,
        status: fd.status,
        statusLabel: statusLabel("FIELD_DEFECT", fd.status),
        supplier: fd.supplierId ? await getSupplierName(fd.supplierId) : null,
        partNumber: fd.partNumber ?? null,
        createdAt: fd.createdAt,
        href: buildHref("FIELD_DEFECT", fd.id, companyType),
      }
    }
    case "DEFECT":
    case "EIGHT_D": {
      const d = await prisma.defect.findFirst({
        where: { id: recordId, oemId, ...supplierFilter },
      })
      if (!d) return null
      return {
        recordType: "DEFECT",
        id: d.id,
        title: d.description,
        status: d.status,
        statusLabel: statusLabel("DEFECT", d.status),
        supplier: await getSupplierName(d.supplierId),
        partNumber: d.partNumber ?? null,
        createdAt: d.createdAt,
        href: buildHref("DEFECT", d.id, companyType),
      }
    }
    case "PPAP": {
      const p = await prisma.ppapSubmission.findFirst({
        where: { id: recordId, oemId, ...supplierFilter },
      })
      if (!p) return null
      return {
        recordType: "PPAP",
        id: p.id,
        title: `${p.requestNumber} — ${p.partName || p.partNumber}`,
        status: p.status,
        statusLabel: statusLabel("PPAP", p.status),
        supplier: await getSupplierName(p.supplierId),
        partNumber: p.partNumber,
        createdAt: p.createdAt,
        href: buildHref("PPAP", p.id, companyType),
      }
    }
    case "IQC": {
      const i = await prisma.iqcReport.findFirst({
        where: { id: recordId, oemId, ...supplierFilter },
      })
      if (!i) return null
      return {
        recordType: "IQC",
        id: i.id,
        title: `${i.inspectionNumber} — ${i.partName || i.partNumber}`,
        status: i.status,
        statusLabel: statusLabel("IQC", i.status),
        supplier: await getSupplierName(i.supplierId),
        partNumber: i.partNumber,
        createdAt: i.createdAt,
        href: buildHref("IQC", i.id, companyType),
      }
    }
    case "FMEA": {
      const f = await prisma.fmea.findFirst({
        where: { id: recordId, oemId, ...supplierFilter },
      })
      if (!f) return null
      return {
        recordType: "FMEA",
        id: f.id,
        title: `${f.fmeaNumber} — ${f.title}`,
        status: f.status,
        statusLabel: statusLabel("FMEA", f.status),
        supplier: f.supplierId ? await getSupplierName(f.supplierId) : null,
        partNumber: f.partNumber,
        createdAt: f.createdAt,
        href: buildHref("FMEA", f.id, companyType),
      }
    }
  }
}

export function clearSupplierNameCache() {
  supplierNameCache.clear()
}

export { groupRecords, dedupRecords }