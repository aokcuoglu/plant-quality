"use client"

import { cn } from "@/lib/utils"
import type { FieldDefectSource } from "@/generated/prisma/client"
import { FIELD_DEFECT_SOURCE_LABELS } from "@/lib/field-defect"

const SOURCE_COLORS: Record<FieldDefectSource, string> = {
  FIELD: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  SERVICE: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  CUSTOMER: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  DEALER: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
  INTERNAL: "bg-muted text-muted-foreground",
}

export function FieldDefectSourceBadge({ source }: { source: FieldDefectSource }) {
  const label = FIELD_DEFECT_SOURCE_LABELS[source]
  const color = SOURCE_COLORS[source]
  if (!color) return <span>{source}</span>

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
        color,
      )}
    >
      {label}
    </span>
  )
}