"use client"

import { cn } from "@/lib/utils"
import type { FieldDefectSource } from "@/generated/prisma/client"
import { FIELD_DEFECT_SOURCE_LABELS } from "@/lib/field-defect"

const SOURCE_COLORS: Record<FieldDefectSource, string> = {
  FIELD: "bg-secondary text-secondary-foreground",
  SERVICE: "bg-secondary text-secondary-foreground",
  CUSTOMER: "bg-secondary text-secondary-foreground",
  DEALER: "bg-secondary text-secondary-foreground",
  INTERNAL: "bg-muted text-muted-foreground",
}

export function FieldDefectSourceBadge({ source }: { source: FieldDefectSource }) {
  const label = FIELD_DEFECT_SOURCE_LABELS[source]
  const color = SOURCE_COLORS[source]
  if (!color) return <span>{source}</span>

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase",
        color,
      )}
    >
      {label}
    </span>
  )
}