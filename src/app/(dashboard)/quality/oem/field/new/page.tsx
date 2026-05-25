import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSuppliersForField } from "@/app/(dashboard)/field/actions"
import { resolveFieldConfig, resolveFieldConfigSync } from "@/lib/custom-fields/resolver"
import type { ResolvedFields } from "@/lib/custom-fields/resolver"
import type { ResolvedField } from "@/lib/custom-fields/types"
import { NewFieldDefectForm } from "./form"

export default async function NewFieldDefectPage() {
  const session = await auth()
  if (!session || session.user.companyType !== "OEM" || !["ADMIN", "QUALITY_ENGINEER"].includes(session.user.role)) {
    redirect("/login")
  }

  const suppliers = await getSuppliersForField()

  let fieldConfig: ResolvedFields
  try {
    if (session.user.plan === "ENTERPRISE") {
      fieldConfig = await resolveFieldConfig(session.user.companyId, "FIELD_DEFECT")
    } else {
      const resolver = resolveFieldConfigSync("FIELD_DEFECT")
      fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
    }
  } catch {
    const resolver = resolveFieldConfigSync("FIELD_DEFECT")
    fieldConfig = { all: resolver.resolve(), visible: resolver.visible, builtIn: resolver.builtIn, custom: resolver.custom }
  }

  return <NewFieldDefectForm suppliers={suppliers} fieldConfig={fieldConfig} />
}