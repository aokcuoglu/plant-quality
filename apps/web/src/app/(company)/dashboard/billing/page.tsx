import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { normalizePlan } from "@/lib/billing/plans"
import { PlanBadge } from "@/components/billing/PlanBadge"
import { getLocale, getTranslations } from "@/i18n/server"

export const dynamic = "force-dynamic"

const STATUS_CLASSES: Record<string, string> = {
  OPEN: "bg-muted text-muted-foreground border-border",
  CONTACTED: "bg-muted text-muted-foreground border-border",
  APPROVED: "bg-emerald-500/10 text-emerald-500 border-border",
  REJECTED: "bg-destructive/10 text-destructive border-border",
  CLOSED: "bg-muted text-muted-foreground border-border",
}

function formatDate(d: string | Date | null | undefined, locale: string): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString(locale)
}

export default async function CompanyBillingPage() {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()])
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role === "SUPER_ADMIN") redirect("/admin")

  const isOemAdmin = session.user.companyType === "OEM" && session.user.role === "ADMIN"
  if (!isOemAdmin) redirect("/dashboard")

  const companyId = session.user.companyId

  const [company, requests] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, plan: true, planStatus: true, planStartedAt: true, trialEndsAt: true, modules: true },
    }),
    prisma.upgradeRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { name: true, email: true } },
        resolvedBy: { select: { name: true, email: true } },
      },
    }),
  ])

  if (!company) redirect("/dashboard")

  const plan = normalizePlan(company.plan)
  const moduleLabels = company.modules.map((m) =>
    m === "PLANT_QUALITY_MODULE" ? "PlantQuality" : m === "PLANT_LOGISTIC_MODULE" ? "PlantLogistic" : m
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("dashboard.company.billing.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.company.billing.description", { company: company.name })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlanDetailCard label={t("dashboard.company.billing.plan")} value={<PlanBadge plan={plan} />} />
        <PlanDetailCard label={t("dashboard.company.billing.status")} value={<span className="text-sm font-medium text-foreground">{company.planStatus ?? t("dashboard.company.billing.active")}</span>} />
        <PlanDetailCard label={t("dashboard.company.billing.startedAt")} value={<span className="text-sm font-medium text-foreground">{formatDate(company.planStartedAt, locale)}</span>} />
        <PlanDetailCard label={t("dashboard.company.billing.trialEndsAt")} value={<span className="text-sm font-medium text-foreground">{formatDate(company.trialEndsAt, locale)}</span>} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">{t("dashboard.company.billing.subscribedModules")}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("dashboard.company.billing.subscribedModulesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {moduleLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.company.billing.noModules")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {moduleLabels.map((m) => (
                <Badge key={m} variant="outline" className="border-border bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                  {m}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">{t("dashboard.company.billing.history")}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("dashboard.company.billing.historyDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.company.billing.noHistory")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left">{t("dashboard.company.billing.date")}</th>
                    <th className="px-4 py-3 text-left">{t("dashboard.company.billing.currentPlan")}</th>
                    <th className="px-4 py-3 text-left">{t("dashboard.company.billing.request")}</th>
                    <th className="px-4 py-3 text-left">{t("dashboard.company.billing.status")}</th>
                    <th className="px-4 py-3 text-left">{t("dashboard.company.billing.note")}</th>
                    <th className="px-4 py-3 text-left">{t("dashboard.company.billing.requestedBy")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {requests.map((r) => {
                    const statusLabel = t(`dashboard.company.billing.statuses.${r.status}` as "dashboard.company.billing.statuses.OPEN")
                    const statusClassName = STATUS_CLASSES[r.status] ?? "bg-muted text-muted-foreground border-border"
                    return (
                      <tr key={r.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.createdAt, locale)}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{r.currentPlan}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{r.requestedPlan}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`px-2 text-[10px] font-semibold uppercase tracking-wider ${statusClassName}`}>
                            {statusLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.message ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.requestedBy?.name ?? r.requestedBy?.email ?? "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PlanDetailCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2">{value}</div>
    </div>
  )
}
