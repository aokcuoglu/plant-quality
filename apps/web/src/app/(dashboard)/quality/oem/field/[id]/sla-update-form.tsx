"use client"

import { Label } from "@/components/ui/label"

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
import { ClockIcon } from "lucide-react"
import { setFieldDefectSla } from "@/app/(dashboard)/field/actions"
import { DatePicker } from "@/components/ui/date-picker"

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
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full justify-start"
      >
        <ClockIcon className="h-4 w-4" />
        Set SLA Deadlines
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!isPending) {
            setOpen(nextOpen)
            if (!nextOpen) setError("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set SLA Deadlines</DialogTitle>
            <DialogDescription>
              Define the response and resolution deadlines for this field defect.
            </DialogDescription>
          </DialogHeader>
            <div className="mt-4 space-y-3">
              <div>
                <Label className="text-sm font-medium text-foreground">Response Due Date</Label>
                <DatePicker value={responseDueAt} onChange={setResponseDueAt} placeholder="mm / dd / yyyy" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground" />
                <p className="mt-0.5 text-xs text-muted-foreground">When the supplier should acknowledge/respond</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Resolution Due Date</Label>
                <DatePicker value={resolutionDueAt} onChange={setResolutionDueAt} placeholder="mm / dd / yyyy" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground" />
                <p className="mt-0.5 text-xs text-muted-foreground">When the issue should be fully resolved</p>
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <DialogFooter>
              <Button
                onClick={() => { setOpen(false); setError("") }}
                disabled={isPending}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save"}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
