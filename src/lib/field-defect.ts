import type {
  FieldDefectSource,
  FieldDefectSeverity,
  FieldDefectStatus,
} from "@/generated/prisma/client"

export const FIELD_DEFECT_SOURCE_LABELS: Record<FieldDefectSource, string> = {
  FIELD: "Field",
  SERVICE: "Service",
  CUSTOMER: "Customer",
  DEALER: "Dealer",
  INTERNAL: "Internal",
}

export const FIELD_DEFECT_SEVERITY_LABELS: Record<
  FieldDefectSeverity,
  string
> = {
  MINOR: "Minor",
  MAJOR: "Major",
  CRITICAL: "Critical",
}

export const FIELD_DEFECT_STATUS_LABELS: Record<FieldDefectStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  SUPPLIER_ASSIGNED: "Supplier Assigned",
  LINKED_TO_8D: "Linked to 8D",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
}

export const FIELD_DEFECT_SEVERITY_COLORS: Record<
  FieldDefectSeverity,
  { dot: string; bg: string }
> = {
  MINOR: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  MAJOR: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  CRITICAL: {
    dot: "bg-red-500",
    bg: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
}

export const FIELD_DEFECT_STATUS_COLORS: Record<
  FieldDefectStatus,
  { dot: string; bg: string }
> = {
  DRAFT: {
    dot: "bg-muted-foreground",
    bg: "bg-muted text-muted-foreground",
  },
  OPEN: {
    dot: "bg-red-500",
    bg: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  UNDER_REVIEW: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  SUPPLIER_ASSIGNED: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  LINKED_TO_8D: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
  CLOSED: {
    dot: "bg-green-500",
    bg: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  },
  CANCELLED: {
    dot: "bg-muted-foreground",
    bg: "bg-muted text-muted-foreground",
  },
}

export const VALID_STATUS_TRANSITIONS: Record<
  FieldDefectStatus,
  FieldDefectStatus[]
> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["UNDER_REVIEW", "SUPPLIER_ASSIGNED", "CANCELLED", "CLOSED"],
  UNDER_REVIEW: [
    "SUPPLIER_ASSIGNED",
    "OPEN",
    "CANCELLED",
    "CLOSED",
  ],
  SUPPLIER_ASSIGNED: [
    "LINKED_TO_8D",
    "UNDER_REVIEW",
    "CLOSED",
    "CANCELLED",
  ],
  LINKED_TO_8D: ["CLOSED"],
  CLOSED: ["OPEN"],
  CANCELLED: [],
}

export function isValidStatusTransition(
  from: FieldDefectStatus,
  to: FieldDefectStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function validateVin(vin: string | null | undefined): {
  ok: boolean
  error?: string
} {
  if (!vin) return { ok: true }
  const trimmed = vin.trim()
  if (trimmed.length !== 17) {
    return { ok: false, error: "VIN must be exactly 17 characters" }
  }
  const valid = /^[A-HJ-NPR-Z0-9]{17}$/i.test(trimmed)
  if (!valid) {
    return {
      ok: false,
      error: "VIN must contain only alphanumeric characters (no I, O, or Q)",
    }
  }
  return { ok: true }
}