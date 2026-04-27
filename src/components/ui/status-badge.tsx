"use client"

import { cn } from "@/lib/utils"

const statusConfig: Record<string, { dot: string; bg: string; label: string }> = {
  OPEN: {
    dot: "bg-destructive",
    bg: "bg-destructive/10 text-destructive",
    label: "Open",
  },
  IN_PROGRESS: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    label: "In Progress",
  },
  WAITING_APPROVAL: {
    dot: "bg-primary",
    bg: "bg-primary/10 text-primary",
    label: "Waiting Approval",
  },
  RESOLVED: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    label: "Resolved",
  },
  REJECTED: {
    dot: "bg-destructive",
    bg: "bg-destructive/10 text-destructive",
    label: "Rejected",
  },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status]
  if (!config) return <span>{status}</span>

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        config.bg,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  )
}
