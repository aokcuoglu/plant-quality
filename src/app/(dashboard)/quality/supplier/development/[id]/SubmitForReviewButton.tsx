"use client"

import { submitPlanForReview } from "@/app/(dashboard)/quality/supplier/development/actions/plan"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function SubmitForReviewButton({ planId }: { planId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    const formData = new FormData()
    formData.set("planId", planId)
    const result = await submitPlanForReview(formData)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Failed to submit for review")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Actions</h2>
      <p className="text-xs text-muted-foreground mb-3">Submit your completed action items for OEM review.</p>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive mb-3">
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? "Submitting..." : "Submit for OEM Review"}
      </button>
    </div>
  )
}