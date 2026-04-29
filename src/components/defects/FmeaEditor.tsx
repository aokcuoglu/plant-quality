"use client"

import { useState, useCallback } from "react"
import { PlusCircleIcon, TrashIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { normalizePlan, canUseFeature } from "@/lib/billing/client"

interface FmeaRow {
  id: string
  processStep?: string
  potentialFailureMode: string
  potentialEffect: string
  severity: number
  potentialCause: string
  occurrence: number
  currentControl: string
  detection: number
  rpn: number
  recommendedAction: string
  responsibleId?: string
  targetDate?: string
  actionTaken?: string
  revisedSeverity?: number
  revisedOccurrence?: number
  revisedDetection?: number
  revisedRpn?: number
}

interface FmeaEditorProps {
  fmeaId: string
  initialRows: FmeaRow[]
  fmeaType: "DESIGN" | "PROCESS"
  canEdit: boolean
  plan: string
  partNumber: string
  partName?: string | null
  processStep?: string | null
}

let counter = 0
function genId() {
  return `row_${++counter}_${Date.now()}`
}

function calcRpn(s: number, o: number, d: number): number {
  const val = s * o * d
  return isNaN(val) ? 0 : val
}

export function FmeaEditor({
  fmeaId,
  initialRows,
  fmeaType,
  canEdit,
  plan,
  partNumber,
  partName,
  processStep,
}: FmeaEditorProps) {
  const [rows, setRows] = useState<FmeaRow[]>(initialRows)
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const updateRow = useCallback((id: string, field: keyof FmeaRow, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const updated = { ...r, [field]: value }
        if (["severity", "occurrence", "detection"].includes(field)) {
          const s = field === "severity" ? Number(value) : updated.severity
          const o = field === "occurrence" ? Number(value) : updated.occurrence
          const d = field === "detection" ? Number(value) : updated.detection
          updated.rpn = calcRpn(s, o, d)
        }
        if (["revisedSeverity", "revisedOccurrence", "revisedDetection"].includes(field) && updated.revisedSeverity != null && updated.revisedOccurrence != null && updated.revisedDetection != null) {
          updated.revisedRpn = calcRpn(updated.revisedSeverity, updated.revisedOccurrence, updated.revisedDetection)
        }
        return updated
      }),
    )
  }, [])

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: genId(),
        processStep: fmeaType === "PROCESS" ? "" : undefined,
        potentialFailureMode: "",
        potentialEffect: "",
        severity: 5,
        potentialCause: "",
        occurrence: 3,
        currentControl: "",
        detection: 5,
        rpn: 75,
        recommendedAction: "",
      },
    ])
  }, [fmeaType])

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/fmea/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fmeaId, rows }),
      })
      const data = await res.json()
      if (!data.success) {
        alert(data.error || "Save failed")
      }
    } catch {
      alert("Save failed")
    } finally {
      setSaving(false)
    }
  }, [fmeaId, rows])

  const normalizedPlan = normalizePlan(plan)
  const canUseAi = canUseFeature(normalizedPlan, "OEM", "FMEA")
  const handleAiSuggest = useCallback(async () => {
    if (!canUseAi) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch("/api/ai/fmea-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: "failure_modes",
          context: { partNumber, partName, fmeaType, processStep },
        }),
      })
      const data = await res.json()
      if (data.error) {
        setAiError(data.error)
        return
      }
      let parsed: FmeaRow[] = []
      try {
        const raw = data.suggestion.replace(/```json\n?|```/g, "").trim()
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          parsed = arr.map((item: Record<string, unknown>) => ({
            id: genId(),
            processStep: fmeaType === "PROCESS" ? (item.processStep as string ?? "") : undefined,
            potentialFailureMode: String(item.potentialFailureMode ?? ""),
            potentialEffect: String(item.potentialEffect ?? ""),
            severity: Number(item.severity) || 5,
            potentialCause: String(item.potentialCause ?? ""),
            occurrence: Number(item.occurrence) || 3,
            currentControl: String(item.currentControl ?? ""),
            detection: Number(item.detection) || 5,
            rpn: calcRpn(Number(item.severity) || 5, Number(item.occurrence) || 3, Number(item.detection) || 5),
            recommendedAction: "",
          }))
        }
      } catch {
        const lines = data.suggestion.split("\n").filter((l: string) => l.trim())
        parsed = lines.slice(0, 5).map(() => ({
          id: genId(),
          potentialFailureMode: lines[0] || "",
          potentialEffect: "",
          severity: 5,
          potentialCause: "",
          occurrence: 3,
          currentControl: "",
          detection: 5,
          rpn: 75,
          recommendedAction: "",
        }))
      }
      if (parsed.length > 0) {
        setRows((prev) => [...prev, ...parsed])
      }
    } catch {
      setAiError("AI suggestion failed")
    } finally {
      setAiLoading(false)
    }
  }, [canUseAi, partNumber, partName, fmeaType, processStep])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {canEdit && (
          <>
            <Button variant="outline" size="sm" onClick={addRow}>
              <PlusCircleIcon className="mr-1.5 size-4" />
              Add Row
            </Button>
            {canUseAi && (
              <Button variant="outline" size="sm" onClick={handleAiSuggest} disabled={aiLoading}>
                <SparklesIcon className="mr-1.5 size-4 text-emerald-400" />
                {aiLoading ? "Analyzing..." : "AI Suggest Failures"}
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        )}
      </div>
      {aiError && (
        <p className="text-xs text-destructive">{aiError}</p>
      )}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {fmeaType === "PROCESS" && <th className="px-2 py-2 text-left font-medium uppercase tracking-wider text-muted-foreground">Process Step</th>}
              <th className="px-2 py-2 text-left font-medium uppercase tracking-wider text-muted-foreground">Failure Mode</th>
              <th className="px-2 py-2 text-left font-medium uppercase tracking-wider text-muted-foreground">Effect</th>
              <th className="px-2 py-2 text-center font-medium uppercase tracking-wider text-muted-foreground w-12">Sev</th>
              <th className="px-2 py-2 text-left font-medium uppercase tracking-wider text-muted-foreground">Cause</th>
              <th className="px-2 py-2 text-center font-medium uppercase tracking-wider text-muted-foreground w-12">Occ</th>
              <th className="px-2 py-2 text-left font-medium uppercase tracking-wider text-muted-foreground">Control</th>
              <th className="px-2 py-2 text-center font-medium uppercase tracking-wider text-muted-foreground w-12">Det</th>
              <th className="px-2 py-2 text-center font-medium uppercase tracking-wider text-muted-foreground w-14">RPN</th>
              <th className="px-2 py-2 text-left font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]">Action</th>
              {canEdit && <th className="px-2 py-2 w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30">
                {fmeaType === "PROCESS" && (
                  <td className="px-2 py-1.5">
                    {canEdit ? (
                      <Input className="h-7 text-xs" value={row.processStep ?? ""} onChange={(e) => updateRow(row.id, "processStep", e.target.value)} />
                    ) : (
                      <span className="text-foreground">{row.processStep}</span>
                    )}
                  </td>
                )}
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.potentialFailureMode} onChange={(e) => updateRow(row.id, "potentialFailureMode", e.target.value)} />
                  ) : (
                    <span className="text-foreground">{row.potentialFailureMode}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.potentialEffect} onChange={(e) => updateRow(row.id, "potentialEffect", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.potentialEffect}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {canEdit ? (
                    <Input type="number" min={1} max={10} className="h-7 w-12 text-xs text-center" value={row.severity} onChange={(e) => updateRow(row.id, "severity", Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} />
                  ) : (
                    <span className="text-foreground">{row.severity}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.potentialCause} onChange={(e) => updateRow(row.id, "potentialCause", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.potentialCause}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {canEdit ? (
                    <Input type="number" min={1} max={10} className="h-7 w-12 text-xs text-center" value={row.occurrence} onChange={(e) => updateRow(row.id, "occurrence", Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} />
                  ) : (
                    <span className="text-foreground">{row.occurrence}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.currentControl} onChange={(e) => updateRow(row.id, "currentControl", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.currentControl}</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {canEdit ? (
                    <Input type="number" min={1} max={10} className="h-7 w-12 text-xs text-center" value={row.detection} onChange={(e) => updateRow(row.id, "detection", Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} />
                  ) : (
                    <span className="text-foreground">{row.detection}</span>
                  )}
                </td>
                <td className={cn("px-2 py-1.5 text-center font-bold", row.rpn >= 200 ? "text-red-400" : row.rpn >= 100 ? "text-amber-400" : "text-emerald-400")}>
                  {row.rpn}
                </td>
                <td className="px-2 py-1.5">
                  {canEdit ? (
                    <Input className="h-7 text-xs" value={row.recommendedAction ?? ""} onChange={(e) => updateRow(row.id, "recommendedAction", e.target.value)} />
                  ) : (
                    <span className="text-muted-foreground">{row.recommendedAction}</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-1 py-1.5">
                    <button onClick={() => removeRow(row.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <TrashIcon className="size-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={fmeaType === "PROCESS" ? 11 : 10} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No failure modes added yet. Click &quot;Add Row&quot; or use AI suggestions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}