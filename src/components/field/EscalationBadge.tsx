"use client"

import { cn } from "@/lib/utils"
import type { EscalationLevel } from "@/generated/prisma/client"
import { ESCALATION_LABELS, ESCALATION_COLORS } from "@/lib/escalation"

export function EscalationBadge({ level }: { level: EscalationLevel }) {
  const config = ESCALATION_COLORS[level]
  const label = ESCALATION_LABELS[level]

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