"use client"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createIqcInspection } from "../actions/report"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { IQC_INSPECTION_TYPES } from "@/lib/iqc"
import { DynamicCustomFields } from "@/components/custom-fields/DynamicCustomFields"
import { DatePicker } from "@/components/ui/date-picker"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import type { CustomFieldsData } from "@/lib/custom-fields/types"

export function IqcCreateForm({
  suppliers,
  fieldConfig,
}: {
  suppliers: { id: string; name: string; users: { id: string; name: string | null; email: string }[] }[]
  fieldConfig: ResolvedFields
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customFields, setCustomFields] = useState<CustomFieldsData>({})

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError(null)
    formData.set("customFields", JSON.stringify(customFields))
    try {
      const result = await createIqcInspection(formData)
      if (result.success && result.inspectionId) {
        router.push(`/quality/oem/iqc/${result.inspectionId}`)
        router.refresh()
      } else {
        setError(result.error ?? "Failed to create IQC inspection")
        setSaving(false)
      }
    } catch {
      setError("An unexpected error occurred")
      setSaving(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplierId">
            Supplier <span className="text-destructive">*</span>
          </Label>
          <NativeSelect
            id="supplierId"
            name="supplierId"
            required className="w-full"
          >
            <NativeSelectOption value="">Select a supplier...</NativeSelectOption>
            {suppliers.map((s) => (
              <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partNumber">
            Part Number <span className="text-destructive">*</span>
          </Label>
          <Input id="partNumber" name="partNumber" required placeholder="e.g. AX-7420-B" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partName">Part Name</Label>
          <Input id="partName" name="partName" placeholder="e.g. Cylinder Head Casting" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inspectionType">Inspection Type</Label>
          <NativeSelect
            id="inspectionType"
            name="inspectionType" className="w-full"
          >
            {IQC_INSPECTION_TYPES.map((t) => (
              <NativeSelectOption key={t.value} value={t.value}>{t.label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantityReceived">
            Quantity Received <span className="text-destructive">*</span>
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
          <DatePicker id="inspectionDate" name="inspectionDate" placeholder="mm / dd / yyyy" />
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

      {fieldConfig.custom.length > 0 && (
        <DynamicCustomFields
          entity="IQC_REPORT"
          fields={fieldConfig.all}
          values={customFields}
          onChange={(fieldName, value) => setCustomFields((prev) => ({ ...prev, [fieldName]: value }))}
          mode="create"
        />
      )}

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