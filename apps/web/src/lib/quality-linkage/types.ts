import type { QualityRecordType, QualityLinkType } from "@plantx/db/client"

export type { QualityRecordType, QualityLinkType }

export const QUALITY_RECORD_TYPE_LABELS: Record<QualityRecordType, string> = {
  FIELD_DEFECT: "Field Defect",
  DEFECT: "Defect / 8D",
  EIGHT_D: "8D Report",
  PPAP: "PPAP",
  IQC: "IQC",
  FMEA: "FMEA",
  LOGISTIC_ORDER: "Vehicle Order",
}

export const QUALITY_LINK_TYPE_LABELS: Record<QualityLinkType, string> = {
  SAME_PART: "Same part number",
  SAME_SUPPLIER: "Same supplier + part",
  SAME_FAILURE_MODE: "Same failure mode",
  SAME_VEHICLE: "Same vehicle/project",
  IQC_TO_DEFECT: "IQC → Defect",
  FIELD_TO_8D: "Direct 8D link",
  PPAP_REFERENCE: "PPAP same part",
  FMEA_COVERAGE: "FMEA coverage",
  MANUAL: "Manual link",
  RELATED_HISTORY: "Related history",
  IQC_REJECTION: "IQC rejection history",
  SAME_SUPPLIER_ONLY: "Same supplier only",
  LOGISTIC_QUALITY_HOLD: "Quality Hold → Logistic",
  ORDER_TO_DEFECT: "Order → Defect",
}

export const QUALITY_LINK_TYPE_COLORS: Record<QualityLinkType, string> = {
  SAME_PART: "bg-muted text-muted-foreground border-border",
  SAME_SUPPLIER: "bg-muted text-muted-foreground border-border",
  SAME_FAILURE_MODE: "bg-destructive/10 text-destructive border-destructive/20",
  SAME_VEHICLE: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  IQC_TO_DEFECT: "bg-muted text-muted-foreground border-border",
  FIELD_TO_8D: "bg-muted text-muted-foreground border-border",
  PPAP_REFERENCE: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  FMEA_COVERAGE: "bg-destructive/10 text-destructive border-destructive/20",
  MANUAL: "bg-muted text-foreground border-foreground/20",
  RELATED_HISTORY: "bg-muted text-muted-foreground border-border",
  IQC_REJECTION: "bg-destructive/10 text-destructive border-destructive/20",
  SAME_SUPPLIER_ONLY: "bg-muted/60 text-muted-foreground border-border",
  LOGISTIC_QUALITY_HOLD: "bg-destructive/10 text-destructive border-destructive/20",
  ORDER_TO_DEFECT: "bg-muted text-muted-foreground border-border",
}

export const QUALITY_RECORD_TYPE_COLORS: Record<QualityRecordType, string> = {
  FIELD_DEFECT: "bg-destructive/10 text-destructive border-destructive/20",
  DEFECT: "bg-destructive/10 text-destructive border-destructive/20",
  EIGHT_D: "bg-destructive/10 text-destructive border-destructive/20",
  PPAP: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  IQC: "bg-muted text-muted-foreground border-border",
  FMEA: "bg-destructive/10 text-destructive border-destructive/20",
  LOGISTIC_ORDER: "bg-muted text-muted-foreground border-border",
}

export const QUALITY_RECORD_TYPE_ICONS: Record<QualityRecordType, string> = {
  FIELD_DEFECT: "AlertTriangle",
  DEFECT: "Bug",
  EIGHT_D: "FileText",
  PPAP: "FileCheck",
  IQC: "ClipboardCheck",
  FMEA: "ShieldAlert",
  LOGISTIC_ORDER: "Truck",
}

export const SCORE_MANUAL = 100
export const SCORE_DIRECT = 95
export const SCORE_THRESHOLD = 50
export const DEFAULT_GROUP_LIMIT = 5
export const MAX_TOTAL_RESULTS = 20

export type Confidence = "direct" | "strong" | "moderate" | "weak"

export function confidenceFromScore(score: number): Confidence {
  if (score >= SCORE_DIRECT) return "direct"
  if (score >= 70) return "strong"
  if (score >= SCORE_THRESHOLD) return "moderate"
  return "weak"
}

export function confidenceLabel(c: Confidence): string {
  switch (c) {
    case "direct": return "Direct"
    case "strong": return "Strong"
    case "moderate": return "Moderate"
    case "weak": return "Low"
  }
}

export const CONFIDENCE_STYLES: Record<Confidence, { label: string; className: string }> = {
  direct: { label: "Direct", className: "bg-muted text-foreground border-foreground/20" },
  strong: { label: "Strong", className: "bg-muted text-muted-foreground border-border" },
  moderate: { label: "Moderate", className: "bg-destructive/10 text-destructive border-destructive/20" },
  weak: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
}

export interface RelatedQualityRecord {
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
  confidence: Confidence
  score: number
}

export interface GroupedRelatedRecords {
  recordType: QualityRecordType
  label: string
  records: RelatedQualityRecord[]
}