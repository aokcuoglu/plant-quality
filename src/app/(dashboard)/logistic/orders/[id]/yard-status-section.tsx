"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Ban, Pencil } from "lucide-react"
import { upsertYardStatus, markReadyForDispatch, blockDispatch, unblockDispatch } from "../../yard-actions"

export function YardStatusSection({ yardStatus, orderId }: {
  yardStatus: {
    id: string
    yardLocation: string | null
    parkingSlot: string | null
    readyForDispatch: boolean
    blockedForDispatch: boolean
    blockReason: string | null
    lastMovementAt: Date | null
    waitingDays: number | null
    notes: string | null
  } | null
  orderId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [yardLocation, setYardLocation] = useState(yardStatus?.yardLocation ?? "")
  const [parkingSlot, setParkingSlot] = useState(yardStatus?.parkingSlot ?? "")
  const [notes, setNotes] = useState(yardStatus?.notes ?? "")
  const [blockReasonInput, setBlockReasonInput] = useState("")
  const [showBlockDialog, setShowBlockDialog] = useState(false)

  const waitingDays = yardStatus?.waitingDays ?? null

  function handleSave() {
    startTransition(async () => {
      const result = await upsertYardStatus(orderId, {
        yardLocation: yardLocation || null,
        parkingSlot: parkingSlot || null,
        notes: notes || null,
      })
      if (result?.error) { alert(result.error); return }
      setEditing(false)
      router.refresh()
    })
  }

  function handleMarkReady() {
    startTransition(async () => {
      const result = await markReadyForDispatch(orderId)
      if (result?.error) { alert(result.error); return }
      router.refresh()
    })
  }

  function handleBlock() {
    if (!blockReasonInput.trim()) return
    startTransition(async () => {
      const result = await blockDispatch(orderId, blockReasonInput.trim())
      if (result?.error) { alert(result.error); return }
      setShowBlockDialog(false)
      setBlockReasonInput("")
      router.refresh()
    })
  }

  function handleUnblock() {
    startTransition(async () => {
      const result = await unblockDispatch(orderId)
      if (result?.error) { alert(result.error); return }
      router.refresh()
    })
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Yard Status</h2>
        <div className="flex items-center gap-2">
          {yardStatus?.readyForDispatch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
              <CheckCircle2 className="size-3" /> Ready
            </span>
          )}
          {yardStatus?.blockedForDispatch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
              <Ban className="size-3" /> Blocked
            </span>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Yard Location</label>
              <input
                type="text"
                value={yardLocation}
                onChange={(e) => setYardLocation(e.target.value)}
                placeholder="e.g. Yard A, Zone B3"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Parking Slot</label>
              <input
                type="text"
                value={parkingSlot}
                onChange={(e) => setParkingSlot(e.target.value)}
                placeholder="e.g. A-12"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Yard Location</dt>
            <dd className="font-medium text-foreground">{yardStatus?.yardLocation || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Parking Slot</dt>
            <dd className="font-medium text-foreground">{yardStatus?.parkingSlot || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ready for Dispatch</dt>
            <dd className="text-foreground">{yardStatus?.readyForDispatch ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Blocked for Dispatch</dt>
            <dd className="text-foreground">{yardStatus?.blockedForDispatch ? "Yes" : "No"}</dd>
          </div>
          {yardStatus?.blockReason && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Block Reason</dt>
              <dd className="text-destructive">{yardStatus.blockReason}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Last Movement</dt>
            <dd className="text-foreground">{yardStatus?.lastMovementAt ? new Date(yardStatus.lastMovementAt).toLocaleDateString() : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Waiting Days</dt>
            <dd className="text-foreground">
              {waitingDays !== null ? (
                <span className={waitingDays > 14 ? "text-destructive" : waitingDays > 7 ? "text-amber-600" : ""}>
                  {waitingDays} day{waitingDays !== 1 ? "s" : ""}
                </span>
              ) : "—"}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {(!yardStatus || !yardStatus.readyForDispatch) && !yardStatus?.blockedForDispatch && (
          <button
            onClick={handleMarkReady}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50"
          >
            <CheckCircle2 className="size-3.5" /> Mark Ready
          </button>
        )}
        {!yardStatus?.blockedForDispatch && (
          <button
            onClick={() => setShowBlockDialog(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            <Ban className="size-3.5" /> Block Dispatch
          </button>
        )}
        {yardStatus?.blockedForDispatch && (
          <button
            onClick={handleUnblock}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-500/20 disabled:opacity-50"
          >
            Unblock Dispatch
          </button>
        )}
      </div>

      {showBlockDialog && (
        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <label className="mb-1 block text-xs text-muted-foreground">Block Reason</label>
          <input
            type="text"
            value={blockReasonInput}
            onChange={(e) => setBlockReasonInput(e.target.value)}
            placeholder="Enter reason for blocking dispatch..."
            className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex gap-2">
            <button
              onClick={handleBlock}
              disabled={isPending || !blockReasonInput.trim()}
              className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
            >
              {isPending ? "Blocking..." : "Block"}
            </button>
            <button
              onClick={() => { setShowBlockDialog(false); setBlockReasonInput("") }}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}