"use client"

import { cn } from "@/lib/utils"
import type { FmeaActionStatusValue } from "@/lib/fmea/types"

interface ActionStatusSelectProps {
  value: FmeaActionStatusValue
  onChange: (value: FmeaActionStatusValue) => void
  className?: string
}

const ACTION_OPTIONS: { value: FmeaActionStatusValue; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

export function ActionStatusSelect({ value, onChange, className }: ActionStatusSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as FmeaActionStatusValue)}
      className={cn(
        "h-7 w-full min-w-[6rem] rounded-md border border-border bg-background px-1.5 text-xs text-foreground",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {ACTION_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}