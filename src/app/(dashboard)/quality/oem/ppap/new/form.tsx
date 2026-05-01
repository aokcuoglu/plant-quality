"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createPpapRequest } from "../actions/review"
import { Button } from "@/components/ui/button"
import { PPAP_LEVELS, PPAP_REASONS, PPAP_REQUIREMENTS, getDefaultRequirements } from "@/lib/ppap"
import type { PpapLevel } from "@/generated/prisma/client"

export function PpapCreateForm({
  suppliers,
}: {
  suppliers: { id: string; name: string; users: { id: string; name: string | null; email: string }[] }[]
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [level, setLevel] = useState<PpapLevel>("LEVEL_3")
  const [requirements, setRequirements] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.entries(getDefaultRequirements("LEVEL_3")))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="supplierId" className="text-sm font-medium text-foreground">
            Supplier <span className="text-red-400">*</span>
          </label>
          <select
            id="supplierId"
            name="supplierId"
            required
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select a supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="partNumber" className="text-sm font-medium text-foreground">
            Part Number <span className="text-red-400">*</span>
          </label>
          <input
            id="partNumber"
            name="partNumber"
            type="text"
            required
            placeholder="e.g. AX-7420-B"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="partName" className="text-sm font-medium text-foreground">
            Part Name <span className="text-red-400">*</span>
          </label>
          <input
            id="partName"
            name="partName"
            type="text"
            required
            placeholder="e.g. Cylinder Head Casting"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="revision" className="text-sm font-medium text-foreground">
            Revision
          </label>
          <input
            id="revision"
            name="revision"
            type="text"
            defaultValue="A"
            maxLength={3}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="projectName" className="text-sm font-medium text-foreground">
            Project Name
          </label>
          <input
            id="projectName"
            name="projectName"
            type="text"
            placeholder="e.g. Model S 2026"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="vehicleModel" className="text-sm font-medium text-foreground">
            Vehicle Model
          </label>
          <input
            id="vehicleModel"
            name="vehicleModel"
            type="text"
            placeholder="e.g. Model S 2025"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="revisionLevel" className="text-sm font-medium text-foreground">
            Revision Level
          </label>
          <input
            id="revisionLevel"
            name="revisionLevel"
            type="text"
            placeholder="e.g. Rev C"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="drawingNumber" className="text-sm font-medium text-foreground">
            Drawing Number
          </label>
          <input
            id="drawingNumber"
            name="drawingNumber"
            type="text"
            placeholder="e.g. DWG-7420-001"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="level" className="text-sm font-medium text-foreground">
            PPAP Level <span className="text-red-400">*</span>
          </label>
          <select
            id="level"
            name="level"
            value={level}
            onChange={(e) => handleLevelChange(e.target.value as PpapLevel)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {PPAP_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label} — {l.description}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="reasonForSubmission" className="text-sm font-medium text-foreground">
            Reason for Submission
          </label>
          <select
            id="reasonForSubmission"
            name="reasonForSubmission"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {PPAP_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="dueDate" className="text-sm font-medium text-foreground">
            Due Date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
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
            <label key={r.key} className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={requirements[r.key] ?? false}
                onChange={() => toggleRequirement(r.key)}
                className="mt-0.5 rounded border-border"
              />
              <div className="min-w-0">
                <span className="text-sm text-foreground">{r.label}</span>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create PPAP Request"}
        </Button>
        <button
          type="button"
          onClick={() => router.push("/quality/oem/ppap")}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}