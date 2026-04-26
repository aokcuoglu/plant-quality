"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { createFieldDefect } from "@/app/(dashboard)/field/actions"
import { Button } from "@/components/ui/button"
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
    <div className="space-y-6 max-w-2xl">
      <Link href="/oem/field" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Field Quality
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">New Field Defect</h1>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form ref={formRef} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Brief description of the field defect"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-destructive">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={4}
            placeholder="Detailed description of the problem observed in the field..."
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="source" className="text-sm font-medium">Source</label>
            <select
              id="source"
              name="source"
              defaultValue="FIELD"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="severity" className="text-sm font-medium">Severity</label>
            <select
              id="severity"
              name="severity"
              defaultValue="MAJOR"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2"><input type="checkbox" name="safetyImpact" className="rounded" /><span className="text-sm">Safety Impact</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="vehicleDown" className="rounded" /><span className="text-sm">Vehicle Down</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="repeatIssue" className="rounded" /><span className="text-sm">Repeat Issue</span></label>
        </div>

        <div className="border-t pt-5">
          <h2 className="text-sm font-semibold mb-4">Vehicle Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="vin" className="text-sm font-medium">VIN</label>
              <input id="vin" name="vin" type="text" placeholder="17-character VIN" maxLength={17} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="space-y-2">
              <label htmlFor="vehicleModel" className="text-sm font-medium">Vehicle Model</label>
              <input id="vehicleModel" name="vehicleModel" type="text" placeholder="e.g., Model X 2024" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="space-y-2">
              <label htmlFor="vehicleVariant" className="text-sm font-medium">Vehicle Variant</label>
              <input id="vehicleVariant" name="vehicleVariant" type="text" placeholder="e.g., Sport Package" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="space-y-2">
              <label htmlFor="mileage" className="text-sm font-medium">Mileage (km)</label>
              <input id="mileage" name="mileage" type="number" placeholder="e.g., 15000" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="space-y-2">
              <label htmlFor="failureDate" className="text-sm font-medium">Failure Date</label>
              <input id="failureDate" name="failureDate" type="date" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium">Location / Service Center</label>
              <input id="location" name="location" type="text" placeholder="e.g., Istanbul Service Center" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
          </div>
        </div>

        <div className="border-t pt-5">
          <h2 className="text-sm font-semibold mb-4">Part & Supplier</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="partNumber" className="text-sm font-medium">Part Number</label>
              <input id="partNumber" name="partNumber" type="text" placeholder="e.g., AX-7420-B" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="space-y-2">
              <label htmlFor="partName" className="text-sm font-medium">Part Name</label>
              <input id="partName" name="partName" type="text" placeholder="e.g., Cylinder Head Casting" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label htmlFor="supplierId" className="text-sm font-medium">Supplier</label>
              <select
                id="supplierId"
                name="supplierId"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a supplier (optional)...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="button" disabled={isPending} onClick={() => handleSubmit("OPEN")}>
            {isPending ? "Creating..." : "Create"}
          </Button>
          <button
            type="button"
            onClick={() => handleSubmit("DRAFT")}
            disabled={isPending}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Save as Draft
          </button>
          <Link
            href="/oem/field"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}