import type { EscalationLevel, FieldDefectStatus } from "@/generated/prisma/client"

type SlaFieldDefect = {
  status: FieldDefectStatus
  responseDueAt: Date | null
  resolutionDueAt: Date | null
  escalationLevel: EscalationLevel
}

export type SlaStatus = "overdue" | "due-soon" | "on-track" | "no-sla" | "completed"

export const SLA_DUE_SOON_HOURS = 48

export function getFieldDefectActiveDueDate(fd: SlaFieldDefect): Date | null {
  if (fd.status === "CLOSED" || fd.status === "CANCELLED" || fd.status === "LINKED_TO_8D") return null
  if (fd.status === "DRAFT") return null
  if (fd.status === "SUPPLIER_ASSIGNED") return fd.responseDueAt ?? fd.resolutionDueAt
  if (fd.status === "UNDER_REVIEW") return fd.responseDueAt ?? fd.resolutionDueAt
  if (fd.status === "OPEN") return fd.responseDueAt ?? fd.resolutionDueAt
  return fd.resolutionDueAt ?? fd.responseDueAt
}

export function getFieldDefectSlaStatus(fd: SlaFieldDefect, now = new Date()): SlaStatus {
  if (fd.status === "CLOSED" || fd.status === "CANCELLED") return "completed"
  if (fd.status === "LINKED_TO_8D") return "completed"
  if (fd.status === "DRAFT") return "no-sla"
  const dueDate = getFieldDefectActiveDueDate(fd)
  if (!dueDate) return "no-sla"
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (dueDate < today) return "overdue"
  const diffMs = dueDate.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  if (diffHours > 0 && diffHours <= SLA_DUE_SOON_HOURS) return "due-soon"
  return "on-track"
}

export const SLA_STATUS_CONFIG: Record<SlaStatus, { label: string; dotClass: string; bgClass: string }> = {
  overdue: {
    label: "Overdue",
    dotClass: "bg-destructive",
    bgClass: "bg-destructive/10 text-destructive",
  },
  "due-soon": {
    label: "Due Soon",
    dotClass: "bg-amber-500",
    bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "on-track": {
    label: "On Track",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "no-sla": {
    label: "No SLA",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted text-muted-foreground",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
}