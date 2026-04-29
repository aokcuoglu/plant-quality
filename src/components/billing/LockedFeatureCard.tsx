import { normalizePlan } from "@/lib/billing/plans"
import { checkFeatureAccess, type FeatureKey } from "@/lib/billing/features"
import { cn } from "@/lib/utils"

interface LockedFeatureCardProps {
  featureKey: FeatureKey
  currentPlan: string | null | undefined
  companyType?: string | null
  title: string
  description: string
  className?: string
}

export function LockedFeatureCard({ featureKey, currentPlan, companyType, title, description, className }: LockedFeatureCardProps) {
  const plan = normalizePlan(currentPlan)
  const effectiveCompanyType = companyType ?? "OEM"
  const access = checkFeatureAccess(plan, effectiveCompanyType, featureKey)

  if (access.allowed) return null

  return (
    <div className={cn("relative rounded-lg border border-dashed border-border bg-muted/30 p-4", className)}>
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <svg className="size-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          {access.reason && (
            <p className="mt-0.5 text-xs text-muted-foreground">{access.reason}</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            Billing integration is not enabled yet. Please contact PlantX sales or your system administrator to upgrade.
          </p>
        </div>
        <a
          href="/oem/settings/plan"
          className="shrink-0 rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
        >
          Upgrade
        </a>
      </div>
    </div>
  )
}