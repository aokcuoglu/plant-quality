import type { ScoreGrade, RiskLevel, PenaltyBreakdown } from "./types"

export function computeScore(breakdown: PenaltyBreakdown): number {
  const totalPenalty =
    breakdown.fieldDefectHighCritical.penalty +
    breakdown.repeatIssueCluster.penalty +
    breakdown.iqcRejected.penalty +
    breakdown.openOverdue8d.penalty +
    breakdown.slaBreach.penalty +
    breakdown.ppapApprovedWithIssues.penalty +
    breakdown.fmeaCoverageGap.penalty +
    breakdown.executiveRiskSignal.penalty

  return Math.max(0, Math.min(100, 100 - totalPenalty))
}

export function getGrade(score: number): ScoreGrade {
  if (score >= 90) return "A"
  if (score >= 75) return "B"
  if (score >= 60) return "C"
  if (score >= 40) return "D"
  return "E"
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "low"
  if (score >= 60) return "medium"
  if (score >= 40) return "high"
  return "critical"
}

export function applyPenalty(count: number, perItem: number, cap: number): number {
  if (count <= 0) return 0
  return Math.min(count * perItem, cap)
}

export const PENALTY_CONFIG = {
  FIELD_DEFECT_HIGH_CRITICAL: { perItem: 10, cap: 30 },
  REPEAT_ISSUE_CLUSTER: { perItem: 15, cap: 30 },
  IQC_REJECTED: { perItem: 8, cap: 25 },
  OPEN_OVERDUE_8D: { perItem: 10, cap: 30 },
  SLA_BREACH: { perItem: 10, cap: 25 },
  PPAP_APPROVED_WITH_ISSUES: { perItem: 8, cap: 20 },
  FMEA_COVERAGE_GAP: { perItem: 8, cap: 20 },
  EXECUTIVE_RISK_SIGNAL: { perItem: 5, cap: 15 },
} as const

export const GRADE_CONFIG: Record<ScoreGrade, { label: string; className: string }> = {
  A: { label: "A", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  B: { label: "B", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  C: { label: "C", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  D: { label: "D", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  E: { label: "E", className: "bg-red-500/10 text-red-500 border-red-500/20" },
}

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  high: { label: "High", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  critical: { label: "Critical", className: "bg-red-500/10 text-red-500 border-red-500/20" },
}

export function getRecommendedAction(riskLevel: RiskLevel, signalCount: number): string {
  if (riskLevel === "critical") return "Immediate executive review required"
  if (riskLevel === "high") return "Schedule supplier review meeting"
  if (riskLevel === "medium" && signalCount >= 3) return "Request supplier corrective action plan"
  if (riskLevel === "medium") return "Monitor and plan review"
  return "Continue monitoring"
}