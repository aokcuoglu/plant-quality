import { prisma } from "@/lib/prisma"
import type { QualityRecordType, QualityLinkType } from "@/generated/prisma/client"
import type { RelatedQualityRecord, GroupedRelatedRecords } from "./types"
import { QUALITY_RECORD_TYPE_LABELS } from "./types"

interface SessionUser {
  companyId: string
  companyType: string
  role: string
  plan?: string | null
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

function groupRecords(records: RelatedQualityRecord[]): GroupedRelatedRecords[] {
  const groups = new Map<QualityRecordType, RelatedQualityRecord[]>()
  for (const r of records) {
    const existing = groups.get(r.recordType) ?? []
    existing.push(r)
    groups.set(r.recordType, existing)
  }
  const typeOrder: QualityRecordType[] = ["FIELD_DEFECT", "DEFECT", "EIGHT_D", "PPAP", "IQC", "FMEA"]
  const result: GroupedRelatedRecords[] = []
  for (const t of typeOrder) {
    const recs = groups.get(t)
    if (recs && recs.length > 0) {
      recs.sort((a, b) => {
        const confidenceOrder = ["direct", "exact", "strong", "moderate"]
        const ci = confidenceOrder.indexOf(a.confidence) - confidenceOrder.indexOf(b.confidence)
        if (ci !== 0) return ci
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      result.push({
        recordType: t,
        label: QUALITY_RECORD_TYPE_LABELS[t],
        records: recs,
      })
    }
  }
  return result
}

function dedupRecords(records: RelatedQualityRecord[]): RelatedQualityRecord[] {
  const seen = new Map<string, RelatedQualityRecord>()
  for (const r of records) {
    const key = `${r.recordType}:${r.id}`
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, r)
    } else {
      const mergedReasons = new Set([...existing.matchReasons, ...r.matchReasons])
      existing.matchReasons = [...mergedReasons]
      const confidenceOrder = ["direct", "exact", "strong", "moderate"] as const
      const ci = confidenceOrder.indexOf(r.confidence) - confidenceOrder.indexOf(existing.confidence)
      if (ci < 0) existing.confidence = r.confidence
    }
  }
  return [...seen.values()]
}

function _extractKeywords(text: string | null | undefined): string[] {
  if (!text) return []
  const stopWords = new Set(["the", "and", "for", "this", "that", "with", "from", "are", "was", "were", "been", "have", "has", "had", "not", "but", "our", "all", "can", "will", "just", "should", "now", "over", "also", "some", "into", "than", "then", "only", "more", "very", "when", "what", "which", "their", "there", "about", "would", "could", "other", "being", "after", "before", "between", "through", "during", "without"])
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopWords.has(w))
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
  const records: RelatedQualityRecord[] = []

  if (fd.linkedDefectId) {
    const defect = await prisma.defect.findFirst({
      where: { id: fd.linkedDefectId, oemId },
      include: { eightDReport: true },
    })
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
        confidence: "direct",
      })
    }
  }

  if (supplierId) {
    const ppapRecords = await prisma.ppapSubmission.findMany({
      where: {
        oemId,
        supplierId,
        ...(isSupplier ? { supplierId: companyId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const p of ppapRecords) {
      const reasons: QualityLinkType[] = []
      let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
      reasons.push("SAME_SUPPLIER")
      if (fd.partNumber && p.partNumber && fd.partNumber.toLowerCase() === p.partNumber.toLowerCase()) {
        reasons.push("SAME_PART")
        confidence = "exact"
      }
      if (fd.vehicleModel && p.vehicleModel && fd.vehicleModel.toLowerCase() === p.vehicleModel.toLowerCase()) {
        reasons.push("SAME_VEHICLE")
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
        confidence,
      })
    }

    const iqcRecords = await prisma.iqcReport.findMany({
      where: {
        oemId,
        supplierId,
        ...(isSupplier ? { supplierId: companyId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const i of iqcRecords) {
      const reasons: QualityLinkType[] = []
      let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
      reasons.push("SAME_SUPPLIER")
      if (fd.partNumber && i.partNumber && fd.partNumber.toLowerCase() === i.partNumber.toLowerCase()) {
        reasons.push("SAME_PART")
        confidence = "exact"
      }
      if (fd.vehicleModel && i.vehicleModel && fd.vehicleModel.toLowerCase() === i.vehicleModel.toLowerCase()) {
        reasons.push("SAME_VEHICLE")
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
        confidence,
      })
    }
  }

  const fmeaConditions: Array<{ oemId: string; partNumber?: { equals: string; mode: "insensitive" }; supplierId?: string }> = [{ oemId }]
  if (fd.partNumber) {
    fmeaConditions[0].partNumber = { equals: fd.partNumber, mode: "insensitive" as const }
  }
  if (supplierId) {
    fmeaConditions[0].supplierId = supplierId
  }
  if (fd.partNumber || supplierId) {
    const fmeaRecords = await prisma.fmea.findMany({
      where: fmeaConditions[0],
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const f of fmeaRecords) {
      const reasons: QualityLinkType[] = []
      let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
      if (fd.partNumber && f.partNumber && fd.partNumber.toLowerCase() === f.partNumber.toLowerCase()) {
        reasons.push("SAME_PART")
        confidence = "exact"
      }
      if (supplierId && f.supplierId === supplierId) {
        reasons.push("SAME_SUPPLIER")
        if (confidence !== "exact") confidence = "strong"
      }
      if (fd.category || fd.subcategory) {
        reasons.push("FMEA_COVERAGE")
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
          confidence,
        })
      }
    }
  }

  if (fd.partNumber || supplierId) {
    const defectOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (fd.partNumber) {
      defectOrConditions.push({ partNumber: { equals: fd.partNumber, mode: "insensitive" as const } })
    }
    if (supplierId) {
      defectOrConditions.push({ supplierId })
    }
    const defects = await prisma.defect.findMany({
      where: {
        oemId,
        OR: defectOrConditions,
        ...(fd.linkedDefectId ? { id: { not: fd.linkedDefectId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const d of defects) {
      const reasons: QualityLinkType[] = []
      let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
      if (fd.partNumber && d.partNumber && fd.partNumber.toLowerCase() === d.partNumber.toLowerCase()) {
        reasons.push("SAME_PART")
        confidence = "exact"
      }
      if (supplierId && d.supplierId === supplierId) {
        reasons.push("SAME_SUPPLIER")
        if (confidence !== "exact") confidence = "strong"
      }
      if (fd.category && d.description.toLowerCase().includes(fd.category.toLowerCase())) {
        reasons.push("SAME_FAILURE_MODE")
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
        confidence,
      })
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
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType)
    if (resolved) {
      records.push({
        ...resolved,
        matchReasons: ["MANUAL"],
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
  const records: RelatedQualityRecord[] = []

  if (iqc.linkedDefectId) {
    const defect = await prisma.defect.findFirst({
      where: { id: iqc.linkedDefectId, oemId },
    })
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
        confidence: "direct",
      })
    }
  }

  if (supplierId) {
    const ppapRecords = await prisma.ppapSubmission.findMany({
      where: {
        oemId,
        supplierId,
        partNumber: iqc.partNumber,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const p of ppapRecords) {
      const reasons: QualityLinkType[] = ["SAME_PART", "SAME_SUPPLIER"]
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
        confidence: "exact",
      })
    }
  }

  const fmeaRecords = await prisma.fmea.findMany({
    where: {
      oemId,
      partNumber: { equals: iqc.partNumber, mode: "insensitive" },
      ...(supplierId ? { supplierId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const f of fmeaRecords) {
    const reasons: QualityLinkType[] = ["SAME_PART"]
    if (supplierId && f.supplierId === supplierId) reasons.push("SAME_SUPPLIER")
    reasons.push("FMEA_COVERAGE")
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
      confidence: supplierId && f.supplierId === supplierId ? "exact" : "strong",
    })
  }

  const fieldDefects = await prisma.fieldDefect.findMany({
    where: {
      oemId,
      deletedAt: null,
      OR: [
        ...(iqc.partNumber ? [{ partNumber: { equals: iqc.partNumber, mode: "insensitive" as const } }] : []),
        ...(supplierId ? [{ supplierId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const fd of fieldDefects) {
    const reasons: QualityLinkType[] = []
    let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
    if (iqc.partNumber && fd.partNumber && iqc.partNumber.toLowerCase() === fd.partNumber.toLowerCase()) {
      reasons.push("SAME_PART")
      confidence = "exact"
    }
    if (supplierId && fd.supplierId === supplierId) {
      reasons.push("SAME_SUPPLIER")
      if (confidence !== "exact") confidence = "strong"
    }
    if (iqc.vehicleModel && fd.vehicleModel && iqc.vehicleModel.toLowerCase() === fd.vehicleModel.toLowerCase()) {
      reasons.push("SAME_VEHICLE")
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
        confidence,
      })
    }
  }

  const defects = await prisma.defect.findMany({
    where: {
      oemId,
      OR: [
        { partNumber: { equals: iqc.partNumber, mode: "insensitive" } },
        ...(supplierId ? [{ supplierId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const d of defects) {
    if (iqc.linkedDefectId && d.id === iqc.linkedDefectId) continue
    const reasons: QualityLinkType[] = []
    let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
    if (iqc.partNumber && d.partNumber && iqc.partNumber.toLowerCase() === d.partNumber.toLowerCase()) {
      reasons.push("SAME_PART")
      confidence = "exact"
    }
    if (supplierId && d.supplierId === supplierId) {
      reasons.push("SAME_SUPPLIER")
      if (confidence !== "exact") confidence = "strong"
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
        confidence,
      })
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
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType)
    if (resolved) {
      records.push({ ...resolved, matchReasons: ["MANUAL"], confidence: "direct" })
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
  const records: RelatedQualityRecord[] = []

  if (fmea.defectId) {
    const defect = await prisma.defect.findFirst({
      where: { id: fmea.defectId, oemId },
    })
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
        confidence: "direct",
      })
    }
  }

  const fdOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
  if (fmea.partNumber) {
    fdOrConditions.push({ partNumber: { equals: fmea.partNumber, mode: "insensitive" as const } })
  }
  if (supplierId) {
    fdOrConditions.push({ supplierId })
  }
  if (fdOrConditions.length > 0) {
    const fieldDefects = await prisma.fieldDefect.findMany({
      where: {
        oemId,
        deletedAt: null,
        OR: fdOrConditions,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
  for (const fd of fieldDefects) {
    const reasons: QualityLinkType[] = []
    let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
    if (fmea.partNumber && fd.partNumber && fmea.partNumber.toLowerCase() === fd.partNumber.toLowerCase()) {
      reasons.push("SAME_PART")
      confidence = "exact"
    }
    if (supplierId && fd.supplierId === supplierId) {
      reasons.push("SAME_SUPPLIER")
      if (confidence !== "exact") confidence = "strong"
    }
    if (fd.category || fd.subcategory) {
      reasons.push("FMEA_COVERAGE")
    }
    if (fmea.vehicleModel && fd.vehicleModel && fmea.vehicleModel.toLowerCase() === fd.vehicleModel.toLowerCase()) {
      reasons.push("SAME_VEHICLE")
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
        confidence,
      })
    }
  }
  }

  const iqcRecords = await prisma.iqcReport.findMany({
    where: {
      oemId,
      partNumber: { equals: fmea.partNumber, mode: "insensitive" },
      ...(supplierId ? { supplierId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const i of iqcRecords) {
    const reasons: QualityLinkType[] = ["SAME_PART"]
    if (supplierId && i.supplierId === supplierId) reasons.push("SAME_SUPPLIER")
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
      confidence: supplierId && i.supplierId === supplierId ? "exact" : "strong",
    })
  }

  if (supplierId) {
    const ppapRecords = await prisma.ppapSubmission.findMany({
      where: { oemId, supplierId, partNumber: { equals: fmea.partNumber, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const p of ppapRecords) {
      records.push({
        recordType: "PPAP",
        id: p.id,
        title: `${p.requestNumber} — ${p.partName || p.partNumber}`,
        status: p.status,
        statusLabel: statusLabel("PPAP", p.status),
        supplier: (await getSupplierName(p.supplierId)) ?? null,
        partNumber: p.partNumber,
        createdAt: p.createdAt,
        matchReasons: ["SAME_PART", "SAME_SUPPLIER", "PPAP_REFERENCE"],
        href: buildHref("PPAP", p.id, companyType),
        confidence: "exact",
      })
    }
  }

  const defects = await prisma.defect.findMany({
    where: {
      oemId,
      OR: [
        { partNumber: { equals: fmea.partNumber, mode: "insensitive" } },
        ...(supplierId ? [{ supplierId }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const d of defects) {
    if (fmea.defectId && d.id === fmea.defectId) continue
    const reasons: QualityLinkType[] = []
    let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
    if (fmea.partNumber && d.partNumber && fmea.partNumber.toLowerCase() === d.partNumber.toLowerCase()) {
      reasons.push("SAME_PART")
      confidence = "exact"
    }
    if (supplierId && d.supplierId === supplierId) {
      reasons.push("SAME_SUPPLIER")
      if (confidence !== "exact") confidence = "strong"
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
        confidence,
      })
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
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType)
    if (resolved) {
      records.push({ ...resolved, matchReasons: ["MANUAL"], confidence: "direct" })
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
  const records: RelatedQualityRecord[] = []

  if (ppap.defectId) {
    const defect = await prisma.defect.findFirst({
      where: { id: ppap.defectId, oemId },
    })
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
        confidence: "direct",
      })
    }
  }

  const iqcRecords = await prisma.iqcReport.findMany({
    where: {
      oemId,
      supplierId,
      partNumber: { equals: ppap.partNumber, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const i of iqcRecords) {
    records.push({
      recordType: "IQC",
      id: i.id,
      title: `${i.inspectionNumber} — ${i.partName || i.partNumber}`,
      status: i.status,
      statusLabel: statusLabel("IQC", i.status),
      supplier: (await getSupplierName(i.supplierId)) ?? null,
      partNumber: i.partNumber,
      createdAt: i.createdAt,
      matchReasons: ["SAME_PART", "SAME_SUPPLIER"],
      href: buildHref("IQC", i.id, companyType),
      confidence: "exact",
    })
  }

  const fmeaRecords = await prisma.fmea.findMany({
    where: {
      oemId,
      partNumber: { equals: ppap.partNumber, mode: "insensitive" },
      supplierId,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const f of fmeaRecords) {
    records.push({
      recordType: "FMEA",
      id: f.id,
      title: `${f.fmeaNumber} — ${f.title}`,
      status: f.status,
      statusLabel: statusLabel("FMEA", f.status),
      supplier: f.supplierId ? (await getSupplierName(f.supplierId)) : null,
      partNumber: f.partNumber,
      createdAt: f.createdAt,
      matchReasons: ["SAME_PART", "SAME_SUPPLIER", "FMEA_COVERAGE"],
      href: buildHref("FMEA", f.id, companyType),
      confidence: "exact",
    })
  }

  const fieldDefects = await prisma.fieldDefect.findMany({
    where: {
      oemId,
      deletedAt: null,
      OR: [
        { partNumber: { equals: ppap.partNumber, mode: "insensitive" as const } },
        { supplierId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const fd of fieldDefects) {
    const reasons: QualityLinkType[] = []
    let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
    if (ppap.partNumber && fd.partNumber && ppap.partNumber.toLowerCase() === fd.partNumber.toLowerCase()) {
      reasons.push("SAME_PART")
      confidence = "exact"
    }
    if (fd.supplierId === supplierId) {
      reasons.push("SAME_SUPPLIER")
      if (confidence !== "exact") confidence = "strong"
    }
    if (ppap.vehicleModel && fd.vehicleModel && ppap.vehicleModel.toLowerCase() === fd.vehicleModel.toLowerCase()) {
      reasons.push("SAME_VEHICLE")
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
        confidence,
      })
    }
  }

  const defects = await prisma.defect.findMany({
    where: {
      oemId,
      OR: [
        { partNumber: { equals: ppap.partNumber, mode: "insensitive" } },
        { supplierId },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  for (const d of defects) {
    if (ppap.defectId && d.id === ppap.defectId) continue
    const reasons: QualityLinkType[] = []
    let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
    if (ppap.partNumber && d.partNumber && ppap.partNumber.toLowerCase() === d.partNumber.toLowerCase()) {
      reasons.push("SAME_PART")
      confidence = "exact"
    }
    if (d.supplierId === supplierId) {
      reasons.push("SAME_SUPPLIER")
      if (confidence !== "exact") confidence = "strong"
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
        confidence,
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
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType)
    if (resolved) {
      records.push({ ...resolved, matchReasons: ["MANUAL"], confidence: "direct" })
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
  const records: RelatedQualityRecord[] = []

  const linkedFd = await prisma.fieldDefect.findFirst({
    where: { linkedDefectId: defectId, oemId, deletedAt: null },
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
      confidence: "direct",
    })
  }

  const linkedIqc = await prisma.iqcReport.findFirst({
    where: { linkedDefectId: defectId, oemId },
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
      confidence: "direct",
    })
  }

  const linkedPpap = await prisma.ppapSubmission.findFirst({
    where: { defectId: defectId, oemId },
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
      confidence: "direct",
    })
  }

  const linkedFmea = await prisma.fmea.findFirst({
    where: { defectId: defectId, oemId },
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
      confidence: "direct",
    })
  }

  const fdOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
  if (defect.partNumber) {
    fdOrConditions.push({ partNumber: { equals: defect.partNumber, mode: "insensitive" as const } })
  }
  if (supplierId) {
    fdOrConditions.push({ supplierId })
  }
  if (fdOrConditions.length > 0) {
    const fieldDefects = await prisma.fieldDefect.findMany({
      where: {
        oemId,
        deletedAt: null,
        ...(linkedFd ? { id: { not: linkedFd.id } } : {}),
        OR: fdOrConditions,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const fd of fieldDefects) {
      const reasons: QualityLinkType[] = []
      let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
      if (defect.partNumber && fd.partNumber && defect.partNumber.toLowerCase() === fd.partNumber.toLowerCase()) {
        reasons.push("SAME_PART")
        confidence = "exact"
      }
      if (supplierId && fd.supplierId === supplierId) {
        reasons.push("SAME_SUPPLIER")
        if (confidence !== "exact") confidence = "strong"
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
          confidence,
        })
      }
    }
  }

  if (defect.partNumber || supplierId) {
    const dOrConditions: Array<{ partNumber: { equals: string; mode: "insensitive" } } | { supplierId: string }> = []
    if (defect.partNumber) {
      dOrConditions.push({ partNumber: { equals: defect.partNumber, mode: "insensitive" as const } })
    }
    if (supplierId) {
      dOrConditions.push({ supplierId })
    }
    const otherDefects = await prisma.defect.findMany({
      where: {
        oemId,
        id: { not: defectId },
        OR: dOrConditions,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
    for (const d of otherDefects) {
      const reasons: QualityLinkType[] = []
      let confidence: "exact" | "strong" | "moderate" | "direct" = "moderate"
      if (defect.partNumber && d.partNumber && defect.partNumber.toLowerCase() === d.partNumber.toLowerCase()) {
        reasons.push("SAME_PART")
        confidence = "exact"
      }
      if (supplierId && d.supplierId === supplierId) {
        reasons.push("SAME_SUPPLIER")
        if (confidence !== "exact") confidence = "strong"
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
          confidence,
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
    const resolved = await resolveRecord(targetRecordType, targetRecordId, oemId, companyType)
    if (resolved) {
      records.push({ ...resolved, matchReasons: ["MANUAL"], confidence: "direct" })
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
): Promise<Omit<RelatedQualityRecord, "matchReasons" | "confidence"> | null> {
  switch (recordType) {
    case "FIELD_DEFECT": {
      const fd = await prisma.fieldDefect.findFirst({
        where: { id: recordId, oemId, deletedAt: null },
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
        where: { id: recordId, oemId },
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
        where: { id: recordId, oemId },
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
        where: { id: recordId, oemId },
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
        where: { id: recordId, oemId },
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