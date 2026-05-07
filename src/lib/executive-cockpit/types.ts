export interface ExecutiveKpis {
  criticalHighFieldIssues: number
  openDefects8d: number
  overdueActions: number
  highRiskSupplierParts: number
  repeatIssues: number
  ppapApprovedWithIssues: number
  fmeaCoverageGaps: number
}

export type ActionPriority = "critical" | "high" | "medium"

export interface ActionItem {
  id: string
  priority: ActionPriority
  reason: string
  title: string
  href: string | null
  suggestedOwner: string
  category: "supplier" | "sla" | "fmea" | "ppap" | "repeat"
}

export interface SupplierAttentionEntry {
  supplierId: string
  supplierName: string
  activeSignalCount: number
  highestRiskLevel: string
  topAffectedParts: string[]
  recommendedAction: string
  hrefs: { label: string; href: string }[]
}

export interface SlaEscalationItem {
  id: string
  type: "defect" | "field_defect"
  title: string
  status: string
  severity: string | null
  escalationLevel: string | null
  slaStatus: string
  dueDate: Date | null
  href: string
  ownerType: string | null
}

export interface ExecutiveCockpitData {
  kpis: ExecutiveKpis
  topRisks: {
    rank: number
    supplierId: string
    supplierName: string
    partNumber: string
    partName: string | null
    riskLevel: string
    riskScore: number
    mainSignals: string[]
    latestActivity: Date | null
    recommendedAction: string
    href: string | null
  }[]
  supplierAttention: SupplierAttentionEntry[]
  slaEscalationAttention: SlaEscalationItem[]
  repeatIssueSummary: {
    totalClusters: number
    totalRecords: number
    clusters: {
      supplierId: string
      supplierName: string
      partNumber: string
      totalCount: number
      fieldDefectCount: number
      defect8dCount: number
      iqcCount: number
      hrefs: { label: string; href: string }[]
    }[]
  }
  ppapIqcFieldSignals: {
    ppapId: string
    ppapRequestNumber: string
    supplierName: string
    partNumber: string
    issueCount: number
    issueTypes: string[]
    latestIssueDate: Date | null
    href: string
  }[]
  fmeaCoverageSignals: {
    sourceId: string
    sourceType: string
    sourceTitle: string
    supplierName: string | null
    partNumber: string | null
    hasRelatedFmea: boolean
    gapReason: string
    sourceHref: string
    fmeaHref: string | null
  }[]
  actionRequiredList: ActionItem[]
}