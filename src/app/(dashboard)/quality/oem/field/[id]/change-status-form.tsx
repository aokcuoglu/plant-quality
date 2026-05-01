"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { changeFieldDefectStatus } from "@/app/(dashboard)/field/actions"
import type { FieldDefectStatus } from "@/generated/prisma/client"
import { FIELD_DEFECT_STATUS_LABELS } from "@/lib/field-defect"

const VALID_NEXT_STATUSES: Record<FieldDefectStatus, FieldDefectStatus[]> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["UNDER_REVIEW", "SUPPLIER_ASSIGNED", "CANCELLED", "CLOSED"],
  UNDER_REVIEW: ["SUPPLIER_ASSIGNED", "OPEN", "CANCELLED", "CLOSED"],
  SUPPLIER_ASSIGNED: ["LINKED_TO_8D", "UNDER_REVIEW", "CLOSED", "CANCELLED"],
  LINKED_TO_8D: ["CLOSED"],
  CLOSED: ["OPEN"],
  CANCELLED: [],
}

export function ChangeStatusForm({ fieldDefectId, currentStatus }: { fieldDefectId: string; currentStatus: FieldDefectStatus }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const nextStatuses = VALID_NEXT_STATUSES[currentStatus] ?? []

  async function handleStatusChange(newStatus: FieldDefectStatus) {
    setError(null)
    startTransition(async () => {
      try {
        const result = await changeFieldDefectStatus(fieldDefectId, newStatus)
        if (result.success) {
          router.refresh()
        } else {
          setError(result.error ?? "Failed to change status")
        }
      } catch {
        setError("An unexpected error occurred. Please try again.")
      }
    })
  }

  if (nextStatuses.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Change Status</h2>
      </div>
      <div className="px-4 py-3 space-y-2">
        {nextStatuses.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={isPending}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50 text-left"
          >
            {FIELD_DEFECT_STATUS_LABELS[status]}
          </button>
        ))}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}