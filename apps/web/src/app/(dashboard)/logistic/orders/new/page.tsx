import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { canSalesExport } from "@/lib/logistic/roles"
import { resolveFieldConfig, resolveFieldConfigSync } from "@/lib/custom-fields/resolver"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import { LogisticOrderFormWrapper } from "./form-wrapper"
import { prisma } from "@/lib/prisma"
import { getTranslations } from "@/i18n/server"

export const dynamic = "force-dynamic"

export default async function NewLogisticOrderPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  if (!canSalesExport(session.user.role)) redirect("/logistic/orders")

  let fieldConfig: ResolvedFields
  const t = await getTranslations()
  const vehicleModels = await prisma.logisticVehicleModel.findMany({ where: { companyId: session.user.companyId, active: true, group: { active: true } }, orderBy: { name: "asc" }, include: { group: { select: { name: true } } } })
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "LOGISTIC_ORDER")
    } else {
      const resolver = resolveFieldConfigSync("LOGISTIC_ORDER")
      fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
    }
  } catch {
    const resolver = resolveFieldConfigSync("LOGISTIC_ORDER")
    fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("nav.newOrder")}</h1>
        <p className="text-sm text-muted-foreground">{t("logistic.dynamicFlow.newOrderDescription")}</p>
      </div>

      <LogisticOrderFormWrapper fieldConfig={fieldConfig} vehicleModels={vehicleModels.map((model) => ({ id: model.id, name: model.name, groupName: model.group.name }))} />
    </div>
  )
}
