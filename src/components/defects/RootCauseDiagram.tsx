"use client"

import { useState, useCallback, useMemo } from "react"
import {
  SparklesIcon,
  LockIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  AlertTriangleIcon,
  CheckIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface RootCauseRow {
  id: string
  cause: string
  contribution: number
}

let idCounter = 1000
function genId() {
  return `rc_${idCounter++}_${Date.now()}`
}

export function RootCauseDiagram({
  d2Problem,
  initialRootCauses,
  isPro,
  onShowUpgradeModal,
  onRootCausesChange,
  defectTitle,
  partName,
  symptoms,
}: {
  d2Problem: string
  initialRootCauses: RootCauseRow[]
  isPro: boolean
  onShowUpgradeModal: () => void
  onRootCausesChange: (causes: RootCauseRow[]) => void
  defectTitle?: string
  partName?: string
  symptoms?: string
}) {
  const [aiLoading, setAiLoading] = useState(false)

  const totalContribution = useMemo(
    () => initialRootCauses.reduce((sum, r) => sum + (r.contribution || 0), 0),
    [initialRootCauses],
  )

  const handleAi = useCallback(async () => {
    if (!isPro) { onShowUpgradeModal(); return }
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId: "d4_rootCause", defectTitle: defectTitle ?? "", partName: partName ?? "", symptoms: symptoms ?? "", d2Text: d2Problem }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast({ title: "Brainstorm failed", description: err.error ?? "Please try again.", type: "destructive" as const })
        return
      }
      const { suggestion } = await res.json()
      const lines = suggestion.split("\n").map((l: string) => l.replace(/^[\s*-]+/, "").replace(/^Why\s*\d+\s*[:.-]\s*/i, "").trim()).filter(Boolean).filter((l: string) => !l.startsWith("---") && !l.startsWith("AI"))
      if (lines.length > 0) {
        onRootCausesChange(lines.map((cause: string, i: number) => ({ id: genId(), cause, contribution: i === 0 ? 100 : 0 })))
      }
    } catch {
      toast({ title: "Network error", description: "Failed to connect to AI service.", type: "destructive" as const })
    } finally {
      setAiLoading(false)
    }
  }, [isPro, onShowUpgradeModal, defectTitle, partName, symptoms, d2Problem, onRootCausesChange])

  return (
    <div className="space-y-4">
      <div className="overflow-visible border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead className="w-[55%]">Root Cause</TableHead>
              <TableHead className="w-[18%]">% Contribution</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRootCauses.map((rc, idx) => (
              <TableRow key={rc.id}>
                <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <input value={rc.cause} onChange={(e) => {
                    const updated = initialRootCauses.map((r, i) => i === idx ? { ...r, cause: e.target.value } : r)
                    onRootCausesChange(updated)
                  }} placeholder={idx === 0 ? "Direct cause..." : `Why ${idx + 1}...`} className="w-full rounded border border-input bg-background px-2 py-1 text-xs" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} max={100} value={rc.contribution}
                      onChange={(e) => {
                        const updated = initialRootCauses.map((r, i) => i === idx
                          ? { ...r, contribution: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } : r)
                        onRootCausesChange(updated)
                      }} className="w-16 rounded border border-input bg-background px-2 py-1 text-xs" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  {initialRootCauses.length > 1 && (
                    <button type="button" onClick={() => onRootCausesChange(initialRootCauses.filter((_, i) => i !== idx))}
                      className="inline-flex items-center justify-center rounded-md p-1 text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalContribution !== 100 && initialRootCauses.length > 0 && (
        <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
          totalContribution > 100 ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400")}>
          <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          Total contribution: {totalContribution}% {totalContribution > 100 ? "(exceeds 100%)" : "(ideally should equal 100%)"}
        </div>
      )}
      {totalContribution === 100 && initialRootCauses.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-400">
          <CheckIcon className="h-3.5 w-3.5 shrink-0" /> Total contribution: 100% — validated
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm"
          onClick={() => onRootCausesChange([...initialRootCauses, { id: genId(), cause: "", contribution: 0 }])}>
          <PlusIcon className="mr-1 h-3.5 w-3.5" /> Add Root Cause
        </Button>
        <button type="button" onClick={() => isPro ? handleAi() : onShowUpgradeModal()} disabled={aiLoading}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          {aiLoading ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : isPro ? <SparklesIcon className="h-3.5 w-3.5" /> : <LockIcon className="h-3.5 w-3.5" />}
          {aiLoading ? "Brainstorming..." : isPro ? "AI Brainstorm Root Causes" : "AI Brainstorm — Upgrade to PRO"}
        </button>
      </div>
    </div>
  )
}
