"use client"

import { useState } from "react"
import type { ProductionMilestoneStatus } from "@/generated/prisma/client"
import { getNextMilestoneStatuses, isTerminalMilestoneStatus } from "@/lib/logistic/milestone-status"
import { changeProductionMilestoneStatus } from "@/app/(dashboard)/logistic/milestone-actions"
import { useRouter } from "next/navigation"

const ACTION_LABELS: Record<string, string> = {
  PLANNED: "Mark Planned",
  IN_PROGRESS: "Start",
  BLOCKED: "Block",
  QUALITY_HOLD: "Quality Hold",
  COMPLETED: "Complete",
  CANCELLED: "Cancel",
}

export function MilestoneActions({
  milestoneId,
  currentStatus,
  orderId: _orderId,
}: {
  milestoneId: string
  currentStatus: ProductionMilestoneStatus
  orderId: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (isTerminalMilestoneStatus(currentStatus)) return null

  const nextStatuses = getNextMilestoneStatuses(currentStatus)
  if (nextStatuses.length === 0) return null

  const handleTransition = async (newStatus: ProductionMilestoneStatus) => {
    setLoading(true)
    setError(null)
    try {
      const result = await changeProductionMilestoneStatus(milestoneId, newStatus)
      if (result.error) {
        setError(result.error)
      }
      router.refresh()
    } catch {
      setError("Failed to update milestone")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {nextStatuses.map((status) => {
        const isPrimary = status === "IN_PROGRESS" || status === "COMPLETED"
        return (
          <button
            key={status}
            onClick={() => handleTransition(status)}
            disabled={loading}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              isPrimary
                ? "bg-muted text-muted-foreground hover:bg-foreground/20"
                : status === "BLOCKED"
                ? "bg-muted text-muted-foreground hover:bg-accent"
                : status === "QUALITY_HOLD"
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {ACTION_LABELS[status] || status}
          </button>
        )
      })}
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  )
}