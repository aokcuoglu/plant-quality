import { prisma } from "@/lib/prisma"
import { PENALTY_CONFIG } from "./scoring"

export type ScorecardConfigData = {
  fieldDefectPerItem: number
  fieldDefectCap: number
  repeatIssuePerItem: number
  repeatIssueCap: number
  iqcRejectedPerItem: number
  iqcRejectedCap: number
  openOverdue8dPerItem: number
  openOverdue8dCap: number
  slaBreachPerItem: number
  slaBreachCap: number
  ppapWithIssuesPerItem: number
  ppapWithIssuesCap: number
  fmeaGapPerItem: number
  fmeaGapCap: number
  execRiskPerItem: number
  execRiskCap: number
}

export function defaultScorecardConfig(): ScorecardConfigData {
  return {
    fieldDefectPerItem: PENALTY_CONFIG.FIELD_DEFECT_HIGH_CRITICAL.perItem,
    fieldDefectCap: PENALTY_CONFIG.FIELD_DEFECT_HIGH_CRITICAL.cap,
    repeatIssuePerItem: PENALTY_CONFIG.REPEAT_ISSUE_CLUSTER.perItem,
    repeatIssueCap: PENALTY_CONFIG.REPEAT_ISSUE_CLUSTER.cap,
    iqcRejectedPerItem: PENALTY_CONFIG.IQC_REJECTED.perItem,
    iqcRejectedCap: PENALTY_CONFIG.IQC_REJECTED.cap,
    openOverdue8dPerItem: PENALTY_CONFIG.OPEN_OVERDUE_8D.perItem,
    openOverdue8dCap: PENALTY_CONFIG.OPEN_OVERDUE_8D.cap,
    slaBreachPerItem: PENALTY_CONFIG.SLA_BREACH.perItem,
    slaBreachCap: PENALTY_CONFIG.SLA_BREACH.cap,
    ppapWithIssuesPerItem: PENALTY_CONFIG.PPAP_APPROVED_WITH_ISSUES.perItem,
    ppapWithIssuesCap: PENALTY_CONFIG.PPAP_APPROVED_WITH_ISSUES.cap,
    fmeaGapPerItem: PENALTY_CONFIG.FMEA_COVERAGE_GAP.perItem,
    fmeaGapCap: PENALTY_CONFIG.FMEA_COVERAGE_GAP.cap,
    execRiskPerItem: PENALTY_CONFIG.EXECUTIVE_RISK_SIGNAL.perItem,
    execRiskCap: PENALTY_CONFIG.EXECUTIVE_RISK_SIGNAL.cap,
  }
}

export async function getScorecardConfig(companyId: string): Promise<ScorecardConfigData> {
  const db = await prisma.supplierScorecardConfig.findUnique({
    where: { companyId },
  })

  if (!db) return defaultScorecardConfig()

  return {
    fieldDefectPerItem: db.fieldDefectPerItem,
    fieldDefectCap: db.fieldDefectCap,
    repeatIssuePerItem: db.repeatIssuePerItem,
    repeatIssueCap: db.repeatIssueCap,
    iqcRejectedPerItem: db.iqcRejectedPerItem,
    iqcRejectedCap: db.iqcRejectedCap,
    openOverdue8dPerItem: db.openOverdue8dPerItem,
    openOverdue8dCap: db.openOverdue8dCap,
    slaBreachPerItem: db.slaBreachPerItem,
    slaBreachCap: db.slaBreachCap,
    ppapWithIssuesPerItem: db.ppapWithIssuesPerItem,
    ppapWithIssuesCap: db.ppapWithIssuesCap,
    fmeaGapPerItem: db.fmeaGapPerItem,
    fmeaGapCap: db.fmeaGapCap,
    execRiskPerItem: db.execRiskPerItem,
    execRiskCap: db.execRiskCap,
  }
}
