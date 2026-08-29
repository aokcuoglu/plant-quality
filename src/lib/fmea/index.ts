import type { FmeaStatus, FmeaType, FmeaActionStatus } from "@/generated/prisma/client"

export const FMEA_STATUS_LABELS: Record<FmeaStatus, string> = {
  DRAFT: "Draft",
  REQUESTED: "Requested",
  SUPPLIER_IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  REVISION_REQUIRED: "Revision Required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
  CANCELLED: "Cancelled",
}

export const FMEA_TYPE_LABELS: Record<FmeaType, string> = {
  DESIGN: "DFMEA",
  PROCESS: "PFMEA",
}

export const FMEA_ACTION_STATUS_LABELS: Record<FmeaActionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export function getFmeaStatusColor(status: FmeaStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-muted text-muted-foreground"
    case "REQUESTED":
      return "bg-muted text-muted-foreground"
    case "SUPPLIER_IN_PROGRESS":
      return "bg-destructive/10 text-destructive"
    case "SUBMITTED":
      return "bg-destructive/10 text-destructive"
    case "UNDER_REVIEW":
      return "bg-muted text-muted-foreground"
    case "REVISION_REQUIRED":
      return "bg-destructive/10 text-destructive"
    case "APPROVED":
      return "bg-muted text-muted-foreground"
    case "REJECTED":
      return "bg-destructive/10 text-destructive"
    case "ARCHIVED":
      return "bg-muted text-muted-foreground"
    case "CANCELLED":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getRpnColor(rpn: number): string {
  if (rpn >= 200) return "text-destructive"
  if (rpn >= 100) return "text-destructive"
  return "text-foreground"
}

export function getRpnBg(rpn: number): string {
  if (rpn >= 200) return "bg-destructive/10 text-destructive"
  if (rpn >= 100) return "bg-destructive/10 text-destructive"
  return "bg-muted text-muted-foreground"
}

export function getActionStatusColor(status: FmeaActionStatus): string {
  switch (status) {
    case "OPEN":
      return "bg-muted text-muted-foreground"
    case "IN_PROGRESS":
      return "bg-destructive/10 text-destructive"
    case "COMPLETED":
      return "bg-muted text-muted-foreground"
    case "CANCELLED":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function isFmeaOverdue(dueDate: Date | null, status: FmeaStatus): boolean {
  if (!dueDate) return false
  const terminalStatuses: FmeaStatus[] = ["APPROVED", "REJECTED", "CANCELLED", "ARCHIVED"]
  if (terminalStatuses.includes(status)) return false
  return new Date() > new Date(dueDate)
}

export function canOemEdit(status: FmeaStatus): boolean {
  return ["DRAFT", "REQUESTED"].includes(status)
}

export function canSupplierEdit(status: FmeaStatus): boolean {
  return ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"].includes(status)
}

export function canSubmit(status: FmeaStatus): boolean {
  return ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"].includes(status)
}

export function canOemReview(status: FmeaStatus): boolean {
  return ["SUBMITTED", "UNDER_REVIEW"].includes(status)
}

function generateFmeaNumber(): string {
  const prefix = "FMEA"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export { generateFmeaNumber }