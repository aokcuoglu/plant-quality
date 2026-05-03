import type { QualityRecordType, QualityLinkType } from "@/generated/prisma/client"

export type { QualityRecordType, QualityLinkType }

export const QUALITY_RECORD_TYPE_LABELS: Record<QualityRecordType, string> = {
  FIELD_DEFECT: "Field Defect",
  DEFECT: "Defect / 8D",
  EIGHT_D: "8D Report",
  PPAP: "PPAP",
  IQC: "IQC",
  FMEA: "FMEA",
}

export const QUALITY_LINK_TYPE_LABELS: Record<QualityLinkType, string> = {
  SAME_PART: "Same Part",
  SAME_SUPPLIER: "Same Supplier",
  SAME_FAILURE_MODE: "Same Failure Mode",
  SAME_VEHICLE: "Same Vehicle/Project",
  IQC_TO_DEFECT: "IQC → Defect",
  FIELD_TO_8D: "Field → 8D",
  PPAP_REFERENCE: "PPAP Reference",
  FMEA_COVERAGE: "FMEA Coverage",
  MANUAL: "Manual Link",
  RELATED_HISTORY: "Related History",
}

export const QUALITY_LINK_TYPE_COLORS: Record<QualityLinkType, string> = {
  SAME_PART: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  SAME_SUPPLIER: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  SAME_FAILURE_MODE: "bg-red-500/10 text-red-500 border-red-500/20",
  SAME_VEHICLE: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  IQC_TO_DEFECT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FIELD_TO_8D: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PPAP_REFERENCE: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  FMEA_COVERAGE: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  MANUAL: "bg-foreground/10 text-foreground border-foreground/20",
  RELATED_HISTORY: "bg-muted text-muted-foreground border-border",
}

export const QUALITY_RECORD_TYPE_COLORS: Record<QualityRecordType, string> = {
  FIELD_DEFECT: "bg-red-500/10 text-red-500 border-red-500/20",
  DEFECT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  EIGHT_D: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  PPAP: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  IQC: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  FMEA: "bg-orange-500/10 text-orange-500 border-orange-500/20",
}

export const QUALITY_RECORD_TYPE_ICONS: Record<QualityRecordType, string> = {
  FIELD_DEFECT: "AlertTriangle",
  DEFECT: "Bug",
  EIGHT_D: "FileText",
  PPAP: "FileCheck",
  IQC: "ClipboardCheck",
  FMEA: "ShieldAlert",
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
  confidence: "exact" | "strong" | "moderate" | "direct"
}

export interface GroupedRelatedRecords {
  recordType: QualityRecordType
  label: string
  records: RelatedQualityRecord[]
}