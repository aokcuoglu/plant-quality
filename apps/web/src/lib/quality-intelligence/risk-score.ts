import { getRiskLevel, SIGNAL_POINTS, type RiskScoreContributor, type SupplierPartRisk } from "./types"

interface RiskAccumulator {
  supplierId: string
  supplierName: string
  partNumber: string
  partName: string | null
  contributors: RiskScoreContributor[]
  latestActivity: Date | null
  signalCount: number
}

export function computeSupplierPartRisks(
  signals: {
    ppapIssues: { supplierId: string; supplierName: string; partNumber: string; partName: string | null; ppapApprovedAt: Date | null; issueTypes: string[] }[]
    fmeaGaps: { supplierId: string | null; partNumber: string | null; sourceTitle: string }[]
    iqcRejections: { supplierId: string; supplierName: string; partNumber: string; partName: string | null; rejectionCount: number; latestDate: Date | null }[]
    repeatIssues: { supplierId: string; supplierName: string; partNumber: string; partName: string | null; totalCount: number; latestDate: Date | null }[]
    fieldDefects: { supplierId: string | null; supplierName: string | null; partNumber: string | null; reportDate: Date | null }[]
    defects8d: { supplierId: string; partNumber: string; createdAt: Date | null; status: string }[]
    highRpnFmeas: { supplierId: string | null; partNumber: string; maxRpn: number }[]
    open8d: { supplierId: string; partNumber: string; dueDate: Date | null }[]
    manualLinks: { sourceSupplierId: string | null; sourcePartNumber: string | null; targetSupplierId: string | null; targetPartNumber: string | null }[]
  },
  supplierMap: Map<string, string>
): SupplierPartRisk[] {
  const accumulators = new Map<string, RiskAccumulator>()

  function getAcc(supplierId: string, partNumber: string): RiskAccumulator {
    if (!partNumber || !supplierId) return null as unknown as RiskAccumulator
    const key = `${supplierId}::${partNumber}`
    if (!accumulators.has(key)) {
      accumulators.set(key, {
        supplierId,
        supplierName: supplierMap.get(supplierId) ?? "Unknown",
        partNumber,
        partName: null,
        contributors: [],
        latestActivity: null,
        signalCount: 0,
      })
    }
    return accumulators.get(key)!
  }

  function addContributor(
    supplierId: string,
    partNumber: string,
    signal: string,
    points: number,
    description: string,
    date: Date | null
  ) {
    const acc = getAcc(supplierId, partNumber)
    if (!acc) return
    acc.contributors.push({ signal, points, description })
    acc.signalCount++
    if (date) {
      if (!acc.latestActivity || date > acc.latestActivity) {
        acc.latestActivity = date
      }
    }
  }

  for (const p of signals.ppapIssues) {
    addContributor(p.supplierId, p.partNumber, "PPAP_APPROVED_WITH_ISSUE", SIGNAL_POINTS.PPAP_APPROVED_WITH_ISSUE, `Approved PPAP with ${p.issueTypes.join(", ")} issues`, p.ppapApprovedAt)
  }

  for (const g of signals.fmeaGaps) {
    if (g.supplierId && g.partNumber) {
      addContributor(g.supplierId, g.partNumber, "FMEA_COVERAGE_GAP", SIGNAL_POINTS.FMEA_COVERAGE_GAP, `FMEA coverage gap: ${g.sourceTitle}`, null)
    }
  }

  for (const i of signals.iqcRejections) {
    addContributor(i.supplierId, i.partNumber, "IQC_REJECTED", SIGNAL_POINTS.IQC_REJECTED, `${i.rejectionCount} IQC rejection(s)`, i.latestDate)
    if (i.partName) {
      const acc = getAcc(i.supplierId, i.partNumber)
      if (acc) acc.partName = i.partName
    }
  }

  for (const r of signals.repeatIssues) {
    addContributor(r.supplierId, r.partNumber, "REPEAT_ISSUE", SIGNAL_POINTS.REPEAT_ISSUE, `${r.totalCount} repeat issue(s) across modules`, r.latestDate)
    if (r.partName) {
      const acc = getAcc(r.supplierId, r.partNumber)
      if (acc) acc.partName = r.partName
    }
  }

  for (const fd of signals.fieldDefects) {
    if (fd.supplierId && fd.partNumber) {
      addContributor(fd.supplierId, fd.partNumber, "FIELD_DEFECT", SIGNAL_POINTS.FIELD_DEFECT, `Field defect reported`, fd.reportDate)
    }
  }

  for (const d of signals.defects8d) {
    addContributor(d.supplierId, d.partNumber, "DEFECT_8D", SIGNAL_POINTS.DEFECT_8D, `8D defect reported`, d.createdAt)
  }

  for (const f of signals.highRpnFmeas) {
    if (f.supplierId) {
      addContributor(f.supplierId, f.partNumber, "HIGH_RPN", SIGNAL_POINTS.HIGH_RPN, `FMEA with max RPN ${f.maxRpn}`, null)
    }
  }

  for (const o of signals.open8d) {
    addContributor(o.supplierId, o.partNumber, "OPEN_8D_OR_OVERDUE", SIGNAL_POINTS.OPEN_8D_OR_OVERDUE, `Open or overdue 8D`, o.dueDate)
  }

  for (const l of signals.manualLinks) {
    if (l.sourceSupplierId && l.sourcePartNumber) {
      addContributor(l.sourceSupplierId, l.sourcePartNumber, "MANUAL_LINK", SIGNAL_POINTS.MANUAL_LINK, "Manually linked quality records", null)
    }
    if (l.targetSupplierId && l.targetPartNumber) {
      addContributor(l.targetSupplierId, l.targetPartNumber, "MANUAL_LINK", SIGNAL_POINTS.MANUAL_LINK, "Manually linked quality records", null)
    }
  }

  const results: SupplierPartRisk[] = []
  for (const acc of accumulators.values()) {
    const totalScore = acc.contributors.reduce((sum, c) => sum + c.points, 0)
    const safeScore = Number.isFinite(totalScore) ? totalScore : 0
    const cappedScore = Math.min(safeScore, 150)
    results.push({
      supplierId: acc.supplierId,
      supplierName: acc.supplierName,
      partNumber: acc.partNumber,
      partName: acc.partName,
      riskScore: cappedScore,
      riskLevel: getRiskLevel(cappedScore),
      contributors: acc.contributors,
      latestActivity: acc.latestActivity,
      signalCount: acc.signalCount,
    })
  }

  results.sort((a, b) => {
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore
    const aDate = a.latestActivity?.getTime() ?? 0
    const bDate = b.latestActivity?.getTime() ?? 0
    if (bDate !== aDate) return bDate - aDate
    const supplierCmp = a.supplierName.localeCompare(b.supplierName)
    if (supplierCmp !== 0) return supplierCmp
    return a.partNumber.localeCompare(b.partNumber)
  })
  return results
}