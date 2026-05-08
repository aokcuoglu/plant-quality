"use client"

import { updateDevPlanStatus } from "@/app/(dashboard)/quality/oem/supplier-development/actions/plan"
import type { DevPlanStatus } from "@/lib/supplier-development/client"

export function DevPlanActions({ planId, status }: { planId: string; status: DevPlanStatus }) {
  const handleStatusChange = async (newStatus: DevPlanStatus) => {
    const formData = new FormData()
    formData.set("planId", planId)
    formData.set("status", newStatus)
    await updateDevPlanStatus(formData)
    window.location.reload()
  }

  const buttons: Array<{ label: string; status: DevPlanStatus; variant: "default" | "outline" | "destructive" }> = []

  if (status === "DRAFT") {
    buttons.push({ label: "Open Plan", status: "OPEN", variant: "default" })
  }
  if (status === "DRAFT" || status === "OPEN") {
    buttons.push({ label: "Send to Supplier", status: "SUPPLIER_ACTION_REQUIRED", variant: "outline" })
    buttons.push({ label: "Cancel Plan", status: "CANCELLED", variant: "destructive" })
  }
  if (status === "SUPPLIER_ACTION_REQUIRED") {
    buttons.push({ label: "Move to Review", status: "OEM_REVIEW", variant: "default" })
    buttons.push({ label: "Request Revision", status: "REVISION_REQUIRED", variant: "outline" })
    buttons.push({ label: "Cancel Plan", status: "CANCELLED", variant: "destructive" })
  }
  if (status === "OEM_REVIEW") {
    buttons.push({ label: "Complete Plan", status: "COMPLETED", variant: "default" })
    buttons.push({ label: "Request Revision", status: "REVISION_REQUIRED", variant: "outline" })
    buttons.push({ label: "Cancel Plan", status: "CANCELLED", variant: "destructive" })
  }
  if (status === "REVISION_REQUIRED") {
    buttons.push({ label: "Send to Supplier", status: "SUPPLIER_ACTION_REQUIRED", variant: "default" })
    buttons.push({ label: "Cancel Plan", status: "CANCELLED", variant: "destructive" })
  }

  if (buttons.length === 0) return null

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3">Actions</h2>
      <div className="space-y-2">
        {buttons.map((btn) => (
          <button
            key={btn.status}
            onClick={() => handleStatusChange(btn.status)}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              btn.variant === "default"
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : btn.variant === "destructive"
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}