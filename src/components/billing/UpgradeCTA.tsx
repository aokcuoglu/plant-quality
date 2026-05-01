"use client"

import { useState } from "react"
import { normalizePlan, type PlanKey, PLAN_LABELS, isPlanAtLeast } from "@/lib/billing/plans"
import { cn } from "@/lib/utils"
import { UpgradeRequestDialog } from "@/components/billing/UpgradeRequestDialog"

interface UpgradeCTAProps {
  currentPlan: string | null | undefined
  featureName: string
  minPlan?: PlanKey
  companyType?: string | null
  className?: string
  compact?: boolean
}

export function UpgradeCTA({ currentPlan, featureName, minPlan, companyType, className, compact }: UpgradeCTAProps) {
  const plan = normalizePlan(currentPlan)
  const targetPlan: PlanKey = minPlan ?? "PRO"
  const [dialogOpen, setDialogOpen] = useState(false)

  if (plan === "ENTERPRISE") return null
  if (companyType === "SUPPLIER") {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4 text-center", className)}>
        <p className="text-sm text-muted-foreground">
          {featureName} is not available for supplier accounts.
        </p>
      </div>
    )
  }

  if (isPlanAtLeast(plan, targetPlan)) return null

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={cn("text-xs text-emerald-500 hover:text-emerald-400 hover:underline cursor-pointer", className)}
        >
          Requires {PLAN_LABELS[targetPlan]}
        </button>
        <UpgradeRequestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          currentPlan={plan}
          requestedPlan={targetPlan}
          sourceFeature={featureName}
        />
      </>
    )
  }

  return (
    <>
      <div className={cn("rounded-lg border border-border bg-card p-6 text-center", className)}>
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
          <svg className="size-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-foreground">{featureName}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {targetPlan === "ENTERPRISE"
            ? "Enterprise plans are handled by custom quote. Please contact PlantX sales or your system administrator."
            : "This feature requires a Pro plan or higher. Billing integration is not enabled yet — please contact PlantX sales or your system administrator to upgrade."}
        </p>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
        >
          Request {PLAN_LABELS[targetPlan]}
        </button>
      </div>
      <UpgradeRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentPlan={plan}
        requestedPlan={targetPlan}
        sourceFeature={featureName}
      />
    </>
  )
}