"use client"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangleIcon } from "lucide-react"
import type { EscalationLevel } from "@plantx/db/client"
import { ESCALATION_LABELS, ESCALATION_LEVEL_DESCRIPTIONS, getNextEscalationLevel } from "@/lib/escalation"
import { escalateFieldDefect } from "@/app/(dashboard)/field/actions"

export function EscalateButton({
  fieldDefectId,
  currentLevel,
}: {
  fieldDefectId: string
  currentLevel: EscalationLevel
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const nextLevel = getNextEscalationLevel(currentLevel)

  if (!nextLevel) return null

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Please provide a reason for escalation")
      return
    }
    setError("")
    startTransition(async () => {
      const result = await escalateFieldDefect(fieldDefectId, reason.trim())
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setReason("")
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full justify-start text-destructive hover:bg-destructive/10"
      >
        <AlertTriangleIcon className="h-4 w-4" />
        Escalate to {ESCALATION_LABELS[nextLevel]}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isPending) {
            setOpen(nextOpen)
            if (!nextOpen) {
              setReason("")
              setError("")
            }
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Escalate to {ESCALATION_LABELS[nextLevel]}
            </DialogTitle>
            <DialogDescription>
              {ESCALATION_LEVEL_DESCRIPTIONS[nextLevel]}
            </DialogDescription>
          </DialogHeader>
            <div className="mt-4">
              <Label className="text-sm font-medium text-foreground">Reason for escalation</Label>
              <Textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError("") }}
                rows={3}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                placeholder="Describe why this field defect is being escalated..."
              />
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
          <DialogFooter>
              <Button
                onClick={() => { setOpen(false); setReason(""); setError("") }}
                disabled={isPending}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                variant="destructive"
              >
                {isPending ? "Escalating..." : "Escalate"}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
