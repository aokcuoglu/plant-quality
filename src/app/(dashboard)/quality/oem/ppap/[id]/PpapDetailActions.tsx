"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { approvePpap, rejectPpap, requestPpapRevision, cancelPpap } from "../actions/review"

export function PpapDetailActions({
  ppapId,
  status,
  hasAllDocsApproved = true,
  canCancel = false,
}: {
  ppapId: string
  status: string
  hasAllDocsApproved?: boolean
  canCancel?: boolean
}) {
  const router = useRouter()
  const [rejectReason, setRejectReason] = useState("")
  const [revisionReason, setRevisionReason] = useState("")
  const [showReject, setShowReject] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReviewable = ["SUBMITTED", "UNDER_REVIEW"].includes(status)

  async function handleApprove() {
    setLoading(true)
    setError(null)
    const result = await approvePpap(ppapId)
    setLoading(false)
    if (result.success) router.refresh()
    else setError(result.error ?? "Failed to approve PPAP")
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setLoading(true)
    setError(null)
    const result = await rejectPpap(ppapId, rejectReason)
    setLoading(false)
    if (result.success) { setShowReject(false); router.refresh() }
    else setError(result.error ?? "Failed to reject PPAP")
  }

  async function handleRevisionRequest() {
    if (!revisionReason.trim()) return
    setLoading(true)
    setError(null)
    const result = await requestPpapRevision(ppapId, revisionReason)
    setLoading(false)
    if (result.success) { setShowRevision(false); router.refresh() }
    else setError(result.error ?? "Failed to request revision")
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this PPAP request?")) return
    setLoading(true)
    setError(null)
    const result = await cancelPpap(ppapId)
    setLoading(false)
    if (result.success) router.refresh()
    else setError(result.error ?? "Failed to cancel PPAP")
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {isReviewable && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={loading || !hasAllDocsApproved}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasAllDocsApproved ? "All required documents must be approved before final approval" : "Approve PPAP"}
          >
            Approve PPAP
          </button>
          <button
            onClick={() => setShowRevision(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Request Revision
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
          >
            Reject PPAP
          </button>
          {!hasAllDocsApproved && (
            <span className="text-xs text-amber-400">Some required documents need approval before final PPAP approval</span>
          )}
        </div>
      )}

      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel PPAP
        </button>
      )}

      {showReject && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3">
          <h3 className="text-sm font-medium text-destructive">Reject PPAP</h3>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex gap-2">
            <button onClick={handleReject} disabled={loading || !rejectReason.trim()} className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">Confirm Reject</button>
            <button onClick={() => setShowReject(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {showRevision && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Request Revision</h3>
          <textarea
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
            placeholder="Describe what needs to be revised..."
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex gap-2">
            <button onClick={handleRevisionRequest} disabled={loading || !revisionReason.trim()} className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">Request Revision</button>
            <button onClick={() => setShowRevision(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}