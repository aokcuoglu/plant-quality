"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { reviewPpapDocument } from "../actions/review"
import { PPAP_DOCUMENT_STATUS_LABELS, getDocumentStatusColor } from "@/lib/ppap"

export function PpapDocumentReview({
  evidence,
  canReview,
  requirementLabel,
}: {
  evidence: {
    id: string
    requirement: string
    status: string
    fileName: string | null
    sizeBytes: number | null
    supplierComment: string | null
    oemComment: string | null
    reviewedAt: Date | null
    reviewedBy: { name: string | null } | null
    createdAt: Date
  }
  canReview: boolean
  requirementLabel: string
}) {
  const router = useRouter()
  const [oemComment, setOemComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReview(action: "APPROVED" | "REJECTED" | "REVISION_REQUIRED") {
    setLoading(true)
    setError(null)
    const result = await reviewPpapDocument(evidence.id, action, oemComment || undefined)
    setLoading(false)
    if (result.success) {
      setOemComment("")
      router.refresh()
    } else {
      setError(result.error ?? "Failed to review document")
    }
  }

  const isReviewable = canReview && (evidence.status === "UPLOADED" || evidence.status === "UNDER_REVIEW" || evidence.status === "REVISION_REQUIRED")

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{requirementLabel}</p>
          {evidence.fileName && (
            <p className="text-xs text-muted-foreground truncate">{evidence.fileName} {evidence.sizeBytes ? `(${(evidence.sizeBytes / 1024).toFixed(1)} KB)` : ""}</p>
          )}
          {evidence.supplierComment && (
            <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{evidence.supplierComment}&rdquo;</p>
          )}
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getDocumentStatusColor(evidence.status)}`}>
          {PPAP_DOCUMENT_STATUS_LABELS[evidence.status] ?? evidence.status}
        </span>
      </div>

      {evidence.oemComment && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">OEM note: {evidence.oemComment}</p>
      )}
      {evidence.reviewedAt && evidence.reviewedBy && (
        <p className="text-xs text-muted-foreground">Reviewed {evidence.reviewedAt.toLocaleDateString()} by {evidence.reviewedBy.name}</p>
      )}

      {isReviewable && (
        <div className="border-t border-border pt-2 space-y-2">
          {error && (
            <div className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1 text-xs text-red-400">
              {error}
            </div>
          )}
          <input
            type="text"
            value={oemComment}
            onChange={(e) => setOemComment(e.target.value)}
            placeholder="Add review comment (optional)..."
            className="flex w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => handleReview("APPROVED")}
              disabled={loading}
              className="rounded px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => handleReview("REVISION_REQUIRED")}
              disabled={loading}
              className="rounded px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              Request Revision
            </button>
            <button
              onClick={() => handleReview("REJECTED")}
              disabled={loading}
              className="rounded px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {evidence.status === "MISSING" && (
        <p className="text-xs text-muted-foreground">Awaiting document upload from supplier</p>
      )}
    </div>
  )
}