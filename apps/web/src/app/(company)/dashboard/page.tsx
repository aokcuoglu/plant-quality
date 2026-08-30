import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  ShieldCheck,
  TruckIcon,
  Users,
  ArrowRight,
  BugIcon,
  ClipboardCheckIcon,
  ShieldAlertIcon,
  Factory,
  PackageCheck,
  AlertTriangle,
} from "lucide-react"
import { ModuleCard } from "@/components/dashboard/ModuleCard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { checkModuleAccess, MODULE_ENTITLEMENTS, MODULE_ORDER, type ModuleKey } from "@/lib/billing/features"
import { normalizePlan } from "@/lib/billing/plans"
import { PlanBadge } from "@/components/billing/PlanBadge"
import { getTranslations } from "@/i18n/server"

export const dynamic = "force-dynamic"

const MODULE_META: Record<
  ModuleKey,
  { id: string; name: string; descriptionKey: "dashboard.company.modules.quality" | "dashboard.company.modules.logistic"; icon: React.ComponentType<{ className?: string }>; homeHref: (t: string) => string }
> = {
  PLANT_QUALITY_MODULE: {
    id: "quality",
    name: "PlantQuality",
    descriptionKey: "dashboard.company.modules.quality",
    icon: ShieldCheck,
    homeHref: (t) => (t === "SUPPLIER" ? "/quality/supplier" : "/quality/oem"),
  },
  PLANT_LOGISTIC_MODULE: {
    id: "logistic",
    name: "PlantLogistic",
    descriptionKey: "dashboard.company.modules.logistic",
    icon: TruckIcon,
    homeHref: () => "/logistic",
  },
}

export default async function CompanyDashboardPage() {
  const t = await getTranslations()
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role === "SUPER_ADMIN") redirect("/admin")
  if (session.user.companyType !== "OEM" || session.user.role !== "ADMIN") {
    redirect(session.user.companyType === "SUPPLIER" ? "/quality/supplier" : "/quality/oem")
  }

  const companyId = session.user.companyId
  const companyType = session.user.companyType

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, type: true, plan: true, modules: true },
  })

  const modules = company?.modules ?? []
  const plan = normalizePlan(company?.plan ?? session.user.plan)
  const isOemAdmin = true

  const accessible = MODULE_ORDER.filter((key) =>
    checkModuleAccess(key, companyId, companyType, session.user.role, session.user.modules, modules)
  )

  const qualityAccess = accessible.includes("PLANT_QUALITY_MODULE")
  const logisticAccess = accessible.includes("PLANT_LOGISTIC_MODULE")

  const [qualityKpi, logisticKpi, userStats] = await Promise.all([
    qualityAccess
      ? (async () => {
          const where = { oemId: companyId }
          const [total, open, resolved] = await Promise.all([
            prisma.defect.count({ where }),
            prisma.defect.count({ where: { ...where, status: "OPEN" } }),
            prisma.defect.count({ where: { ...where, status: "RESOLVED" } }),
          ])
          return { total, open, resolved }
        })()
      : null,
    logisticAccess
      ? (async () => {
          const [active, qualityHold, inTransit] = await Promise.all([
            prisma.plantLogisticOrder.count({
              where: { companyId, status: { notIn: ["CLOSED", "CANCELLED", "REJECTED"] } },
            }),
            prisma.plantLogisticOrder.count({ where: { companyId, status: "QUALITY_HOLD" } }),
            prisma.plantLogisticDispatch.count({ where: { companyId, status: "IN_TRANSIT" } }),
          ])
          return { active, qualityHold, inTransit }
        })()
      : null,
    isOemAdmin
      ? (async () => {
          const users = await prisma.user.findMany({
            where: { companyId },
            select: { role: true, modules: true },
          })
          return {
            total: users.length,
            perModule: {
              PLANT_QUALITY_MODULE: users.filter((u) =>
                checkModuleAccess("PLANT_QUALITY_MODULE", companyId, companyType, u.role, u.modules, modules)
              ).length,
              PLANT_LOGISTIC_MODULE: users.filter((u) =>
                checkModuleAccess("PLANT_LOGISTIC_MODULE", companyId, companyType, u.role, u.modules, modules)
              ).length,
            } as Record<ModuleKey, number>,
          }
        })()
      : null,
  ])

  const lockedModules = MODULE_ORDER.filter((key) => !accessible.includes(key))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {company?.name ?? t("dashboard.company.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.company.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border bg-muted px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {company?.type ?? companyType}
          </Badge>
          <PlanBadge plan={plan} size="sm" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {MODULE_ORDER.map((key) => {
          const meta = MODULE_META[key]
          const hasAccess = accessible.includes(key)
          const Icon = meta.icon
          const isQuality = key === "PLANT_QUALITY_MODULE"

          const kpiRow = isQuality && qualityKpi ? (
            <div className="grid grid-cols-3 gap-2">
              <KpiMini label={t("dashboard.company.kpi.total")} value={qualityKpi.total} icon={BugIcon} />
              <KpiMini label={t("dashboard.company.kpi.open")} value={qualityKpi.open} icon={AlertTriangle} />
              <KpiMini label={t("dashboard.company.kpi.resolved")} value={qualityKpi.resolved} icon={ClipboardCheckIcon} />
            </div>
          ) : !isQuality && logisticKpi ? (
            <div className="grid grid-cols-3 gap-2">
              <KpiMini label={t("dashboard.company.kpi.active")} value={logisticKpi.active} icon={Factory} />
              <KpiMini label={t("dashboard.company.kpi.qualityHold")} value={logisticKpi.qualityHold} icon={ShieldAlertIcon} />
              <KpiMini label={t("dashboard.company.kpi.inTransit")} value={logisticKpi.inTransit} icon={PackageCheck} />
            </div>
          ) : null

          return (
            <ModuleCard
              key={key}
              name={meta.name}
              description={t(meta.descriptionKey)}
              icon={Icon}
              variant={hasAccess ? "live" : "locked"}
              href={hasAccess ? meta.homeHref(companyType) : undefined}
            >
              {kpiRow}
            </ModuleCard>
          )
        })}
      </div>

      {isOemAdmin && userStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="size-4" /> {t("dashboard.company.userAccess.title")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {t("dashboard.company.userAccess.description", { count: userStats.total })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {MODULE_ORDER.map((key) => {
                const meta = MODULE_META[key]
                const Icon = meta.icon
                return (
                  <div key={key} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{meta.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("dashboard.company.userAccess.count", { accessible: userStats.perModule[key] ?? 0, total: userStats.total })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-start">
              <Link href="/dashboard/users">
                <Button variant="outline" size="sm" className="gap-1.5 text-foreground">
                  <Users className="size-3.5" /> {t("dashboard.company.userAccess.manage")} <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {lockedModules.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("dashboard.company.lockedModules", { modules: lockedModules.map((k) => MODULE_ENTITLEMENTS[k].label).join(", ") })}{" "}
          <Link href="/dashboard/billing" className="text-foreground underline underline-offset-2">
            {t("dashboard.company.billing.title")}
          </Link>
        </p>
      )}
    </div>
  )
}

function KpiMini({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <p className="mt-1 text-lg font-bold tracking-tight text-foreground">{value}</p>
    </div>
  )
}
