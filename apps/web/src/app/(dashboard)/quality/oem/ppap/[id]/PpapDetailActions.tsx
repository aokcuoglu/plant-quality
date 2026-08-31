"use client"

import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { approvePpap, rejectPpap, requestPpapRevision, cancelPpap } from "../actions/review"
import { useAppAlertDialog } from "@/components/ui/app-alert-dialog"
import { useTranslations } from "@/i18n/context"

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
  const t = useTranslations()
  const { showConfirm } = useAppAlertDialog()
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
    const confirmed = await showConfirm({
      title: t("quality.ppap.cancelTitle"),
      description: t("quality.ppap.cancelDescription"),
      actionLabel: t("quality.ppap.cancelAction"),
      variant: "destructive",
    })
    if (!confirmed) return
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
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {isReviewable && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleApprove}
            disabled={loading || !hasAllDocsApproved}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!hasAllDocsApproved ? "All required documents must be approved before final approval" : "Approve PPAP"}
          >
            Approve PPAP
          </Button>
          <Button
            onClick={() => setShowRevision(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-destructive/90 transition-colors"
          >
            Request Revision
          </Button>
          <Button
            onClick={() => setShowReject(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-destructive/90 transition-colors"
          >
            Reject PPAP
          </Button>
          {!hasAllDocsApproved && (
            <span className="text-xs text-destructive">All required documents must be approved before final PPAP approval</span>
          )}
        </div>
      )}

      {canCancel && (
        <Button
          onClick={handleCancel}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel PPAP
        </Button>
      )}

      {showReject && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
          <h3 className="text-sm font-medium text-destructive">Reject PPAP</h3>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex gap-2">
            <Button onClick={handleReject} disabled={loading || !rejectReason.trim()} className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-destructive/90 disabled:opacity-50">Confirm Reject</Button>
            <Button variant="outline" onClick={() => setShowReject(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">Cancel</Button>
          </div>
        </div>
      )}

      {showRevision && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Request Revision</h3>
          <Textarea
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
            placeholder="Describe what needs to be revised..."
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex gap-2">
            <Button onClick={handleRevisionRequest} disabled={loading || !revisionReason.trim()} className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-destructive/90 disabled:opacity-50">Request Revision</Button>
            <Button variant="outline" onClick={() => setShowRevision(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
