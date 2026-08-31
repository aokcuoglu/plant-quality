"use client"

import { Textarea } from "@/components/ui/textarea"

import { Button } from "@/components/ui/button"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createUpgradeRequest } from "@/app/(dashboard)/_actions/upgrade-requests"
import { PLAN_LABELS, type PlanKey } from "@/lib/billing/plans"

interface UpgradeRequestFormProps {
  currentPlan: PlanKey
}

export function UpgradeRequestForm({ currentPlan }: UpgradeRequestFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ plan: string; duplicate: boolean } | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null)
  const [message, setMessage] = useState("")

  function handleRequest(plan: PlanKey) {
    setSelectedPlan(plan)
  }

  function handleSubmit() {
    if (!selectedPlan) return
    setError(null)
    startTransition(async () => {
      const result = await createUpgradeRequest({
        requestedPlan: selectedPlan,
        message: message.trim() || undefined,
      })
      if (result.success) {
        setSuccess({ plan: selectedPlan, duplicate: result.duplicate ?? false })
        setSelectedPlan(null)
        setMessage("")
        router.refresh()
      } else {
        setError(result.error ?? "Failed to create upgrade request")
      }
    })
  }

  if (success) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">
          {success.duplicate
            ? `An open request to upgrade to ${PLAN_LABELS[success.plan as PlanKey]} already exists.`
            : `Your request to upgrade to ${PLAN_LABELS[success.plan as PlanKey]} has been submitted.`}
        </div>
        <p className="text-xs text-muted-foreground">
          Billing integration is not enabled yet. Please contact PlantX sales or your system administrator. Enterprise plans are handled by custom quote.
        </p>
        <Button
          type="button"
          onClick={() => setSuccess(null)}
          variant="ghost" className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Dismiss
        </Button>
      </div>
    )
  }

  if (selectedPlan) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-foreground font-medium">
          Request upgrade to {PLAN_LABELS[selectedPlan]}
        </p>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us why you need this upgrade (optional)"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
          disabled={isPending}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {isPending ? "Submitting..." : "Submit Request"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setSelectedPlan(null); setMessage(""); setError(null) }}
            disabled={isPending}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Billing integration is not enabled yet. Approval does not automatically change your plan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {currentPlan === "FREE" && (
          <Button
            type="button"
            onClick={() => handleRequest("PRO")}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-foreground/90 transition-colors"
          >
            Request Pro
          </Button>
        )}
        {currentPlan !== "ENTERPRISE" && (
          <Button
            type="button"
            onClick={() => handleRequest("ENTERPRISE")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/20 transition-colors"
          >
            Request Enterprise
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Billing integration is not enabled yet. Please contact PlantX sales or your system administrator to upgrade. Enterprise plans are handled by custom quote.
      </p>
    </div>
  )
}
