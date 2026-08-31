"use client"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SodSelect } from "@/components/fmea/SodSelect"
import { ActionStatusSelect } from "@/components/fmea/ActionStatusSelect"
import { saveFmeaRows } from "@/app/(dashboard)/quality/oem/fmea/actions/fmea"
import { createEmptyRow, type FmeaRow } from "@/lib/fmea/types"
import { cn } from "@/lib/utils"

interface FmeaRowEditorProps {
  fmeaId: string
  initialRows: FmeaRow[]
  fmeaType: "DESIGN" | "PROCESS"
  canEdit: boolean
}

function clampSod(value: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 5
  return Math.min(10, Math.max(1, Math.round(n)))
}

export function FmeaRowEditor({ fmeaId, initialRows, fmeaType, canEdit }: FmeaRowEditorProps) {
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table className="w-full text-xs">
          <TableHeader>
            <TableRow className="border-b border-border bg-muted/50">
              {fmeaType === "PROCESS" && <TableHead className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Process Step</TableHead>}
              <TableHead className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Failure Mode</TableHead>
              <TableHead className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Effect</TableHead>
              <TableHead className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Sev</TableHead>
              <TableHead className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Cause</TableHead>
              <TableHead className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Occ</TableHead>
              <TableHead className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Prevention Ctrl</TableHead>
              <TableHead className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]">Detection Ctrl</TableHead>
              <TableHead className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-12">Det</TableHead>
              <TableHead className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-14">RPN</TableHead>
              <TableHead className="px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Action</TableHead>
              <TableHead className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-20">Status</TableHead>
              {canEdit && <TableHead className="px-2 py-2 w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {rows.map(row => (
              <TableRow key={row.id} className={cn("hover:bg-muted/30", Number.isFinite(row.rpn) && row.rpn >= 200 ? "bg-destructive/5" : Number.isFinite(row.rpn) && row.rpn >= 100 ? "bg-destructive/5" : "")}>
                {fmeaType === "PROCESS" && (
                  <TableCell className="px-2 py-1.5">
                    {canEdit ? (
                      <Input className="h-7 text-xs" value={row.processStep ?? ""} onChange={e => updateRow(row.id, "processStep", e.target.value)} />
                    ) : (
                      <span className="text-foreground">{row.processStep ?? "—"}</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.failureMode} onChange={e => updateRow(row.id, "failureMode", e.target.value)} />
                  ) : (
                    <span className="text-foreground">{row.failureMode || "—"}</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.failureEffect} onChange={e => updateRow(row.id, "failureEffect", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.failureEffect || "—"}</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1.5 text-center">
                    {canEdit ? (
                      <SodSelect value={row.severity} onChange={v => updateRow(row.id, "severity", v)} label="Severity" />
                    ) : (
                      <span className="text-foreground">{row.severity}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {canEdit ? (
                      <Input className="h-7 text-xs" value={row.failureCause ?? ""} onChange={e => updateRow(row.id, "failureCause", e.target.value)} />
                    ) : (
                      <span className="text-muted-foreground">{row.failureCause || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-center">
                    {canEdit ? (
                      <SodSelect value={row.occurrence} onChange={v => updateRow(row.id, "occurrence", v)} label="Occurrence" />
                    ) : (
                      <span className="text-foreground">{row.occurrence}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {canEdit ? (
                      <Input className="h-7 text-xs" value={row.preventionControl ?? ""} onChange={e => updateRow(row.id, "preventionControl", e.target.value)} />
                    ) : (
                      <span className="text-muted-foreground">{row.preventionControl || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {canEdit ? (
                      <Input className="h-7 text-xs" value={row.detectionControl ?? ""} onChange={e => updateRow(row.id, "detectionControl", e.target.value)} />
                    ) : (
                      <span className="text-muted-foreground">{row.detectionControl || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-center">
                    {canEdit ? (
                      <SodSelect value={row.detection} onChange={v => updateRow(row.id, "detection", v)} label="Detection" />
                    ) : (
                      <span className="text-foreground">{row.detection}</span>
                    )}
                  </TableCell>
                <TableCell className={cn("px-2 py-1.5 text-center font-bold", Number.isFinite(row.rpn) && row.rpn >= 200 ? "text-destructive" : Number.isFinite(row.rpn) && row.rpn >= 100 ? "text-destructive" : "text-foreground")}>
                  {Number.isFinite(row.rpn) ? row.rpn : "—"}
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.recommendedAction ?? ""} onChange={e => updateRow(row.id, "recommendedAction", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.recommendedAction || "—"}</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1.5">
                  {canEdit ? (
                    <ActionStatusSelect value={row.actionStatus} onChange={v => updateRow(row.id, "actionStatus", v)} />
                  ) : (
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", row.actionStatus === "COMPLETED" ? "bg-muted text-muted-foreground" : row.actionStatus === "IN_PROGRESS" ? "bg-destructive/10 text-destructive" : row.actionStatus === "CANCELLED" ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground")}>
                      {row.actionStatus?.replaceAll("_", " ") ?? "OPEN"}
                    </span>
                  )}
                </TableCell>
                {canEdit && (
                  <TableCell className="px-1 py-1.5">
                    <Button onClick={() => handleRemoveRow(row.id)} disabled={saving} variant="destructive" className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                      &times;
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={fmeaType === "PROCESS" ? 12 : 11} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No failure modes added yet. Click &quot;Add Row&quot; to begin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}