import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PlanBadge } from "@/components/billing/PlanBadge"
import { normalizePlan, getPlanLimits, formatLimit } from "@/lib/billing/plans"
import { getAllFeatures, checkFeatureAccess } from "@/lib/billing/features"
import { getUsageLimitStatus, type UsageKey } from "@/lib/billing/usage"

export const metadata = { title: "Plan & Usage — PlantQuality" }

export default async function PlanSettingsPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || session.user.role !== "ADMIN") redirect("/login")

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: {
      plan: true,
      planStatus: true,
      planStartedAt: true,
      trialEndsAt: true,
      name: true,
      type: true,
    },
  })

  if (!company) redirect("/login")

  const plan = normalizePlan(company.plan)
  const _limits = getPlanLimits(plan)
  const features = getAllFeatures()

  const usageKeys: { key: UsageKey; label: string }[] = [
    { key: "MONTHLY_DEFECTS", label: "Monthly Defects" },
    { key: "MONTHLY_FIELD_DEFECTS", label: "Monthly Field Defects" },
    { key: "SUPPLIERS", label: "Suppliers" },
    { key: "USERS", label: "Users" },
    { key: "STORAGE_MB", label: "Storage (MB)" },
    { key: "AI_CLASSIFICATION_RUNS", label: "AI Classification Runs" },
    { key: "AI_8D_REVIEW_RUNS", label: "AI 8D Review Runs" },
    { key: "SIMILAR_ISSUE_SEARCHES", label: "Similar Issue Searches" },
    { key: "WAR_ROOM_ITEMS", label: "War Room Items" },
    { key: "PPAP_PACKAGES", label: "PPAP Packages" },
    { key: "IQC_INSPECTIONS", label: "IQC Inspections" },
    { key: "FMEA_RECORDS", label: "FMEA Records" },
  ]

  const usageStatuses = await Promise.all(
    usageKeys.map(async ({ key }) => ({
      key,
      status: await getUsageLimitStatus(session.user.companyId, key),
    }))
  )

  const featureAccessList = features.map((f) => ({
    ...f,
    access: checkFeatureAccess(plan, "OEM", f.key),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan & Usage"
        description={`Manage your plan and view usage for ${company.name}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <PlanBadge plan={plan} />
              {company.planStatus && (
                <span className="text-xs text-muted-foreground uppercase">
                  {company.planStatus}
                </span>
              )}
            </div>
            {company.planStartedAt && (
              <p className="text-xs text-muted-foreground">
                Active since {company.planStartedAt.toLocaleDateString()}
              </p>
            )}
            {company.trialEndsAt && (
              <p className="text-xs text-muted-foreground">
                Trial ends {company.trialEndsAt.toLocaleDateString()}
              </p>
            )}
            {plan !== "ENTERPRISE" && (
              <div className="pt-2">
                <a
                  href="#"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
                >
                  Upgrade to {plan === "FREE" ? "Pro" : "Enterprise"}
                </a>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Billing integration is not enabled yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usageStatuses.map(({ key, status }) => {
                const label = usageKeys.find((u) => u.key === key)?.label ?? key
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">
                        {status.current.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-foreground">
                        {formatLimit(status.limit)}
                      </span>
                      {status.percentage !== null && (
                        <div className="w-16">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                status.isOver
                                  ? "bg-destructive"
                                  : status.isNear
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(100, status.percentage)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Feature Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featureAccessList.map((f) => (
              <div key={f.key} className="flex items-center gap-2 text-sm">
                <span className={cn("size-2 rounded-full shrink-0", f.access.allowed ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                <span className={f.access.allowed ? "text-foreground" : "text-muted-foreground"}>
                  {f.label}
                </span>
                {!f.access.allowed && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {f.minPlan}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}