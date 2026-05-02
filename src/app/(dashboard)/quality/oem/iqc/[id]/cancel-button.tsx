"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { cancelIqcInspection } from "../actions/report"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function CancelInspectionButton({ inspectionId }: { inspectionId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await cancelIqcInspection(inspectionId)
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error ?? "Failed to cancel inspection")
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full text-red-400 border-red-400/30 hover:bg-red-500/10"
        onClick={() => setOpen(true)}
      >
        Cancel Inspection
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel IQC Inspection</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this inspection? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Keep Inspection
            </Button>
            <Button type="button" className="bg-red-500/10 text-red-400 border border-red-400/30 hover:bg-red-500/20" onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}