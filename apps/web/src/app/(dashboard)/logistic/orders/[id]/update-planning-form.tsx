"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DatePicker } from "@/components/ui/date-picker"

export function UpdatePlanningForm({ order }: { order: { id: string; plannedProductionDate: Date | null; plannedDeliveryDate: Date | null; plannedProductionWeek: string | null; productionOrderNo: string | null } }) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  const handleSave = async (formData: FormData) => {
    setLoading(true)
    try {
      const { updateLogisticOrderPlanning } = await import("../../actions")
      const result = await updateLogisticOrderPlanning(order.id, formData)
      if (result?.error) alert(result.error)
      setEditing(false)
      router.refresh()
    } catch {
      alert("Failed to update planning")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: Date | null) => d ? new Date(d).toISOString().split("T")[0] : ""

  if (!editing) {
    return (
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Planned Production Date</dt>
          <dd className="text-foreground">{order.plannedProductionDate ? new Date(order.plannedProductionDate).toLocaleDateString() : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Production Week</dt>
          <dd className="text-foreground">{order.plannedProductionWeek ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Planned Delivery Date</dt>
          <dd className="text-foreground">{order.plannedDeliveryDate ? new Date(order.plannedDeliveryDate).toLocaleDateString() : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Production Order #</dt>
          <dd className="text-foreground">{order.productionOrderNo ?? "—"}</dd>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Edit Planning
        </button>
      </dl>
    )
  }

  return (
    <form action={handleSave} className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Planned Production Date</label>
        <DatePicker
          name="plannedProductionDate"
          defaultValue={formatDate(order.plannedProductionDate)}
          placeholder="mm / dd / yyyy"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Production Week</label>
        <input
          type="text"
          name="plannedProductionWeek"
          defaultValue={order.plannedProductionWeek ?? ""}
          placeholder="e.g. 2026-W23"
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Planned Delivery Date</label>
        <DatePicker
          name="plannedDeliveryDate"
          defaultValue={formatDate(order.plannedDeliveryDate)}
          placeholder="mm / dd / yyyy"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Production Order #</label>
        <input
          type="text"
          name="productionOrderNo"
          defaultValue={order.productionOrderNo ?? ""}
          placeholder="e.g. PO-2026-001"
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}