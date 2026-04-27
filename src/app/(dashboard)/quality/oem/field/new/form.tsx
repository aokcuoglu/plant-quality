"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { createFieldDefect } from "@/app/(dashboard)/field/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import type { FieldDefectSource, FieldDefectSeverity } from "@/generated/prisma/client"

const sourceOptions: { value: FieldDefectSource; label: string }[] = [
  { value: "FIELD", label: "Field" },
  { value: "SERVICE", label: "Service" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "DEALER", label: "Dealer" },
  { value: "INTERNAL", label: "Internal" },
]

const severityOptions: { value: FieldDefectSeverity; label: string }[] = [
  { value: "MINOR", label: "Minor" },
  { value: "MAJOR", label: "Major" },
  { value: "CRITICAL", label: "Critical" },
]

export function NewFieldDefectForm({
  suppliers,
}: {
  suppliers: { id: string; name: string; users: { id: string; name: string | null; email: string }[] }[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [supplierId, setSupplierId] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(status: "DRAFT" | "OPEN") {
    const formData = new FormData(formRef.current!)
    formData.set("_status", status)
    setError(null)
    startTransition(async () => {
      const result = await createFieldDefect(formData)
      if (result && !result.success) {
        setError(result.error ?? "Failed to create field defect")
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/quality/oem/field" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        &larr; Field Quality
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">New Field Defect</h1>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form ref={formRef} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input id="title" name="title" type="text" required placeholder="Brief description of the field defect" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
            <Textarea id="description" name="description" required rows={4} placeholder="Detailed description of the problem observed in the field..." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <select
                id="source"
                name="source"
                defaultValue="FIELD"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="severity">Severity</Label>
              <select
                id="severity"
                name="severity"
                defaultValue="MAJOR"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {severityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2">
              <Checkbox name="safetyImpact" />
              <span className="text-sm">Safety Impact</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox name="vehicleDown" />
              <span className="text-sm">Vehicle Down</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox name="repeatIssue" />
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
              <Input id="vin" name="vin" type="text" placeholder="17-character VIN" maxLength={17} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicleModel">Vehicle Model</Label>
              <Input id="vehicleModel" name="vehicleModel" type="text" placeholder="e.g., Model X 2024" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicleVariant">Vehicle Variant</Label>
              <Input id="vehicleVariant" name="vehicleVariant" type="text" placeholder="e.g., Sport Package" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mileage">Mileage (km)</Label>
              <Input id="mileage" name="mileage" type="number" placeholder="e.g., 15000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="failureDate">Failure Date</Label>
              <Input id="failureDate" name="failureDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location / Service Center</Label>
              <Input id="location" name="location" type="text" placeholder="e.g., Istanbul Service Center" />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Part &amp; Supplier</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input id="partNumber" name="partNumber" type="text" placeholder="e.g., AX-7420-B" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partName">Part Name</Label>
              <Input id="partName" name="partName" type="text" placeholder="e.g., Cylinder Head Casting" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="supplierId">Supplier</Label>
              <select
                id="supplierId"
                name="supplierId"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="">Select a supplier (optional)...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <Button type="button" disabled={isPending} onClick={() => handleSubmit("OPEN")}>
            {isPending ? "Creating..." : "Create"}
          </Button>
          <Button type="button" variant="outline" onClick={() => handleSubmit("DRAFT")} disabled={isPending}>
            Save as Draft
          </Button>
          <Link href="/quality/oem/field">
            <Button type="button" variant="ghost">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}