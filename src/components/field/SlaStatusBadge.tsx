"use client"

import { cn } from "@/lib/utils"
import type { SlaStatus } from "@/lib/sla-field-defect"
import { SLA_STATUS_CONFIG } from "@/lib/sla-field-defect"

export function SlaStatusBadge({ status }: { status: SlaStatus }) {
  const config = SLA_STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bgClass,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  )
}