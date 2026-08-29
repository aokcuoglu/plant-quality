import type { PlanSheetStatus, PlanSheetChannel, PlanSheetLineStatus } from "@/generated/prisma/client"

export const PLAN_SHEET_STATUS: Record<PlanSheetStatus, string> = {
  DRAFT: "Taslak",
  SUBMITTED: "Gönderildi",
  UNDER_REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal Edildi",
}

export const PLAN_SHEET_CHANNEL: Record<PlanSheetChannel, string> = {
  EXPORT: "İhracat",
  DOMESTIC: "Yurtiçi",
}

export const PLAN_SHEET_LINE_STATUS: Record<PlanSheetLineStatus, string> = {
  PENDING: "Bekliyor",
  SUBMITTED: "Gönderildi",
  CONFIRMED: "Onaylandı",
  REJECTED: "Reddedildi",
  GENERATED: "Sipariş oluştu",
}

export const PLAN_SHEET_STATUS_COLOR: Record<PlanSheetStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-500/10 text-blue-600",
  UNDER_REVIEW: "bg-amber-500/10 text-amber-600",
  APPROVED: "bg-emerald-500/10 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
}

export const PLAN_SHEET_LINE_STATUS_COLOR: Record<PlanSheetLineStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-blue-500/10 text-blue-600",
  CONFIRMED: "bg-emerald-500/10 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
  GENERATED: "bg-emerald-500/10 text-emerald-600",
}

/** Determines which sheet statuses allow the specific action. */
export const PLAN_SHEET_ALLOWED = {
  submit: (s: PlanSheetStatus) => s === "DRAFT" || s === "SUBMITTED",
  approve: (s: PlanSheetStatus) => s === "UNDER_REVIEW" || s === "SUBMITTED",
  reject: (s: PlanSheetStatus) => s === "UNDER_REVIEW" || s === "SUBMITTED",
  cancel: (s: PlanSheetStatus) => s !== "APPROVED" && s !== "REJECTED" && s !== "CANCELLED",
} as const
