"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SparklesIcon, CheckIcon, XIcon, RefreshCwIcon } from "lucide-react"

interface Classification {
  category: string | null
  subcategory: string | null
  probableArea: string | null
  suggestedSeverity: string | null
  suggestedSupplierName: string | null
  confidence: number
  reasoning: string
  recommendedAction: string
  duplicateRisk: string
}

interface Suggestion {
  id: string
  suggestionType: string
  status: string
  resultJson: unknown
  confidence: number | null
  createdAt: string
  createdBy: { name: string | null; email: string } | null
  acceptedBy: { name: string | null; email: string } | null
  rejectedBy: { name: string | null; email: string } | null
  acceptedAt: string | null
  rejectedAt: string | null
}

interface AiInsightPanelProps {
  fieldDefectId: string
  suggestions: Suggestion[]
  aiEnabled: boolean
  isPro: boolean
  canManage: boolean
}

const severityColors: Record<string, string> = {
  MINOR: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  MAJOR: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  CRITICAL: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
}

const riskColors: Record<string, string> = {
  LOW: "text-emerald-500",
  MEDIUM: "text-amber-500",
  HIGH: "text-red-500",
}

const statusLabels: Record<string, string> = {
  GENERATED: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
}

const statusColors: Record<string, string> = {
  GENERATED: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ACCEPTED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  EXPIRED: "bg-muted text-muted-foreground",
}

export function AiInsightPanel({
  fieldDefectId,
  suggestions,
  aiEnabled,
  isPro,
  canManage,
}: AiInsightPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const classificationSuggestions = suggestions.filter(
    (s) => s.suggestionType === "CLASSIFICATION",
  )
  const latestSuggestion = classificationSuggestions[0]
  const latestClassification: Classification | null =
    latestSuggestion ? (latestSuggestion.resultJson as Classification) : null

  async function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/field/${fieldDefectId}/ai/classify`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to generate classification")
      } else {
        router.refresh()
      }
    })
  }

  async function handleAction(suggestionId: string, action: "accept" | "reject") {
    setError(null)
    startTransition(async () => {
      const res = await fetch(
        `/api/field/${fieldDefectId}/ai/suggestions/${suggestionId}/${action}`,
        { method: "POST" },
      )
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || `Failed to ${action} suggestion`)
      } else {
        router.refresh()
      }
    })
  }

  if (!aiEnabled) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-muted-foreground" />
            AI Insight
          </h2>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">AI suggestions are not configured.</p>
          <p className="text-xs text-muted-foreground mt-1">Contact your administrator to enable AI features.</p>
        </div>
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-muted-foreground" />
            AI Insight
          </h2>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">AI features require a PRO plan.</p>
          <p className="text-xs text-muted-foreground mt-1">Upgrade your plan to unlock AI-powered classification.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-emerald-500" />
          AI Insight
        </h2>
        {latestSuggestion && (
          <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full ${statusColors[latestSuggestion.status] ?? ""}`}>
            {statusLabels[latestSuggestion.status] ?? latestSuggestion.status}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!latestClassification && !isPending && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No AI classification yet.</p>
            {canManage && (
              <button
                onClick={handleGenerate}
                disabled={isPending}
                aria-label="Generate AI classification"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 text-emerald-500 px-3 py-2 text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="h-4 w-4" />
                Generate Classification
              </button>
            )}
          </div>
        )}

        {isPending && !latestClassification && (
          <div className="flex items-center justify-center py-6">
            <RefreshCwIcon className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Generating classification...</span>
          </div>
        )}

        {latestClassification && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {latestClassification.category && (
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-medium text-foreground">{latestClassification.category}</p>
                </div>
              )}
              {latestClassification.subcategory && (
                <div>
                  <p className="text-xs text-muted-foreground">Subcategory</p>
                  <p className="text-sm font-medium text-foreground">{latestClassification.subcategory}</p>
                </div>
              )}
              {latestClassification.probableArea && (
                <div>
                  <p className="text-xs text-muted-foreground">Probable Area</p>
                  <p className="text-sm font-medium text-foreground">{latestClassification.probableArea}</p>
                </div>
              )}
              {latestClassification.suggestedSeverity && (
                <div>
                  <p className="text-xs text-muted-foreground">Suggested Severity</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${severityColors[latestClassification.suggestedSeverity] ?? "bg-muted text-muted-foreground"}`}>
                    {latestClassification.suggestedSeverity}
                  </span>
                </div>
              )}
              {latestClassification.suggestedSupplierName && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Suggested Supplier</p>
                  <p className="text-sm font-medium text-foreground">{latestClassification.suggestedSupplierName}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Confidence</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, latestClassification.confidence)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{latestClassification.confidence}%</span>
              </div>
            </div>

            {latestClassification.reasoning && (
              <div>
                <p className="text-xs text-muted-foreground">Reasoning</p>
                <p className="text-sm text-foreground">{latestClassification.reasoning}</p>
              </div>
            )}

            {latestClassification.recommendedAction && (
              <div>
                <p className="text-xs text-muted-foreground">Recommended Action</p>
                <p className="text-sm text-foreground">{latestClassification.recommendedAction}</p>
              </div>
            )}

            {latestClassification.duplicateRisk && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Duplicate Risk</p>
                <span className={`text-sm font-semibold ${riskColors[latestClassification.duplicateRisk] ?? ""}`}>
                  {latestClassification.duplicateRisk}
                </span>
              </div>
            )}

            {canManage && latestSuggestion?.status === "GENERATED" && (
              <div className="space-y-2 pt-1">
                {(latestClassification.category || latestClassification.subcategory || latestClassification.probableArea) && (
                  <p className="text-xs text-muted-foreground">
                    Accepting will apply: {[
                      latestClassification.category && "category",
                      latestClassification.subcategory && "subcategory",
                      latestClassification.probableArea && "probable area",
                      latestClassification.suggestedSeverity && "severity",
                    ].filter(Boolean).join(", ")} to this field defect.
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(latestSuggestion.id, "accept")}
                    disabled={isPending}
                    aria-label="Accept AI suggestion"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 px-3 py-2 text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleAction(latestSuggestion.id, "reject")}
                    disabled={isPending}
                    aria-label="Reject AI suggestion"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XIcon className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            )}

            {latestSuggestion?.status !== "GENERATED" && canManage && (
              <button
                onClick={handleGenerate}
                disabled={isPending}
                aria-label="Re-generate AI classification"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
                Re-generate
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}