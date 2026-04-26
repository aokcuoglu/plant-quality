"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { convertTo8D } from "@/app/(dashboard)/field/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function ConvertTo8DButton({ fieldDefectId }: { fieldDefectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleConvert() {
    setError(null)
    const result = await convertTo8D(fieldDefectId)
    if (result.success && result.defectId) {
      setOpen(false)
      router.push(`/oem/defects/${result.defectId}`)
      router.refresh()
    } else {
      setError(result.error ?? "Failed to convert to 8D")
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
        Convert to 8D
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Convert to 8D Report</DialogTitle>
            <DialogDescription>
              This will create a new Defect and 8D Report from this field defect. The field defect status will be changed to &ldquo;Linked to 8D&rdquo; and cannot be converted again.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => startTransition(handleConvert)}
              disabled={isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isPending ? "Converting..." : "Convert to 8D"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}