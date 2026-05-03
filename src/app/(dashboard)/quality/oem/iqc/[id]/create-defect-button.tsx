"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createDefectFromIqc } from "../actions/report"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CreateDefectFromIqcButton({ inspectionId }: { inspectionId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [createdDefectId, setCreatedDefectId] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    setCreatedDefectId(null)
    startTransition(async () => {
      try {
        const result = await createDefectFromIqc(inspectionId)
        if (result.success && result.defectId) {
          setCreatedDefectId(result.defectId)
          router.refresh()
        } else {
          setError(result.error ?? "Failed to create defect")
        }
      } catch {
        setError("An unexpected error occurred")
      }
    })
  }

  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        Create Defect
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {createdDefectId ? (
            <>
              <DialogHeader>
                <DialogTitle>Defect Created</DialogTitle>
                <DialogDescription>
                  A defect has been created and linked to this IQC inspection.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Link href={`/quality/oem/defects/${createdDefectId}`} className="text-sm text-emerald-400 hover:underline">
                  View Defect →
                </Link>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); setCreatedDefectId(null); setError(null); }}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create Defect from IQC</DialogTitle>
                <DialogDescription>
                  This will create a new defect record linked to this IQC inspection and notify the supplier. The defect will be assigned to the supplier for response.
                </DialogDescription>
              </DialogHeader>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">{error}</div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleConfirm} disabled={isPending}>
                  {isPending ? "Creating..." : "Create Defect"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}