"use client"

import { cn } from "@/lib/utils"
import type { FieldDefectSeverity } from "@/generated/prisma/client"
import { FIELD_DEFECT_SEVERITY_LABELS, FIELD_DEFECT_SEVERITY_COLORS } from "@/lib/field-defect"

export function FieldDefectSeverityBadge({ severity }: { severity: FieldDefectSeverity }) {
  const config = FIELD_DEFECT_SEVERITY_COLORS[severity]
  const label = FIELD_DEFECT_SEVERITY_LABELS[severity]
  if (!config) return <span>{severity}</span>

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