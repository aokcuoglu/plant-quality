"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangleIcon } from "lucide-react"
import type { EscalationLevel } from "@/generated/prisma/client"
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
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30 transition-colors"
      >
        <AlertTriangleIcon className="h-4 w-4" />
        Escalate to {ESCALATION_LABELS[nextLevel]}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!isPending) { setOpen(false); setReason(""); setError("") } }}>
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">
              Escalate to {ESCALATION_LABELS[nextLevel]}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {ESCALATION_LEVEL_DESCRIPTIONS[nextLevel]}
            </p>
            <div className="mt-4">
              <label className="text-sm font-medium text-foreground">Reason for escalation</label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError("") }}
                rows={3}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Describe why this field defect is being escalated..."
              />
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setOpen(false); setReason(""); setError("") }}
                disabled={isPending}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Escalating..." : "Escalate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}