"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { updateActionItem } from "@/app/(dashboard)/quality/oem/supplier-development/actions/plan"
import type { DevActionStatus, DevActionOwnerType } from "@/lib/supplier-development/client"

export function OemActionItemActions({ itemId, planId, status, ownerType }: { itemId: string; planId: string; status: DevActionStatus; ownerType: DevActionOwnerType }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

  const handleStatusUpdate = async (newStatus: DevActionStatus) => {
    setIsSubmitting(newStatus)
    const formData = new FormData()
    formData.set("itemId", itemId)
    formData.set("planId", planId)
    formData.set("status", newStatus)
    const result = await updateActionItem(formData)
    if (result.success) {
      router.refresh()
    } else {
      setIsSubmitting(null)
    }
  }

  const canAccept = ownerType === "SUPPLIER" && status === "SUBMITTED"
  const canMarkComplete = status === "IN_PROGRESS" || status === "OPEN"
  const canReject = ownerType === "SUPPLIER" && status === "SUBMITTED"

  return (
    <div className="flex flex-wrap gap-1">
      {canMarkComplete && status === "OPEN" && (
        <button onClick={() => handleStatusUpdate("IN_PROGRESS")} disabled={isSubmitting !== null} className="text-xs text-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border hover:border-border disabled:opacity-50">
          Start
        </button>
      )}
      {canMarkComplete && (
        <button onClick={() => handleStatusUpdate("COMPLETED")} disabled={isSubmitting !== null} className="text-xs text-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border hover:border-border disabled:opacity-50">
          Complete
        </button>
      )}
      {canAccept && (
        <button onClick={() => handleStatusUpdate("ACCEPTED")} disabled={isSubmitting !== null} className="text-xs text-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border hover:border-border disabled:opacity-50">
          Accept
        </button>
      )}
      {canReject && (
        <button onClick={() => handleStatusUpdate("REJECTED")} disabled={isSubmitting !== null} className="text-xs text-destructive hover:text-destructive/80 transition-colors px-1.5 py-0.5 rounded border border-destructive/20 hover:border-destructive/40 disabled:opacity-50">
          Reject
        </button>
      )}
      {status !== "CANCELLED" && status !== "COMPLETED" && status !== "ACCEPTED" && (
        <button onClick={() => handleStatusUpdate("CANCELLED")} disabled={isSubmitting !== null} className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 disabled:opacity-50">
          Cancel
        </button>
      )}
    </div>
  )
}