"use client"

import { updateSupplierActionItem } from "@/app/(dashboard)/quality/supplier/development/actions/plan"
import type { DevActionItemDetail } from "@/lib/supplier-development/client"
import { ACTION_STATUS_CONFIG, isActionItemOverdue } from "@/lib/supplier-development/client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function SupplierActionItemCard({ item, planId, isReadOnly, canActOnItems, canSubmit }: { item: DevActionItemDetail; planId: string; isReadOnly: boolean; canActOnItems: boolean; canSubmit: boolean }) {
  const router = useRouter()
  const [supplierResponse, setSupplierResponse] = useState(item.supplierResponse || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatusUpdate = async (newStatus: string) => {
    setIsSubmitting(true)
    setError(null)
    const formData = new FormData()
    formData.set("itemId", item.id)
    formData.set("planId", planId)
    formData.set("status", newStatus)
    if (supplierResponse.trim()) formData.set("supplierResponse", supplierResponse)
    const result = await updateSupplierActionItem(formData)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Failed to update action item")
      setIsSubmitting(false)
    }
  }

  const handleResponseUpdate = async () => {
    if (!supplierResponse.trim()) return
    setIsSubmitting(true)
    setError(null)
    const formData = new FormData()
    formData.set("itemId", item.id)
    formData.set("planId", planId)
    formData.set("supplierResponse", supplierResponse)
    const result = await updateSupplierActionItem(formData)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Failed to save response")
      setIsSubmitting(false)
    }
  }

  const isOverdue = isActionItemOverdue(item)
  const isTerminalStatus = item.status === "COMPLETED" || item.status === "CANCELLED" || item.status === "ACCEPTED"

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        <span className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${ACTION_STATUS_CONFIG[item.status].className}`}>
          {ACTION_STATUS_CONFIG[item.status].label}
        </span>
      </div>
      {item.description && <p className="text-xs text-muted-foreground mb-2">{item.description}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <span>Due: {item.dueDate ? (isOverdue ? <span className="text-destructive font-semibold">{new Date(item.dueDate).toLocaleDateString()}</span> : new Date(item.dueDate).toLocaleDateString()) : "None"}</span>
        {item.oemComment && (
          <span className="text-foreground">OEM comment: {item.oemComment}</span>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive mb-2">{error}</p>
      )}

      {canActOnItems && !isTerminalStatus && (
        <div className="mt-2 space-y-2">
          <textarea
            value={supplierResponse}
            onChange={(e) => setSupplierResponse(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="Add your response..."
          />
          <div className="flex gap-2">
            {item.status === "OPEN" && (
              <button onClick={() => handleStatusUpdate("IN_PROGRESS")} disabled={isSubmitting} className="text-xs text-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:border-border transition-colors disabled:opacity-50">
                Start Work
              </button>
            )}
            {item.status === "IN_PROGRESS" && canSubmit && (
              <button onClick={() => handleStatusUpdate("SUBMITTED")} disabled={isSubmitting} className="text-xs text-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:border-border transition-colors disabled:opacity-50">
                Submit
              </button>
            )}
            {item.status === "REJECTED" && (
              <button onClick={() => handleStatusUpdate("IN_PROGRESS")} disabled={isSubmitting} className="text-xs text-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:border-border transition-colors disabled:opacity-50">
                Re-work
              </button>
            )}
            <button onClick={handleResponseUpdate} disabled={isSubmitting || !supplierResponse.trim()} className="text-xs text-foreground hover:text-foreground px-2 py-1 rounded border border-border hover:border-border transition-colors disabled:opacity-50">
              Save Response
            </button>
          </div>
        </div>
      )}

      {(isReadOnly || (!canActOnItems && !isTerminalStatus)) && item.supplierResponse && (
        <div className="mt-2 rounded-md bg-muted/50 border border-border p-2">
          <p className="text-xs font-medium text-muted-foreground">Your Response:</p>
          <p className="text-xs text-foreground mt-0.5">{item.supplierResponse}</p>
        </div>
      )}

      {isTerminalStatus && item.supplierResponse && (
        <div className="mt-2 rounded-md bg-muted/50 border border-border p-2">
          <p className="text-xs font-medium text-muted-foreground">Your Response:</p>
          <p className="text-xs text-foreground mt-0.5">{item.supplierResponse}</p>
        </div>
      )}
    </div>
  )
}