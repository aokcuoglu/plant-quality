"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addFieldDefectComment } from "@/app/(dashboard)/field/actions"

type CommentWithAuthor = {
  id: string
  content: string
  createdAt: Date
  author: { name: string | null; email: string; companyId: string | null }
}

export function CommentSection({
  fieldDefectId,
  comments,
}: {
  fieldDefectId: string
  comments: CommentWithAuthor[]
}) {
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const result = await addFieldDefectComment(fieldDefectId, newComment.trim())
      if (result.success) {
        setNewComment("")
        router.refresh()
      } else {
        setError(result.error ?? "Failed to add comment")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Comments ({comments.length})</h2>
      </div>
      <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No comments yet</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{comment.author.name ?? comment.author.email}</span>
              <span className="text-xs text-muted-foreground">
                {comment.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-border space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add Comment"}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </div>
  )
}