"use client"

import { cn } from "@/lib/utils"

interface SodSelectProps {
  value: number
  onChange: (value: number) => void
  className?: string
  label?: string
}

const SOD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

const SOD_LABELS: Record<number, string> = {
  1: "1 — Very Low",
  2: "2 — Low",
  3: "3 — Low",
  4: "4 — Moderate",
  5: "5 — Moderate",
  6: "6 — Moderate",
  7: "7 — High",
  8: "8 — High",
  9: "9 — Very High",
  10: "10 — Very High",
}

export function SodSelect({ value, onChange, className, label }: SodSelectProps) {
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      aria-label={label}
      className={cn(
        "h-7 w-full min-w-[5.5rem] rounded-md border border-border bg-background px-1.5 text-xs text-foreground",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {SOD_OPTIONS.map(n => (
        <option key={n} value={n}>{SOD_LABELS[n]}</option>
      ))}
    </select>
  )
}

interface SodSelectNullableProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  className?: string
  label?: string
}

export function SodSelectNullable({ value, onChange, className, label }: SodSelectNullableProps) {
  return (
    <select
      value={value ?? ""}
      onChange={e => {
        const v = e.target.value
        onChange(v === "" ? undefined : Number(v))
      }}
      aria-label={label}
      className={cn(
        "h-7 w-full min-w-[5.5rem] rounded-md border border-border bg-background px-1.5 text-xs text-foreground",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        value == null && "text-muted-foreground",
        className
      )}
    >
      <option value="">—</option>
      {SOD_OPTIONS.map(n => (
        <option key={n} value={n}>{SOD_LABELS[n]}</option>
      ))}
    </select>
  )
}