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
      return "bg-blue-500/10 text-blue-400"
    case "SUPPLIER_IN_PROGRESS":
      return "bg-amber-500/10 text-amber-400"
    case "SUBMITTED":
      return "bg-amber-500/10 text-amber-400"
    case "UNDER_REVIEW":
      return "bg-blue-500/10 text-blue-400"
    case "REVISION_REQUIRED":
      return "bg-orange-500/10 text-orange-400"
    case "APPROVED":
      return "bg-emerald-500/10 text-emerald-400"
    case "REJECTED":
      return "bg-red-500/10 text-red-400"
    case "ARCHIVED":
      return "bg-muted text-muted-foreground"
    case "CANCELLED":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function getRpnColor(rpn: number): string {
  if (rpn >= 200) return "text-red-400"
  if (rpn >= 100) return "text-amber-400"
  return "text-emerald-400"
}

export function getRpnBg(rpn: number): string {
  if (rpn >= 200) return "bg-red-500/10 text-red-400"
  if (rpn >= 100) return "bg-amber-500/10 text-amber-400"
  return "bg-emerald-500/10 text-emerald-400"
}

export function getActionStatusColor(status: FmeaActionStatus): string {
  switch (status) {
    case "OPEN":
      return "bg-muted text-muted-foreground"
    case "IN_PROGRESS":
      return "bg-amber-500/10 text-amber-400"
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-400"
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