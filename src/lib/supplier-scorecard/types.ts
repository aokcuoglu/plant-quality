export type ScoreGrade = "A" | "B" | "C" | "D" | "E"

export type RiskLevel = "low" | "medium" | "high" | "critical"

export interface PenaltyBreakdown {
  fieldDefectHighCritical: { count: number; penalty: number; cap: number }
  repeatIssueCluster: { count: number; penalty: number; cap: number }
  iqcRejected: { count: number; penalty: number; cap: number }
  openOverdue8d: { count: number; penalty: number; cap: number }
  slaBreach: { count: number; penalty: number; cap: number }
  ppapApprovedWithIssues: { count: number; penalty: number; cap: number }
  fmeaCoverageGap: { count: number; penalty: number; cap: number }
  executiveRiskSignal: { count: number; penalty: number; cap: number }
}

export interface SignalDetail {
  label: string
  count: number
  severity: "critical" | "high" | "medium" | "low"
}

export interface SupplierScorecard {
  supplierId: string
  supplierName: string
  overallScore: number
  grade: ScoreGrade
  riskLevel: RiskLevel
  openIssuesCount: number
  repeatIssuesCount: number
  fieldDefectsCount: number
  defects8dCount: number
  overdue8dCount: number
  iqcRejectedCount: number
  ppapApprovedWithIssuesCount: number
  fmeaCoverageGapCount: number
  escalationCount: number
  latestActivityAt: Date | null
  keySignals: SignalDetail[]
  recommendedAction: string
  penaltyBreakdown: PenaltyBreakdown
  drillDownLinks: {
    label: string
    href: string
  }[]
}

export interface SupplierScorecardSummary {
  suppliersMonitored: number
  highCriticalRiskCount: number
  averageScore: number
  overdueActionsCount: number
  suppliers: SupplierScorecard[]
}