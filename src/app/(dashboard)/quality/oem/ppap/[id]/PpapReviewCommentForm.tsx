"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addPpapReviewComment } from "../actions/review"
import type { PpapSubmissionRequirement } from "@/generated/prisma/client"

export function PpapReviewCommentForm({
  ppapId,
  requirements,
}: {
  ppapId: string
  requirements: { key: string; label: string }[]
}) {
  const router = useRouter()
  const [requirement, setRequirement] = useState(requirements[0]?.key ?? "")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setLoading(true)
    const result = await addPpapReviewComment(ppapId, requirement as PpapSubmissionRequirement, comment)
    setLoading(false)
    if (result.success) {
      setComment("")
      router.refresh()
    } else {
      alert(result.error)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-sm font-medium text-foreground">Add Review Comment</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <select
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {requirements.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Review comment..."
          rows={2}
          className="flex w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={loading || !comment.trim()}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Comment"}
        </button>
      </form>
    </div>
  )
}