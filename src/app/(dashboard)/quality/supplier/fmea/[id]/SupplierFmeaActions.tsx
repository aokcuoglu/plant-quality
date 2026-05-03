"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { submitFmeaForReview } from "@/app/(dashboard)/quality/supplier/fmea/actions/fmea"
import { validateSod, type FmeaRow } from "@/lib/fmea/types"

interface SupplierFmeaActionsProps {
  fmeaId: string
  status: string
  rows: FmeaRow[]
}

export function SupplierFmeaActions({ fmeaId, status, rows }: SupplierFmeaActionsProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submittableStatuses = ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"]
  if (!submittableStatuses.includes(status)) return null

  const hasRows = rows.length > 0
  const allRowsValid = rows.every(row =>
    row.failureMode?.trim() !== "" &&
    validateSod(row.severity).valid &&
    validateSod(row.occurrence).valid &&
    validateSod(row.detection).valid
  )
  const canSubmit = hasRows && allRowsValid

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitFmeaForReview(fmeaId)
      if (!result.success) { setError(result.error ?? "Failed to submit") }
      else { router.refresh() }
    } catch {
      setError("Failed to submit FMEA")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      <Button onClick={handleSubmit} disabled={submitting || !canSubmit} className="bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50">
        {submitting ? "Submitting..." : "Submit for Review"}
      </Button>
      {!hasRows && (
        <p className="text-xs text-muted-foreground">At least one valid FMEA row is required before submitting for review.</p>
      )}
      {hasRows && !allRowsValid && (
        <p className="text-xs text-amber-400">All rows must have a failure mode and valid severity, occurrence, and detection values (1–10).</p>
      )}
      {status === "REVISION_REQUIRED" && (
        <p className="text-xs text-amber-400">Revision has been requested. Please update your FMEA and resubmit.</p>
      )}
    </div>
  )
}