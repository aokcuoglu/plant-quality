"use client"

import { cn } from "@/lib/utils"

const statusConfig: Record<string, { dot: string; bg: string; label: string }> = {
  OPEN: {
    dot: "bg-red-500",
    bg: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
    label: "Open",
  },
  IN_PROGRESS: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    label: "In Progress",
  },
  WAITING_APPROVAL: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    label: "Waiting Approval",
  },
  RESOLVED: {
    dot: "bg-green-500",
    bg: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    label: "Resolved",
  },
  REJECTED: {
    dot: "bg-rose-500",
    bg: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
    label: "Rejected",
  },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status]
  if (!config) return <span>{status}</span>

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  )
}
