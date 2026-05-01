"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createUpgradeRequest,
} from "@/app/(dashboard)/_actions/upgrade-requests"
import { PLAN_LABELS, type PlanKey } from "@/lib/billing/plans"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface UpgradeRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: PlanKey
  requestedPlan: PlanKey
  sourceFeature?: string
}

export function UpgradeRequestDialog({
  open,
  onOpenChange,
  currentPlan,
  requestedPlan,
  sourceFeature,
}: UpgradeRequestDialogProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [duplicate, setDuplicate] = useState(false)

  function handleSubmit() {
    setError(null)
    setSuccess(false)
    setDuplicate(false)
    startTransition(async () => {
      const result = await createUpgradeRequest({
        requestedPlan,
        sourceFeature,
        message: message.trim() || undefined,
      })
      if (result.success) {
        if (result.duplicate) {
          setDuplicate(true)
        } else {
          setSuccess(true)
        }
        router.refresh()
      } else {
        setError(result.error ?? "Failed to create upgrade request")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {success
              ? "Request Submitted"
              : duplicate
                ? "Request Already Exists"
                : `Request ${PLAN_LABELS[requestedPlan]}`}
          </DialogTitle>
          <DialogDescription>
            {success
              ? `Your request to upgrade to ${PLAN_LABELS[requestedPlan]} has been submitted. An administrator will review it shortly.`
              : duplicate
                ? `You already have an open request to upgrade to ${PLAN_LABELS[requestedPlan]}. An administrator will review it.`
                : `Billing integration is not enabled yet. This request will be reviewed by your system administrator or PlantX sales team.`}
          </DialogDescription>
        </DialogHeader>

        {!success && !duplicate && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Plan</span>
                <span className="font-medium text-foreground">{PLAN_LABELS[currentPlan]}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Requested Plan</span>
                <span className="font-medium text-emerald-500">{PLAN_LABELS[requestedPlan]}</span>
              </div>
              {sourceFeature && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Feature</span>
                  <span className="font-medium text-foreground">{sourceFeature.replace(/_/g, " ")}</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Message (optional)
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us why you need this upgrade..."
                rows={3}
                className="resize-none"
                disabled={isPending}
              />
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </>
        )}

        <DialogFooter>
          {success || duplicate ? (
            <Button
              variant="outline"
              onClick={() => {
                setSuccess(false)
                setDuplicate(false)
                setError(null)
                setMessage("")
                onOpenChange(false)
              }}
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null)
                  setMessage("")
                  onOpenChange(false)
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}