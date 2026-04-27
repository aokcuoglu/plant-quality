"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { updateFieldDefect } from "@/app/(dashboard)/field/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
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
  category: string | null
  subcategory: string | null
  probableArea: string | null
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
      router.push(`/quality/oem/field/${fieldDefect.id}`)
    } else {
      setError(result.error ?? "Failed to update")
    }
  }

  return (
    <form onSubmit={(e) => startTransition(() => handleSubmit(e))} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" type="text" required defaultValue={fieldDefect.title} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" required rows={4} defaultValue={fieldDefect.description} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              name="source"
              defaultValue={fieldDefect.source}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {sourceOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="severity">Severity</Label>
            <select
              id="severity"
              name="severity"
              defaultValue={fieldDefect.severity}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {severityOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
        </div>

        <div className="flex gap-6 pt-1">
          <label className="flex items-center gap-2">
            <Checkbox name="safetyImpact" defaultChecked={fieldDefect.safetyImpact} />
            <span className="text-sm">Safety Impact</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox name="vehicleDown" defaultChecked={fieldDefect.vehicleDown} />
            <span className="text-sm">Vehicle Down</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox name="repeatIssue" defaultChecked={fieldDefect.repeatIssue} />
            <span className="text-sm">Repeat Issue</span>
          </label>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Vehicle Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vin">VIN</Label>
            <Input id="vin" name="vin" type="text" defaultValue={fieldDefect.vin ?? ""} maxLength={17} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicleModel">Vehicle Model</Label>
            <Input id="vehicleModel" name="vehicleModel" type="text" defaultValue={fieldDefect.vehicleModel ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicleVariant">Vehicle Variant</Label>
            <Input id="vehicleVariant" name="vehicleVariant" type="text" defaultValue={fieldDefect.vehicleVariant ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mileage">Mileage (km)</Label>
            <Input id="mileage" name="mileage" type="number" defaultValue={fieldDefect.mileage ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="failureDate">Failure Date</Label>
            <Input id="failureDate" name="failureDate" type="date" defaultValue={formatDate(fieldDefect.failureDate)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" type="text" defaultValue={fieldDefect.location ?? ""} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Part &amp; Supplier</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="partNumber">Part Number</Label>
            <Input id="partNumber" name="partNumber" type="text" defaultValue={fieldDefect.partNumber ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="partName">Part Name</Label>
            <Input id="partName" name="partName" type="text" defaultValue={fieldDefect.partName ?? ""} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Classification</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" type="text" defaultValue={fieldDefect.category ?? ""} maxLength={100} placeholder="e.g., Electrical" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subcategory">Subcategory</Label>
            <Input id="subcategory" name="subcategory" type="text" defaultValue={fieldDefect.subcategory ?? ""} maxLength={100} placeholder="e.g., Wiring Harness" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="probableArea">Probable Area</Label>
            <Input id="probableArea" name="probableArea" type="text" defaultValue={fieldDefect.probableArea ?? ""} maxLength={100} placeholder="e.g., Front Left Door" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Leave fields empty to clear. Max 100 characters each.</p>
      </div>

      <Separator />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
        <Link href={`/quality/oem/field/${fieldDefect.id}`}>
          <Button type="button" variant="outline">Cancel</Button>
        </Link>
      </div>
    </form>
  )
}