"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loadScorecardConfig, saveScorecardConfig, resetScorecardConfig } from "./actions"
import type { ScorecardConfigData } from "@/lib/supplier-scorecard/config"
import { RotateCcw, Save } from "lucide-react"

const FIELDS: { key: keyof ScorecardConfigData, label: string }[] = [
  { key: "fieldDefectPerItem", label: "Critical/Major Field Defects — Per Item" },
  { key: "fieldDefectCap", label: "Critical/Major Field Defects — Cap" },
  { key: "repeatIssuePerItem", label: "Repeat Issue Clusters — Per Item" },
  { key: "repeatIssueCap", label: "Repeat Issue Clusters — Cap" },
  { key: "iqcRejectedPerItem", label: "IQC Rejected/On-Hold — Per Item" },
  { key: "iqcRejectedCap", label: "IQC Rejected/On-Hold — Cap" },
  { key: "openOverdue8dPerItem", label: "Open/Overdue 8D — Per Item" },
  { key: "openOverdue8dCap", label: "Open/Overdue 8D — Cap" },
  { key: "slaBreachPerItem", label: "SLA Breaches — Per Item" },
  { key: "slaBreachCap", label: "SLA Breaches — Cap" },
  { key: "ppapWithIssuesPerItem", label: "PPAP with Issues — Per Item" },
  { key: "ppapWithIssuesCap", label: "PPAP with Issues — Cap" },
  { key: "fmeaGapPerItem", label: "FMEA Coverage Gaps — Per Item" },
  { key: "fmeaGapCap", label: "FMEA Coverage Gaps — Cap" },
  { key: "execRiskPerItem", label: "Executive Risk Signals — Per Item" },
  { key: "execRiskCap", label: "Executive Risk Signals — Cap" },
]

export function ScorecardConfigForm() {
  const [config, setConfig] = useState<ScorecardConfigData | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)

  useEffect(() => {
    loadScorecardConfig().then((result) => {
      if (!("error" in result)) {
        setConfig(result)
      }
    })
  }, [])

  function updateField(key: keyof ScorecardConfigData, value: string) {
    const n = parseInt(value, 10)
    if (Number.isFinite(n) && n >= 0 && n <= 100) {
      setConfig((prev) => prev ? { ...prev, [key]: n } : null)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setSaving(true)
    setMessage(null)

    const formData = new FormData()
    for (const field of FIELDS) {
      formData.set(field.key, String(config[field.key]))
    }

    const result = await saveScorecardConfig(formData)
    if ("error" in result) {
      setMessage({ type: "error", text: result.error! })
    } else {
      setMessage({ type: "success", text: "KPI weights saved" })
    }
    setSaving(false)
  }

  async function handleReset() {
    setResetting(true)
    setMessage(null)
    const result = await resetScorecardConfig()
    if (!("error" in result) && result.data) {
      setConfig(result.data)
      setMessage({ type: "success", text: "Reset to defaults" })
    } else {
      setMessage({ type: "error", text: "error" in result ? result.error! : "Failed to reset" })
    }
    setResetting(false)
  }

  if (!config) return null

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {message && (
        <div className={`rounded-md px-4 py-2 text-sm ${message.type === "success" ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-medium text-foreground mb-4">Penalty Weights & Caps</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{field.label}</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={config[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                className="h-9"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} size="sm" className="bg-foreground text-background hover:bg-foreground/90">
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" disabled={resetting} onClick={handleReset} variant="outline" size="sm">
          <RotateCcw className="h-4 w-4 mr-1.5" />
          {resetting ? "Resetting..." : "Reset to Defaults"}
        </Button>
      </div>
    </form>
  )
}
