"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { completeIqcInspection } from "../actions/report"
import type { IqcResult } from "@/generated/prisma/client"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const RESULT_OPTIONS: { value: IqcResult; label: string; group: "positive" | "conditional" | "negative" }[] = [
  { value: "ACCEPTED", label: "Accepted", group: "positive" },
  { value: "CONDITIONAL_ACCEPTED", label: "Conditional Accepted", group: "conditional" },
  { value: "REJECTED", label: "Rejected", group: "negative" },
  { value: "ON_HOLD", label: "On Hold", group: "negative" },
  { value: "REWORK_REQUIRED", label: "Rework Required", group: "negative" },
  { value: "SORTING_REQUIRED", label: "Sorting Required", group: "negative" },
]

export function CompleteInspectionDialog({ inspectionId, hasNokItems }: { inspectionId: string; hasNokItems: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IqcResult | "">(hasNokItems ? "" : "ACCEPTED")
  const [quantityAccepted, setQuantityAccepted] = useState("0")
  const [quantityRejected, setQuantityRejected] = useState("0")
  const [dispositionNotes, setDispositionNotes] = useState("")

  function handleSubmit() {
    if (!result) {
      setError("Please select a result")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await completeIqcInspection(
        inspectionId,
        result,
        parseInt(quantityAccepted) || 0,
        parseInt(quantityRejected) || 0,
        dispositionNotes.trim() || undefined
      )
      if (res.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(res.error ?? "Failed to complete inspection")
      }
    })
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-500/20">
        Complete Inspection
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete IQC Inspection</DialogTitle>
            <DialogDescription>
              Select the final result and enter accepted/rejected quantities.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">{error}</div>
          )}

          {hasNokItems && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
              This inspection has NOK checklist items. You must select a non-accepted result.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Result <span className="text-red-400">*</span></label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as IqcResult | "")}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select result...</option>
                {RESULT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Quantity Accepted</label>
                <Input
                  type="number"
                  min="0"
                  value={quantityAccepted}
                  onChange={(e) => setQuantityAccepted(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Quantity Rejected</label>
                <Input
                  type="number"
                  min="0"
                  value={quantityRejected}
                  onChange={(e) => setQuantityRejected(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Disposition Notes</label>
              <Textarea
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                placeholder="Optional notes about the disposition decision..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending || !result}>
              {isPending ? "Completing..." : "Complete Inspection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}