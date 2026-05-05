export type RiskLevel = "low" | "medium" | "high" | "critical"

export interface RiskScoreContributor {
  signal: string
  points: number
  description: string
}

export interface SupplierPartRisk {
  supplierId: string
  supplierName: string
  partNumber: string
  partName: string | null
  riskScore: number
  riskLevel: RiskLevel
  contributors: RiskScoreContributor[]
  latestActivity: Date | null
  signalCount: number
}

export interface PpapPostApprovalIssueSignal {
  ppapId: string
  ppapRequestNumber: string
  supplierId: string
  supplierName: string
  partNumber: string
  partName: string | null
  ppapApprovedAt: Date | null
  ppapStatus: string
  issueCount: number
  issueTypes: string[]
  latestIssueDate: Date | null
  iqcIssues: { id: string; result: string; inspectionNumber: string; inspectionDate: Date | null }[]
  fieldDefects: { id: string; title: string; status: string; reportDate: Date | null }[]
  defects8d: { id: string; description: string; status: string; createdAt: Date | null }[]
  href: string
}

export interface FmeaCoverageGapSignal {
  sourceId: string
  sourceType: "FIELD_DEFECT" | "DEFECT"
  sourceTitle: string
  supplierId: string | null
  supplierName: string | null
  partNumber: string | null
  category: string | null
  subcategory: string | null
  failureText: string
  hasRelatedFmea: boolean
  fmeaId: string | null
  fmeaNumber: string | null
  fmeaFailureModeMatch: boolean
  gapReason: string
  sourceHref: string
  fmeaHref: string | null
}

export interface IqcRejectionSignal {
  supplierId: string
  supplierName: string
  partNumber: string
  partName: string | null
  rejectionCount: number
  latestResult: string
  latestInspectionDate: Date | null
  latestInspectionNumber: string | null
  hasLinked8d: boolean
  inspections: {
    id: string
    inspectionNumber: string
    result: string
    inspectionDate: Date | null
    partName: string | null
    linkedDefectId: string | null
    href: string
  }[]
}

export interface RepeatIssueSignal {
  supplierId: string
  supplierName: string
  partNumber: string
  partName: string | null
  fieldDefectCount: number
  defect8dCount: number
  iqcIssueCount: number
  totalCount: number
  linkedByManualLink: boolean
  fieldDefects: { id: string; title: string; status: string; reportDate: Date | null; href: string }[]
  defects8d: { id: string; description: string; status: string; createdAt: Date | null; href: string }[]
  iqcInspections: { id: string; inspectionNumber: string; result: string; href: string }[]
}

export interface QualityIntelligenceSummary {
  totalSupplierParts: number
  highRiskCount: number
  criticalRiskCount: number
  ppapIssueCount: number
  fmeaCoverageGapCount: number
  iqcRejectionSignalCount: number
  repeatIssueCount: number
  totalFieldDefects: number
  totalOpenDefects: number
  totalOverdueFieldDefects: number
  totalCriticalFieldDefects: number
}

export const RISK_LEVEL_THRESHOLDS: Record<RiskLevel, { min: number; max: number }> = {
  low: { min: 0, max: 24 },
  medium: { min: 25, max: 49 },
  high: { min: 50, max: 74 },
  critical: { min: 75, max: 999 },
}

export function getRiskLevel(score: number): RiskLevel {
  if (!Number.isFinite(score) || score < 0) return "low"
  if (score >= 75) return "critical"
  if (score >= 50) return "high"
  if (score >= 25) return "medium"
  return "low"
}

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  high: { label: "High", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  critical: { label: "Critical", className: "bg-red-500/10 text-red-500 border-red-500/20" },
}

export const SIGNAL_POINTS = {
  IQC_REJECTED: 25,
  FIELD_DEFECT: 25,
  DEFECT_8D: 25,
  REPEAT_ISSUE: 20,
  PPAP_APPROVED_WITH_ISSUE: 20,
  FMEA_COVERAGE_GAP: 20,
  HIGH_RPN: 15,
  OPEN_8D_OR_OVERDUE: 15,
  MANUAL_LINK: 10,
} as const

export type SignalPointKey = keyof typeof SIGNAL_POINTS