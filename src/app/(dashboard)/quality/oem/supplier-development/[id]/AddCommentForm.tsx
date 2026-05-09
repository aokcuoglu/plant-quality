"use client"

import { addDevPlanComment } from "@/app/(dashboard)/quality/oem/supplier-development/actions/plan"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function AddCommentForm({ planId }: { planId: string }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.set("planId", planId)
    formData.set("message", message)

    const result = await addDevPlanComment(formData)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Failed to add comment")
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Add Comment</h2>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive mb-2">
          {error}
        </div>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        placeholder="Add a comment or note..."
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !message.trim()}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-emerald-600 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Comment"}
        </button>
      </div>
    </form>
  )
}