import type { ActionOwner, DefectStatus } from "@/generated/prisma/client"

type SlaDefect = {
  status: DefectStatus
  currentActionOwner: ActionOwner
  supplierResponseDueAt: Date | null
  eightDSubmissionDueAt: Date | null
  oemReviewDueAt: Date | null
  revisionDueAt: Date | null
}

export function addCalendarDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function getActiveDueDate(defect: SlaDefect) {
  if (defect.status === "RESOLVED" || defect.currentActionOwner === "NONE") return null
  if (defect.status === "WAITING_APPROVAL") return defect.oemReviewDueAt
  if (defect.status === "REJECTED") return defect.revisionDueAt
  if (defect.status === "IN_PROGRESS") {
    return defect.eightDSubmissionDueAt ?? defect.supplierResponseDueAt
  }
  return defect.supplierResponseDueAt
}

export function isDefectOverdue(defect: SlaDefect, now = new Date()) {
  const activeDueDate = getActiveDueDate(defect)
  if (!activeDueDate) return false
  return activeDueDate < startOfToday(now)
}

export function isDueSoon(
  defect: SlaDefect,
  hours = 48,
  now = new Date()
) {
  const activeDueDate = getActiveDueDate(defect)
  if (!activeDueDate) return false
  const diffMs = activeDueDate.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours > 0 && diffHours <= hours
}

export function getActionOwnerLabel(
  defect: Pick<SlaDefect, "currentActionOwner">
) {
  if (defect.currentActionOwner === "OEM") return "OEM"
  if (defect.currentActionOwner === "SUPPLIER") return "Supplier"
  return "None"
}

export function formatDueDate(date: Date | null) {
  if (!date) return "—"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function getSlaStatus(
  defect: SlaDefect,
  now = new Date()
): "overdue" | "due-soon" | "on-track" | "no-sla" {
  const activeDueDate = getActiveDueDate(defect)
  if (!activeDueDate) return "no-sla"
  if (isDefectOverdue(defect, now)) return "overdue"
  if (isDueSoon(defect, 48, now)) return "due-soon"
  return "on-track"
}
