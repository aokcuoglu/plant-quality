"use client"

import { Label } from "@/components/ui/label"

import { Input } from "@/components/ui/input"

import { Button } from "@/components/ui/button"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppAlertDialog } from "@/components/ui/app-alert-dialog"
import { useTranslations } from "@/i18n/context"

export function AssignVinChassisForm({ order }: { order: { id: string; vin: string | null; chassisNumber: string | null } }) {
  const t = useTranslations()
  const { showAlert } = useAppAlertDialog()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  const handleSave = async (formData: FormData) => {
    setLoading(true)
    try {
      const { assignVinChassis } = await import("../../actions")
      const result = await assignVinChassis(order.id, formData)
      if (result?.error) {
        showAlert(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    } catch {
      showAlert(t("logistic.actionErrors.assignVinChassis"))
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
        <Button
          variant="outline"
          onClick={() => setEditing(true)}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Assign VIN / Chassis
        </Button>
      </dl>
    )
  }

  return (
    <form action={handleSave} className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">VIN</Label>
        <Input
          type="text"
          name="vin"
          defaultValue={order.vin ?? ""}
          placeholder="Vehicle Identification Number"
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Chassis Number</Label>
        <Input
          type="text"
          name="chassisNumber"
          defaultValue={order.chassisNumber ?? ""}
          placeholder="Chassis number"
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-foreground/90 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
