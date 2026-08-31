"use client"

import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createPpapRequest } from "../actions/review"
import { Button } from "@/components/ui/button"
import { PPAP_LEVELS, PPAP_REASONS, PPAP_REQUIREMENTS, getDefaultRequirements } from "@/lib/ppap"
import { DynamicCustomFields } from "@/components/custom-fields/DynamicCustomFields"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import type { CustomFieldsData } from "@/lib/custom-fields/types"
import type { PpapLevel } from "@plantx/db/client"
import { DatePicker } from "@/components/ui/date-picker"

export function PpapCreateForm({
  suppliers,
  fieldConfig,
}: {
  suppliers: { id: string; name: string; users: { id: string; name: string | null; email: string }[] }[]
  fieldConfig: ResolvedFields
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [level, setLevel] = useState<PpapLevel>("LEVEL_3")
  const [requirements, setRequirements] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.entries(getDefaultRequirements("LEVEL_3")))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customFields, setCustomFields] = useState<CustomFieldsData>({})

  function handleLevelChange(newLevel: PpapLevel) {
    setLevel(newLevel)
    setRequirements(Object.fromEntries(Object.entries(getDefaultRequirements(newLevel))))
  }

  function toggleRequirement(key: string) {
    setRequirements((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    setError(null)
    formData.set("level", level)
    formData.set("requirements", JSON.stringify(requirements))
    formData.set("customFields", JSON.stringify(customFields))
    try {
      const result = await createPpapRequest(formData)
      if (result.success && result.ppapId) {
        router.push(`/quality/oem/ppap/${result.ppapId}`)
        router.refresh()
      } else {
        setError(result.error ?? "Failed to create PPAP request")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplierId" className="text-sm font-medium text-foreground">
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
          <Label htmlFor="partNumber" className="text-sm font-medium text-foreground">
            Part Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="partNumber"
            name="partNumber"
            type="text"
            required
            placeholder="e.g. AX-7420-B"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="partName" className="text-sm font-medium text-foreground">
            Part Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="partName"
            name="partName"
            type="text"
            required
            placeholder="e.g. Cylinder Head Casting"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="revision" className="text-sm font-medium text-foreground">
            Revision
          </Label>
          <Input
            id="revision"
            name="revision"
            type="text"
            defaultValue="A"
            maxLength={3}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectName" className="text-sm font-medium text-foreground">
            Project Name
          </Label>
          <Input
            id="projectName"
            name="projectName"
            type="text"
            placeholder="e.g. Model S 2026"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vehicleModel" className="text-sm font-medium text-foreground">
            Vehicle Model
          </Label>
          <Input
            id="vehicleModel"
            name="vehicleModel"
            type="text"
            placeholder="e.g. Model S 2025"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="revisionLevel" className="text-sm font-medium text-foreground">
            Revision Level
          </Label>
          <Input
            id="revisionLevel"
            name="revisionLevel"
            type="text"
            placeholder="e.g. Rev C"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="drawingNumber" className="text-sm font-medium text-foreground">
            Drawing Number
          </Label>
          <Input
            id="drawingNumber"
            name="drawingNumber"
            type="text"
            placeholder="e.g. DWG-7420-001"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="level" className="text-sm font-medium text-foreground">
            PPAP Level <span className="text-destructive">*</span>
          </Label>
          <NativeSelect
            id="level"
            name="level"
            value={level}
            onChange={(e) => handleLevelChange(e.target.value as PpapLevel)} className="w-full"
          >
            {PPAP_LEVELS.map((l) => (
              <NativeSelectOption key={l.value} value={l.value}>{l.label} — {l.description}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reasonForSubmission" className="text-sm font-medium text-foreground">
            Reason for Submission
          </Label>
          <NativeSelect
            id="reasonForSubmission"
            name="reasonForSubmission" className="w-full"
          >
            {PPAP_REASONS.map((r) => (
              <NativeSelectOption key={r.value} value={r.value}>{r.label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="dueDate" className="text-sm font-medium text-foreground">
            Due Date
          </Label>
          <DatePicker name="dueDate" placeholder="mm / dd / yyyy" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notes
          </Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Additional notes or instructions for the supplier..."
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Required Documents</h3>
        <p className="text-xs text-muted-foreground">
          Select the documents required for this PPAP submission. Defaults are based on the selected PPAP level.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PPAP_REQUIREMENTS.map((r) => (
            <Label key={r.key} className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={requirements[r.key] ?? false}
                onCheckedChange={() => toggleRequirement(r.key)}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <span className="text-sm text-foreground">{r.label}</span>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
            </Label>
          ))}
        </div>
      </div>

      {fieldConfig.custom.length > 0 && (
        <DynamicCustomFields
          entity="PPAP_SUBMISSION"
          fields={fieldConfig.all}
          values={customFields}
          onChange={(fieldName, value) => setCustomFields((prev) => ({ ...prev, [fieldName]: value }))}
          mode="create"
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create PPAP Request"}
        </Button>
        <Button
          type="button"
          onClick={() => router.push("/quality/oem/ppap")}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
