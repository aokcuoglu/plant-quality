"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createFmea } from "../actions/fmea"

interface Supplier {
  id: string
  name: string
}

export function FmeaCreateForm({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fmeaType, setFmeaType] = useState<"PROCESS" | "DESIGN">("PROCESS")
  const [supplierId, setSupplierId] = useState("")
  const [title, setTitle] = useState("")
  const [partNumber, setPartNumber] = useState("")
  const [partName, setPartName] = useState("")
  const [processName, setProcessName] = useState("")
  const [projectName, setProjectName] = useState("")
  const [vehicleModel, setVehicleModel] = useState("")
  const [revision, setRevision] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const formData = new FormData()
    formData.set("fmeaType", fmeaType)
    formData.set("supplierId", supplierId)
    formData.set("title", title)
    formData.set("partNumber", partNumber)
    formData.set("partName", partName)
    formData.set("processName", processName)
    formData.set("projectName", projectName)
    formData.set("vehicleModel", vehicleModel)
    formData.set("revision", revision)
    formData.set("dueDate", dueDate)
    formData.set("notes", notes)

    try {
      const result = await createFmea(formData)
      if (result.success && result.id) {
        router.push(`/quality/oem/fmea/${result.id}`)
      } else {
        setError(result.error ?? "Failed to create FMEA")
      }
    } catch {
      setError("Failed to create FMEA")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">FMEA Details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">FMEA Type *</label>
            <select
              value={fmeaType}
              onChange={e => setFmeaType(e.target.value as "PROCESS" | "DESIGN")}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="PROCESS">PFMEA (Process)</option>
              <option value="DESIGN">DFMEA (Design)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Supplier</label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">No supplier (OEM only)</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Leave blank for OEM-only FMEA</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Cylinder Head Casting Process FMEA" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Part Number *</label>
            <Input value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="e.g. AX-7420-B" required />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Part Name</label>
            <Input value={partName} onChange={e => setPartName(e.target.value)} placeholder="e.g. Cylinder Head Casting" />
          </div>

          {fmeaType === "PROCESS" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Process Name</label>
              <Input value={processName} onChange={e => setProcessName(e.target.value)} placeholder="e.g. Gravity Die Casting" />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project Name</label>
            <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Engine Block Platform" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Vehicle Model</label>
            <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="e.g. Model S 2026" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Revision</label>
            <Input value={revision} onChange={e => setRevision(e.target.value)} placeholder="e.g. A" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Due Date</label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes or context for this FMEA" rows={3} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving || !title || !partNumber}>
          {saving ? "Creating..." : "Create FMEA"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}