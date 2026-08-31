"use client"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Truck, Ship, Train, Plane } from "lucide-react"
import type { DispatchStatus, DispatchTransportMode } from "@plantx/db/client"
import { DispatchStatusBadge } from "../../dispatch-status-badge"
import { getNextDispatchStatuses, DISPATCH_STATUS_LABELS, TRANSPORT_MODE_OPTIONS, labelForTransportMode } from "@/lib/logistic/dispatch-status"
import { createOrUpdateDispatch, changeDispatchStatus } from "../../dispatch-actions"
import { DatePicker } from "@/components/ui/date-picker"
import { useAppAlertDialog } from "@/components/ui/app-alert-dialog"

function TransportIcon({ mode }: { mode: string }) {
  switch (mode) {
    case "SEA": return <Ship className="size-4" />
    case "RAIL": return <Train className="size-4" />
    case "AIR": return <Plane className="size-4" />
    default: return <Truck className="size-4" />
  }
}

export function DispatchSection({
  dispatches,
  orderId,
}: {
  dispatches: {
    id: string
    dispatchBatchNo: string | null
    carrierName: string | null
    transportMode: string
    status: string
    plannedLoadingDate: Date | null
    actualLoadingDate: Date | null
    estimatedArrivalDate: Date | null
    actualArrivalDate: Date | null
    deliveredAt: Date | null
    destinationCountry: string | null
    destinationCity: string | null
    dealerOrDistributorName: string | null
    trackingReference: string | null
    notes: string | null
  }[]
  orderId: string
}) {
  const { showAlert } = useAppAlertDialog()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    dispatchBatchNo: "",
    carrierName: "",
    transportMode: "ROAD" as DispatchTransportMode,
    destinationCountry: "",
    destinationCity: "",
    dealerOrDistributorName: "",
    trackingReference: "",
    notes: "",
    plannedLoadingDate: "",
    estimatedArrivalDate: "",
  })

  function resetForm() {
    setForm({
      dispatchBatchNo: "",
      carrierName: "",
      transportMode: "ROAD" as DispatchTransportMode,
      destinationCountry: "",
      destinationCity: "",
      dealerOrDistributorName: "",
      trackingReference: "",
      notes: "",
      plannedLoadingDate: "",
      estimatedArrivalDate: "",
    })
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createOrUpdateDispatch(null, orderId, {
        dispatchBatchNo: form.dispatchBatchNo || null,
        carrierName: form.carrierName || null,
        transportMode: form.transportMode,
        destinationCountry: form.destinationCountry || null,
        destinationCity: form.destinationCity || null,
        dealerOrDistributorName: form.dealerOrDistributorName || null,
        trackingReference: form.trackingReference || null,
        notes: form.notes || null,
        plannedLoadingDate: form.plannedLoadingDate || null,
        estimatedArrivalDate: form.estimatedArrivalDate || null,
      })
      if (result?.error) {
        showAlert(result.error)
        return
      }
      setShowCreateForm(false)
      resetForm()
      router.refresh()
    })
  }

  function handleStatusChange(dispatchId: string, newStatus: DispatchStatus) {
    startTransition(async () => {
      const result = await changeDispatchStatus(dispatchId, newStatus)
      if (result?.error) {
        showAlert(result.error)
        return
      }
      router.refresh()
    })
  }

  function startEdit(d: typeof dispatches[0]) {
    setEditingId(d.id)
    setForm({
      dispatchBatchNo: d.dispatchBatchNo ?? "",
      carrierName: d.carrierName ?? "",
      transportMode: d.transportMode as DispatchTransportMode,
      destinationCountry: d.destinationCountry ?? "",
      destinationCity: d.destinationCity ?? "",
      dealerOrDistributorName: d.dealerOrDistributorName ?? "",
      trackingReference: d.trackingReference ?? "",
      notes: d.notes ?? "",
      plannedLoadingDate: d.plannedLoadingDate ? new Date(d.plannedLoadingDate).toISOString().split("T")[0] : "",
      estimatedArrivalDate: d.estimatedArrivalDate ? new Date(d.estimatedArrivalDate).toISOString().split("T")[0] : "",
    })
  }

  function handleUpdate() {
    if (!editingId) return
    startTransition(async () => {
      const result = await createOrUpdateDispatch(editingId, orderId, {
        dispatchBatchNo: form.dispatchBatchNo || null,
        carrierName: form.carrierName || null,
        transportMode: form.transportMode,
        destinationCountry: form.destinationCountry || null,
        destinationCity: form.destinationCity || null,
        dealerOrDistributorName: form.dealerOrDistributorName || null,
        trackingReference: form.trackingReference || null,
        notes: form.notes || null,
        plannedLoadingDate: form.plannedLoadingDate || null,
        estimatedArrivalDate: form.estimatedArrivalDate || null,
      })
      if (result?.error) {
        showAlert(result.error)
        return
      }
      setEditingId(null)
      resetForm()
      router.refresh()
    })
  }

  const fmtDate = (d: Date | null) => d ? new Date(d).toLocaleDateString() : "—"

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Dispatch Plan</h2>
        {!showCreateForm && dispatches.length === 0 && (
          <Button
            onClick={() => { resetForm(); setShowCreateForm(true) }}
            className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-foreground/20"
          >
            <Plus className="size-3.5" /> Add Dispatch
          </Button>
        )}
        {!showCreateForm && dispatches.length > 0 && (
          <Button
            onClick={() => { resetForm(); setShowCreateForm(true) }}
            className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-foreground/20"
          >
            <Plus className="size-3" /> Add
          </Button>
        )}
      </div>

      {showCreateForm && (
        <div className="mb-4 rounded-lg border border-border bg-background p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">New Dispatch</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Batch No</Label>
              <Input type="text" value={form.dispatchBatchNo} onChange={(e) => setForm(f => ({ ...f, dispatchBatchNo: e.target.value }))} placeholder="DIS-2026-001" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Carrier Name</Label>
              <Input type="text" value={form.carrierName} onChange={(e) => setForm(f => ({ ...f, carrierName: e.target.value }))} placeholder="Global Transport Co." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Transport Mode</Label>
              <NativeSelect value={form.transportMode} onChange={(e) => setForm(f => ({ ...f, transportMode: e.target.value as DispatchTransportMode }))} className="w-full">
                {TRANSPORT_MODE_OPTIONS.map(o => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Destination Country</Label>
              <Input type="text" value={form.destinationCountry} onChange={(e) => setForm(f => ({ ...f, destinationCountry: e.target.value }))} placeholder="Germany" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Destination City</Label>
              <Input type="text" value={form.destinationCity} onChange={(e) => setForm(f => ({ ...f, destinationCity: e.target.value }))} placeholder="Munich" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Dealer / Distributor</Label>
              <Input type="text" value={form.dealerOrDistributorName} onChange={(e) => setForm(f => ({ ...f, dealerOrDistributorName: e.target.value }))} placeholder="AutoBahn Dealers" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Tracking Reference</Label>
              <Input type="text" value={form.trackingReference} onChange={(e) => setForm(f => ({ ...f, trackingReference: e.target.value }))} placeholder="TRK-12345" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Planned Loading Date</Label>
              <DatePicker value={form.plannedLoadingDate} onChange={(d) => setForm(f => ({ ...f, plannedLoadingDate: d }))} placeholder="mm / dd / yyyy" />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Estimated Arrival</Label>
              <DatePicker value={form.estimatedArrivalDate} onChange={(d) => setForm(f => ({ ...f, estimatedArrivalDate: d }))} placeholder="mm / dd / yyyy" />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Dispatch notes..." />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={isPending} className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50">
              {isPending ? "Creating..." : "Create Dispatch"}
            </Button>
            <Button onClick={() => { setShowCreateForm(false); resetForm() }} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {dispatches.length === 0 && !showCreateForm ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Truck className="mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm">No dispatch plan yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dispatches.map((d) => {
            const nextStatuses = getNextDispatchStatuses(d.status as DispatchStatus)
            const isTerminal = ["DELIVERED", "CANCELLED"].includes(d.status)
            return (
              <div key={d.id} className="rounded-lg border border-border p-3">
                {editingId === d.id ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Batch No</Label>
                        <Input type="text" value={form.dispatchBatchNo} onChange={(e) => setForm(f => ({ ...f, dispatchBatchNo: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Carrier Name</Label>
                        <Input type="text" value={form.carrierName} onChange={(e) => setForm(f => ({ ...f, carrierName: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Transport Mode</Label>
                        <NativeSelect value={form.transportMode} onChange={(e) => setForm(f => ({ ...f, transportMode: e.target.value as DispatchTransportMode }))} className="w-full">
                          {TRANSPORT_MODE_OPTIONS.map(o => <NativeSelectOption key={o.value} value={o.value}>{o.label}</NativeSelectOption>)}
                        </NativeSelect>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Destination Country</Label>
                        <Input type="text" value={form.destinationCountry} onChange={(e) => setForm(f => ({ ...f, destinationCountry: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Destination City</Label>
                        <Input type="text" value={form.destinationCity} onChange={(e) => setForm(f => ({ ...f, destinationCity: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Dealer / Distributor</Label>
                        <Input type="text" value={form.dealerOrDistributorName} onChange={(e) => setForm(f => ({ ...f, dealerOrDistributorName: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Tracking Reference</Label>
                        <Input type="text" value={form.trackingReference} onChange={(e) => setForm(f => ({ ...f, trackingReference: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Planned Loading Date</Label>
                        <DatePicker value={form.plannedLoadingDate} onChange={(d) => setForm(f => ({ ...f, plannedLoadingDate: d }))} placeholder="mm / dd / yyyy" />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Estimated Arrival</Label>
                        <DatePicker value={form.estimatedArrivalDate} onChange={(d) => setForm(f => ({ ...f, estimatedArrivalDate: d }))} placeholder="mm / dd / yyyy" />
                      </div>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-muted-foreground">Notes</Label>
                      <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdate} disabled={isPending} className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-foreground/90 disabled:opacity-50">
                        {isPending ? "Updating..." : "Update"}
                      </Button>
                      <Button onClick={() => { setEditingId(null); resetForm() }} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TransportIcon mode={d.transportMode} />
                        <span className="text-sm font-medium text-foreground">
                          {d.dispatchBatchNo || "No Batch #"}
                        </span>
                        <DispatchStatusBadge status={d.status as DispatchStatus} />
                      </div>
                      {!isTerminal && (
                        <Button variant="ghost" onClick={() => startEdit(d)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted-foreground">Carrier</dt>
                        <dd className="text-foreground">{d.carrierName || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Transport Mode</dt>
                        <dd className="text-foreground">{labelForTransportMode(d.transportMode)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Planned Loading</dt>
                        <dd className="text-foreground">{fmtDate(d.plannedLoadingDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Actual Loading</dt>
                        <dd className="text-foreground">{fmtDate(d.actualLoadingDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">ETA</dt>
                        <dd className="text-foreground">
                          {d.estimatedArrivalDate ? (
                            <span className={new Date(d.estimatedArrivalDate) < new Date() && d.status !== "DELIVERED" && d.status !== "CANCELLED" ? "text-destructive" : ""}>
                              {fmtDate(d.estimatedArrivalDate)}
                            </span>
                          ) : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Destination</dt>
                        <dd className="text-foreground">
                          {[d.destinationCity, d.destinationCountry].filter(Boolean).join(", ") || "—"}
                        </dd>
                      </div>
                      {d.dealerOrDistributorName && (
                        <div>
                          <dt className="text-xs text-muted-foreground">Dealer / Distributor</dt>
                          <dd className="text-foreground">{d.dealerOrDistributorName}</dd>
                        </div>
                      )}
                      {d.trackingReference && (
                        <div>
                          <dt className="text-xs text-muted-foreground">Tracking Ref</dt>
                          <dd className="text-foreground">{d.trackingReference}</dd>
                        </div>
                      )}
                      {d.deliveredAt && (
                        <div>
                          <dt className="text-xs text-muted-foreground">Delivered At</dt>
                          <dd className="text-foreground">{fmtDate(d.deliveredAt)}</dd>
                        </div>
                      )}
                      {d.notes && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-muted-foreground">Notes</dt>
                          <dd className="text-foreground whitespace-pre-wrap">{d.notes}</dd>
                        </div>
                      )}
                    </dl>
                    {!isTerminal && nextStatuses.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {nextStatuses.map((ns) => (
                          <Button
                            key={ns}
                            onClick={() => handleStatusChange(d.id, ns)}
                            disabled={isPending}
                            className={`rounded-lg px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                              ns === "CANCELLED"
                                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                : "bg-muted text-muted-foreground hover:bg-foreground/20"
                            }`}
                          >
                            {DISPATCH_STATUS_LABELS[ns]}
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
