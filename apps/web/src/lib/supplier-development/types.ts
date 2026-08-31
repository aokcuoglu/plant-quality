import type {
  DevPlanStatus,
  DevPlanPriority,
  DevPlanSourceType,
  DevActionOwnerType,
  DevActionStatus,
} from "@plantx/db/client"

export type {
  DevPlanStatus,
  DevPlanPriority,
  DevPlanSourceType,
  DevActionOwnerType,
  DevActionStatus,
}

export interface DevPlanListItem {
  id: string
  title: string
  description: string | null
  priority: DevPlanPriority
  status: DevPlanStatus
  sourceType: DevPlanSourceType | null
  sourceId: string | null
  dueDate: Date | null
  supplierId: string
  supplierName: string
  oemId: string
  ownerId: string | null
  ownerName: string | null
  createdById: string
  createdByName: string | null
  actionItemCount: number
  completedActionItemCount: number
  overdueActionItemCount: number
  latestActivityAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DevPlanDetail {
  id: string
  title: string
  description: string | null
  priority: DevPlanPriority
  status: DevPlanStatus
  sourceType: DevPlanSourceType | null
  sourceId: string | null
  dueDate: Date | null
  supplierId: string
  supplierName: string
  oemId: string
  oemCompanyName: string
  ownerId: string | null
  ownerName: string | null
  createdById: string
  createdByName: string | null
  completedAt: Date | null
  completedById: string | null
  completedByName: string | null
  actionItems: DevActionItemDetail[]
  events: DevPlanEventDetail[]
  createdAt: Date
  updatedAt: Date
}

export interface DevActionItemDetail {
  id: string
  title: string
  description: string | null
  ownerType: DevActionOwnerType
  ownerId: string | null
  ownerName: string | null
  status: DevActionStatus
  dueDate: Date | null
  supplierResponse: string | null
  oemComment: string | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface DevPlanEventDetail {
  id: string
  actorId: string | null
  actorName: string | null
  type: string
  message: string
  metadata: unknown
  createdAt: Date
}

export interface DevPlanListSummary {
  totalCount: number
  draftCount: number
  openCount: number
  supplierActionRequiredCount: number
  oemReviewCount: number
  completedCount: number
  overdueCount: number
  plans: DevPlanListItem[]
}

export const PRIORITY_CONFIG: Record<DevPlanPriority, { label: string; className: string }> = {
  LOW: { label: "Low", className: "bg-muted text-muted-foreground border-border" },
  MEDIUM: { label: "Medium", className: "bg-destructive/10 text-destructive border-destructive/20" },
  HIGH: { label: "High", className: "bg-destructive/10 text-destructive border-destructive/20" },
  CRITICAL: { label: "Critical", className: "bg-destructive/10 text-destructive border-destructive/20" },
}

export const STATUS_CONFIG: Record<DevPlanStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  OPEN: { label: "Open", className: "bg-muted text-muted-foreground border-border" },
  SUPPLIER_ACTION_REQUIRED: { label: "Supplier Action", className: "bg-destructive/10 text-destructive border-destructive/20" },
  OEM_REVIEW: { label: "OEM Review", className: "bg-brand/10 text-brand border-brand/20" },
  REVISION_REQUIRED: { label: "Revision Required", className: "bg-destructive/10 text-destructive border-destructive/20" },
  COMPLETED: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
}

export const ACTION_STATUS_CONFIG: Record<DevActionStatus, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-muted text-muted-foreground border-border" },
  IN_PROGRESS: { label: "In Progress", className: "bg-muted text-muted-foreground border-border" },
  SUBMITTED: { label: "Submitted", className: "bg-brand/10 text-brand border-brand/20" },
  ACCEPTED: { label: "Accepted", className: "bg-muted text-muted-foreground border-border" },
  REJECTED: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
  COMPLETED: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  CANCELLED: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
}

export const SOURCE_TYPE_CONFIG: Record<DevPlanSourceType, { label: string }> = {
  SCORECARD: { label: "Scorecard" },
  FIELD_DEFECT: { label: "Field Defect" },
  DEFECT_8D: { label: "8D Report" },
  IQC: { label: "IQC" },
  PPAP: { label: "PPAP" },
  FMEA: { label: "FMEA" },
  EXECUTIVE_COCKPIT: { label: "Executive Cockpit" },
  MANUAL: { label: "Manual" },
}

export function isDevPlanOverdue(plan: { dueDate: Date | null; status: DevPlanStatus }): boolean {
  if (!plan.dueDate) return false
  if (plan.status === "COMPLETED" || plan.status === "CANCELLED") return false
  const due = new Date(plan.dueDate)
  const today = new Date()
  return due < new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

export function isActionItemOverdue(item: { dueDate: Date | null; status: string }): boolean {
  if (!item.dueDate) return false
  if (item.status === "COMPLETED" || item.status === "ACCEPTED" || item.status === "CANCELLED") return false
  const due = new Date(item.dueDate)
  const today = new Date()
  return due < new Date(today.getFullYear(), today.getMonth(), today.getDate())
}