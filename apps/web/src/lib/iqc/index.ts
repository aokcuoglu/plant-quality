import { isEditorRole } from "@/lib/roles"
import type { IqcResult, IqcInspectionType } from "@plantx/db/client"

export const IQC_DEFAULT_CHECKLIST: { itemName: string; requirement: string }[] = [
  { itemName: "Packaging Condition", requirement: "No visible damage, contamination, or deterioration on packaging" },
  { itemName: "Label / Traceability Check", requirement: "Labels match PO, part number, lot/batch number, and supplier ID" },
  { itemName: "Visual Inspection", requirement: "No visible defects, discoloration, foreign material, or surface irregularities" },
  { itemName: "Dimensional Check", requirement: "Critical dimensions within specified tolerances per drawing" },
  { itemName: "Functional Check", requirement: "Part functions as intended per specification" },
  { itemName: "Material Certificate Check", requirement: "Material certification/test report matches specification" },
  { itemName: "Quantity Check", requirement: "Received quantity matches PO quantity" },
  { itemName: "Damage Check", requirement: "No shipping damage, dents, scratches, or impact marks" },
  { itemName: "Special Characteristic Check", requirement: "Safety or regulatory critical characteristics verified per control plan" },
]

export const IQC_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export const IQC_RESULT_LABELS: Record<string, string> = {
  ACCEPTED: "Accepted",
  CONDITIONAL_ACCEPTED: "Conditional Accepted",
  REJECTED: "Rejected",
  ON_HOLD: "On Hold",
  REWORK_REQUIRED: "Rework Required",
  SORTING_REQUIRED: "Sorting Required",
}

export const IQC_INSPECTION_TYPE_LABELS: Record<string, string> = {
  RECEIVING_INSPECTION: "Receiving Inspection",
  FIRST_ARTICLE_INSPECTION: "First Article Inspection",
  CONTAINMENT_INSPECTION: "Containment Inspection",
  RE_INSPECTION: "Re-Inspection",
  DOCK_AUDIT: "Dock Audit",
}

export const IQC_INSPECTION_TYPES: { value: IqcInspectionType; label: string }[] = [
  { value: "RECEIVING_INSPECTION", label: "Receiving Inspection" },
  { value: "FIRST_ARTICLE_INSPECTION", label: "First Article Inspection" },
  { value: "CONTAINMENT_INSPECTION", label: "Containment Inspection" },
  { value: "RE_INSPECTION", label: "Re-Inspection" },
  { value: "DOCK_AUDIT", label: "Dock Audit" },
]

export const IQC_CHECKLIST_RESULT_LABELS: Record<string, string> = {
  PENDING: "Pending",
  OK: "OK",
  NOK: "NOK",
  NA: "N/A",
}

export function getIqcStatusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-muted text-muted-foreground"
    case "CANCELLED":
      return "bg-destructive/10 text-destructive"
    case "IN_PROGRESS":
      return "bg-muted text-muted-foreground"
    case "PLANNED":
      return "bg-brand/10 text-brand"
    case "DRAFT":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getIqcResultColor(result: string | null): string {
  switch (result) {
    case "ACCEPTED":
      return "bg-muted text-muted-foreground"
    case "CONDITIONAL_ACCEPTED":
      return "bg-destructive/10 text-destructive"
    case "REJECTED":
      return "bg-destructive/10 text-destructive"
    case "ON_HOLD":
      return "bg-destructive/10 text-destructive"
    case "REWORK_REQUIRED":
      return "bg-destructive/10 text-destructive"
    case "SORTING_REQUIRED":
      return "bg-destructive/10 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getIqcChecklistResultColor(result: string): string {
  switch (result) {
    case "OK":
      return "bg-muted text-muted-foreground"
    case "NOK":
      return "bg-destructive/10 text-destructive"
    case "NA":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getIqcChecklistResultIcon(result: string): string {
  switch (result) {
    case "OK":
      return "✓"
    case "NOK":
      return "✗"
    case "NA":
      return "—"
    default:
      return "○"
  }
}

export function generateIqcInspectionNumber(): string {
  const prefix = "IQC"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export function canManageIqc(session: { user: { companyType: string; role: string } } | null, type: "OEM" | "SUPPLIER" = "OEM"): boolean {
  if (!session) return false
  if (session.user.companyType !== type) return false
  return isEditorRole(session.user.role)
}

export function isNegativeResult(result: IqcResult | null): boolean {
  if (!result) return false
  return ["REJECTED", "ON_HOLD", "REWORK_REQUIRED", "SORTING_REQUIRED"].includes(result)
}