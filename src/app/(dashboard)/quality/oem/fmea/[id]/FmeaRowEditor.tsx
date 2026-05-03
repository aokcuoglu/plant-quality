"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { saveFmeaRows } from "@/app/(dashboard)/quality/supplier/fmea/actions/fmea"
import { createEmptyRow, type FmeaRow } from "@/lib/fmea/types"
import { cn } from "@/lib/utils"

interface FmeaRowEditorProps {
  fmeaId: string
  initialRows: FmeaRow[]
  fmeaType: "DESIGN" | "PROCESS"
  canEdit: boolean
}

export function FmeaRowEditor({ fmeaId, initialRows, fmeaType, canEdit }: FmeaRowEditorProps) {
  const [rows, setRows] = useState<FmeaRow[]>(initialRows)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRow = (id: string, field: keyof FmeaRow, value: string | number) => {
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }
        if (["severity", "occurrence", "detection"].includes(field)) {
          const s = field === "severity" ? Number(value) : updated.severity
          const o = field === "occurrence" ? Number(value) : updated.occurrence
          const d = field === "detection" ? Number(value) : updated.detection
          updated.rpn = s * o * d
        }
        if (
          ["revisedSeverity", "revisedOccurrence", "revisedDetection"].includes(field) &&
          updated.revisedSeverity != null &&
          updated.revisedOccurrence != null &&
          updated.revisedDetection != null
        ) {
          updated.revisedRpn = updated.revisedSeverity * updated.revisedOccurrence * updated.revisedDetection
        }
        return updated
      }),
    )
  }

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow(fmeaType)])
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await saveFmeaRows(fmeaId, rows)
      if (!result.success) {
        setError(result.error ?? "Save failed")
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
        {canEdit && (
          <>
            <Button variant="outline" size="sm" onClick={addRow}>
              Add Row
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        )}
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
              {canEdit && <th className="px-2 py-2 w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(row => (
              <tr key={row.id} className={cn("hover:bg-muted/30", row.rpn >= 200 ? "bg-red-500/5" : row.rpn >= 100 ? "bg-amber-500/5" : "")}>
                {fmeaType === "PROCESS" && (
                  <td className="px-2 py-1.5">
                    {canEdit ? (
                      <Input className="h-7 text-xs" value={row.processStep ?? ""} onChange={e => updateRow(row.id, "processStep", e.target.value)} />
                    ) : (
                      <span className="text-foreground">{row.processStep ?? "—"}</span>
                    )}
                  </td>
                )}
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.failureMode} onChange={e => updateRow(row.id, "failureMode", e.target.value)} />
                  ) : (
                    <span className="text-foreground">{row.failureMode || "—"}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.failureEffect} onChange={e => updateRow(row.id, "failureEffect", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.failureEffect || "—"}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {canEdit ? (
                    <Input type="number" min={1} max={10} className="h-7 w-12 text-xs text-center" value={row.severity} onChange={e => updateRow(row.id, "severity", Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} />
                  ) : (
                    <span className="text-foreground">{row.severity}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.failureCause ?? ""} onChange={e => updateRow(row.id, "failureCause", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.failureCause || "—"}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {canEdit ? (
                    <Input type="number" min={1} max={10} className="h-7 w-12 text-xs text-center" value={row.occurrence} onChange={e => updateRow(row.id, "occurrence", Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} />
                  ) : (
                    <span className="text-foreground">{row.occurrence}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.preventionControl ?? ""} onChange={e => updateRow(row.id, "preventionControl", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.preventionControl || "—"}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.detectionControl ?? ""} onChange={e => updateRow(row.id, "detectionControl", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.detectionControl || "—"}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {canEdit ? (
                    <Input type="number" min={1} max={10} className="h-7 w-12 text-xs text-center" value={row.detection} onChange={e => updateRow(row.id, "detection", Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} />
                  ) : (
                    <span className="text-foreground">{row.detection}</span>
                  )}
                </td>
                <td className={cn("px-2 py-1.5 text-center font-bold", row.rpn >= 200 ? "text-red-400" : row.rpn >= 100 ? "text-amber-400" : "text-emerald-400")}>
                  {row.rpn}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.recommendedAction ?? ""} onChange={e => updateRow(row.id, "recommendedAction", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.recommendedAction || "—"}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <select
                      className="h-7 rounded border border-border bg-background px-1 text-xs text-foreground"
                      value={row.actionStatus}
                      onChange={e => updateRow(row.id, "actionStatus", e.target.value)}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  ) : (
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", row.actionStatus === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400" : row.actionStatus === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-400" : row.actionStatus === "CANCELLED" ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground")}>
                      {row.actionStatus?.replace("_", " ") ?? "OPEN"}
                    </span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-1 py-1.5">
                    <button onClick={() => removeRow(row.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      &times;
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={fmeaType === "PROCESS" ? 12 : 11} className="px-4 py-8 text-center text-sm text-muted-foreground">
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