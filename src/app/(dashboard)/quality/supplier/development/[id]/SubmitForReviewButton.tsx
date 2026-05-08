"use client"

import { submitPlanForReview } from "@/app/(dashboard)/quality/supplier/development/actions/plan"
import { useState } from "react"

export function SubmitForReviewButton({ planId }: { planId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const formData = new FormData()
    formData.set("planId", planId)
    await submitPlanForReview(formData)
    setIsSubmitting(false)
    window.location.reload()
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Actions</h2>
      <p className="text-xs text-muted-foreground mb-3">Submit your completed action items for OEM review.</p>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? "Submitting..." : "Submit for OEM Review"}
      </button>
    </div>
  )
}