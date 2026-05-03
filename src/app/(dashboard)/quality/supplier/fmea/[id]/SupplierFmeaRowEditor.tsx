"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SodSelect, SodSelectNullable } from "@/components/fmea/SodSelect"
import { ActionStatusSelect } from "@/components/fmea/ActionStatusSelect"
import { saveFmeaRows } from "@/app/(dashboard)/quality/supplier/fmea/actions/fmea"
import { createEmptyRow, type FmeaRow } from "@/lib/fmea/types"
import { cn } from "@/lib/utils"

interface SupplierFmeaRowEditorProps {
  fmeaId: string
  initialRows: FmeaRow[]
  fmeaType: "DESIGN" | "PROCESS"
}

function clampSod(value: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 5
  return Math.min(10, Math.max(1, Math.round(n)))
}

export function SupplierFmeaRowEditor({ fmeaId, initialRows, fmeaType }: SupplierFmeaRowEditorProps) {
  const router = useRouter()
  const [rows, setRows] = useState<FmeaRow[]>(initialRows)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRow = (id: string, field: keyof FmeaRow, value: string | number) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }
        if (["severity", "occurrence", "detection"].includes(field)) {
          const s = field === "severity" ? clampSod(Number(value)) : updated.severity
          const o = field === "occurrence" ? clampSod(Number(value)) : updated.occurrence
          const d = field === "detection" ? clampSod(Number(value)) : updated.detection
          updated.rpn = s * o * d
        }
        if (["revisedSeverity", "revisedOccurrence", "revisedDetection"].includes(field)) {
          const rs = field === "revisedSeverity" ? (value === "" ? undefined : clampSod(Number(value))) : updated.revisedSeverity
          const ro = field === "revisedOccurrence" ? (value === "" ? undefined : clampSod(Number(value))) : updated.revisedOccurrence
          const rd = field === "revisedDetection" ? (value === "" ? undefined : clampSod(Number(value))) : updated.revisedDetection
          updated.revisedSeverity = rs
          updated.revisedOccurrence = ro
          updated.revisedDetection = rd
          if (rs != null && ro != null && rd != null) {
            updated.revisedRpn = rs * ro * rd
          } else {
            updated.revisedRpn = undefined
          }
        }
        return updated
      }),
    )
  }

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow(fmeaType)])
  }

  const handleRemoveRow = async (id: string) => {
    const updatedRows = rows.filter(r => r.id !== id)
    setRows(updatedRows)
    setSaving(true)
    setError(null)
    try {
      const result = await saveFmeaRows(fmeaId, updatedRows)
      if (!result.success) {
        setError(result.error ?? "Failed to remove row")
        setRows(rows)
      } else {
        router.refresh()
      }
    } catch {
      setError("Failed to remove row")
      setRows(rows)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await saveFmeaRows(fmeaId, rows)
      if (!result.success) {
        setError(result.error ?? "Save failed")
      } else {
        router.refresh()
      }
    } catch {
      setError("Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={addRow}>
          Add Row
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {fmeaType === "PROCESS" && <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Process Step</th>}
              <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Failure Mode</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Effect</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Sev</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Cause</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Occ</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Prevention Ctrl</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Detection Ctrl</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Det</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-14">RPN</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Action</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-20">Status</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">R-Sev</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">R-Occ</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">R-Det</th>
              <th className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-14">R-RPN</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Supplier Comment</th>
              <th className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">OEM Comment</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(row => (
              <tr key={row.id} className={cn("hover:bg-muted/30", Number.isFinite(row.rpn) && row.rpn >= 200 ? "bg-red-500/5" : Number.isFinite(row.rpn) && row.rpn >= 100 ? "bg-amber-500/5" : "")}>
                {fmeaType === "PROCESS" && (
                  <td className="px-2 py-1.5">
                    <Input className="h-7 text-xs" value={row.processStep ?? ""} onChange={e => updateRow(row.id, "processStep", e.target.value)} />
                  </td>
                )}
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs" value={row.failureMode} onChange={e => updateRow(row.id, "failureMode", e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs" value={row.failureEffect} onChange={e => updateRow(row.id, "failureEffect", e.target.value)} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <SodSelect value={row.severity} onChange={v => updateRow(row.id, "severity", v)} label="Severity" />
                </td>
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs" value={row.failureCause ?? ""} onChange={e => updateRow(row.id, "failureCause", e.target.value)} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <SodSelect value={row.occurrence} onChange={v => updateRow(row.id, "occurrence", v)} label="Occurrence" />
                </td>
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs" value={row.preventionControl ?? ""} onChange={e => updateRow(row.id, "preventionControl", e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs" value={row.detectionControl ?? ""} onChange={e => updateRow(row.id, "detectionControl", e.target.value)} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <SodSelect value={row.detection} onChange={v => updateRow(row.id, "detection", v)} label="Detection" />
                </td>
                <td className={cn("px-2 py-1.5 text-center font-bold", Number.isFinite(row.rpn) && row.rpn >= 200 ? "text-red-400" : Number.isFinite(row.rpn) && row.rpn >= 100 ? "text-amber-400" : "text-emerald-400")}>
                  {Number.isFinite(row.rpn) ? row.rpn : "—"}
                </td>
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs" value={row.recommendedAction ?? ""} onChange={e => updateRow(row.id, "recommendedAction", e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <ActionStatusSelect value={row.actionStatus} onChange={v => updateRow(row.id, "actionStatus", v)} />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <SodSelectNullable value={row.revisedSeverity} onChange={v => updateRow(row.id, "revisedSeverity", v ?? "")} label="Revised Severity" />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <SodSelectNullable value={row.revisedOccurrence} onChange={v => updateRow(row.id, "revisedOccurrence", v ?? "")} label="Revised Occurrence" />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <SodSelectNullable value={row.revisedDetection} onChange={v => updateRow(row.id, "revisedDetection", v ?? "")} label="Revised Detection" />
                </td>
                <td className={cn("px-2 py-1.5 text-center font-bold", (row.revisedRpn ?? 0) >= 200 ? "text-red-400" : (row.revisedRpn ?? 0) >= 100 ? "text-amber-400" : row.revisedRpn != null ? "text-emerald-400" : "")}>
                  {row.revisedRpn ?? "—"}
                </td>
                <td className="px-2 py-1.5">
                  <Input className="h-7 text-xs" value={row.supplierComment ?? ""} onChange={e => updateRow(row.id, "supplierComment", e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <span className="text-muted-foreground">{row.oemComment || "—"}</span>
                </td>
                <td className="px-1 py-1.5">
                  <button onClick={() => handleRemoveRow(row.id)} disabled={saving} className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                    &times;
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={fmeaType === "PROCESS" ? 19 : 18} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No failure modes added yet. Click &quot;Add Row&quot; to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}