"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { submitFmeaForReview } from "@/app/(dashboard)/quality/supplier/fmea/actions/fmea"

interface SupplierFmeaActionsProps {
  fmeaId: string
  status: string
}

export function SupplierFmeaActions({ fmeaId, status }: SupplierFmeaActionsProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const submittableStatuses = ["REQUESTED", "SUPPLIER_IN_PROGRESS", "REVISION_REQUIRED"]
  if (!submittableStatuses.includes(status)) return null

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white">
        {submitting ? "Submitting..." : "Submit for Review"}
      </Button>
      {status === "REVISION_REQUIRED" && (
        <p className="text-xs text-amber-400">Revision has been requested. Please update your FMEA and resubmit.</p>
      )}
    </div>
  )
}