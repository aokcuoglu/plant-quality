"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createIqcInspection } from "../actions/report"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { IQC_INSPECTION_TYPES } from "@/lib/iqc"

export function IqcCreateForm({
  suppliers,
}: {
  suppliers: { id: string; name: string; users: { id: string; name: string | null; email: string }[] }[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError(null)
    try {
      const result = await createIqcInspection(formData)
      if (result.success && result.inspectionId) {
        router.push(`/quality/oem/iqc/${result.inspectionId}`)
        router.refresh()
      } else {
        setError(result.error ?? "Failed to create IQC inspection")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplierId">
            Supplier <span className="text-red-400">*</span>
          </Label>
          <select
            id="supplierId"
            name="supplierId"
            required
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partNumber">
            Part Number <span className="text-red-400">*</span>
          </Label>
          <Input id="partNumber" name="partNumber" required placeholder="e.g. AX-7420-B" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partName">Part Name</Label>
          <Input id="partName" name="partName" placeholder="e.g. Cylinder Head Casting" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inspectionType">Inspection Type</Label>
          <select
            id="inspectionType"
            name="inspectionType"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {IQC_INSPECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantityReceived">
            Quantity Received <span className="text-red-400">*</span>
          </Label>
          <Input id="quantityReceived" name="quantityReceived" type="number" min="1" required placeholder="e.g. 100" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inspectionQuantity">Inspection Quantity</Label>
          <Input id="inspectionQuantity" name="inspectionQuantity" type="number" min="0" placeholder="e.g. 10" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lotNumber">Lot Number</Label>
          <Input id="lotNumber" name="lotNumber" placeholder="e.g. LOT-2026-0042" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="batchNumber">Batch Number</Label>
          <Input id="batchNumber" name="batchNumber" placeholder="e.g. BATCH-A123" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchaseOrder">Purchase Order</Label>
          <Input id="purchaseOrder" name="purchaseOrder" placeholder="e.g. PO-12345" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="deliveryNote">Delivery Note</Label>
          <Input id="deliveryNote" name="deliveryNote" placeholder="e.g. DN-67890" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleModel">Vehicle Model</Label>
          <Input id="vehicleModel" name="vehicleModel" placeholder="e.g. Model S 2025" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectName">Project Name</Label>
          <Input id="projectName" name="projectName" placeholder="e.g. NextGen Platform" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inspectionDate">Inspection Date</Label>
          <Input id="inspectionDate" name="inspectionDate" type="date" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="samplingPlan">Sampling Plan</Label>
          <Input id="samplingPlan" name="samplingPlan" placeholder="e.g. AQL 1.0 Level II" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Additional notes or observations..." />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create IQC Inspection"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/quality/oem/iqc")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}