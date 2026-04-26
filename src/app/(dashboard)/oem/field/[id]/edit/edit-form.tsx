"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { updateFieldDefect } from "@/app/(dashboard)/field/actions"
import type { FieldDefectSource, FieldDefectSeverity } from "@/generated/prisma/client"

type FieldDefectData = {
  id: string
  title: string
  description: string
  source: FieldDefectSource
  severity: FieldDefectSeverity
  safetyImpact: boolean
  vehicleDown: boolean
  repeatIssue: boolean
  vin: string | null
  vehicleModel: string | null
  vehicleVariant: string | null
  mileage: number | null
  failureDate: Date | null
  location: string | null
  partNumber: string | null
  partName: string | null
}

export function EditFieldDefectForm({
  fieldDefect,
  sourceOptions,
  severityOptions,
}: {
  fieldDefect: FieldDefectData
  sourceOptions: { value: string; label: string }[]
  severityOptions: { value: string; label: string }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function formatDate(d: Date | null): string {
    if (!d) return ""
    return d.toISOString().split("T")[0]
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await updateFieldDefect(fieldDefect.id, formData)
    if (result.success) {
      router.push(`/oem/field/${fieldDefect.id}`)
    } else {
      setError(result.error ?? "Failed to update")
    }
  }

  return (
    <form onSubmit={(e) => startTransition(() => handleSubmit(e))} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">Title</label>
        <input id="title" name="title" type="text" required defaultValue={fieldDefect.title} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">Description</label>
        <textarea id="description" name="description" required rows={4} defaultValue={fieldDefect.description} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="source" className="text-sm font-medium">Source</label>
          <select id="source" name="source" defaultValue={fieldDefect.source} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {sourceOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="severity" className="text-sm font-medium">Severity</label>
          <select id="severity" name="severity" defaultValue={fieldDefect.severity} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {severityOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2"><input type="checkbox" name="safetyImpact" defaultChecked={fieldDefect.safetyImpact} className="rounded" /><span className="text-sm">Safety Impact</span></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="vehicleDown" defaultChecked={fieldDefect.vehicleDown} className="rounded" /><span className="text-sm">Vehicle Down</span></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="repeatIssue" defaultChecked={fieldDefect.repeatIssue} className="rounded" /><span className="text-sm">Repeat Issue</span></label>
      </div>

      <div className="border-t pt-5">
        <h2 className="text-sm font-semibold mb-4">Vehicle Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label htmlFor="vin" className="text-sm font-medium">VIN</label><input id="vin" name="vin" type="text" defaultValue={fieldDefect.vin ?? ""} maxLength={17} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
          <div className="space-y-2"><label htmlFor="vehicleModel" className="text-sm font-medium">Vehicle Model</label><input id="vehicleModel" name="vehicleModel" type="text" defaultValue={fieldDefect.vehicleModel ?? ""} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
          <div className="space-y-2"><label htmlFor="vehicleVariant" className="text-sm font-medium">Vehicle Variant</label><input id="vehicleVariant" name="vehicleVariant" type="text" defaultValue={fieldDefect.vehicleVariant ?? ""} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
          <div className="space-y-2"><label htmlFor="mileage" className="text-sm font-medium">Mileage (km)</label><input id="mileage" name="mileage" type="number" defaultValue={fieldDefect.mileage ?? ""} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
          <div className="space-y-2"><label htmlFor="failureDate" className="text-sm font-medium">Failure Date</label><input id="failureDate" name="failureDate" type="date" defaultValue={formatDate(fieldDefect.failureDate)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
          <div className="space-y-2"><label htmlFor="location" className="text-sm font-medium">Location</label><input id="location" name="location" type="text" defaultValue={fieldDefect.location ?? ""} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
        </div>
      </div>

      <div className="border-t pt-5">
        <h2 className="text-sm font-semibold mb-4">Part & Supplier</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><label htmlFor="partNumber" className="text-sm font-medium">Part Number</label><input id="partNumber" name="partNumber" type="text" defaultValue={fieldDefect.partNumber ?? ""} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
          <div className="space-y-2"><label htmlFor="partName" className="text-sm font-medium">Part Name</label><input id="partName" name="partName" type="text" defaultValue={fieldDefect.partName ?? ""} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={isPending} className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-600 transition-colors disabled:opacity-50">
          {isPending ? "Saving..." : "Save Changes"}
        </button>
        <Link href={`/oem/field/${fieldDefect.id}`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}