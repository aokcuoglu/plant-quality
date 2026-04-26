"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ClockIcon } from "lucide-react"
import { setFieldDefectSla } from "@/app/(dashboard)/field/actions"

export function SlaUpdateForm({
  fieldDefectId,
  currentResponseDue,
  currentResolutionDue,
}: {
  fieldDefectId: string
  currentResponseDue: Date | null
  currentResolutionDue: Date | null
}) {
  const [open, setOpen] = useState(false)
  const [responseDueAt, setResponseDueAt] = useState(
    currentResponseDue ? new Date(currentResponseDue).toISOString().split("T")[0] : ""
  )
  const [resolutionDueAt, setResolutionDueAt] = useState(
    currentResolutionDue ? new Date(currentResolutionDue).toISOString().split("T")[0] : ""
  )
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = () => {
    setError("")
    startTransition(async () => {
      const result = await setFieldDefectSla(fieldDefectId, {
        responseDueAt: responseDueAt ? responseDueAt + "T00:00:00.000Z" : null,
        resolutionDueAt: resolutionDueAt ? resolutionDueAt + "T00:00:00.000Z" : null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        router.replace(window.location.pathname + window.location.search)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        <ClockIcon className="h-4 w-4" />
        Set SLA Deadlines
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!isPending) { setOpen(false); setError("") } }}>
          <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Set SLA Deadlines</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Define the response and resolution deadlines for this field defect.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Response Due Date</label>
                <input
                  type="date"
                  value={responseDueAt}
                  onChange={(e) => setResponseDueAt(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="mt-0.5 text-xs text-muted-foreground">When the supplier should acknowledge/respond</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Resolution Due Date</label>
                <input
                  type="date"
                  value={resolutionDueAt}
                  onChange={(e) => setResolutionDueAt(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="mt-0.5 text-xs text-muted-foreground">When the issue should be fully resolved</p>
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setOpen(false); setError("") }}
                disabled={isPending}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}