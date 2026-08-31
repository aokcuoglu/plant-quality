"use client"

import { Button } from "@/components/ui/button"

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
        <Button onClick={() => handleStatusUpdate("IN_PROGRESS")} disabled={isSubmitting !== null} variant="outline" className="text-xs text-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border hover:border-border disabled:opacity-50">
          Start
        </Button>
      )}
      {canMarkComplete && (
        <Button onClick={() => handleStatusUpdate("COMPLETED")} disabled={isSubmitting !== null} variant="outline" className="text-xs text-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border hover:border-border disabled:opacity-50">
          Complete
        </Button>
      )}
      {canAccept && (
        <Button onClick={() => handleStatusUpdate("ACCEPTED")} disabled={isSubmitting !== null} variant="outline" className="text-xs text-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-border hover:border-border disabled:opacity-50">
          Accept
        </Button>
      )}
      {canReject && (
        <Button onClick={() => handleStatusUpdate("REJECTED")} disabled={isSubmitting !== null} variant="outline" className="text-xs text-destructive hover:text-destructive/80 transition-colors px-1.5 py-0.5 rounded border border-destructive/20 hover:border-destructive/40 disabled:opacity-50">
          Reject
        </Button>
      )}
      {status !== "CANCELLED" && status !== "COMPLETED" && status !== "ACCEPTED" && (
        <Button onClick={() => handleStatusUpdate("CANCELLED")} disabled={isSubmitting !== null} variant="destructive" className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 disabled:opacity-50">
          Cancel
        </Button>
      )}
    </div>
  )
}