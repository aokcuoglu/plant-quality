import type { EscalationLevel } from "@/generated/prisma/client"

export const ESCALATION_LEVELS: EscalationLevel[] = [
  "NONE",
  "LEVEL_1",
  "LEVEL_2",
  "LEVEL_3",
]

export const ESCALATION_LABELS: Record<EscalationLevel, string> = {
  NONE: "None",
  LEVEL_1: "Level 1",
  LEVEL_2: "Level 2",
  LEVEL_3: "Level 3",
}

export const ESCALATION_COLORS: Record<EscalationLevel, { dot: string; bg: string }> = {
  NONE: {
    dot: "bg-muted-foreground",
    bg: "bg-muted text-muted-foreground",
  },
  LEVEL_1: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  LEVEL_2: {
    dot: "bg-orange-500",
    bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  LEVEL_3: {
    dot: "bg-destructive",
    bg: "bg-destructive/10 text-destructive",
  },
}

export function getNextEscalationLevel(current: EscalationLevel): EscalationLevel | null {
  const idx = ESCALATION_LEVELS.indexOf(current)
  if (idx < 0 || idx >= ESCALATION_LEVELS.length - 1) return null
  return ESCALATION_LEVELS[idx + 1]
}

export const ESCALATION_LEVEL_DESCRIPTIONS: Record<EscalationLevel, string> = {
  NONE: "No escalation",
  LEVEL_1: "Escalated to supplier management",
  LEVEL_2: "Escalated to supplier executive leadership",
  LEVEL_3: "Escalated to supplier C-suite — final escalation",
}