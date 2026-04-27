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
    dot: "bg-primary",
    bg: "bg-primary/10 text-primary",
  },
  MAJOR: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  CRITICAL: {
    dot: "bg-destructive",
    bg: "bg-destructive/10 text-destructive",
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
    dot: "bg-destructive",
    bg: "bg-destructive/10 text-destructive",
  },
  UNDER_REVIEW: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  SUPPLIER_ASSIGNED: {
    dot: "bg-primary",
    bg: "bg-primary/10 text-primary",
  },
  LINKED_TO_8D: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  CLOSED: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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