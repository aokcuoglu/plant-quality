import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { PlanBadge } from "@/components/billing/PlanBadge"
import { normalizePlan, formatLimit, PLAN_LABELS } from "@/lib/billing/plans"
import { MODULE_ENTITLEMENTS, MODULE_ORDER, MODULE_CATALOG, checkModuleAccess, getAllFeatures, checkFeatureAccess, getModuleStatus } from "@/lib/billing/features"
import { getUsageLimitStatus, type UsageKey } from "@/lib/billing/usage"
import { UpgradeRequestForm } from "@/app/(dashboard)/oem/settings/plan/upgrade-request-form"
import { UpgradeRequestList } from "@/app/(dashboard)/oem/settings/plan/upgrade-request-list"
import { ModuleCatalogCard } from "@/components/billing/ModuleCatalogCard"
import { ShieldCheck, TruckIcon, LockIcon } from "lucide-react"

type ModuleContext = "quality" | "logistic"

interface PlanAndUsageContentProps {
  moduleContext: ModuleContext
}

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PLANT_QUALITY_MODULE: ShieldCheck,
  PLANT_LOGISTIC_MODULE: TruckIcon,
}

export async function PlanAndUsageContent({ moduleContext }: PlanAndUsageContentProps) {
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
  const companyId = session.user.companyId
  const companyType = session.user.companyType ?? "OEM"
  const features = getAllFeatures()

  const usageKeys: { key: UsageKey; label: string }[] = [
    { key: "MONTHLY_DEFECTS", label: "Monthly Defects" },
    { key: "MONTHLY_FIELD_DEFECTS", label: "Monthly Field Defects" },
    { key: "SUPPLIERS", label: "Suppliers" },
    { key: "USERS", label: "Users" },
    { key: "STORAGE_MB", label: "Storage" },
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
      status: await getUsageLimitStatus(companyId, key),
    }))
  )

  const featureAccessList = features.map((f) => ({
    ...f,
    access: checkFeatureAccess(plan, companyType, f.key, companyId),
  }))

  const upgradeRequests = await prisma.upgradeRequest.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      requestedBy: { select: { name: true, email: true } },
      resolvedBy: { select: { name: true, email: true } },
    },
  })

  const serializedRequests = upgradeRequests.map((r) => ({
    id: r.id,
    currentPlan: r.currentPlan,
    requestedPlan: r.requestedPlan,
    sourceFeature: r.sourceFeature,
    message: r.message,
    status: r.status,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
    requestedBy: r.requestedBy ? { name: r.requestedBy.name, email: r.requestedBy.email } : null,
    resolvedBy: r.resolvedBy ? { name: r.resolvedBy.name, email: r.resolvedBy.email } : null,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  }))

  const moduleEntries = MODULE_ORDER.map((moduleKey) => {
    const entitlement = MODULE_ENTITLEMENTS[moduleKey]
    const hasModule = checkModuleAccess(moduleKey, companyId, companyType)
    const ModuleIcon = MODULE_ICONS[moduleKey] ?? ShieldCheck
    return { moduleKey, entitlement, hasModule, ModuleIcon }
  })

  const catalogEntries = MODULE_CATALOG.filter((entry) => {
    const ct = session.user.companyType ?? "OEM"
    if (ct === "SUPPLIER" && !entry.supplierAccess && entry.status === "live") return false
    return true
  }).map((entry) => ({
    entry,
    status: getModuleStatus(entry, companyId, companyType, moduleContext),
  }))

  const activeModules = catalogEntries.filter((e) => e.status === "ACTIVE" || e.status === "LIVE")
  const lockedModules = catalogEntries.filter((e) => e.status === "LOCKED")
  const soonModules = catalogEntries.filter((e) => e.status === "SOON")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan & Usage"
        description={`Manage your subscription, modules, and usage for ${company.name}`}
      />

      <div className="grid gap-6 xl:grid-cols-2">
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
              <UpgradeRequestForm currentPlan={plan} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Module Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {moduleEntries.map(({ moduleKey, entitlement, hasModule, ModuleIcon }) => (
              <div key={moduleKey} className="flex items-center gap-3">
                <div className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  hasModule ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <ModuleIcon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", hasModule ? "text-foreground" : "text-muted-foreground")}>
                      {entitlement.label}
                    </span>
                    {hasModule ? (
                      <span className="inline-flex items-center rounded-full border border-border bg-brand/10 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-foreground">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted px-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <LockIcon className="size-2.5" />Locked
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {entitlement.description}
                  </p>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Module access is based on your subscription. Contact sales to add modules.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Available PlantX Modules
            </CardTitle>
            <span className="text-[10px] text-muted-foreground">
              Online billing is not enabled yet
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {activeModules.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-foreground">
                Active &mdash; Included in your plan
              </h3>
              <div className="grid gap-2">
                {activeModules.map(({ entry, status }) => (
                  <ModuleCatalogCard key={entry.id} entry={entry} status={status} />
                ))}
              </div>
            </div>
          )}
          {lockedModules.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Locked &mdash; Request access
              </h3>
              <div className="grid gap-2">
                {lockedModules.map(({ entry, status }) => (
                  <ModuleCatalogCard key={entry.id} entry={entry} status={status} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Request access sends a request to the PlantX team. Module activation is handled manually.
              </p>
            </div>
          )}
          {soonModules.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                Coming soon
              </h3>
              <div className="grid gap-2">
                {soonModules.map(({ entry, status }) => (
                  <ModuleCatalogCard key={entry.id} entry={entry} status={status} />
                ))}
              </div>
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
              const isBlocked = status.limit === 0
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    {isBlocked ? (
                      <span className="text-muted-foreground">&mdash;</span>
                    ) : (
                      <>
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
                                      ? "bg-destructive"
                                      : "bg-foreground"
                                )}
                                style={{ width: `${Math.min(100, status.percentage)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
                <span className={cn("size-2 rounded-full shrink-0", f.access.allowed ? "bg-foreground" : "bg-muted-foreground/30")} />
                <span className={f.access.allowed ? "text-foreground" : "text-muted-foreground"}>
                  {f.label}
                </span>
                {!f.access.allowed && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {PLAN_LABELS[f.minPlan] ?? f.minPlan}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Upgrade Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpgradeRequestList requests={serializedRequests} />
        </CardContent>
      </Card>
    </div>
  )
}