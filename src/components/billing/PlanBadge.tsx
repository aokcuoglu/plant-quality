import { normalizePlan, getPlanLabel, getPlanBadgeClasses } from "@/lib/billing/plans"
import { cn } from "@/lib/utils"

interface PlanBadgeProps {
  plan: string | null | undefined
  className?: string
  size?: "sm" | "default"
}

export function PlanBadge({ plan, className, size = "default" }: PlanBadgeProps) {
  const normalizedPlan = normalizePlan(plan)
  const label = getPlanLabel(normalizedPlan)
  const badgeClasses = getPlanBadgeClasses(normalizedPlan)

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold tracking-wider uppercase",
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        badgeClasses,
        className
      )}
    >
      {label}
    </span>
  )
}

export function PlanBadgeDisplay({ plan, companyType }: { plan: string | null | undefined; companyType: string | null | undefined }) {
  const normalizedPlan = normalizePlan(plan)
  const isSupplier = companyType === "SUPPLIER"

  return <PlanBadge plan={isSupplier ? "FREE" : normalizedPlan} />
}