"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function AssignVinChassisForm({ order }: { order: { id: string; vin: string | null; chassisNumber: string | null } }) {
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  const handleSave = async (formData: FormData) => {
    setLoading(true)
    try {
      const { assignVinChassis } = await import("../../actions")
      const result = await assignVinChassis(order.id, formData)
      if (result?.error) alert(result.error)
      setEditing(false)
      router.refresh()
    } catch {
      alert("Failed to assign VIN/chassis")
    } finally {
      setLoading(false)
    }
  }

  if (!editing) {
    return (
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">VIN</dt>
          <dd className="font-mono text-foreground">{order.vin ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Chassis Number</dt>
          <dd className="font-mono text-foreground">{order.chassisNumber ?? "—"}</dd>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Assign VIN / Chassis
        </button>
      </dl>
    )
  }

  return (
    <form action={handleSave} className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">VIN</label>
        <input
          type="text"
          name="vin"
          defaultValue={order.vin ?? ""}
          placeholder="Vehicle Identification Number"
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Chassis Number</label>
        <input
          type="text"
          name="chassisNumber"
          defaultValue={order.chassisNumber ?? ""}
          placeholder="Chassis number"
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
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