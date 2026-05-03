"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [supplierId, setSupplierId] = useState("_none_")
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
    formData.set("supplierId", supplierId === "_none_" ? "" : supplierId)
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
            <Label>FMEA Type *</Label>
            <Select value={fmeaType} onValueChange={(v) => setFmeaType((v ?? "PROCESS") as "PROCESS" | "DESIGN")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROCESS">PFMEA (Process)</SelectItem>
                <SelectItem value="DESIGN">DFMEA (Design)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={(v) => setSupplierId(v ?? "_none_")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No supplier (OEM only)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">No supplier (OEM only)</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Leave blank for OEM-only FMEA</p>
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Cylinder Head Casting Process FMEA" required />
          </div>

          <div className="space-y-2">
            <Label>Part Number *</Label>
            <Input value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="e.g. AX-7420-B" required />
          </div>

          <div className="space-y-2">
            <Label>Part Name</Label>
            <Input value={partName} onChange={e => setPartName(e.target.value)} placeholder="e.g. Cylinder Head Casting" />
          </div>

          {fmeaType === "PROCESS" && (
            <div className="space-y-2">
              <Label>Process Name</Label>
              <Input value={processName} onChange={e => setProcessName(e.target.value)} placeholder="e.g. Gravity Die Casting" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Engine Block Platform" />
          </div>

          <div className="space-y-2">
            <Label>Vehicle Model</Label>
            <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="e.g. Model S 2026" />
          </div>

          <div className="space-y-2">
            <Label>Revision</Label>
            <Input value={revision} onChange={e => setRevision(e.target.value)} placeholder="e.g. A" />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
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