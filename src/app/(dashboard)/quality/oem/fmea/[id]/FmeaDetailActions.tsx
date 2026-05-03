"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { approveFmea, rejectFmea, requestFmeaRevision, cancelFmea } from "../actions/fmea"
import type { FmeaStatus } from "@/generated/prisma/client"

interface FmeaDetailActionsProps {
  fmeaId: string
  status: FmeaStatus
  canReview: boolean
  canCancel: boolean
}

export function FmeaDetailActions({ fmeaId, status, canReview, canCancel }: FmeaDetailActionsProps) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [revisioning, setRevisioning] = useState(false)
  const [revisionReason, setRevisionReason] = useState("")
  const [approving, setApproving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    setApproving(true)
    setError(null)
    try {
      const result = await approveFmea(fmeaId)
      if (!result.success) { setError(result.error ?? "Failed to approve") }
      else { router.refresh() }
    } catch { setError("Failed to approve FMEA") }
    finally { setApproving(false) }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError("Rejection reason is required"); return }
    setRejecting(true)
    setError(null)
    try {
      const result = await rejectFmea(fmeaId, rejectReason)
      if (!result.success) { setError(result.error ?? "Failed to reject") }
      else { router.refresh() }
    } catch { setError("Failed to reject FMEA") }
    finally { setRejecting(false) }
  }

  const handleRequestRevision = async () => {
    if (!revisionReason.trim()) { setError("Revision reason is required"); return }
    setRevisioning(true)
    setError(null)
    try {
      const result = await requestFmeaRevision(fmeaId, revisionReason)
      if (!result.success) { setError(result.error ?? "Failed to request revision") }
      else { router.refresh() }
    } catch { setError("Failed to request revision") }
    finally { setRevisioning(false) }
  }

  const handleCancel = async () => {
    setCancelling(true)
    setError(null)
    try {
      const result = await cancelFmea(fmeaId)
      if (!result.success) { setError(result.error ?? "Failed to cancel") }
      else { router.refresh() }
    } catch { setError("Failed to cancel FMEA") }
    finally { setCancelling(false) }
  }

  const cancellableStatuses: FmeaStatus[] = ["DRAFT", "REQUESTED", "SUPPLIER_IN_PROGRESS"]
  const reviewableStatuses: FmeaStatus[] = ["SUBMITTED", "UNDER_REVIEW"]

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {canReview && reviewableStatuses.includes(status) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Review Actions</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleApprove} disabled={approving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {approving ? "Approving..." : "Approve"}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reject with Reason</label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={2} />
            <Button variant="outline" onClick={handleReject} disabled={rejecting} className="text-red-400 border-red-500/50 hover:bg-red-500/10">
              {rejecting ? "Rejecting..." : "Reject"}
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Request Revision</label>
            <Textarea value={revisionReason} onChange={e => setRevisionReason(e.target.value)} placeholder="What needs to be revised..." rows={2} />
            <Button variant="outline" onClick={handleRequestRevision} disabled={revisioning} className="text-amber-400 border-amber-500/50 hover:bg-amber-500/10">
              {revisioning ? "Requesting..." : "Request Revision"}
            </Button>
          </div>
        </div>
      )}

      {canCancel && cancellableStatuses.includes(status) && (
        <div className="pt-2 border-t border-border">
          <Button variant="outline" onClick={handleCancel} disabled={cancelling} className="text-muted-foreground">
            {cancelling ? "Cancelling..." : "Cancel FMEA"}
          </Button>
        </div>
      )}
    </div>
  )
}