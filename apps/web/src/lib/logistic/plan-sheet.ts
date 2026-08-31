import type { PlanSheetStatus, PlanSheetChannel, PlanSheetLineStatus } from "@plantx/db/client"

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
  SUBMITTED: "bg-brand/10 text-brand",
  UNDER_REVIEW: "bg-destructive/10 text-destructive",
  APPROVED: "bg-emerald-500/10 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
}

export const PLAN_SHEET_LINE_STATUS_COLOR: Record<PlanSheetLineStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  SUBMITTED: "bg-brand/10 text-brand",
  CONFIRMED: "bg-emerald-500/10 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
  GENERATED: "bg-emerald-500/10 text-emerald-600",
}

export const PLAN_SHEET_FORECAST_REQUIRED = "PLAN_SHEET_FORECAST_REQUIRED" as const
export const PLAN_SHEET_FORECAST_IN_PAST = "PLAN_SHEET_FORECAST_IN_PAST" as const
export const PLAN_SHEET_LINE_LOCKED = "PLAN_SHEET_LINE_LOCKED" as const
export const PLAN_SHEET_REJECTION_COMMENT_REQUIRED = "PLAN_SHEET_REJECTION_COMMENT_REQUIRED" as const

export function hasForecastDispatchDate(
  value: Date | string | null | undefined,
): value is Date | string {
  return value !== null && value !== undefined && value !== ""
}

export function dateOnlyInTimeZone(
  value: Date = new Date(),
  timeZone = "Europe/Istanbul",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? ""
  return `${part("year")}-${part("month")}-${part("day")}`
}

export function dateOnly(value: Date | string): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export function isForecastDispatchDateCurrentOrFuture(
  value: Date | string | null | undefined,
  minimumDate = dateOnlyInTimeZone(),
): boolean {
  if (!hasForecastDispatchDate(value)) return false
  const normalized = dateOnly(value)
  return normalized !== null && normalized >= minimumDate
}

export const PLAN_SHEET_LINE_ALLOWED = {
  review: (status: PlanSheetLineStatus) => status === "SUBMITTED",
  setForecast: (status: PlanSheetLineStatus) => status === "SUBMITTED" || status === "CONFIRMED",
  reviseForecast: (status: PlanSheetLineStatus) => status === "CONFIRMED",
} as const

/** Determines which sheet statuses allow the specific action. */
export const PLAN_SHEET_ALLOWED = {
  submit: (s: PlanSheetStatus) => s === "DRAFT" || s === "SUBMITTED",
  edit: (s: PlanSheetStatus) => s === "DRAFT",
  approve: (s: PlanSheetStatus) => s === "UNDER_REVIEW" || s === "SUBMITTED",
  reject: (s: PlanSheetStatus) => s === "UNDER_REVIEW" || s === "SUBMITTED",
  cancel: (s: PlanSheetStatus) => s !== "APPROVED" && s !== "REJECTED" && s !== "CANCELLED",
} as const
