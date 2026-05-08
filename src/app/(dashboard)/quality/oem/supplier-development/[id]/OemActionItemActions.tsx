"use client"

import { updateActionItem } from "@/app/(dashboard)/quality/oem/supplier-development/actions/plan"
import type { DevActionStatus, DevActionOwnerType } from "@/lib/supplier-development/client"

export function OemActionItemActions({ itemId, planId, status, ownerType }: { itemId: string; planId: string; status: DevActionStatus; ownerType: DevActionOwnerType }) {
  const handleStatusUpdate = async (newStatus: DevActionStatus) => {
    const formData = new FormData()
    formData.set("itemId", itemId)
    formData.set("planId", planId)
    formData.set("status", newStatus)
    await updateActionItem(formData)
    window.location.reload()
  }

  const canAccept = ownerType === "SUPPLIER" && (status === "SUBMITTED" || status === "IN_PROGRESS")
  const canMarkComplete = status === "IN_PROGRESS" || status === "OPEN"
  const canReject = ownerType === "SUPPLIER" && status === "SUBMITTED"

  return (
    <div className="flex flex-wrap gap-1">
      {canMarkComplete && status === "OPEN" && (
        <button onClick={() => handleStatusUpdate("IN_PROGRESS")} className="text-xs text-foreground hover:text-emerald-500 transition-colors px-1.5 py-0.5 rounded border border-border hover:border-emerald-500/20">
          Start
        </button>
      )}
      {canMarkComplete && (
        <button onClick={() => handleStatusUpdate("COMPLETED")} className="text-xs text-foreground hover:text-emerald-500 transition-colors px-1.5 py-0.5 rounded border border-border hover:border-emerald-500/20">
          Complete
        </button>
      )}
      {canAccept && (
        <button onClick={() => handleStatusUpdate("ACCEPTED")} className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors px-1.5 py-0.5 rounded border border-emerald-500/20 hover:border-emerald-500/40">
          Accept
        </button>
      )}
      {canReject && (
        <button onClick={() => handleStatusUpdate("REJECTED")} className="text-xs text-destructive hover:text-destructive/80 transition-colors px-1.5 py-0.5 rounded border border-destructive/20 hover:border-destructive/40">
          Reject
        </button>
      )}
      {status !== "CANCELLED" && (
        <button onClick={() => handleStatusUpdate("CANCELLED")} className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5">
          Cancel
        </button>
      )}
    </div>
  )
}