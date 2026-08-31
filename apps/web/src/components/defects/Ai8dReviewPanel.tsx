"use client"

import { Button } from "@/components/ui/button"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  SparklesIcon,
  CheckIcon,
  XIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertTriangleIcon,
  LightbulbIcon,
  HelpCircleIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizePlan, canUseFeature } from "@/lib/billing/client"
import {
  generateAi8dReview,
  generateRootCauseSuggestion,
  markAi8dReviewAsReviewed,
  rejectAi8dReview,
} from "@/app/(dashboard)/quality/oem/defects/actions/ai-review"
import type { Ai8dReviewResult } from "@/lib/ai/review-8d"
import type { EightDCompletenessResult } from "@/lib/ai/validate-8d-completeness"
import type { RootCauseSuggestion } from "@/lib/ai/root-cause-suggestion"
import { toast } from "@/components/ui/use-toast"

interface Ai8dReviewRecord {
  id: string
  status: string
  score: number | null
  createdAt: string
  createdBy: { name: string | null; email: string } | null
  reviewedBy: { name: string | null; email: string } | null
  rejectedBy: { name: string | null; email: string } | null
  reviewedAt: string | null
  rejectedAt: string | null
  resultJson: unknown
}

interface Ai8dReviewPanelProps {
  defectId: string
  eightDReportExists: boolean
  aiEnabled: boolean
  plan: string
  canManage: boolean
  latestReview: Ai8dReviewRecord | null
  deterministicCompleteness: EightDCompletenessResult | null
}

const reviewStatusColors: Record<string, string> = {
  STRONG: "bg-muted text-muted-foreground ",
  NEEDS_IMPROVEMENT: "bg-destructive/10 text-destructive ",
  INCOMPLETE: "bg-destructive/10 text-destructive",
  RISKY: "bg-destructive/10 text-destructive",
}

const reviewStatusLabel: Record<string, string> = {
  STRONG: "Strong",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  INCOMPLETE: "Incomplete",
  RISKY: "Risky",
}

const statusColors: Record<string, string> = {
  GENERATED: "bg-destructive/10 text-destructive ",
  REVIEWED: "bg-muted text-muted-foreground ",
  REJECTED: "bg-destructive/10 text-destructive",
  EXPIRED: "bg-muted text-muted-foreground",
}

const statusLabels: Record<string, string> = {
  GENERATED: "Pending Review",
  REVIEWED: "Reviewed",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
}

function parseReviewResult(raw: unknown): Ai8dReviewResult | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (
    typeof r.overallScore !== "number" ||
    !["STRONG", "NEEDS_IMPROVEMENT", "INCOMPLETE", "RISKY"].includes(r.reviewStatus as string) ||
    typeof r.confidence !== "number"
  ) {
    return null
  }
  const comp = r.completeness as Record<string, unknown> | undefined
  return {
    overallScore: Math.max(0, Math.min(100, Math.round(r.overallScore))),
    reviewStatus: r.reviewStatus as Ai8dReviewResult["reviewStatus"],
    completeness: {
      problemDescriptionComplete: Boolean(comp?.problemDescriptionComplete),
      containmentDefined: Boolean(comp?.containmentDefined),
      rootCauseDefined: Boolean(comp?.rootCauseDefined),
      correctiveActionDefined: Boolean(comp?.correctiveActionDefined),
      preventiveActionDefined: Boolean(comp?.preventiveActionDefined),
      verificationDefined: Boolean(comp?.verificationDefined),
    },
    weakPoints: Array.isArray(r.weakPoints) ? r.weakPoints.filter((s: unknown) => typeof s === "string") : [],
    missingItems: Array.isArray(r.missingItems) ? r.missingItems.filter((s: unknown) => typeof s === "string") : [],
    suggestedQuestionsForSupplier: Array.isArray(r.suggestedQuestionsForSupplier) ? r.suggestedQuestionsForSupplier.filter((s: unknown) => typeof s === "string") : [],
    suggestedRootCauseAngles: Array.isArray(r.suggestedRootCauseAngles) ? r.suggestedRootCauseAngles.filter((s: unknown) => typeof s === "string") : [],
    suggestedContainmentActions: Array.isArray(r.suggestedContainmentActions) ? r.suggestedContainmentActions.filter((s: unknown) => typeof s === "string") : [],
    suggestedCorrectiveActions: Array.isArray(r.suggestedCorrectiveActions) ? r.suggestedCorrectiveActions.filter((s: unknown) => typeof s === "string") : [],
    suggestedPreventiveActions: Array.isArray(r.suggestedPreventiveActions) ? r.suggestedPreventiveActions.filter((s: unknown) => typeof s === "string") : [],
    reasoningSummary: typeof r.reasoningSummary === "string" ? r.reasoningSummary : "",
    confidence: Math.max(0, Math.min(100, Math.round(r.confidence))),
  }
}

function CompletenessChecklist({ completeness }: { completeness: EightDCompletenessResult }) {
  const items = [
    { label: "Problem Description (D2)", complete: completeness.problemDescriptionComplete },
    { label: "Containment Actions (D3)", complete: completeness.containmentDefined },
    { label: "Root Cause Analysis (D4)", complete: completeness.rootCauseDefined },
    { label: "Corrective Actions (D5)", complete: completeness.correctiveActionDefined },
    { label: "Validation & Implementation (D6)", complete: completeness.verificationDefined },
    { label: "Preventive Actions (D7)", complete: completeness.preventiveActionDefined },
  ]

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]",
            item.complete
              ? "bg-muted text-muted-foreground"
              : "bg-destructive/10 text-destructive",
          )}>
            {item.complete ? <CheckIcon className="h-2.5 w-2.5" /> : <XIcon className="h-2.5 w-2.5" />}
          </div>
          <span className={cn("text-xs", item.complete ? "text-foreground" : "text-muted-foreground")}>
            {item.label}
          </span>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              completeness.completenessPercent >= 80
                ? "bg-foreground"
                : completeness.completenessPercent >= 50
                  ? "bg-destructive"
                  : "bg-destructive",
            )}
            style={{ width: `${completeness.completenessPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{completeness.completenessPercent}%</span>
      </div>
    </div>
  )
}

function SuggestionList({ items, icon }: { items: string[]; icon: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null
  const showing = expanded ? items : items.slice(0, 3)
  return (
    <div>
      <div className="space-y-1">
        {showing.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
            <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      {items.length > 3 && !expanded && (
        <Button
          type="button"
          onClick={() => setExpanded(true)}
          variant="ghost" className="mt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          +{items.length - 3} more
        </Button>
      )}
    </div>
  )
}

export function Ai8dReviewPanel({
  defectId,
  eightDReportExists,
  aiEnabled,
  plan,
  canManage,
  latestReview,
  deterministicCompleteness,
}: Ai8dReviewPanelProps) {
  const normalizedPlan = normalizePlan(plan)
  const canUseAi8d = canUseFeature(normalizedPlan, "OEM", "AI_8D_REVIEW")
  const canUseRootCause = canUseFeature(normalizedPlan, "OEM", "ROOT_CAUSE_SUGGESTION")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rootCausePending, setRootCausePending] = useState(false)
  const [rootCauseResult, setRootCauseResult] = useState<RootCauseSuggestion | null>(null)
  const [rootCauseError, setRootCauseError] = useState<string | null>(null)
  const [showRootCause, setShowRootCause] = useState(false)

  const review: Ai8dReviewResult | null = parseReviewResult(latestReview?.resultJson)
  const reviewStatus = latestReview?.status ?? null
  const hasMalformedReview = latestReview && !review

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const result = await generateAi8dReview(defectId)
      if (!result.success) {
        setError(result.error)
        if (result.error !== "No 8D report found") {
          toast({ title: "AI Review Failed", description: result.error, type: "destructive" })
        }
      } else {
        router.refresh()
      }
    })
  }

  function handleMarkReviewed() {
    if (!latestReview) return
    startTransition(async () => {
      const result = await markAi8dReviewAsReviewed(latestReview.id)
      if (!result.success) {
        toast({ title: "Action Failed", description: result.error, type: "destructive" })
      } else {
        router.refresh()
      }
    })
  }

  function handleReject() {
    if (!latestReview) return
    startTransition(async () => {
      const result = await rejectAi8dReview(latestReview.id)
      if (!result.success) {
        toast({ title: "Action Failed", description: result.error, type: "destructive" })
      } else {
        router.refresh()
      }
    })
  }

  async function handleRootCause() {
    setRootCauseError(null)
    setRootCausePending(true)
    setRootCauseResult(null)
    try {
      const result = await generateRootCauseSuggestion(defectId)
      if (!result.success) {
        setRootCauseError(result.error)
        toast({ title: "Root Cause Suggestion Failed", description: result.error, type: "destructive" })
      } else {
        setRootCauseResult(result.suggestion)
        setShowRootCause(true)
      }
    } catch {
      setRootCauseError("An unexpected error occurred. Please try again.")
    } finally {
      setRootCausePending(false)
    }
  }

  if (!eightDReportExists) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-muted-foreground" />
            AI 8D Review
          </h2>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">8D report has not been submitted yet.</p>
          {deterministicCompleteness && (
            <div className="mt-4 text-left">
              <p className="text-xs font-medium text-muted-foreground mb-2">Completeness Check</p>
              <CompletenessChecklist completeness={deterministicCompleteness} />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!aiEnabled) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-muted-foreground" />
            AI 8D Review
          </h2>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">AI suggestions are not configured.</p>
          <p className="text-xs text-muted-foreground mt-1">Contact your administrator to enable AI features.</p>
        </div>
      </div>
    )
  }

  if (!canUseAi8d) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-muted-foreground" />
            AI 8D Review
          </h2>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">AI 8D Review requires an Enterprise plan.</p>
          <p className="text-xs text-muted-foreground mt-1">Upgrade your plan to unlock AI-powered 8D review.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-foreground" />
          AI 8D Review
        </h2>
        {latestReview && (
          <span className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full ${statusColors[latestReview.status] ?? ""}`}>
            {statusLabels[latestReview.status] ?? latestReview.status}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {hasMalformedReview && !isPending && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangleIcon className="h-4 w-4 text-destructive" />
              <p className="text-sm font-medium text-foreground">Review data could not be loaded</p>
            </div>
            <p className="text-xs text-muted-foreground">
              A review was generated but its results could not be parsed. You can regenerate it below.
            </p>
          </div>
        )}

        {!review && !latestReview && !isPending && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No AI review generated yet.</p>
            {canManage && canUseAi8d && (
              <Button
                onClick={handleGenerate}
                variant="outline"
                disabled={isPending}
                aria-label="Generate AI 8D review"
                className="inline-flex items-center gap-2 rounded-lg bg-muted text-muted-foreground px-3 py-2 text-sm font-medium hover:bg-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="h-4 w-4" />
                Generate AI Review
              </Button>
            )}
          </div>
        )}

        {isPending && (
          <div className="flex items-center justify-center py-6">
            <RefreshCwIcon className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Generating AI review...</span>
          </div>
        )}

        {review && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{review.overallScore}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
              </div>
              <span className={`text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full ${reviewStatusColors[review.reviewStatus] ?? "bg-muted text-muted-foreground"}`}>
                {reviewStatusLabel[review.reviewStatus] ?? review.reviewStatus}
              </span>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Confidence</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${Math.min(100, review.confidence)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{review.confidence}%</span>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Completeness</p>
              <div className="space-y-1.5">
                {[
                  { label: "Problem Description", complete: review.completeness.problemDescriptionComplete },
                  { label: "Containment Actions", complete: review.completeness.containmentDefined },
                  { label: "Root Cause", complete: review.completeness.rootCauseDefined },
                  { label: "Corrective Actions", complete: review.completeness.correctiveActionDefined },
                  { label: "Preventive Actions", complete: review.completeness.preventiveActionDefined },
                  { label: "Verification", complete: review.completeness.verificationDefined },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px]",
                      item.complete
                        ? "bg-muted text-muted-foreground"
                        : "bg-destructive/10 text-destructive",
                    )}>
                      {item.complete ? <CheckIcon className="h-2 w-2" /> : <XIcon className="h-2 w-2" />}
                    </div>
                    <span className={cn("text-xs", item.complete ? "text-foreground" : "text-muted-foreground line-through")}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {review.weakPoints.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <AlertTriangleIcon className="h-3 w-3 text-destructive" />
                  Weak Points
                </p>
                <div className="space-y-1">
                  {review.weakPoints.map((wp, i) => (
                    <p key={i} className="text-xs text-foreground">{wp}</p>
                  ))}
                </div>
              </div>
            )}

            {review.missingItems.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <XIcon className="h-3 w-3 text-destructive" />
                  Missing Items
                </p>
                <div className="space-y-1">
                  {review.missingItems.map((mi, i) => (
                    <p key={i} className="text-xs text-foreground">{mi}</p>
                  ))}
                </div>
              </div>
            )}

            {review.suggestedQuestionsForSupplier.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <HelpCircleIcon className="h-3 w-3 text-muted-foreground" />
                  Questions for Supplier
                </p>
                <SuggestionList items={review.suggestedQuestionsForSupplier} icon={<span className="text-muted-foreground">•</span>} />
              </div>
            )}

            {review.suggestedRootCauseAngles.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <LightbulbIcon className="h-3 w-3 text-destructive" />
                  Root Cause Angles
                </p>
                <SuggestionList items={review.suggestedRootCauseAngles} icon={<span className="text-muted-foreground">•</span>} />
              </div>
            )}

            {review.suggestedContainmentActions.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <ShieldCheckIcon className="h-3 w-3 text-muted-foreground" />
                  Suggested Containment
                </p>
                <SuggestionList items={review.suggestedContainmentActions} icon={<span className="text-muted-foreground">•</span>} />
              </div>
            )}

            {review.suggestedCorrectiveActions.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggested Corrective Actions</p>
                <SuggestionList items={review.suggestedCorrectiveActions} icon={<span className="text-muted-foreground">•</span>} />
              </div>
            )}

            {review.suggestedPreventiveActions.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Suggested Preventive Actions</p>
                <SuggestionList items={review.suggestedPreventiveActions} icon={<span className="text-muted-foreground">•</span>} />
              </div>
            )}

            {review.reasoningSummary && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Reasoning</p>
                <p className="text-xs text-foreground">{review.reasoningSummary}</p>
              </div>
            )}

            {canManage && reviewStatus === "GENERATED" && (
              <div className="space-y-2 pt-1 border-t">
                <p className="text-xs text-muted-foreground">
                  AI review is advisory only. You decide the outcome.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleMarkReviewed}
                    disabled={isPending}
                    aria-label="Mark AI review as reviewed"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-muted text-muted-foreground px-3 py-2 text-sm font-medium hover:bg-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Mark Reviewed
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={isPending}
                    aria-label="Reject AI review"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 text-destructive px-3 py-2 text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XIcon className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {canManage && canUseAi8d && reviewStatus !== "GENERATED" && (
              <Button
                onClick={handleGenerate}
                variant="outline"
                disabled={isPending}
                aria-label="Regenerate AI review"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
                Regenerate Review
              </Button>
            )}
          </>
        )}

        {hasMalformedReview && canManage && canUseAi8d && !isPending && (
          <div className="border-t pt-3">
            <Button
              onClick={handleGenerate}
              variant="outline"
              disabled={isPending}
              aria-label="Regenerate AI review"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCwIcon className="h-3.5 w-3.5" />
              Regenerate Review
            </Button>
          </div>
        )}

        {deterministicCompleteness && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Deterministic Completeness Check</p>
            <CompletenessChecklist completeness={deterministicCompleteness} />
          </div>
        )}

        {canManage && canUseRootCause && (
          <div className="border-t pt-3">
            <Button
              onClick={() => setShowRootCause(!showRootCause)}
              type="button"
              variant="ghost" className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <LightbulbIcon className="h-3.5 w-3.5" />
                Root Cause Suggestion
              </span>
              {showRootCause ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
            </Button>

            {showRootCause && !rootCauseResult && !rootCausePending && (
              <div className="mt-3 text-center">
                {rootCauseError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive mb-2">
                    {rootCauseError}
                  </div>
                )}
                <Button
                  onClick={handleRootCause}
                  variant="outline"
                  disabled={rootCausePending}
                  aria-label="Generate root cause suggestion"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Suggest Root Causes
                </Button>
              </div>
            )}

            {rootCausePending && (
              <div className="mt-3 flex items-center justify-center py-4">
                <RefreshCwIcon className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Analyzing...</span>
              </div>
            )}

            {rootCauseResult && (
              <div className="mt-3 space-y-3">
                {rootCauseResult.suggestedRootCauses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Potential Root Causes</p>
                    <div className="space-y-1">
                      {rootCauseResult.suggestedRootCauses.map((rc, i) => (
                        <p key={i} className="text-xs text-foreground">{i + 1}. {rc}</p>
                      ))}
                    </div>
                  </div>
                )}

                {rootCauseResult.suggested5WhyChain.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">5-Why Chain</p>
                    <div className="space-y-0.5">
                      {rootCauseResult.suggested5WhyChain.map((w, i) => (
                        <p key={i} className="text-xs text-foreground">Why {i + 1}: {w}</p>
                      ))}
                    </div>
                  </div>
                )}

                {rootCauseResult.suggestedInvestigationMethods.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Investigation Methods</p>
                    <div className="space-y-0.5">
                      {rootCauseResult.suggestedInvestigationMethods.map((m, i) => (
                        <p key={i} className="text-xs text-foreground">• {m}</p>
                      ))}
                    </div>
                  </div>
                )}

                {rootCauseResult.suggestedContainmentActions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Suggested Containment</p>
                    <div className="space-y-0.5">
                      {rootCauseResult.suggestedContainmentActions.map((a, i) => (
                        <p key={i} className="text-xs text-foreground">• {a}</p>
                      ))}
                    </div>
                  </div>
                )}

                {rootCauseResult.reasoning && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Reasoning</p>
                    <p className="text-xs text-foreground">{rootCauseResult.reasoning}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, rootCauseResult.confidence)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{rootCauseResult.confidence}%</span>
                </div>

                <Button
                  onClick={handleRootCause}
                  variant="outline"
                  disabled={rootCausePending}
                  aria-label="Regenerate root cause suggestion"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCwIcon className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
