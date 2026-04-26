"use client"

import { cn } from "@/lib/utils"
import type { FieldDefectStatus } from "@/generated/prisma/client"
import { FIELD_DEFECT_STATUS_LABELS, FIELD_DEFECT_STATUS_COLORS } from "@/lib/field-defect"

export function FieldDefectStatusBadge({ status }: { status: FieldDefectStatus }) {
  const config = FIELD_DEFECT_STATUS_COLORS[status]
  const label = FIELD_DEFECT_STATUS_LABELS[status]
  if (!config) return <span>{status}</span>

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {label}
    </span>
  )
}