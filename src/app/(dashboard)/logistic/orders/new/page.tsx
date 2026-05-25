import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireFeature, requireModule } from "@/lib/billing/guards"
import { resolveFieldConfig, resolveFieldConfigSync } from "@/lib/custom-fields/resolver"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import { LogisticOrderFormWrapper } from "./form-wrapper"

export const dynamic = "force-dynamic"

export default async function NewLogisticOrderPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.companyType !== "OEM") redirect("/quality/supplier")

  const moduleAccess = requireModule(session, "PLANT_LOGISTIC_MODULE")
  if (!moduleAccess.allowed) redirect("/quality/oem")
  const { allowed } = requireFeature(session, "PLANT_LOGISTIC")
  if (!allowed) redirect("/quality/oem")

  let fieldConfig: ResolvedFields
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">New Vehicle Order</h1>
        <p className="text-sm text-muted-foreground">Create a new vehicle order request</p>
      </div>

      <LogisticOrderFormWrapper fieldConfig={fieldConfig} />
    </div>
  )
}
